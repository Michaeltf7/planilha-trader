(() => {
  const readStoredJson = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch (_) {
      return fallback;
    }
  };
  const layoutVersion = localStorage.getItem('public_odds_layout_version');
  const savedLayout = localStorage.getItem('public_odds_layout');
  const state = {
    payload: {}, feedId: '', data: null, bet365Data: null, error: '', bet365Error: '', alwaysOnTop: false, overlay: false,
    showBetfair: false,
    showBet365: localStorage.getItem('public_odds_show_bet365') !== '0',
    showMatchOdds: localStorage.getItem('public_odds_show_match') !== '0',
    showGoals: localStorage.getItem('public_odds_show_goals') !== '0',
    layoutMode: layoutVersion === '2' ? (savedLayout || 'compact') : 'compact',
    layoutNeedsMigration: layoutVersion !== '2',
    compactExpanded: false,
    compactMarketIndex: 0,
    trends: {},
    trendHistory: {},
    trendObservedAt: {},
    widgetOdds: {},
    goalSidesByMode: readStoredJson('public_odds_goal_sides_by_mode', {}),
    rateCycles: {},
    goalSelectionCustomized: localStorage.getItem('public_odds_goal_lines_customized') === '1',
    outcomes: readStoredJson('public_odds_outcomes', { home: true, draw: true, away: true }),
    goalLineVisibility: readStoredJson('public_odds_goal_lines', {})
  };
  const root = document.getElementById('odds-root');
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));

  function decodePayload() {
    try {
      const encoded = new URLSearchParams(location.search).get('payload') || '';
      const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), '=');
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), char => char.charCodeAt(0))) || '{}');
    } catch (_) {
      return {};
    }
  }

  function renderLegacy() {
    document.body.classList.toggle('layout-compact', state.layoutMode === 'compact');
    const data = state.data || {};
    const bet365Data = state.bet365Data || {};
    const prices = data.prices || {};
    const bet365Prices = bet365Data.prices || {};
    const visibleOutcomes = [
      ['home', 'CASA'],
      ['draw', 'EMPATE'],
      ['away', 'FORA']
    ].filter(([key]) => state.outcomes[key] !== false);
    const betfairReady = !!(prices.home || prices.draw || prices.away);
    const bet365Ready = !!(bet365Prices.home || bet365Prices.draw || bet365Prices.away);
    const ready = betfairReady || bet365Ready;
    const labels = {
      loading: 'Abrindo navegador de odds...',
      'waiting-extension': 'Aguardando coletor de odds...',
      searching: 'Procurando partida...',
      'opening-match': 'Abrindo mercados...',
      'loading-market': 'Lendo mercados...',
      found: 'Odds atualizadas'
    };
    const activeProviders = [
      ...(state.showBet365 ? [{ key: 'bet365', label: 'BET365' }] : []),
      ...(state.showBetfair ? [{ key: 'betfair', label: 'BETFAIR' }] : [])
    ];
    const differenceHtml = (bet365Odd, betfairOdd) => {
      const base = Number(bet365Odd);
      const comparison = Number(betfairOdd);
      if (!Number.isFinite(base) || !Number.isFinite(comparison) || base <= 0) return '<span class="odd-difference">-</span>';
      const difference = ((comparison / base) - 1) * 100;
      return `<span class="odd-difference">${difference >= 0 ? '+' : ''}${difference.toFixed(1)}%</span>`;
    };
    const comparisonCell = (value, provider) => `<span class="comparison-price ${provider}">${escapeHtml(value || '-')}</span>`;
    const comparisonRow = (label, bet365Odd, betfairOdd) => `<div class="comparison-row providers-${activeProviders.length}"><span class="comparison-label">${escapeHtml(label)}</span>${state.showBet365 ? comparisonCell(bet365Odd, 'bet365') : ''}${state.showBetfair ? comparisonCell(betfairOdd, 'betfair') : ''}${state.showBet365 && state.showBetfair ? differenceHtml(bet365Odd, betfairOdd) : ''}</div>`;
    const betfairLines = new Map((data.goalLines || []).map(line => [String(line.line), line]));
    const bet365Lines = new Map((bet365Data.goalLines || []).map(line => [String(line.line), line]));
    const isGoalLineVisible = line => state.goalSelectionCustomized
      ? state.goalLineVisibility[line] === true
      : state.goalLineVisibility[line] !== false;
    const goalLineKeys = Array.from(new Set([...betfairLines.keys(), ...bet365Lines.keys()]))
      .filter(isGoalLineVisible)
      .sort((left, right) => Number(left) - Number(right));
    const outcomeCards = visibleOutcomes.map(([key, label]) => `<div class="market-card"><b>${label}</b><div class="market-card-prices">${state.showBet365 ? comparisonCell(bet365Prices[key], 'bet365') : ''}${state.showBetfair ? comparisonCell(prices[key]?.back, 'betfair') : ''}</div>${state.showBet365 && state.showBetfair ? differenceHtml(bet365Prices[key], prices[key]?.back) : ''}</div>`).join('');
    const goalCards = goalLineKeys.map(line => {
      const bet365Line = bet365Lines.get(line) || {};
      const betfairLine = betfairLines.get(line) || {};
      return `<div class="goal-compare-card"><b>${escapeHtml(line)} GOLS</b>${comparisonRow('MAIS', bet365Line.over, betfairLine.over?.back)}${comparisonRow('MENOS', bet365Line.under, betfairLine.under?.back)}</div>`;
    }).join('');
    const compactGoalLineKeys = state.goalSelectionCustomized ? goalLineKeys : goalLineKeys.slice(0, 1);
    const compactTiles = [
      ...(state.showMatchOdds ? visibleOutcomes.map(([key, label]) => ({ label, bet365: bet365Prices[key], betfair: prices[key]?.back })) : []),
      ...(state.showGoals ? compactGoalLineKeys.flatMap(line => {
        const bet365Line = bet365Lines.get(line) || {};
        const betfairLine = betfairLines.get(line) || {};
        return [
          { label: `+${line}`, bet365: bet365Line.over, betfair: betfairLine.over?.back },
          { label: `-${line}`, bet365: bet365Line.under, betfair: betfairLine.under?.back }
        ];
      }) : [])
    ].map(item => `<div class="compact-tile"><b>${escapeHtml(item.label)}</b>${state.showBet365 ? `<span class="compact-odd bet365">${escapeHtml(item.bet365 || '-')}</span>` : ''}${state.showBetfair ? `<span class="compact-odd betfair">${escapeHtml(item.betfair || '-')}</span>` : ''}</div>`).join('');
    const layoutContent = state.layoutMode === 'compact'
      ? `<div class="compact-board providers-${activeProviders.length}">${compactTiles || '<span class="compact-empty">Nenhum mercado selecionado</span>'}</div>`
      : `<div class="comparison-board">${state.showMatchOdds && outcomeCards ? `<section class="horizontal-market"><div class="section-title">RESULTADO DA PARTIDA</div><div class="outcome-card-grid">${outcomeCards}</div></section>` : ''}${state.showGoals && goalCards ? `<section class="horizontal-market"><div class="section-title">MAIS/MENOS GOLS</div><div class="goal-card-grid">${goalCards}</div></section>` : ''}</div>`;
    const sourceStatus = `<div class="compare-sources">${state.showBet365 ? `<span class="source-pill bet365"><b>BET365</b>${escapeHtml(state.bet365Error || labels[bet365Data.status] || 'Conectando...')}</span>` : ''}${state.showBetfair ? `<span class="source-pill betfair"><b>BETFAIR</b>${escapeHtml(state.error || labels[data.status] || 'Conectando...')}</span>` : ''}</div>`;
    root.innerHTML = `
      <header class="odds-head">
        <div class="odds-title"><span>Radar de Odds</span><h1>${escapeHtml(state.payload.home || '-')} x ${escapeHtml(state.payload.away || '-')}</h1></div>
        <div class="odds-actions">
          <button type="button" data-action="top" class="${state.alwaysOnTop ? 'active' : ''}" title="Sempre por cima"><i class='bx bx-pin'></i></button>
          <button type="button" data-action="highlight" title="Destacar area"><i class='bx bx-crop'></i></button>
          <button type="button" data-action="close" title="Fechar"><i class='bx bx-x'></i></button>
        </div>
      </header>
      ${sourceStatus}
      ${activeProviders.length ? layoutContent : '<div class="odds-status">Selecione ao menos uma fonte.</div>'}
      <footer class="odds-foot"><span>${ready ? `Atualizado ${new Date(Math.max(data.capturedAt || 0, bet365Data.capturedAt || 0) || Date.now()).toLocaleTimeString('pt-BR')}` : 'As fontes permanecem em segundo plano.'}</span><button type="button" data-action="diagnostics"><i class='bx bx-show'></i> Diagnostico</button></footer>`;
  }

  const statusLabels = {
    loading: 'Conectando',
    'waiting-extension': 'Aguardando coletor',
    searching: 'Procurando partida',
    'opening-match': 'Abrindo mercados',
    'loading-market': 'Lendo mercados',
    found: 'Atualizadas'
  };

  function differenceValue(bet365Odd, betfairOdd) {
    const base = Number(bet365Odd);
    const comparison = Number(betfairOdd);
    if (!Number.isFinite(base) || !Number.isFinite(comparison) || base <= 0) return '';
    const difference = ((comparison / base) - 1) * 100;
    return `${difference >= 0 ? '+' : ''}${difference.toFixed(1)}%`;
  }

  const validGoalLineNumber = value => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0.5 && numeric <= 20
      && Math.abs((numeric * 2) - Math.round(numeric * 2)) < 0.001
      && Math.round(numeric * 2) % 2 === 1;
  };
  const validOddNumber = value => Number.isFinite(Number(value)) && Number(value) > 1 && Number(value) <= 1000;
  const sanitizeProviderGoalLines = (lines, provider) => (Array.isArray(lines) ? lines : []).filter(line => {
    if (!validGoalLineNumber(line?.line)) return false;
    if (provider === 'betfair') return validOddNumber(line?.over?.back) || validOddNumber(line?.under?.back);
    return validOddNumber(line?.over) || validOddNumber(line?.under);
  });

  function buildOddsViewModel() {
    const betfair = state.data || {};
    const bet365 = state.bet365Data || {};
    const betfairPrices = betfair.prices || {};
    const bet365Prices = bet365.prices || {};
    const betfairLines = new Map(sanitizeProviderGoalLines(betfair.ftGoalLines || betfair.goalLines, 'betfair').map(line => [String(line.line), line]));
    const bet365Lines = new Map(sanitizeProviderGoalLines(bet365.ftGoalLines || bet365.goalLines, 'bet365').map(line => [String(line.line), line]));
    const outcomes = [
      ['home', 'CASA'],
      ['draw', 'EMPATE'],
      ['away', 'FORA']
    ].filter(([key]) => state.showMatchOdds && state.outcomes[key] !== false)
      .map(([key, label]) => ({ id: key, group: 'Resultado da partida', label, bet365: bet365Prices[key], betfair: betfairPrices[key]?.back }));
    const isLineVisible = line => state.goalSelectionCustomized
      ? state.goalLineVisibility[line] === true
      : state.goalLineVisibility[line] !== false;
    const lineKeys = Array.from(new Set([...betfairLines.keys(), ...bet365Lines.keys()]))
      .filter(line => state.showGoals && isLineVisible(line))
      .sort((left, right) => Number(left) - Number(right));
    const goals = lineKeys.flatMap(line => {
      const exchange = betfairLines.get(line) || {};
      const sportsBook = bet365Lines.get(line) || {};
      return [
        { id: `over:${line}`, group: 'Mais/Menos gols', label: `MAIS ${line}`, bet365: sportsBook.over, betfair: exchange.over?.back },
        { id: `under:${line}`, group: 'Mais/Menos gols', label: `MENOS ${line}`, bet365: sportsBook.under, betfair: exchange.under?.back }
      ];
    });
    return {
      items: [...outcomes, ...goals],
      betfair,
      bet365,
      betfairPrices,
      bet365Prices,
      betfairLines,
      bet365Lines,
      bet365Status: state.bet365Error || statusLabels[bet365.status] || 'Conectando',
      betfairStatus: state.error || statusLabels[betfair.status] || 'Conectando',
      updatedAt: Math.max(betfair.capturedAt || 0, bet365.capturedAt || 0)
    };
  }

  function trendIcon(provider, itemId) {
    const trend = state.trends[`${provider}:${itemId}`];
    const history = state.trendHistory[`${provider}:${itemId}`] || [];
    const tooltip = trendHistoryTooltip(history);
    if (trend === 'up') return `<i class="bx bx-up-arrow-alt trend-up" title="${escapeHtml(tooltip)}"></i>`;
    if (trend === 'down') return `<i class="bx bx-down-arrow-alt trend-down" title="${escapeHtml(tooltip)}"></i>`;
    return `<i class="bx bx-minus trend-flat" title="${escapeHtml(tooltip)}"></i>`;
  }

  function trendHistoryTooltip(history) {
    if (!history.length) return 'Nenhuma variacao registrada.';
    const values = history.flatMap(item => [item.from, item.to]).filter(Number.isFinite);
    const first = history[0].from;
    const last = history[history.length - 1].to;
    const total = Number.isFinite(first) && first > 0 ? ((last / first) - 1) * 100 : null;
    const entries = history.slice(-8).map(item => {
      const gameClock = item.clock && item.clock !== '--:--' ? ` (jogo ${item.clock})` : '';
      return `Apos ${formatVariationDelay(item.elapsedMs)}${gameClock}: ${item.from} -> ${item.to}`;
    });
    return [
      ...entries,
      `Menor: ${Math.min(...values)}`,
      `Maior: ${Math.max(...values)}`,
      `Variacao total: ${total === null ? '-' : `${total >= 0 ? '+' : ''}${total.toFixed(2)}%`}`
    ].join('\n');
  }

  function observeWidgetOdd(mode, side, line, value) {
    const itemId = `${mode}:${side}:${line || '-'}`;
    const historyKey = `bet365:${itemId}`;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return itemId;
    const now = Date.now();
    const previous = state.widgetOdds[historyKey];
    if (!previous) {
      state.widgetOdds[historyKey] = { value: numeric, observedAt: now };
      state.trendObservedAt[historyKey] = now;
      return itemId;
    }
    if (previous.value === numeric) return itemId;
    const elapsedMs = Math.max(0, now - previous.observedAt);
    state.widgetOdds[historyKey] = { value: numeric, observedAt: now };
    state.trendObservedAt[historyKey] = now;
    state.trends[historyKey] = numeric > previous.value ? 'up' : 'down';
    const history = state.trendHistory[historyKey] || [];
    history.push({
      clock: String(state.bet365Data?.liveClock || '--:--').trim() || '--:--',
      from: previous.value,
      to: numeric,
      elapsedMs,
      changedAt: now
    });
    state.trendHistory[historyKey] = history.slice(-30);
    return itemId;
  }

  function formatVariationDelay(milliseconds) {
    const seconds = Math.max(0, Math.round(Number(milliseconds || 0) / 1000));
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return remainder ? `${minutes}min ${remainder}s` : `${minutes}min`;
  }

  const RATE_WINDOW_MS = 5 * 60 * 1000;
  const rateCycleKey = (provider, itemId) => `${provider}:${itemId}`;
  function rateMetric(provider, item, now = Date.now()) {
    const odd = Number(item?.[provider]);
    if (!Number.isFinite(odd) || odd <= 1) return null;
    const key = rateCycleKey(provider, item.id);
    let cycle = state.rateCycles[key];
    if (!cycle || now >= cycle.endsAt) {
      cycle = { provider, itemId: item.id, label: item.label, startOdd: odd, currentOdd: odd, startedAt: now, endsAt: now + RATE_WINDOW_MS };
      state.rateCycles[key] = cycle;
    } else {
      cycle.currentOdd = odd;
      cycle.label = item.label;
    }
    const elapsedMs = Math.max(0, now - cycle.startedAt);
    const elapsedMinutes = elapsedMs / 60000;
    const totalPercent = ((cycle.currentOdd / cycle.startOdd) - 1) * 100;
    const perMinute = elapsedMs >= 10000 && elapsedMinutes > 0 ? totalPercent / elapsedMinutes : null;
    return { key, cycle, elapsedMs, totalPercent, perMinute, remainingMs: Math.max(0, cycle.endsAt - now) };
  }

  const formatCountdown = milliseconds => {
    const seconds = Math.max(0, Math.ceil(Number(milliseconds || 0) / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };

  function rateTooltip(metric, marketMeta) {
    if (!metric) return 'Aguardando historico suficiente.';
    const provider = metric.cycle.provider === 'bet365' ? 'Bet365' : 'Betfair';
    const rate = metric.perMinute === null ? 'calculando' : `${metric.perMinute >= 0 ? '+' : ''}${metric.perMinute.toFixed(2)}% por minuto`;
    return [
      `${provider} - ${metric.cycle.label}`,
      `Mercado: ${marketMeta?.scope || ''} ${marketMeta?.title || ''}`.trim(),
      `Odd inicial: ${metric.cycle.startOdd.toFixed(2)}`,
      `Odd atual: ${metric.cycle.currentOdd.toFixed(2)}`,
      `Variacao total: ${metric.totalPercent >= 0 ? '+' : ''}${metric.totalPercent.toFixed(2)}%`,
      `Media: ${rate}`,
      `Tempo analisado: ${formatCountdown(metric.elapsedMs)}`,
      `Novo ciclo em: ${formatCountdown(metric.remainingMs)}`
    ].join('\n');
  }

  function rateSummary(primary, marketMeta) {
    const bet365 = rateMetric('bet365', primary);
    const display = metric => metric?.perMinute === null || metric?.perMinute === undefined
      ? '--'
      : `${metric.perMinute >= 0 ? '+' : ''}${metric.perMinute.toFixed(1)}%`;
    const countdownMetric = bet365;
    return {
      html: `<span class="compact-rate-values"><b class="bet365" ${bet365 ? `data-rate-value-key="${escapeHtml(bet365.key)}"` : ''} title="${escapeHtml(rateTooltip(bet365, marketMeta))}"><i class='bx bx-line-chart'></i><span>365 ${display(bet365)}/min</span></b></span>`,
      countdown: ''
    };
  }

  function refreshRateIndicators() {
    const now = Date.now();
    document.querySelectorAll('[data-rate-value-key]').forEach(element => {
      const cycle = state.rateCycles[element.dataset.rateValueKey];
      if (!cycle) return;
      const elapsedMs = Math.max(0, now - cycle.startedAt);
      const elapsedMinutes = elapsedMs / 60000;
      const totalPercent = ((cycle.currentOdd / cycle.startOdd) - 1) * 100;
      const perMinute = elapsedMs >= 10000 && elapsedMinutes > 0 ? totalPercent / elapsedMinutes : null;
      const prefix = cycle.provider === 'bet365' ? '365' : 'BF';
      const value = perMinute === null ? '--' : `${perMinute >= 0 ? '+' : ''}${perMinute.toFixed(1)}%`;
      const label = element.querySelector('span');
      if (label) label.textContent = `${prefix} ${value}/min`;
    });
    document.querySelectorAll('[data-rate-key]').forEach(element => {
      const cycle = state.rateCycles[element.dataset.rateKey];
      if (!cycle) return;
      if (now >= cycle.endsAt) {
        cycle.startOdd = cycle.currentOdd;
        cycle.startedAt = now;
        cycle.endsAt = now + RATE_WINDOW_MS;
      }
      const icon = element.querySelector('i')?.outerHTML || '';
      element.innerHTML = `<small>CICLO</small>${icon}${formatCountdown(cycle.endsAt - now)}`;
    });
  }

  const providerOdd = (line, side, provider) => provider === 'betfair'
    ? line?.[side]?.back
    : line?.[side];

  function providerCell(provider, value, itemId) {
    return `<span class="widget-provider ${provider}"><small>${provider === 'bet365' ? 'BET365' : 'BETFAIR'}</small><b>${escapeHtml(value || '-')}</b>${trendIcon(provider, itemId)}</span>`;
  }

  function widgetState(model, hasMarket, mode = '') {
    const bet365State = String(model.bet365?.marketStates?.[mode] || model.bet365?.marketState || '').toLowerCase();
    if (bet365State === 'var') return null;
    if (bet365State === 'closed') return { className: 'is-closed', text: 'Mercado fechado' };
    const bet365Waiting = model.bet365?.status && model.bet365.status !== 'found';
    if (!hasMarket && bet365Waiting) return { className: 'is-waiting', text: 'Aguardando mercado' };
    return null;
  }

  const compactTeamName = value => {
    const clean = String(value || '').replace(/\b(fc|cf|sc|ac|ec|afc|club|de|do|da|the)\b/gi, ' ').replace(/[^a-z0-9 ]/gi, ' ').replace(/\s+/g, ' ').trim();
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length > 1) return parts.slice(0, 3).map(part => part[0]).join('').toUpperCase();
    return clean.slice(0, 3).toUpperCase() || '---';
  };

  const currentLiveMatch = () => {
    const providerScore = state.bet365Data?.liveScore;
    const fallbackScore = state.payload.score || {};
    const score = providerScore && Number.isFinite(Number(providerScore.home)) && Number.isFinite(Number(providerScore.away))
      ? { home: Number(providerScore.home), away: Number(providerScore.away) }
      : { home: Number(fallbackScore.home) || 0, away: Number(fallbackScore.away) || 0 };
    const rawClock = String(state.bet365Data?.liveClock || state.payload.clock || '').trim();
    const clockMatch = rawClock.match(/^(\d{1,3}):(\d{2})$/);
    const running = ['first', 'second'].includes(String(state.bet365Data?.livePeriod || state.payload.period || ''));
    const capturedAt = Number(state.bet365Data?._clockAnchorAt || state.bet365Data?.capturedAt) || Date.now();
    const baseSeconds = clockMatch ? (Number(clockMatch[1]) * 60) + Number(clockMatch[2]) : null;
    return {
      score,
      clock: rawClock,
      period: String(state.bet365Data?.livePeriod || state.payload.period || ''),
      running,
      capturedAt,
      baseSeconds
    };
  };

  const formatLiveClock = seconds => `${Math.floor(seconds / 60)}:${String(Math.max(0, seconds % 60)).padStart(2, '0')}`;

  function refreshLiveClocks() {
    const now = Date.now();
    document.querySelectorAll('[data-live-clock]').forEach(element => {
      const baseSeconds = Number(element.dataset.baseSeconds);
      const capturedAt = Number(element.dataset.capturedAt);
      if (!Number.isFinite(baseSeconds)) return;
      const elapsed = element.dataset.running === '1' && Number.isFinite(capturedAt)
        ? Math.max(0, Math.floor((now - capturedAt) / 1000))
        : 0;
      element.textContent = formatLiveClock(baseSeconds + elapsed);
    });
  }

  const compactLiveStatus = () => {
    const live = currentLiveMatch();
    const periodLabel = { first: '1T', interval: 'INT', second: '2T' }[live.period] || '';
    const clockData = Number.isFinite(live.baseSeconds)
      ? `data-live-clock data-base-seconds="${live.baseSeconds}" data-captured-at="${live.capturedAt}" data-running="${live.running ? '1' : '0'}"`
      : '';
    return `<span class="compact-live-status" title="Placar e tempo da Bet365"><b>${live.score.home} x ${live.score.away}</b><em ${clockData}>${escapeHtml(live.clock || '--:--')}</em>${periodLabel ? `<i>${periodLabel}</i>` : ''}</span>`;
  };

  function MatchOddsStrip(model) {
    const rows = [
      ['home', compactTeamName(state.payload.home)],
      ['draw', 'X'],
      ['away', compactTeamName(state.payload.away)]
    ];
    const hasMarket = rows.some(([key]) => model.bet365Prices[key]);
    const marketState = widgetState(model, hasMarket, 'mo');
    return `<section class="match-odds-strip bet365-only ${marketState?.className || ''}">
      <header><strong>Match Odds</strong><button type="button" data-action="settings" title="Configuracoes"><i class='bx bx-cog'></i></button></header>
      <div class="match-strip-rows">${rows.map(([key, label]) => {
        const bet365 = model.bet365Prices[key];
        return `<div class="match-strip-row"><strong title="${escapeHtml(key === 'draw' ? 'Empate' : label)}">${escapeHtml(label)}</strong><span class="match-strip-divider"></span><b class="bet365">${escapeHtml(bet365 || '-')}</b>${trendIcon('bet365', key)}</div>`;
      }).join('')}</div>
      ${marketState ? marketStateOverlay(marketState) : ''}
    </section>`;
  }

  function marketStateOverlay(marketState) {
    const isVar = marketState?.className === 'is-var';
    return `<div class="compact-market-state"><span class="market-state-symbol">${isVar ? 'VAR' : "<i class='bx bx-lock-alt'></i>"}</span><strong>${escapeHtml(marketState?.text || '')}</strong></div>`;
  }

  function MatchOddsWidget(model) {
    const rows = [
      ['home', state.payload.home || 'Casa'],
      ['draw', 'X'],
      ['away', state.payload.away || 'Visitante']
    ];
    const hasMarket = rows.some(([key]) => model.bet365Prices[key] || model.betfairPrices[key]?.back);
    const marketState = widgetState(model, hasMarket);
    return `<section class="market-widget match-widget ${marketState?.className || ''}">
      <header><b>MO</b><span>Match Odds</span><em>${escapeHtml(state.payload.clock || '')}</em></header>
      <div class="widget-columns"><span>Selecao</span><span>Bet365</span><span>Betfair</span></div>
      <div class="match-widget-rows">${rows.map(([key, label]) => `<div class="match-widget-row"><strong title="${escapeHtml(label)}">${escapeHtml(label)}</strong>${providerCell('bet365', model.bet365Prices[key], key)}${providerCell('betfair', model.betfairPrices[key]?.back, key)}</div>`).join('')}</div>
      ${marketState ? `<div class="widget-market-state"><i class='bx ${marketState.className === 'is-var' ? 'bx-video-recording' : 'bx-lock-alt'}'></i>${marketState.text}</div>` : ''}
    </section>`;
  }

  function selectGoalWidgetLine(model, mode) {
    const useHalf = mode === 'lht';
    const bet365Source = useHalf ? sanitizeProviderGoalLines(model.bet365.htGoalLines, 'bet365') : Array.from(model.bet365Lines.values());
    const bet365Map = new Map(bet365Source.map(line => [String(line.line), line]));
    const keys = Array.from(bet365Map.keys()).filter(key => Number.isFinite(Number(key))).sort((a, b) => Number(a) - Number(b));
    const providerGoals = Number(model.bet365.currentGoals);
    const live = currentLiveMatch();
    const currentGoals = Number.isFinite(providerGoals)
      ? providerGoals
      : Math.max(0, Number(live.score.home) || 0) + Math.max(0, Number(live.score.away) || 0);
    const liveGoalLineKeys = keys.filter(candidate => Number(candidate) > currentGoals);
    const limitKey = liveGoalLineKeys[0];
    const aheadKey = liveGoalLineKeys[1];
    const primary = String(useHalf ? model.bet365.primaryHtGoalLine : model.bet365.primaryFtGoalLine || '');
    const confirmedPrimary = keys.includes(primary) ? primary : keys.find(candidate => bet365Map.get(candidate)?.primary);
    const fallbackKey = mode === 'laft'
      ? keys.find(candidate => confirmedPrimary && Number(candidate) > Number(confirmedPrimary))
      : confirmedPrimary;
    const key = mode === 'laft'
      ? (aheadKey || fallbackKey)
      : (limitKey || fallbackKey);
    return { key, bet365: bet365Map.get(key) || {}, betfair: {}, scope: useHalf ? 'HT' : 'FT' };
  }

  function goalSidesForMode(mode) {
    const saved = state.goalSidesByMode[mode] || {};
    const sides = { over: saved.over !== false, under: saved.under !== false };
    if (!sides.over && !sides.under) sides.under = true;
    return sides;
  }

  function Bet365GoalStrip(model, mode) {
    const selected = selectGoalWidgetLine(model, mode);
    const sides = goalSidesForMode(mode);
    const over = providerOdd(selected.bet365, 'over', 'bet365');
    const under = providerOdd(selected.bet365, 'under', 'bet365');
    const intervalClosed = state.payload.period === 'interval' && mode === 'lht';
    const marketState = intervalClosed
      ? { className: 'is-closed', text: 'Mercado HT encerrado' }
      : widgetState(model, !!(over || under), mode);
    const overHistoryId = observeWidgetOdd(mode, 'over', selected.key, over);
    const underHistoryId = observeWidgetOdd(mode, 'under', selected.key, under);
    return `<section class="bet365-goal-strip ${marketState?.className || ''}">
      <header><strong>${escapeHtml(selected.scope)} ${escapeHtml(selected.key || '-')}</strong><button type="button" class="compact-tool" data-action="settings" title="Configuracoes"><i class='bx bx-cog'></i></button></header>
      <div class="bet365-goal-pair count-${Number(sides.over) + Number(sides.under)}">
        ${sides.over ? `<div class="bet365-goal-price over"><strong class="goal-side-letter">O</strong><span class="goal-price-divider"></span><span class="goal-price-value"><b title="${escapeHtml(trendHistoryTooltip(state.trendHistory[`bet365:${overHistoryId}`] || []))}">${escapeHtml(over || '-')}</b></span></div>` : ''}
        ${sides.under ? `<div class="bet365-goal-price under"><strong class="goal-side-letter">U</strong><span class="goal-price-divider"></span><span class="goal-price-value"><b title="${escapeHtml(trendHistoryTooltip(state.trendHistory[`bet365:${underHistoryId}`] || []))}">${escapeHtml(under || '-')}</b></span></div>` : ''}
      </div>
      ${marketState ? marketStateOverlay(marketState) : ''}
    </section>`;
  }

  function GoalLineWidget(model, mode) {
    const selected = selectGoalWidgetLine(model, mode);
    const labels = { lht: 'Limite HT', lft: 'Limite FT', laft: 'Limite a frente FT' };
    const overId = `over:${selected.key}`;
    const underId = `under:${selected.key}`;
    const hasMarket = !!selected.key && (providerOdd(selected.bet365, 'over', 'bet365') || providerOdd(selected.betfair, 'over', 'betfair') || providerOdd(selected.bet365, 'under', 'bet365') || providerOdd(selected.betfair, 'under', 'betfair'));
    const intervalClosed = state.payload.period === 'interval' && mode === 'lht';
    const marketState = intervalClosed ? { className: 'is-closed', text: 'Mercado HT encerrado' } : widgetState(model, hasMarket, mode);
    return `<section class="market-widget goal-widget ${marketState?.className || ''}">
      <header><b>${mode.toUpperCase()}</b><span>${labels[mode]}</span><em>${selected.scope} ${escapeHtml(selected.key || '-')}</em></header>
      <div class="goal-widget-grid">
        <strong>Mais ${escapeHtml(selected.key || '-')}</strong>${providerCell('bet365', providerOdd(selected.bet365, 'over', 'bet365'), overId)}${providerCell('betfair', providerOdd(selected.betfair, 'over', 'betfair'), overId)}
        <strong>Menos ${escapeHtml(selected.key || '-')}</strong>${providerCell('bet365', providerOdd(selected.bet365, 'under', 'bet365'), underId)}${providerCell('betfair', providerOdd(selected.betfair, 'under', 'betfair'), underId)}
      </div>
      ${marketState ? `<div class="widget-market-state"><i class='bx ${marketState.className === 'is-var' ? 'bx-video-recording' : 'bx-lock-alt'}'></i>${marketState.text}</div>` : ''}
    </section>`;
  }

  function CompactOddsCard(model) {
    const items = model.items.length ? model.items : [{ id: 'empty', label: 'AGUARDANDO', bet365: null, betfair: null }];
    state.compactMarketIndex = Math.min(state.compactMarketIndex, items.length - 1);
    const primary = items[state.compactMarketIndex];
    const secondary = items.filter((_, index) => index !== state.compactMarketIndex).slice(0, 2);
    const bet365Connected = Object.values(state.bet365Data?.prices || {}).some(Boolean);
    const betfairConnected = Object.values(state.data?.prices || {}).some(Boolean);
    const marketState = model.marketState || null;
    const rates = rateSummary(primary, model.marketMeta);
    return `<section class="compact-odds-card ${marketState?.className || ''}">
      <header class="compact-card-head">
        ${model.marketMeta
          ? `<span class="compact-market-name compact-market-identity"><b>${escapeHtml(model.marketMeta.code)}</b><em>${escapeHtml(model.marketMeta.scope)}</em><strong>${escapeHtml(model.marketMeta.title)}</strong>${compactLiveStatus()}</span>`
          : `<span class="compact-market-name">${escapeHtml(primary.label)}</span>`}
        <span class="compact-counter">${state.compactMarketIndex + 1}/${items.length}</span>
        <span class="connection-lights"><i class="${bet365Connected ? 'online' : ''}" title="Bet365: ${escapeHtml(model.bet365Status)}"></i><i class="betfair ${betfairConnected ? 'online' : ''}" title="Betfair: ${escapeHtml(model.betfairStatus)}"></i></span>
        <button type="button" class="compact-tool" data-action="settings" title="Configuracoes"><i class='bx bx-cog'></i></button>
        <button type="button" class="compact-tool" data-action="expand-compact" title="Ver mais"><i class='bx bx-grid-alt'></i></button>
      </header>
      <div class="compact-main-odds">
        ${state.showBet365 ? `<div class="book-odd bet365"><span class="book-logo bet365"><em>bet</em><strong>365</strong></span><b>${escapeHtml(primary.bet365 || '-')}</b>${trendIcon('bet365', primary.id)}</div>` : ''}
        ${state.showBetfair ? `<div class="book-odd betfair"><span class="book-logo betfair"><img src="../img/betfair-rounded.png" alt="Betfair"></span><b>${escapeHtml(primary.betfair || '-')}</b>${trendIcon('betfair', primary.id)}</div>` : ''}
      </div>
      <div class="compact-card-meta">
        ${rates.html}
        ${rates.countdown}
      </div>
      <div class="compact-secondary">
        ${secondary.map(item => `<button type="button" class="premium-secondary-market" data-market-index="${items.indexOf(item)}" title="Clique para tornar este mercado principal">
          <span>${escapeHtml(item.label)}</span>
          <em class="secondary-provider bet365" title="Bet365: ${escapeHtml(item.bet365 || 'Indisponivel')}"><small>365</small><b>${escapeHtml(item.bet365 || 'INDISP.')}</b>${trendIcon('bet365', item.id)}</em>
          <em class="secondary-provider betfair" title="Betfair: ${escapeHtml(item.betfair || 'Indisponivel')}"><small>BF</small><b>${escapeHtml(item.betfair || 'INDISP.')}</b>${trendIcon('betfair', item.id)}</em>
        </button>`).join('')}
        ${items.length > 3 ? `<span class="compact-more">+${items.length - 3}</span>` : ''}
      </div>
      ${marketState ? `<div class="compact-market-state"><i class='bx ${marketState.className === 'is-var' ? 'bx-video-recording' : 'bx-lock-alt'}'></i><strong>${escapeHtml(marketState.text)}</strong></div>` : ''}
    </section>`;
  }

  function dedicatedCompactModel(model, mode) {
    if (mode === 'mo') {
      const items = [
        { id: 'home', label: state.payload.home || 'CASA', bet365: model.bet365Prices.home, betfair: model.betfairPrices.home?.back },
        { id: 'draw', label: 'X', bet365: model.bet365Prices.draw, betfair: model.betfairPrices.draw?.back },
        { id: 'away', label: state.payload.away || 'FORA', bet365: model.bet365Prices.away, betfair: model.betfairPrices.away?.back }
      ];
      return { ...model, items, marketState: widgetState(model, items.some(item => item.bet365 || item.betfair)) };
    }
    const selected = selectGoalWidgetLine(model, mode);
    const items = [
      { id: `under:${selected.key}`, label: `MENOS ${selected.key || '-'}`, bet365: providerOdd(selected.bet365, 'under', 'bet365'), betfair: providerOdd(selected.betfair, 'under', 'betfair') },
      { id: `over:${selected.key}`, label: `MAIS ${selected.key || '-'}`, bet365: providerOdd(selected.bet365, 'over', 'bet365'), betfair: providerOdd(selected.betfair, 'over', 'betfair') }
    ];
    const intervalClosed = state.payload.period === 'interval' && mode === 'lht';
    const hasMarket = items.some(item => item.bet365 || item.betfair);
    const marketState = intervalClosed
      ? { className: 'is-closed', text: 'Mercado HT encerrado' }
      : (hasMarket ? widgetState(model, true) : { className: 'is-waiting', text: `Aguardando mercado ${selected.scope}` });
    items.forEach(item => { item.label = `${selected.scope} ${item.label}`; });
    return {
      ...model,
      items,
      marketState,
      marketMeta: { code: mode.toUpperCase(), scope: selected.scope, title: `${mode === 'laft' ? 'Limite a frente' : 'Limite'} ${selected.key || '-'}` }
    };
  }

  function OddsMarketCard(item) {
    return `<article class="normal-market-card">
      <header><b>${escapeHtml(item.label)}</b><span>${escapeHtml(differenceValue(item.bet365, item.betfair) || '-')}</span></header>
      <div class="normal-price-row">
        ${state.showBet365 ? `<span class="normal-price bet365"><small>BET365</small><b>${escapeHtml(item.bet365 || '-')}</b></span>` : ''}
        ${state.showBetfair ? `<span class="normal-price betfair"><small>BETFAIR</small><b>${escapeHtml(item.betfair || '-')}</b></span>` : ''}
      </div>
    </article>`;
  }

  function NormalOddsPanel(model) {
    const groups = new Map();
    model.items.forEach(item => {
      if (!groups.has(item.group)) groups.set(item.group, []);
      groups.get(item.group).push(item);
    });
    return `<section class="normal-odds-panel">
      <div class="normal-source-bar">
        ${state.showBet365 ? `<span class="normal-source bet365"><b>BET365</b>${escapeHtml(model.bet365Status)}</span>` : ''}
        ${state.showBetfair ? `<span class="normal-source betfair"><b>BETFAIR</b>${escapeHtml(model.betfairStatus)}</span>` : ''}
        ${state.compactExpanded ? `<button type="button" data-action="collapse-compact" title="Voltar ao compacto"><i class='bx bx-collapse-alt'></i></button>` : ''}
      </div>
      <div class="normal-scroll-area">
        ${Array.from(groups.entries()).map(([group, items]) => `<div class="normal-market-group"><h2>${escapeHtml(group)}</h2><div class="normal-market-grid">${items.map(OddsMarketCard).join('')}</div></div>`).join('') || '<div class="normal-empty">Aguardando mercados...</div>'}
      </div>
    </section>`;
  }

  function render() {
    const model = buildOddsViewModel();
    const compact = state.overlay && state.layoutMode === 'compact' && !state.compactExpanded;
    const viewMode = String(state.payload.viewMode || '');
    const dedicatedWidget = state.overlay && ['mo', 'lht', 'lft', 'laft'].includes(viewMode);
    document.body.classList.toggle('layout-compact', compact);
    document.body.classList.toggle('layout-normal', !compact);
    document.body.classList.toggle('layout-market-widget', dedicatedWidget);
    const content = dedicatedWidget
      ? (viewMode === 'mo' ? MatchOddsStrip(model) : Bet365GoalStrip(model, viewMode))
      : (compact ? CompactOddsCard(model) : NormalOddsPanel(model));
    root.innerHTML = `${state.overlay ? '' : `<header class="odds-head"><div class="odds-title"><span>Radar de Odds</span><h1>${escapeHtml(state.payload.home || '-')} x ${escapeHtml(state.payload.away || '-')}</h1></div><div class="odds-actions"><button type="button" data-action="top" class="${state.alwaysOnTop ? 'active' : ''}" title="Sempre por cima"><i class='bx bx-pin'></i></button><button type="button" data-action="highlight" title="Destacar"><i class='bx bx-crop'></i></button><button type="button" data-action="close" title="Fechar"><i class='bx bx-x'></i></button></div></header>`}${content}${state.overlay ? '' : `<footer class="odds-foot"><span>${model.updatedAt ? `Atualizado ${new Date(model.updatedAt).toLocaleTimeString('pt-BR')}` : 'Conectando fontes...'}</span><button type="button" data-action="diagnostics"><i class='bx bx-show'></i> Diagnostico</button></footer>`}`;
  }

  function oddsSnapshot(data, provider) {
    const snapshot = {};
    const prices = data?.prices || {};
    ['home', 'draw', 'away'].forEach(key => {
      snapshot[key] = provider === 'betfair' ? prices[key]?.back : prices[key];
    });
    (data?.goalLines || []).forEach(line => {
      const key = String(line.line);
      snapshot[`over:${key}`] = provider === 'betfair' ? line.over?.back : line.over;
      snapshot[`under:${key}`] = provider === 'betfair' ? line.under?.back : line.under;
    });
    return snapshot;
  }

  function recordOddsTrends(provider, previous, next) {
    const before = oddsSnapshot(previous, provider);
    const after = oddsSnapshot(next, provider);
    Object.entries(after).forEach(([key, value]) => {
      const oldValue = Number(before[key]);
      const newValue = Number(value);
      const historyKey = `${provider}:${key}`;
      const changedAt = Date.now();
      if (!state.trendObservedAt[historyKey]) state.trendObservedAt[historyKey] = changedAt;
      if (!Number.isFinite(oldValue) || !Number.isFinite(newValue) || oldValue === newValue) return;
      const elapsedMs = Math.max(0, changedAt - state.trendObservedAt[historyKey]);
      state.trendObservedAt[historyKey] = changedAt;
      state.trends[historyKey] = newValue > oldValue ? 'up' : 'down';
      const clock = provider === 'bet365' ? String(next?.liveClock || '--:--').trim() : '--:--';
      const history = state.trendHistory[historyKey] || [];
      history.push({ clock: clock || '--:--', from: oldValue, to: newValue, elapsedMs, changedAt });
      state.trendHistory[historyKey] = history.slice(-30);
    });
  }

  async function init() {
    state.payload = decodePayload();
    state.overlay = !!state.payload.overlay;
    const dedicatedOverlay = state.overlay && ['mo', 'lht', 'lft', 'laft'].includes(state.payload.viewMode);
    document.body.classList.toggle('is-overlay', state.overlay);
    if (state.overlay && ['lht', 'lft', 'laft'].includes(state.payload.viewMode)) {
      const sides = goalSidesForMode(state.payload.viewMode);
      window.traderPublicOdds?.resizeGoalSides?.(Number(sides.over) + Number(sides.under));
    }
    if (state.layoutNeedsMigration) {
      localStorage.setItem('public_odds_layout', 'compact');
      localStorage.setItem('public_odds_layout_version', '2');
      state.layoutNeedsMigration = false;
      if (state.overlay && !dedicatedOverlay) window.traderPublicOdds?.resizeLayout?.('compact');
    }
    if (state.overlay && !dedicatedOverlay) window.traderPublicOdds?.setLayoutMinimum?.(state.layoutMode);
    setInterval(() => {
      refreshRateIndicators();
      refreshLiveClocks();
    }, 1000);
    render();
    window.traderPublicOdds?.onUpdate?.(payload => {
      if (!payload || payload.feedId !== state.feedId) return;
      const provider = payload.data?.provider === 'bet365' ? 'bet365' : 'betfair';
      if (provider === 'bet365') state.bet365Error = payload.error || '';
      else state.error = payload.error || '';
      if (!payload.error) {
        const next = payload.data || {};
        const previous = provider === 'bet365' ? (state.bet365Data || {}) : (state.data || {});
        const hasPrices = next.prices && Object.values(next.prices).some(Boolean);
        const navigating = ['searching', 'opening-match', 'waiting-extension'].includes(next.status);
        const merged = {
          ...previous,
          ...next,
          matchVerified: navigating ? false : (next.matchVerified ?? previous.matchVerified),
          prices: navigating ? {} : (hasPrices ? next.prices : (previous.prices || {})),
          goals: navigating ? null : (next.goals || previous.goals || null),
          goalLines: navigating ? [] : (Array.isArray(next.goalLines) && next.goalLines.length ? next.goalLines : (previous.goalLines || [])),
          ftGoalLines: navigating ? [] : (Array.isArray(next.ftGoalLines) && next.ftGoalLines.length ? next.ftGoalLines : (previous.ftGoalLines || [])),
          htGoalLines: navigating ? [] : (Array.isArray(next.htGoalLines) && next.htGoalLines.length ? next.htGoalLines : (previous.htGoalLines || [])),
          primaryFtGoalLine: navigating ? null : (next.primaryFtGoalLine || previous.primaryFtGoalLine || null),
          primaryHtGoalLine: navigating ? null : (next.primaryHtGoalLine || previous.primaryHtGoalLine || null)
        };
        recordOddsTrends(provider, previous, merged);
        if (provider === 'bet365') {
          merged._clockAnchorAt = merged.liveClock && merged.liveClock === previous.liveClock
            ? (previous._clockAnchorAt || previous.capturedAt || merged.capturedAt || Date.now())
            : (merged.capturedAt || Date.now());
          state.bet365Data = merged;
          if (merged.liveScore) state.payload.score = { ...merged.liveScore };
          if (merged.liveClock) state.payload.clock = merged.liveClock;
          if (merged.livePeriod) state.payload.period = merged.livePeriod;
        } else state.data = merged;
      }
      render();
    });
    try {
      state.data = { status: 'loading' };
      state.bet365Data = { status: 'loading' };
      render();
      const result = await window.traderPublicOdds.start(state.payload);
      state.feedId = result.feedId;
    } catch (error) {
      state.error = error?.message || 'Nao foi possivel iniciar o Radar de Odds.';
      render();
    }
  }

  document.addEventListener('click', async event => {
    const marketButton = event.target.closest('[data-market-index]');
    if (marketButton) {
      state.compactMarketIndex = Number(marketButton.dataset.marketIndex) || 0;
      render();
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'close') return window.close();
    if (action === 'highlight') return window.traderPublicOdds?.highlight?.(state.payload);
    if (action === 'diagnostics') return state.feedId && window.traderPublicOdds?.showDiagnostics?.(state.feedId);
    if (action === 'settings') return window.traderPublicOdds?.showMenu?.();
    if (action === 'expand-compact') {
      state.compactExpanded = true;
      window.traderPublicOdds?.resizeLayout?.('comparison');
      render();
      return;
    }
    if (action === 'collapse-compact') {
      state.compactExpanded = false;
      window.traderPublicOdds?.resizeLayout?.('compact');
      render();
      return;
    }
    if (action === 'top') {
      const result = await window.traderPublicOdds?.toggleAlwaysOnTop?.();
      state.alwaysOnTop = !!result?.alwaysOnTop;
      render();
    }
  });

  document.addEventListener('contextmenu', event => {
    if (!state.overlay) return;
    event.preventDefault();
    window.traderPublicOdds?.showMenu?.();
  });

  window.__publicOddsMenuState = () => ({
    viewMode: state.payload.viewMode || '',
    showMatchOdds: state.showMatchOdds,
    showGoals: state.showGoals,
    showBetfair: state.showBetfair,
    showBet365: state.showBet365,
    layoutMode: state.layoutMode,
    goalSelectionCustomized: state.goalSelectionCustomized,
    outcomes: { ...state.outcomes },
    availableGoalLines: Array.from(new Set([
      ...(state.data?.goalLines || []).map(line => String(line.line)),
      ...(state.bet365Data?.goalLines || []).map(line => String(line.line))
    ])).sort((left, right) => Number(left) - Number(right)),
    goalLineVisibility: { ...state.goalLineVisibility },
    goalSides: goalSidesForMode(state.payload.viewMode)
  });
  window.traderPublicOdds?.onMenuAction?.(payload => {
    const action = payload?.action;
    if (action === 'switch-market') {
      const nextMode = ['mo', 'lht', 'lft', 'laft'].includes(payload.value) ? payload.value : state.payload.viewMode;
      state.payload.viewMode = nextMode;
      state.compactMarketIndex = 0;
      state.compactExpanded = false;
      state.rateCycles = {};
      if (nextMode === 'mo') window.traderPublicOdds?.resizeGoalSides?.(2);
      else {
        const sides = goalSidesForMode(nextMode);
        window.traderPublicOdds?.resizeGoalSides?.(Number(sides.over) + Number(sides.under));
      }
      render();
    } else if (action === 'show-goal-side') {
      const mode = state.payload.viewMode;
      const sides = goalSidesForMode(mode);
      sides[payload.key] = !!payload.value;
      if (!sides.over && !sides.under) sides[payload.key] = true;
      state.goalSidesByMode[mode] = sides;
      localStorage.setItem('public_odds_goal_sides_by_mode', JSON.stringify(state.goalSidesByMode));
      window.traderPublicOdds?.resizeGoalSides?.(Number(sides.over) + Number(sides.under));
      render();
    } else if (action === 'show-match-odds') {
      state.showMatchOdds = !!payload.value;
      localStorage.setItem('public_odds_show_match', state.showMatchOdds ? '1' : '0');
      render();
    } else if (action === 'show-goals') {
      state.showGoals = !!payload.value;
      localStorage.setItem('public_odds_show_goals', state.showGoals ? '1' : '0');
      render();
    } else if (action === 'show-provider') {
      if (payload.key === 'betfair') {
        state.showBetfair = !!payload.value;
        localStorage.setItem('public_odds_show_betfair', state.showBetfair ? '1' : '0');
      } else if (payload.key === 'bet365') {
        state.showBet365 = !!payload.value;
        localStorage.setItem('public_odds_show_bet365', state.showBet365 ? '1' : '0');
      }
      render();
    } else if (action === 'show-outcome') {
      state.outcomes[payload.key] = !!payload.value;
      localStorage.setItem('public_odds_outcomes', JSON.stringify(state.outcomes));
      render();
    } else if (action === 'show-goal-line') {
      if (!state.goalSelectionCustomized) {
        const available = [
          ...(state.data?.goalLines || []).map(line => String(line.line)),
          ...(state.bet365Data?.goalLines || []).map(line => String(line.line))
        ];
        available.forEach(line => { state.goalLineVisibility[line] = true; });
        state.goalSelectionCustomized = true;
        localStorage.setItem('public_odds_goal_lines_customized', '1');
      }
      state.goalLineVisibility[String(payload.key)] = !!payload.value;
      localStorage.setItem('public_odds_goal_lines', JSON.stringify(state.goalLineVisibility));
      render();
    } else if (action === 'layout-mode') {
      state.layoutMode = payload.value === 'compact' ? 'compact' : 'comparison';
      state.compactExpanded = false;
      localStorage.setItem('public_odds_layout', state.layoutMode);
      window.traderPublicOdds?.resizeLayout?.(state.layoutMode);
      render();
    } else if (action === 'restore-window') {
      window.traderPublicOdds?.openWindow?.(state.payload).then(() => window.close());
    }
  });

  window.addEventListener('beforeunload', () => {
    if (state.feedId) window.traderPublicOdds?.stop?.(state.feedId);
  });
  init();
})();
