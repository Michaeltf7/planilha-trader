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
    showPressureChart: localStorage.getItem('custom_wradar_mod_show_pressure_chart') === '1',
    sofascoreGraphPoints: [],
    sofascoreGraphFetchedAt: 0,
    sofascoreGraphError: '',
    sofascoreGraphFetchPromise: null,
    sofascoreGraphTimer: null,
    heatmapMode: localStorage.getItem('custom_wradar_mod_heatmap_mode') || (localStorage.getItem('custom_wradar_mod_show_heatmap') === '1' ? 'match' : 'off'),
    heatmapStyle: localStorage.getItem('custom_wradar_mod_heatmap_style') || 'candles',
    heatmapMenuOpen: false,
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
  const getSofascoreEventId = () => Number(state.event?.sofascoreId || state.event?.sofaId || state.event?.sofascoreEventId || 0) || null;
  const fetchJson = async url => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
        headers: { accept: 'application/json,text/plain,*/*' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = JSON.parse(await response.text());
      if (typeof data?.contents === 'string') return JSON.parse(data.contents);
      return data;
    } finally {
      clearTimeout(timer);
    }
  };
  const fetchSofascoreJson = async path => {
    const endpoints = [
      'https://api.sofascore.com/api/v1',
      'https://www.sofascore.com/api/v1',
      'https://api.sofascore.app/api/v1'
    ];
    const urls = endpoints.map(base => `${base}${path}`);
    const attempts = [
      ...urls,
      ...urls.map(url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`),
      ...urls.map(url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`)
    ];
    let lastError = null;
    for (const url of attempts) {
      try {
        const data = await fetchJson(url);
        if (data && typeof data === 'object') return data;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Sofascore sem resposta.');
  };
  const fetchSofascorePressureGraph = async (force = false) => {
    const eventId = getSofascoreEventId();
    if (!eventId || !state.showPressureChart) return;
    if (!force && Date.now() - state.sofascoreGraphFetchedAt < 12000) return;
    if (state.sofascoreGraphFetchPromise) return state.sofascoreGraphFetchPromise;

    state.sofascoreGraphFetchPromise = (async () => {
      let points = [];
      if (window.traderSofascoreData?.momentum) {
        const result = await window.traderSofascoreData.momentum({ sofascoreId: eventId });
        if (result?.ok && Array.isArray(result.momentum)) {
          points = result.momentum;
        } else if (result?.error) {
          throw new Error(result.error);
        }
      } else {
        const data = await fetchSofascoreJson(`/event/${eventId}/graph`);
        points = Array.isArray(data?.graphPoints) ? data.graphPoints : [];
      }
      return points;
    })()
      .then(points => {
        state.sofascoreGraphPoints = points
          .map((point, index) => ({
            minute: Number(point.minute ?? index),
            value: Number(point.value ?? 0)
          }))
          .filter(point => Number.isFinite(point.minute) && Number.isFinite(point.value));
        state.sofascoreGraphFetchedAt = Date.now();
        state.sofascoreGraphError = '';
        scheduleRender();
      })
      .catch(error => {
        state.sofascoreGraphError = error?.message || 'Sofascore indisponivel.';
        state.sofascoreGraphFetchedAt = Date.now();
      })
      .finally(() => {
        state.sofascoreGraphFetchPromise = null;
      });
    return state.sofascoreGraphFetchPromise;
  };
  const scheduleSofascorePressureGraph = (immediate = false) => {
    clearTimeout(state.sofascoreGraphTimer);
    if (!state.showPressureChart || !getSofascoreEventId()) return;
    state.sofascoreGraphTimer = setTimeout(() => {
      fetchSofascorePressureGraph(true).finally(() => scheduleSofascorePressureGraph(false));
    }, immediate ? 0 : 15000);
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
    if (text.includes('remate bloqueado') || text.includes('chute bloqueado') || text.includes('blocked shot') || text.includes('shot blocked')) return 'blocked-shot';
    if (text.includes('remate') || text.includes('chute') || text.includes('shot')) return 'shot';
    if (text.includes('escanteio') || text.includes('corner')) return 'corner';
    if (text.includes('cartao amarelo') || text.includes('yellow card')) return 'yellow-card';
    if ((text.includes('possivel') || text.includes('possible')) && (text.includes('cartao vermelho') || text.includes('red card'))) return 'possible-red-card';
    if (text.includes('cartao vermelho') || text.includes('red card')) return 'red-card';
    if (text.includes('cartao') || text.includes('card')) return 'yellow-card';
    if (text.includes('substituicao') || text.includes('substitution')) return 'substitution';
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
    if (type === 'substitution') {
      return `<span class="custom-radar-event-icon substitution ${escapeHtml(side)}" aria-label="Substituicao"><i class='bx bx-left-arrow-alt'></i><i class='bx bx-right-arrow-alt'></i></span>`;
    }
    const map = {
      goal: 'bx-football', dangerous: directionalArrow,
      attack: directionalArrow,
      defense: directionalArrow, 'shot-on-target': 'bx-football', 'blocked-shot': 'bx-block', shot: 'bx-radio-circle',
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
  const heatEventScore = item => {
    const text = normalizeMatchText(`${item?.comment || ''} ${item?.all || ''} ${item?.className || ''}`);
    const type = eventType(item);
    if (type === 'dangerous') return { type, label: 'Ataques perigosos', score: 5, offensive: true };
    if (type === 'shot-on-target') return { type, label: 'Remates certeiros', score: 10, offensive: true };
    if (type === 'blocked-shot') return { type, label: 'Remates bloqueados', score: 3, offensive: true };
    if (type === 'shot') return { type, label: 'Remates', score: 6, offensive: true };
    if (type === 'corner') return { type, label: 'Escanteios', score: 4, offensive: true };
    if (type === 'attack') return { type, label: 'Ataques', score: 1 };
    if (type === 'goal-kick') return { type, label: 'Tiros de meta', score: -1 };
    if (type === 'foul' || text.includes('falta') || text.includes('free kick')) return { type: 'foul', label: 'Faltas', score: -0.5 };
    return null;
  };
  const heatTimeMultiplier = seconds => {
    const minute = Math.max(0, Math.floor((Number(seconds) || 0) / 60));
    if (minute >= 80) return 1.3;
    if (minute >= 70) return 1.15;
    return 1;
  };
  const heatLevel = value => {
    const score = Math.max(0, Number(value) || 0);
    if (score >= 46) return { key: 'very-hot', label: 'Muito perigoso', icon: 'bx-burst' };
    if (score >= 26) return { key: 'hot', label: 'Quente', icon: 'bxs-flame' };
    if (score >= 11) return { key: 'watch', label: 'Atencao', icon: 'bx-error-circle' };
    return { key: 'cold', label: 'Frio', icon: 'bx-check-circle' };
  };
  const heatWindowLabel = index => {
    const start = index * 5;
    return `${String(start).padStart(2, '0')}-${String(start + 5).padStart(2, '0')}`;
  };
  const heatBucketForSeconds = seconds => {
    const minute = Math.max(0, Number(seconds) / 60);
    if (minute > 45 && minute < 46) {
      return { key: '45plus', label: '45+', startSeconds: 45 * 60, endSeconds: 46 * 60, order: 8.5 };
    }
    if (minute > 90 && minute < 91) {
      return { key: '90plus', label: '90+', startSeconds: 90 * 60, endSeconds: 91 * 60, order: 17.5 };
    }
    const adjustedMinute = minute >= 46 && minute <= 90 ? minute - 1 : minute > 91 ? 89 : minute;
    const index = Math.max(0, Math.floor(adjustedMinute / 5));
    return {
      key: `w${index}`,
      label: heatWindowLabel(index),
      startSeconds: index * 300,
      endSeconds: (index + 1) * 300,
      order: index
    };
  };
  const summarizeHeatRange = (windows, latestSeconds, minutes) => {
    if (!windows.length || !Number.isFinite(latestSeconds)) return { score: 0, level: heatLevel(0) };
    const startSeconds = Math.max(0, latestSeconds - (minutes * 60));
    const relevant = windows.filter(item => item.endSeconds > startSeconds && item.startSeconds <= latestSeconds);
    const total = relevant.reduce((sum, item) => sum + item.score, 0);
    const normalized = total / Math.max(1, minutes / 5);
    return { score: normalized, level: heatLevel(normalized) };
  };
  const heatTrend = windows => {
    const recent = windows.filter(item => item.events > 0).slice(-4);
    if (recent.length < 2) return { key: 'stable', label: 'Estavel' };
    const last = recent[recent.length - 1].score;
    const prev = recent.slice(0, -1).reduce((sum, item) => sum + item.score, 0) / (recent.length - 1);
    if (last >= prev + 8) return { key: 'up', label: 'Subindo' };
    if (last <= prev - 8) return { key: 'down', label: 'Caindo' };
    return { key: 'stable', label: 'Estavel' };
  };
  const heatmapPanelHtml = (items, clock, title, extraClass = '') => {
    if (!items.length) {
      return `<div class="custom-radar-heatmap ${extraClass} is-empty"><div class="custom-radar-heatmap-head"><strong><i class='bx bxs-flame'></i> ${escapeHtml(title)}</strong><span>Aguardando eventos</span></div></div>`;
    }

    const parsedItems = items
      .map(item => {
        const seconds = parseGameSeconds(commentTime(item));
        const heat = heatEventScore(item);
        const multiplier = heatTimeMultiplier(seconds);
        return { item, seconds, heat, multiplier };
      })
      .filter(entry => entry.seconds !== null && entry.heat);
    if (!parsedItems.length) {
      return `<div class="custom-radar-heatmap ${extraClass} is-empty"><div class="custom-radar-heatmap-head"><strong><i class='bx bxs-flame'></i> ${escapeHtml(title)}</strong><span>Sem eventos de pressao ainda</span></div></div>`;
    }

    const period = clockPeriodInfo(clock);
    let latest = parseGameSeconds(clock);
    if (latest === null) latest = Math.max(...parsedItems.map(entry => entry.seconds), 0);
    if (period.period === 'second' && latest < 45 * 60) latest += 45 * 60;
    const latestMinute = Math.max(0, latest / 60);
    const maxOrder = latestMinute > 45 && latestMinute < 46
      ? 8
      : Math.max(0, Math.ceil(heatBucketForSeconds(latest).order));
    const windows = Array.from({ length: maxOrder + 1 }, (_, index) => ({
      key: `w${index}`,
      index,
      label: heatWindowLabel(index),
      startSeconds: index * 300,
      endSeconds: (index + 1) * 300,
      order: index,
      score: 0,
      events: 0,
      details: {}
    }));
    if (latest >= 45 * 60) {
      windows.push({
        key: '45plus',
        index: 9.5,
        label: '45+',
        startSeconds: 45 * 60,
        endSeconds: 46 * 60,
        order: 8.5,
        score: 0,
        events: 0,
        details: {}
      });
    }
    if (latest >= 90 * 60) {
      windows.push({
        key: '90plus',
        index: 18.5,
        label: '90+',
        startSeconds: 90 * 60,
        endSeconds: 91 * 60,
        order: 17.5,
        score: 0,
        events: 0,
        details: {}
      });
    }
    windows.sort((a, b) => a.order - b.order);
    const windowMap = new Map(windows.map(item => [item.key, item]));

    parsedItems.forEach(({ seconds, heat, multiplier }) => {
      const bucket = heatBucketForSeconds(seconds);
      const windowItem = windowMap.get(bucket.key);
      if (!windowItem) return;
      windowItem.score += heat.score * multiplier;
      windowItem.events += 1;
      windowItem.details[heat.label] = (windowItem.details[heat.label] || 0) + 1;
      if (multiplier > 1) windowItem.details[`Peso ${multiplier.toFixed(2)}x`] = (windowItem.details[`Peso ${multiplier.toFixed(2)}x`] || 0) + 1;
    });

    parsedItems
      .filter(entry => entry.heat.offensive)
      .sort((a, b) => a.seconds - b.seconds)
      .forEach((entry, index, offensiveEvents) => {
        const pressureCount = offensiveEvents
          .slice(0, index + 1)
          .filter(previous => entry.seconds - previous.seconds <= 120).length;
        if (pressureCount < 3) return;

        const bucket = heatBucketForSeconds(entry.seconds);
        const windowItem = windowMap.get(bucket.key);
        if (!windowItem) return;
        if (windowItem.sequenceBonus) return;

        const multiplier = heatTimeMultiplier(entry.seconds);
        windowItem.sequenceBonus = true;
        windowItem.score += 5 * multiplier;
        windowItem.details['Bonus pressao continua'] = 1;
    });

    windows.forEach(item => {
      item.score = Math.max(0, Math.round(item.score * 10) / 10);
      item.level = heatLevel(item.score);
    });

    const visible = windows.slice(-20);
    const style = state.heatmapStyle === 'dots' ? 'dots' : 'candles';
    const range5 = summarizeHeatRange(windows, latest, 5);
    const range10 = summarizeHeatRange(windows, latest, 10);
    const range15 = summarizeHeatRange(windows, latest, 15);
    const trend = heatTrend(windows);
    const summary = (label, range) => `<span class="custom-radar-heat-summary ${range.level.key}"><small>${label}</small><strong><i class='bx ${range.level.icon}'></i>${range.level.label}</strong></span>`;
    const block = item => {
      const title = [
        `${item.label} min`,
        `Intensidade: ${item.score}`,
        item.level.label,
        ...Object.entries(item.details).map(([name, count]) => `${name}: ${count}`)
      ].join(' | ');
      const candleHeight = Math.max(8, Math.min(38, Math.round(8 + (Math.min(60, item.score) / 60) * 30)));
      if (style === 'candles') {
        return `<span class="custom-radar-heat-candle-wrap" title="${escapeHtml(title)}"><b>${escapeHtml(item.label)}</b><i class="custom-radar-heat-candle ${item.level.key}" style="--heat-height:${candleHeight}px"></i></span>`;
      }
      return `<span class="custom-radar-heat-point-wrap" title="${escapeHtml(title)}"><b>${escapeHtml(item.label)}</b><i class="custom-radar-heat-point ${item.level.key}"></i></span>`;
    };

    return `
      <div class="custom-radar-heatmap ${extraClass} is-${style}">
        <div class="custom-radar-heatmap-head">
          <strong><i class='bx bxs-flame'></i> ${escapeHtml(title)}</strong>
          <span class="custom-radar-heat-trend ${trend.key}">Tendencia: ${escapeHtml(trend.label)}</span>
        </div>
        <div class="custom-radar-heat-summary-row">
          ${summary('5m', range5)}
          ${summary('10m', range10)}
          ${summary('15m', range15)}
        </div>
        <div class="custom-radar-heat-track">${visible.map(block).join('')}</div>
      </div>
    `;
  };
  const heatmapHtml = (data, clock, mode, names) => {
    const items = Array.isArray(data?.commentaries) ? data.commentaries : [];
    if (mode === 'home') {
      return heatmapPanelHtml(items.filter(item => item?.side === 'home'), clock, `Calor ${names.home || 'Casa'}`, 'is-team');
    }
    if (mode === 'away') {
      return heatmapPanelHtml(items.filter(item => item?.side === 'away'), clock, `Calor ${names.away || 'Visitante'}`, 'is-team');
    }
    if (mode === 'teams') {
      return `
        <div class="custom-radar-heatmap-split">
          ${heatmapPanelHtml(items.filter(item => item?.side === 'home'), clock, names.home || 'Casa', 'is-team')}
          ${heatmapPanelHtml(items.filter(item => item?.side === 'away'), clock, names.away || 'Visitante', 'is-team')}
        </div>
      `;
    }
    return heatmapPanelHtml(items, clock, 'Temperatura do jogo');
  };
  const sofascorePressureChartHtml = (points, names) => {
    const validPoints = (points || [])
      .map((point, index) => ({
        minute: Number(point.minute ?? index),
        value: Number(point.value ?? 0)
      }))
      .filter(point => Number.isFinite(point.minute) && Number.isFinite(point.value))
      .sort((a, b) => a.minute - b.minute);
    if (!validPoints.length) return '';

    const latestMinute = Math.max(...validPoints.map(point => point.minute), 0);
    const timelineMinutes = Math.max(90, Math.ceil(latestMinute / 5) * 5);
    const chartWidth = Math.max(720, timelineMinutes * 10);
    const chartHeight = 92;
    const midY = 46;
    const maxBarHeight = 40;
    const barWidth = Math.max(5, Math.min(9, Math.floor(chartWidth / Math.max(90, timelineMinutes)) - 1));
    const absValues = validPoints.map(point => Math.abs(point.value)).filter(value => value > 0).sort((a, b) => a - b);
    const percentileIndex = absValues.length ? Math.min(absValues.length - 1, Math.floor(absValues.length * 0.88)) : 0;
    const visualMax = Math.max(12, absValues[percentileIndex] || 0);
    const dividerX = Math.round((45 / timelineMinutes) * chartWidth);
    const leftStartX = 4;
    const leftEndX = Math.max(leftStartX, dividerX - barWidth - 3);
    const rightStartX = Math.min(chartWidth - barWidth - 4, dividerX + 3);
    const rightEndX = chartWidth - barWidth - 4;
    const xInRange = (value, min, max, start, end) => {
      if (max <= min) return start;
      const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
      return Math.round(start + (ratio * (end - start)));
    };
    const xForMinute = minute => {
      const safeMinute = Math.max(0, Math.min(timelineMinutes, minute));
      if (safeMinute < 46) {
        const firstHalfMinute = safeMinute > 45
          ? Math.min(45, 44.72 + ((safeMinute - 45) * 0.52))
          : safeMinute;
        return xInRange(firstHalfMinute, 1, 45, leftStartX, leftEndX);
      }
      return xInRange(safeMinute, 46, timelineMinutes, rightStartX, rightEndX);
    };
    const bars = validPoints.map(point => {
      const x = xForMinute(point.minute);
      const value = Math.max(-100, Math.min(100, point.value));
      const ratio = Math.min(1, Math.abs(value) / visualMax);
      const height = Math.max(2, Math.round(Math.pow(ratio, 0.82) * maxBarHeight));
      const isHome = value >= 0;
      const y = isHome ? midY - height : midY;
      const fill = isHome ? '#22c55e' : '#6366f1';
      const side = isHome ? names.home : names.away;
      const title = `${Math.round(point.minute)}' | ${side}: ${Math.abs(Math.round(value))}`;
      return `
        <g>
          <title>${escapeHtml(title)}</title>
          <rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="1.5" fill="${fill}" opacity="0.96"></rect>
        </g>
      `;
    }).join('');

    return `
      <div class="custom-radar-pressure-chart is-sofascore" title="Grafico de pressao Sofascore">
        <div class="custom-radar-pressure-chart-head">
          <strong><i class='bx bx-bar-chart-alt-2'></i> Pressao <small>Sofascore</small></strong>
          <span><b>${escapeHtml(teamAbbr(names.home))}</b><em></em><b>${escapeHtml(teamAbbr(names.away))}</b></span>
        </div>
        <div class="custom-radar-pressure-chart-body">
          <svg viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="none" role="img" aria-label="Grafico de pressao Sofascore">
            <line x1="0" y1="${midY}" x2="${chartWidth}" y2="${midY}" stroke="rgba(248,250,252,.34)" stroke-width="1"></line>
            <line x1="${dividerX}" y1="0" x2="${dividerX}" y2="${chartHeight}" stroke="rgba(248,250,252,.20)" stroke-width="1"></line>
            ${bars}
          </svg>
        </div>
      </div>
    `;
  };
  const pressureChartHtml = (data, clock, names) => {
    const sofaChart = sofascorePressureChartHtml(state.sofascoreGraphPoints, names);
    if (sofaChart) return sofaChart;

    const items = Array.isArray(data?.commentaries) ? data.commentaries : [];
    if (!items.length) return '';

    const parsedItems = items
      .map(item => {
        const seconds = parseGameSeconds(commentTime(item));
        const heat = heatEventScore(item);
        const side = item?.side === 'away' ? 'away' : item?.side === 'home' ? 'home' : '';
        return { item, seconds, heat, side };
      })
      .filter(entry => entry.seconds !== null && entry.heat && entry.side);
    if (!parsedItems.length) return '';

    const period = clockPeriodInfo(clock);
    let latest = parseGameSeconds(clock);
    if (latest === null) latest = Math.max(...parsedItems.map(entry => entry.seconds), 0);
    if (period.period === 'second' && latest < 45 * 60) latest += 45 * 60;

    const maxMinute = Math.max(0, Math.floor(latest / 60));
    const startMinute = Math.max(0, maxMinute - 45);
    const minutes = Array.from({ length: maxMinute - startMinute + 1 }, (_, offset) => ({
      minute: startMinute + offset,
      home: 0,
      away: 0,
      homeEvents: {},
      awayEvents: {},
      markers: []
    }));
    const minuteMap = new Map(minutes.map(item => [item.minute, item]));

    parsedItems.forEach(({ item, seconds, heat, side }) => {
      const minute = Math.max(0, Math.floor(seconds / 60));
      if (minute < startMinute || minute > maxMinute) return;
      const bucket = minuteMap.get(minute);
      const score = Math.max(0, heat.score) * heatTimeMultiplier(seconds);
      bucket[side] += score;
      const detailsKey = side === 'away' ? 'awayEvents' : 'homeEvents';
      bucket[detailsKey][heat.label] = (bucket[detailsKey][heat.label] || 0) + 1;
      const type = eventType(item);
      if (['goal', 'red-card', 'possible-red-card', 'corner', 'shot-on-target'].includes(type)) {
        bucket.markers.push({ side, type });
      }
    });

    const maxValue = Math.max(10, ...minutes.flatMap(item => [item.home, item.away]));
    const chartWidth = Math.max(520, minutes.length * 13);
    const chartHeight = 78;
    const midY = 39;
    const gap = 2;
    const barWidth = Math.max(5, Math.min(10, Math.floor((chartWidth / Math.max(1, minutes.length)) - gap)));
    const xFor = index => Math.round(index * (barWidth + gap) + 8);
    const markerIcon = marker => {
      if (marker.type === 'goal') return '●';
      if (marker.type === 'red-card' || marker.type === 'possible-red-card') return '◆';
      if (marker.type === 'corner') return '⚑';
      return '•';
    };
    const titleFor = item => {
      const homeDetails = Object.entries(item.homeEvents).map(([name, count]) => `${names.home}: ${name} ${count}`).join(', ');
      const awayDetails = Object.entries(item.awayEvents).map(([name, count]) => `${names.away}: ${name} ${count}`).join(', ');
      return [`${item.minute}'`, homeDetails, awayDetails].filter(Boolean).join(' | ');
    };
    const bars = minutes.map((item, index) => {
      const x = xFor(index);
      const homeHeight = Math.max(1, Math.round((item.home / maxValue) * 31));
      const awayHeight = Math.max(1, Math.round((item.away / maxValue) * 31));
      const homeOpacity = item.home > 0 ? 0.96 : 0.18;
      const awayOpacity = item.away > 0 ? 0.96 : 0.18;
      const markers = item.markers.slice(0, 3).map((marker, markerIndex) => {
        const y = marker.side === 'home' ? 10 + (markerIndex * 9) : 62 - (markerIndex * 9);
        const color = marker.side === 'home' ? '#22c55e' : '#6366f1';
        return `<text x="${x + (barWidth / 2)}" y="${y}" text-anchor="middle" fill="${color}" font-size="8" font-weight="900">${markerIcon(marker)}</text>`;
      }).join('');
      return `
        <g>
          <title>${escapeHtml(titleFor(item))}</title>
          <rect x="${x}" y="${midY - homeHeight}" width="${barWidth}" height="${homeHeight}" rx="1.5" fill="#22c55e" opacity="${homeOpacity}"></rect>
          <rect x="${x}" y="${midY}" width="${barWidth}" height="${awayHeight}" rx="1.5" fill="#6366f1" opacity="${awayOpacity}"></rect>
          ${markers}
        </g>
      `;
    }).join('');

    return `
      <div class="custom-radar-pressure-chart" title="Grafico de pressao por minuto">
        <div class="custom-radar-pressure-chart-head">
          <strong><i class='bx bx-bar-chart-alt-2'></i> Pressao</strong>
          <span><b>${escapeHtml(teamAbbr(names.home))}</b><em></em><b>${escapeHtml(teamAbbr(names.away))}</b></span>
        </div>
        <div class="custom-radar-pressure-chart-body">
          <svg viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="none" role="img" aria-label="Grafico de pressao">
            <line x1="0" y1="${midY}" x2="${chartWidth}" y2="${midY}" stroke="rgba(248,250,252,.34)" stroke-width="1"></line>
            ${bars}
          </svg>
        </div>
      </div>
    `;
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
    const heatmapMode = ['off', 'match', 'home', 'away', 'teams'].includes(state.heatmapMode) ? state.heatmapMode : 'off';
    const heatmapStyle = state.heatmapStyle === 'dots' ? 'dots' : 'candles';
    const heatmapActive = heatmapMode !== 'off';
    const heatmapLabels = { off: 'Desligado', match: 'Partida', home: 'Casa', away: 'Visitante', teams: 'Times separados' };
    const pressureChartActive = !!state.showPressureChart;
    const heatmapMenu = `
      <div class="custom-radar-heat-menu ${state.heatmapMenuOpen ? 'is-open' : ''}">
        ${[
          ['match', 'Partida', 'bx-football'],
          ['home', names.home || 'Casa', 'bx-home-alt'],
          ['away', names.away || 'Visitante', 'bx-plane'],
          ['teams', 'Times separados', 'bx-columns'],
          ['off', 'Desligado', 'bx-hide']
        ].map(([mode, label, icon]) => `<button type="button" class="${heatmapMode === mode ? 'active' : ''}" data-action="heatmap-mode" data-mode="${mode}"><i class='bx ${icon}'></i><span>${escapeHtml(label)}</span></button>`).join('')}
        <div class="custom-radar-heat-menu-label">Visual</div>
        ${[
          ['candles', 'Velas', 'bx-bar-chart-alt-2'],
          ['dots', 'Bolinhas', 'bx-dots-horizontal-rounded']
        ].map(([style, label, icon]) => `<button type="button" class="${heatmapStyle === style ? 'active' : ''}" data-action="heatmap-style" data-style="${style}"><i class='bx ${icon}'></i><span>${escapeHtml(label)}</span></button>`).join('')}
      </div>
    `;
    const heatmapTopButton = `
      <span class="custom-radar-heat-menu-wrap">
        <button type="button" class="custom-radar-icon-btn ${heatmapActive ? 'active' : ''}" data-action="heatmap-menu" title="Mapa de calor: ${escapeHtml(heatmapLabels[heatmapMode] || 'Desligado')}"><i class='bx bxs-flame'></i></button>
        ${heatmapMenu}
      </span>
    `;
    content.innerHTML = `
      <div class="custom-radar-window-toolbar">
        <button type="button" class="custom-radar-icon-btn" data-action="theme" title="Alternar tema"><i class='bx ${state.theme === 'light' ? 'bx-moon' : 'bx-sun'}'></i></button>
        <button type="button" class="custom-radar-icon-btn" data-action="overlay" title="Alternar fundo limpo/painel"><i class='bx bx-layer'></i></button>
        <button type="button" class="custom-radar-icon-btn" data-action="density" title="Alternar formato largo/achatado"><i class='bx bx-expand-horizontal'></i></button>
        <button type="button" class="custom-radar-icon-btn ${pressureChartActive ? 'active pressure-active' : ''}" data-action="pressure-chart" title="${pressureChartActive ? 'Ocultar grafico de pressao' : 'Mostrar grafico de pressao'}"><i class='bx bx-bar-chart-alt-2'></i></button>
        ${heatmapTopButton}
        <button type="button" class="custom-radar-icon-btn" data-action="highlight" title="Destacar area"><i class='bx bx-crop'></i></button>
        <button type="button" class="custom-radar-icon-btn" data-action="close" title="Fechar"><i class='bx bx-x'></i></button>
      </div>
      <header class="custom-radar-header">
        <div class="custom-radar-title"><span class="custom-radar-kicker">MOD proprio ${data ? 'ao vivo' : 'conectando'}</span><h2>${escapeHtml(names.home)} <span>vs</span> ${escapeHtml(names.away)}</h2><p>${escapeHtml(state.error || event.name || '')}</p></div>
        <div class="custom-radar-actions">
          <button type="button" class="custom-radar-icon-btn" data-action="theme" title="Alternar tema"><i class='bx ${state.theme === 'light' ? 'bx-moon' : 'bx-sun'}'></i></button>
          <button type="button" class="custom-radar-icon-btn" data-action="overlay" title="Alternar fundo limpo/painel"><i class='bx bx-layer'></i></button>
          <button type="button" class="custom-radar-icon-btn" data-action="density" title="Alternar formato largo/achatado"><i class='bx bx-expand-horizontal'></i></button>
          <button type="button" class="custom-radar-icon-btn ${pressureChartActive ? 'active pressure-active' : ''}" data-action="pressure-chart" title="${pressureChartActive ? 'Ocultar grafico de pressao' : 'Mostrar grafico de pressao'}"><i class='bx bx-bar-chart-alt-2'></i></button>
          ${heatmapTopButton}
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
          <div class="custom-radar-footer-stats"><div class="custom-radar-footer-title"><i class='bx bx-bar-chart-alt-2'></i><strong>Estatisticas ao vivo</strong></div>${statsHtml(data)}${pressureHtml(data, clock)}${pressureChartActive ? pressureChartHtml(data, clock, names) : ''}${heatmapActive ? heatmapHtml(data, clock, heatmapMode, names) : ''}</div>
        </div>
        <aside class="custom-radar-side custom-radar-tools">
          <div class="custom-radar-controls"><button type="button" class="${state.showOdds ? 'active' : ''}" data-action="odds"><i class='bx bx-money'></i> Odds</button><button type="button" class="${state.showMeta ? 'active' : ''}" data-action="meta"><i class='bx bx-data'></i> IDs</button><button type="button" class="${pressureChartActive ? 'active' : ''}" data-action="pressure-chart"><i class='bx bx-bar-chart-alt-2'></i> Pressao</button><button type="button" class="${heatmapActive ? 'active' : ''}" data-action="heatmap-menu"><i class='bx bxs-flame'></i> ${escapeHtml(heatmapLabels[heatmapMode] || 'Calor')}</button><button type="button" class="custom-radar-highlight-action" data-action="highlight"><i class='bx bx-crop'></i> Destacar</button></div>
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
    if (state.payload.settings?.heatmapMode) {
      state.heatmapMode = state.payload.settings.heatmapMode;
    } else if (state.payload.settings && typeof state.payload.settings.showHeatmap === 'boolean') {
      state.heatmapMode = state.payload.settings.showHeatmap ? 'match' : 'off';
    }
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
      if (state.showPressureChart && getSofascoreEventId()) fetchSofascorePressureGraph(false).catch(() => {});
      scheduleRender();
    });
    scheduleSofascorePressureGraph(true);
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
    const target = event.target;
    const action = target.closest('[data-action]')?.getAttribute('data-action');
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
    if (action === 'pressure-chart') {
      state.showPressureChart = !state.showPressureChart;
      localStorage.setItem('custom_wradar_mod_show_pressure_chart', state.showPressureChart ? '1' : '0');
      if (state.showPressureChart) {
        scheduleSofascorePressureGraph(true);
      } else {
        clearTimeout(state.sofascoreGraphTimer);
      }
      render();
      return;
    }
    if (action === 'heatmap-menu') {
      state.heatmapMenuOpen = !state.heatmapMenuOpen;
      render();
      return;
    }
    if (action === 'heatmap-mode') {
      const mode = target.closest('[data-mode]')?.dataset?.mode || 'off';
      state.heatmapMode = ['off', 'match', 'home', 'away', 'teams'].includes(mode) ? mode : 'off';
      state.heatmapMenuOpen = false;
      localStorage.setItem('custom_wradar_mod_heatmap_mode', state.heatmapMode);
      localStorage.setItem('custom_wradar_mod_show_heatmap', state.heatmapMode === 'off' ? '0' : '1');
      render();
      return;
    }
    if (action === 'heatmap-style') {
      const style = target.closest('[data-style]')?.dataset?.style || 'candles';
      state.heatmapStyle = style === 'dots' ? 'dots' : 'candles';
      localStorage.setItem('custom_wradar_mod_heatmap_style', state.heatmapStyle);
      state.heatmapMenuOpen = false;
      render();
      return;
    }
  });

  document.addEventListener('wheel', event => {
    const list = event.target.closest('.custom-radar-comment-list');
    if (!list) return;
    event.preventDefault();
    const row = list.querySelector('.custom-radar-comment');
    const step = Math.max(24, Math.round(row?.getBoundingClientRect?.().height || 34));
    list.scrollTop += Math.sign(event.deltaY || 1) * step;
    state.interactingUntil = Date.now() + 700;
  }, { passive: false });
  document.addEventListener('pointerdown', event => {
    if (event.target.closest('.custom-radar-comment-list')) state.interactingUntil = Date.now() + 700;
  });
  window.addEventListener('beforeunload', () => {
    if (state.feedId) window.traderWRadarRealMod?.stopFeed?.(state.feedId);
    clearTimeout(state.sofascoreGraphTimer);
  });

  init();
})();
