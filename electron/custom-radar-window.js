(() => {
  const state = {
    payload: {},
    event: null,
    feedId: '',
    realData: null,
    error: '',
    theme: localStorage.getItem('custom_wradar_mod_theme') || 'dark',
    density: localStorage.getItem('custom_wradar_mod_density') || 'wide',
    cleanOverlay: true,
    overlayReplica: false,
    showOdds: localStorage.getItem('custom_wradar_mod_show_odds') !== '0',
    showMeta: localStorage.getItem('custom_wradar_mod_show_meta') !== '0',
    pinnedKey: '',
    pinnedIndex: null,
    lastSignature: '',
    interactingUntil: 0,
    deferredTimer: null
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
  const normalizeMatchText = value => String(value || '')
    .replace(/[øö]/gi, 'o').replace(/æ/gi, 'ae').replace(/œ/gi, 'oe').replace(/ł/gi, 'l')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const get365TeamLogoUrl = teamId => Number(teamId) ? `https://imagecache.365scores.com/image/upload/f_png,w_100,h_100,c_limit,q_auto:eco,dpr_2/v1/Competitors/${Number(teamId)}` : '';
  const getTeamInitials = name => String(name || '?').split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase();
  const splitTeams = event => event?.i?.b && event?.j?.b
    ? { home: event.i.b, away: event.j.b }
    : (() => {
        const parts = String(event?.name || '').split(/\s+v(?:s\.?)?\s+/i);
        return { home: parts[0]?.trim() || 'Mandante', away: parts.slice(1).join(' v ').trim() || 'Visitante' };
      })();
  const normalizeScore = event => {
    const explicitHome = event?.homeTeamScore ?? event?.homeScore;
    const explicitAway = event?.awayTeamScore ?? event?.awayScore;
    if (explicitHome !== null && explicitHome !== undefined && explicitAway !== null && explicitAway !== undefined) {
      return { home: explicitHome, away: explicitAway };
    }
    const match = String(event?.score || '').match(/(\d+)\s*[-:x]\s*(\d+)/i);
    return match ? { home: Number(match[1]), away: Number(match[2]) } : { home: 0, away: 0 };
  };
  const teamAbbr = name => {
    const clean = String(name || '').replace(/\s+/g, ' ').trim();
    const tokens = clean.replace(/\b(fc|cf|sc|ac|ec|afc|club|de|do|da|the)\b/gi, ' ').trim().split(/\s+/).filter(Boolean);
    if (tokens.length >= 2) return tokens.slice(0, 3).map(token => token[0]).join('').toUpperCase().slice(0, 3);
    return clean.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || '---';
  };
  const commentText = text => String(text || '').replace(/\s+/g, ' ').trim()
    .replace(/(Intervalo)(?:\s*Intervalo)+/gi, '$1')
    .replace(/(Half Time)(?:\s*Half Time)+/gi, '$1');
  const commentKey = item => item ? [item.minute || '', item.seconds || '', commentText(item.comment || item.all || '')].join('|') : '';
  const commentTime = item => {
    if (!item) return '';
    return item.minute || item.seconds ? `${item.minute || ''}${item.seconds || ''}` : (item.all?.match(/\d{1,3}'\d{0,2}/)?.[0] || '');
  };
  const parseGameSeconds = value => {
    const raw = String(value || '').replace(/\s+/g, ' ').trim();
    const added = raw.match(/(\d{1,3})'\s*\+\s*(?:(\d{1,2})')?\s*(\d{1,2})?/);
    if (added) return ((Number(added[1]) || 0) * 60) + ((Number(added[2] || added[3]) || 0));
    const minuteSecond = raw.match(/(\d{1,3})'\s*(\d{1,2})/);
    if (minuteSecond) return ((Number(minuteSecond[1]) || 0) * 60) + (Number(minuteSecond[2]) || 0);
    const clock = raw.match(/(\d{1,3})\s*:\s*(\d{1,2})/);
    if (clock) return ((Number(clock[1]) || 0) * 60) + (Number(clock[2]) || 0);
    const minute = raw.match(/(\d{1,3})'/);
    return minute ? (Number(minute[1]) || 0) * 60 : null;
  };
  const clockPeriodInfo = value => {
    const normalized = normalizeMatchText(value);
    if (normalized.includes('intervalo') || normalized.includes('half time')) return { paused: true, period: 'interval' };
    if (normalized.includes('2 t') || normalized.includes('2o t') || normalized.includes('2nd') || normalized.includes('second half')) return { paused: false, period: 'second' };
    return { paused: false, period: 'first' };
  };
  const parseAddedTimeCommentSeconds = value => {
    const raw = String(value || '').replace(/\s+/g, ' ').trim();
    if (!raw) return null;

    if (/^\d+'\s*\+\s*\d+/.test(raw)) return null;

    let match = raw.match(/^(\d+)'\s*(\d{1,2})''/);
    if (match) return (Number(match[1]) * 60) + Number(match[2]);

    match = raw.match(/^(\d+)'\s*(\d{1,2})/);
    if (match) return (Number(match[1]) * 60) + Number(match[2]);

    match = raw.match(/^(\d+)\s*:\s*(\d{1,2})$/);
    if (match) return (Number(match[1]) * 60) + Number(match[2]);

    match = raw.match(/^(\d+)'$/);
    if (match) return Number(match[1]) * 60;

    return null;
  };

  const shouldIgnoreAddedTimeComment = item => {
    const text = normalizeMatchText(`${item?.comment || ''} ${item?.all || ''} ${item?.className || ''}`);
    return text.includes('substituicao') || text.includes('substitution');
  };

  const calculateAddedTimeForHalfFromItems = items => {
    const events = [];

    for (const item of items) {
      if (shouldIgnoreAddedTimeComment(item)) continue;

      const rawTime = commentTime(item);
      const totalSeconds = parseAddedTimeCommentSeconds(rawTime);
      if (totalSeconds === null) continue;

      events.push({
        rawTime,
        totalSeconds,
        item
      });
    }

    events.sort((a, b) => b.totalSeconds - a.totalSeconds);

    let totalAddedSeconds = 0;
    const moments = [];

    for (let i = 0; i < events.length - 1; i += 1) {
      const current = events[i];
      const next = events[i + 1];
      const diff = current.totalSeconds - next.totalSeconds;

      if (diff >= 70) {
        const minutesToAdd = Math.floor(diff / 60);
        const secondsToAdd = minutesToAdd * 60;

        totalAddedSeconds += secondsToAdd;
        moments.push({
          secondsToAdd,
          from: current.rawTime,
          to: next.rawTime,
          diff,
          currentComment: commentText(current.item?.comment || current.item?.all || ''),
          nextComment: commentText(next.item?.comment || next.item?.all || '')
        });
      }
    }

    return {
      minutes: Math.floor(totalAddedSeconds / 60),
      seconds: totalAddedSeconds % 60,
      totalAddedSeconds,
      moments,
      eventCount: events.length
    };
  };

  const splitCommentariesForAddedTime = items => {
    const firstHalf = [];
    const secondHalf = [];

    for (const item of items) {
      if (shouldIgnoreAddedTimeComment(item)) continue;

      const rawTime = commentTime(item);
      const totalSeconds = parseAddedTimeCommentSeconds(rawTime);
      if (totalSeconds === null) continue;

      if (totalSeconds < 45 * 60) {
        firstHalf.push(item);
      } else {
        secondHalf.push(item);
      }
    }

    return { firstHalf, secondHalf };
  };

  const calculateAddedTimeFromCommentaries = data => {
    const items = Array.isArray(data?.commentaries) ? data.commentaries : [];
    const { firstHalf, secondHalf } = splitCommentariesForAddedTime(items);

    return {
      firstHalf: calculateAddedTimeForHalfFromItems(firstHalf),
      secondHalf: calculateAddedTimeForHalfFromItems(secondHalf)
    };
  };

  const addedTimeHtml = (data, clock) => {
    const items = Array.isArray(data?.commentaries) ? data.commentaries : [];
    if (!items.length) return '';

    const period = clockPeriodInfo(clock);
    if (period.paused) return '';

    const results = calculateAddedTimeFromCommentaries(data);
    const active = period.period === 'second' ? results.secondHalf : results.firstHalf;
    const minutes = Math.max(0, active.minutes || 0);

    const debugTitle = active.moments.length
      ? active.moments
          .map(entry => `${entry.from} -> ${entry.to} (${entry.diff}s, +${Math.floor(entry.secondsToAdd / 60)}')`)
          .join(' | ')
      : 'Sem gaps >= 60s encontrados nos comentarios';

    return `<span class="custom-radar-added-time" title="${escapeHtml(debugTitle)}">+${minutes}' prev</span>`;
  };
  const getLastComment = data => data?.commentaries?.[0] ? { ...data.commentaries[0], time: commentTime(data.commentaries[0]) } : null;
  const getFocusedComment = data => {
    const items = Array.isArray(data?.commentaries) ? data.commentaries : [];
    if (!state.pinnedKey && !Number.isInteger(state.pinnedIndex)) return null;
    const item = items.find(entry => commentKey(entry) === state.pinnedKey) || items.find(entry => Number(entry.index) === state.pinnedIndex);
    return item ? { ...item, time: commentTime(item) } : null;
  };
  const eventType = item => {
    const text = normalizeMatchText(`${item?.comment || ''} ${item?.all || ''} ${item?.className || ''}`);
    if (!text) return 'neutral';
    if (text.includes('tiro de meta') || text.includes('goal kick')) return 'goal-kick';
    if (text.includes('lateral') || text.includes('throw in') || text.includes('throw-in')) return 'throw-in';
    if (text.includes('gol') || text.includes('goal')) return 'goal';
    if (text.includes('ataque perigoso') || text.includes('dangerous attack')) return 'dangerous';
    if (text.includes('remate certeiro') || text.includes('chute gol') || text.includes('shot on target') || text.includes('on target')) return 'shot-on-target';
    if (text.includes('remate') || text.includes('chute') || text.includes('shot')) return 'shot';
    if (text.includes('escanteio') || text.includes('corner')) return 'corner';
    if (text.includes('cartao amarelo') || text.includes('yellow card')) return 'yellow-card';
    if ((text.includes('possivel') || text.includes('possible')) && (text.includes('cartao vermelho') || text.includes('red card'))) return 'possible-red-card';
    if (text.includes('cartao vermelho') || text.includes('red card')) return 'red-card';
    if (text.includes('cartao') || text.includes('card')) return 'yellow-card';
    if (text.includes('defesa') || text.includes('defence') || text.includes('defense')) return 'defense';
    if (text.includes('ataque') || text.includes('attack')) return 'attack';
    if (text.includes('posse') || text.includes('controle de meio campo') || text.includes('control')) return 'control';
    if (text.includes('falta') || text.includes('free kick')) return 'foul';
    return 'neutral';
  };
  const eventIcon = item => {
    const type = eventType(item);
    const side = item?.side === 'away' ? 'away' : (item?.side === 'home' ? 'home' : '');
    const directionalArrow = side === 'away' ? 'bx-left-arrow-alt' : 'bx-right-arrow-alt';
    const map = {
      goal: 'bx-football', dangerous: directionalArrow,
      attack: directionalArrow,
      defense: directionalArrow, 'shot-on-target': 'bx-target-lock', shot: 'bx-target-lock',
      'goal-kick': 'bx-radio-circle', 'throw-in': 'bx-radio-circle',
      corner: 'bxs-flag-alt', 'yellow-card': 'bx-square', 'possible-red-card': 'bx-error', 'red-card': 'bx-square',
      control: 'bx-transfer-alt', foul: 'bx-square', neutral: 'bx-radio-circle'
    };
    return `<i class='custom-radar-event-icon ${escapeHtml(type)} ${escapeHtml(side)} bx ${map[type] || map.neutral}'></i>`;
  };
  const renderLogo = (team, fallbackName) => {
    const id = team?.a;
    const label = escapeHtml(getTeamInitials(team?.b || fallbackName || ''));
    if (!id) return `<span class="custom-radar-logo-fallback">${label}</span>`;
    return `<img class="custom-radar-logo" src="${escapeHtml(get365TeamLogoUrl(id))}" alt="${escapeHtml(team?.b || fallbackName || '')}" onerror="this.outerHTML='<span class=&quot;custom-radar-logo-fallback&quot;>${label}</span>'">`;
  };
  const odds = event => {
    const raw = event?.odds;
    if (!raw) return [];
    const map = [['Casa', raw.home], ['Empate', raw.draw], ['Fora', raw.away], ['Over 2.5', raw.over25], ['Under 2.5', raw.under25]];
    return map.map(([label, item]) => ({ label, value: item?.value ?? item ?? '' })).filter(item => item.value !== '');
  };
  const statsHtml = data => {
    const stats = data?.stats || {};
    const substitutions = (Array.isArray(data?.commentaries) ? data.commentaries : []).reduce((acc, item) => {
      const text = normalizeMatchText(`${item?.comment || ''} ${item?.all || ''} ${item?.className || ''}`);
      if (!text.includes('substituicao') && !text.includes('substitution')) return acc;
      const side = item?.side === 'away' ? 'away' : 'home';
      acc[side] += 1;
      return acc;
    }, { home: 0, away: 0 });
    const rows = [
      ['shotsOnTarget', 'Chutes gol', 'bx-target-lock'],
      ['shotsOffTarget', 'Chutes fora', 'bx-crosshair'],
      ['corners', 'Escanteios', 'bxs-flag-alt'],
      ['possession', 'Posse', 'bx-pie-chart-alt-2'],
      ['substitutions', 'Substituicoes', 'bx-transfer-alt'],
      ['dangerousAttacks', 'Ataques perigosos', 'bxs-bolt-circle']
    ];
    const value = (key, side) => key === 'substitutions' ? substitutions[side] : (stats[key]?.[side] || '--');
    return `<div class="custom-radar-stats-grid">${rows.map(([key, label, icon]) => `<div class="custom-radar-stat ${escapeHtml(key)}" title="${escapeHtml(label)}"><strong><i class='bx ${icon}'></i></strong><span>${escapeHtml(value(key, 'home'))} - ${escapeHtml(value(key, 'away'))}</span></div>`).join('')}</div>`;
  };
  const pressureHtml = (data, clock) => {
    const items = Array.isArray(data?.commentaries) ? data.commentaries : [];
    const period = clockPeriodInfo(clock);
    const recent = {
      dangerous: { home: 0, away: 0 },
      onTarget: { home: 0, away: 0 }
    };
    if (!items.length || period.paused) {
      return `<div class="custom-radar-pressure" title="Eventos dos ultimos 5 minutos"><small>5m</small><span class="custom-radar-pressure-item dangerous"><i class='bx bxs-bolt-circle'></i><strong>AP</strong><b>0-0</b></span><span class="custom-radar-pressure-item on-target"><i class='bx bx-target-lock'></i><strong>CG</strong><b>0-0</b></span></div>`;
    }
    let latest = parseGameSeconds(clock) ?? Math.max(...items.map(item => parseGameSeconds(commentTime(item)) ?? 0), 0);
    if (period.period === 'second' && latest < 45 * 60) latest += 45 * 60;
    items.forEach(item => {
      const type = eventType(item);
      const side = item.side === 'away' ? 'away' : (item.side === 'home' ? 'home' : '');
      if (!side) return;
      const seconds = parseGameSeconds(commentTime(item));
      if (seconds === null) return;
      if (period.period === 'second' && seconds < 45 * 60) return;
      if (seconds > latest || latest - seconds > 300) return;
      if (type === 'dangerous') recent.dangerous[side] += 1;
      if (type === 'shot-on-target') recent.onTarget[side] += 1;
    });
    const totalHome = recent.dangerous.home + recent.onTarget.home;
    const totalAway = recent.dangerous.away + recent.onTarget.away;
    const leader = totalHome === totalAway ? 'eq' : (totalHome > totalAway ? 'home' : 'away');
    const row = (className, icon, label, stat) => `<span class="custom-radar-pressure-item ${className}"><i class='bx ${icon}'></i><strong>${label}</strong><b>${stat.home}-${stat.away}</b></span>`;
    return `<div class="custom-radar-pressure ${leader}" title="Eventos dos ultimos 5 minutos"><small>5m</small>${row('dangerous', 'bxs-bolt-circle', 'AP', recent.dangerous)}${row('on-target', 'bx-target-lock', 'CG', recent.onTarget)}</div>`;
  };
  const listHtml = data => {
    const items = Array.isArray(data?.commentaries) ? data.commentaries : [];
    const focusedKey = commentKey(getFocusedComment(data) || getLastComment(data));
    const visibleItems = focusedKey ? items.filter(item => commentKey(item) !== focusedKey) : items;
    if (!visibleItems.length) return `<div class="custom-radar-comment-list is-empty"><div><i class='bx bx-loader-alt bx-spin'></i> Aguardando comentarios do scoreboard...</div></div>`;
    return `<div class="custom-radar-comment-list">${visibleItems.map(item => {
      const time = commentTime(item);
      const type = eventType(item);
      const key = commentKey(item);
      const encoded = encodeURIComponent(key);
      const pinned = key === state.pinnedKey || Number(item.index) === Number(state.pinnedIndex);
      return `<button type="button" class="custom-radar-comment ${escapeHtml(item.side || '')} ${escapeHtml(type)} ${pinned ? 'is-pinned' : ''}" data-index="${Number(item.index)}" data-key="${encoded}" title="Lance do jogo"><span>${escapeHtml(time || '--')}</span>${eventIcon(item)}<strong>${escapeHtml(commentText(item.comment || item.all || '-'))}</strong></button>`;
    }).join('')}</div>`;
  };
  const signature = data => JSON.stringify({
    score: data?.score,
    clock: data?.clock,
    first: data?.commentaries?.[0],
    len: data?.commentaries?.length,
    stats: data?.stats
  });

  function render() {
    const modal = $('#custom-wradar-mod');
    const content = $('#custom-wradar-content');
    if (!content || !modal) return;
    const previousList = $('.custom-radar-comment-list', content);
    const previousScroll = previousList ? {
      top: previousList.scrollTop,
      height: previousList.scrollHeight,
      keep: previousList.scrollTop > 4
    } : null;
    modal.setAttribute('data-radar-theme', state.theme === 'light' ? 'light' : 'dark');
    modal.setAttribute('data-radar-density', state.density === 'compact' ? 'compact' : 'wide');
    modal.setAttribute('data-radar-overlay', state.cleanOverlay ? 'clean' : 'panel');
    const event = state.event || {};
    const data = state.realData;
    const teams = splitTeams(event);
    const fallback = normalizeScore(event);
    const score = {
      home: Number.isFinite(data?.score?.home) ? data.score.home : Number(fallback.home || 0),
      away: Number.isFinite(data?.score?.away) ? data.score.away : Number(fallback.away || 0)
    };
    const names = { home: data?.homeName || teams.home, away: data?.awayName || teams.away };
    const clock = data?.clock || event.minute || (event.whInPlay ? 'Ao vivo' : 'Pre-live');
    const added = addedTimeHtml(data, clock);
    const current = getFocusedComment(data) || getLastComment(data);
    const pinned = (!!state.pinnedKey || Number.isInteger(state.pinnedIndex)) && !!current;
    const type = eventType(current);
    const currentText = commentText(current?.comment || (data ? 'Aguardando lance...' : 'Conectando feed real...'));
    const idBolsa = event?.odds?.idBolsa || event?.idBolsa || '';
    const whUrl = event?.id ? `https://wradar.com.br/radar?eventId=${encodeURIComponent(event.id)}&title=${encodeURIComponent(event.name || '')}&mod=true` : '#';
    const sportUrl = idBolsa ? `https://bolsadeaposta.bet.br/widget/mradar?id=${encodeURIComponent(idBolsa)}` : '';
    content.innerHTML = `
      <div class="custom-radar-window-toolbar">
        <button type="button" class="custom-radar-icon-btn" data-action="theme" title="Alternar tema"><i class='bx ${state.theme === 'light' ? 'bx-moon' : 'bx-sun'}'></i></button>
        <button type="button" class="custom-radar-icon-btn" data-action="overlay" title="Alternar fundo limpo/painel"><i class='bx bx-layer'></i></button>
        <button type="button" class="custom-radar-icon-btn" data-action="density" title="Alternar formato largo/achatado"><i class='bx bx-expand-horizontal'></i></button>
        <button type="button" class="custom-radar-icon-btn" data-action="highlight" title="Destacar area"><i class='bx bx-crop'></i></button>
        <button type="button" class="custom-radar-icon-btn" data-action="close" title="Fechar"><i class='bx bx-x'></i></button>
      </div>
      <header class="custom-radar-header">
        <div class="custom-radar-title"><span class="custom-radar-kicker">MOD proprio ${data ? 'ao vivo' : 'conectando'}</span><h2>${escapeHtml(names.home)} <span>vs</span> ${escapeHtml(names.away)}</h2><p>${escapeHtml(state.error || event.name || '')}</p></div>
        <div class="custom-radar-actions">
          <button type="button" class="custom-radar-icon-btn" data-action="theme" title="Alternar tema"><i class='bx ${state.theme === 'light' ? 'bx-moon' : 'bx-sun'}'></i></button>
          <button type="button" class="custom-radar-icon-btn" data-action="overlay" title="Alternar fundo limpo/painel"><i class='bx bx-layer'></i></button>
          <button type="button" class="custom-radar-icon-btn" data-action="density" title="Alternar formato largo/achatado"><i class='bx bx-expand-horizontal'></i></button>
          <button type="button" class="custom-radar-icon-btn" data-action="highlight" title="Destacar area"><i class='bx bx-crop'></i></button>
          <button type="button" class="custom-radar-icon-btn" data-action="close" title="Fechar"><i class='bx bx-x'></i></button>
        </div>
      </header>
      <div class="custom-radar-scorebar">
        <div class="custom-radar-team home">${renderLogo(event.i, names.home)}<strong>${escapeHtml(names.home)}</strong></div>
        <div class="custom-radar-score"><span>${score.home}</span><small>${escapeHtml(clock || '--')} ${added}</small><span>${score.away}</span></div>
        <div class="custom-radar-team away"><strong>${escapeHtml(names.away)}</strong>${renderLogo(event.j, names.away)}</div>
      </div>
      <div class="custom-radar-layout custom-radar-event-layout">
        <div class="custom-radar-main">
          <div class="custom-radar-live-feed">
            <div class="custom-radar-mini-info"><div class="custom-radar-mini-stack"><div class="custom-radar-mini-score"><span class="home">${escapeHtml(teamAbbr(names.home))}</span><strong>${score.home}x${score.away}</strong><span class="away">${escapeHtml(teamAbbr(names.away))}</span></div><div class="custom-radar-mini-time"><span>${escapeHtml(clock || '--')}</span>${added}</div></div></div>
            <div class="custom-radar-current-event ${escapeHtml(current?.side || '')} ${escapeHtml(type)} ${pinned ? 'is-highlighted' : ''}"><span>${escapeHtml(current?.time || clock || '--')}</span>${eventIcon(current)}<strong>${escapeHtml(currentText)}</strong></div>
            ${listHtml(data)}
          </div>
          <div class="custom-radar-footer-stats"><div class="custom-radar-footer-title"><i class='bx bx-bar-chart-alt-2'></i><strong>Estatisticas ao vivo</strong></div>${statsHtml(data)}${pressureHtml(data, clock)}</div>
        </div>
        <aside class="custom-radar-side custom-radar-tools">
          <div class="custom-radar-controls"><button type="button" class="${state.showOdds ? 'active' : ''}" data-action="odds"><i class='bx bx-money'></i> Odds</button><button type="button" class="${state.showMeta ? 'active' : ''}" data-action="meta"><i class='bx bx-data'></i> IDs</button><button type="button" class="custom-radar-highlight-action" data-action="highlight"><i class='bx bx-crop'></i> Destacar</button></div>
          ${state.showOdds ? `<div class="custom-radar-card"><h3><i class='bx bx-line-chart'></i> William Hill</h3><div class="custom-radar-odds-grid">${odds(event).map(item => `<div class="custom-radar-odd"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join('') || '<p class="custom-radar-muted">Odds indisponiveis para este evento.</p>'}</div></div>` : ''}
          ${state.showMeta ? `<div class="custom-radar-card"><h3><i class='bx bx-fingerprint'></i> Fontes</h3><dl class="custom-radar-meta"><dt>Event ID</dt><dd>${escapeHtml(event.id || '-')}</dd><dt>WH Entity</dt><dd>${escapeHtml(event.rawEntityId || '-')}</dd><dt>ID Bolsa</dt><dd>${escapeHtml(idBolsa || '-')}</dd><dt>Sofascore</dt><dd>${escapeHtml(event.sofascoreId || '-')}</dd><dt>365Scores</dt><dd>${escapeHtml(event.scores365PartnerId || event.matchId || '-')}</dd></dl></div>` : ''}
          <div class="custom-radar-links">${sportUrl ? `<a href="${escapeHtml(sportUrl)}" target="_blank"><i class='bx bx-world'></i> Widget mRadar</a>` : ''}<a href="${escapeHtml(whUrl)}" target="_blank"><i class='bx bx-crosshair'></i> WRadar original</a>${event.packLink ? `<a href="${escapeHtml(event.packLink)}" target="_blank"><i class='bx bx-football'></i> Packball</a>` : ''}</div>
        </aside>
      </div>`;
    restoreScroll(previousScroll);
  }

  function restoreScroll(previousScroll) {
    if (!previousScroll?.keep) return;
    const list = $('.custom-radar-comment-list');
    if (!list) return;
    const delta = Math.max(0, list.scrollHeight - previousScroll.height);
    list.scrollTop = previousScroll.top + delta;
  }

  function scheduleRender() {
    clearTimeout(state.deferredTimer);
    if (Date.now() < state.interactingUntil) {
      state.deferredTimer = setTimeout(scheduleRender, 260);
      return;
    }
    requestAnimationFrame(render);
  }

  function setupOverlayDrag() {
    if (!state.overlayReplica || !window.traderWRadarRealMod?.dragOverlayWindow) return;
    const drag = {
      active: false,
      moved: false,
      pointerId: null,
      startX: 0,
      startY: 0
    };
    const pointFromEvent = event => ({
      x: Number(event.screenX) || 0,
      y: Number(event.screenY) || 0
    });

    document.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      drag.active = true;
      drag.moved = false;
      drag.pointerId = event.pointerId;
      drag.startX = event.screenX;
      drag.startY = event.screenY;
      window.traderWRadarRealMod.dragOverlayWindow({ phase: 'start', ...pointFromEvent(event) });
      event.target.setPointerCapture?.(event.pointerId);
    }, true);

    document.addEventListener('pointermove', event => {
      if (!drag.active || event.pointerId !== drag.pointerId) return;
      if (Math.abs(event.screenX - drag.startX) > 3 || Math.abs(event.screenY - drag.startY) > 3) {
        drag.moved = true;
      }
      window.traderWRadarRealMod.dragOverlayWindow({ phase: 'move', ...pointFromEvent(event) });
      if (drag.moved) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    const endDrag = event => {
      if (!drag.active || event.pointerId !== drag.pointerId) return;
      window.traderWRadarRealMod.dragOverlayWindow({ phase: 'end' });
      drag.active = false;
      drag.pointerId = null;
    };

    document.addEventListener('pointerup', endDrag, true);
    document.addEventListener('pointercancel', endDrag, true);
    document.addEventListener('click', event => {
      if (!drag.moved) return;
      drag.moved = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  async function startFeed() {
    if (!window.traderWRadarRealMod?.startFeed) {
      state.error = 'Feed real disponivel apenas no app desktop Electron.';
      render();
      return;
    }
    const result = await window.traderWRadarRealMod.startFeed({
      eventId: state.event.id,
      title: state.event.name || '',
      locale: 'pt-pt'
    });
    state.feedId = result.feedId;
  }

  function init() {
    const params = new URLSearchParams(location.search);
    const encoded = params.get('payload') || '';
    try {
      const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = new TextDecoder().decode(Uint8Array.from(atob(padded), char => char.charCodeAt(0)));
      state.payload = JSON.parse(json || '{}');
    } catch (_) {
      state.payload = {};
    }
    state.event = state.payload.event || {};
    state.overlayReplica = !!state.payload.overlayReplica;
    if (state.overlayReplica) {
      state.density = 'compact';
      state.cleanOverlay = true;
      document.body.classList.add('custom-radar-overlay-replica');
      setupOverlayDrag();
    }
    document.title = `Radar MOD - ${state.event.name || ''}`;
    render();
    window.traderWRadarRealMod?.onUpdate?.(payload => {
      if (!payload || payload.feedId !== state.feedId) return;
      if (payload.error) {
        state.error = payload.error;
        scheduleRender();
        return;
      }
      const nextSignature = signature(payload.data);
      if (nextSignature === state.lastSignature) return;
      state.lastSignature = nextSignature;
      state.error = '';
      state.realData = payload.data || null;
      scheduleRender();
    });
    startFeed().catch(error => {
      state.error = error?.message || 'Nao foi possivel iniciar o feed real.';
      render();
    });
  }

  window.__customRadarOverlaySnapshot = () => ({
    event: state.event,
    density: state.density,
    cleanOverlay: true
  });

  document.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.getAttribute('data-action');
    if (action === 'theme') {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('custom_wradar_mod_theme', state.theme);
      render();
      return;
    }
    if (action === 'overlay') {
      state.cleanOverlay = !state.cleanOverlay;
      render();
      return;
    }
    if (action === 'density') {
      state.density = state.density === 'compact' ? 'wide' : 'compact';
      localStorage.setItem('custom_wradar_mod_density', state.density);
      render();
      return;
    }
    if (action === 'highlight') {
      window.traderDesktopHighlight?.startSelection?.();
      return;
    }
    if (action === 'close') {
      window.close();
      return;
    }
    if (action === 'clear-pin') {
      state.pinnedKey = '';
      state.pinnedIndex = null;
      render();
      return;
    }
    if (action === 'odds') {
      state.showOdds = !state.showOdds;
      localStorage.setItem('custom_wradar_mod_show_odds', state.showOdds ? '1' : '0');
      render();
      return;
    }
    if (action === 'meta') {
      state.showMeta = !state.showMeta;
      localStorage.setItem('custom_wradar_mod_show_meta', state.showMeta ? '1' : '0');
      render();
      return;
    }
  });

  document.addEventListener('wheel', event => {
    if (event.target.closest('.custom-radar-comment-list')) state.interactingUntil = Date.now() + 700;
  }, { passive: true });
  document.addEventListener('pointerdown', event => {
    if (event.target.closest('.custom-radar-comment-list')) state.interactingUntil = Date.now() + 700;
  });
  window.addEventListener('beforeunload', () => {
    if (state.feedId) window.traderWRadarRealMod?.stopFeed?.(state.feedId);
  });

  init();
})();
