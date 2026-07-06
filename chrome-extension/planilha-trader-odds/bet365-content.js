(() => {
  const API = 'http://127.0.0.1:38465/odds';
  const HEADERS = { 'content-type': 'application/json', 'x-planilha-trader': 'extension-v1' };
  let target = null;
  let lastSignature = '';
  let openedMatch = false;
  let goalsTabOpened = false;
  let scanTimer = null;
  let lastMatchPrices = {};
  let lastMatchClickAt = 0;
  let matchClickAttempts = 0;
  let lastGoalExpandClickAt = 0;
  let moreGoalsExpandRequested = false;
  let popularTabEnsured = false;
  let cachedRouteAttempted = false;
  let lastFtGoalLines = [];
  let lastHtGoalLines = [];
  let periodTabState = 'idle';
  let periodTabRequestedAt = 0;
  let primaryFtGoalLine = null;
  let primaryHtGoalLine = null;
  let searchVariantIndex = 0;
  let lastSearchAt = 0;

  const normalize = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const ignoredTokens = new Set(['fc', 'sc', 'ac', 'cf', 'club', 'clube', 'u20', 'u21', 'women', 'feminino', 'islands', 'ilhas']);
  const aliases = {
    switzerland: ['switzerland', 'suica'], algeria: ['algeria', 'argelia'], croatia: ['croatia', 'croacia'],
    morocco: ['morocco', 'marrocos'], germany: ['germany', 'alemanha'], england: ['england', 'inglaterra'],
    spain: ['spain', 'espanha'], netherlands: ['netherlands', 'holanda', 'paises baixos'],
    'ivory coast': ['ivory coast', 'costa do marfim'], 'south korea': ['south korea', 'coreia do sul'],
    usa: ['usa', 'estados unidos', 'eua'], egypt: ['egypt', 'egito'], 'cape verde': ['cape verde', 'cape verde islands', 'cabo verde', 'ilhas de cabo verde'],
    japan: ['japan', 'japao'], norway: ['norway', 'noruega'], sweden: ['sweden', 'suecia'],
    belgium: ['belgium', 'belgica'], france: ['france', 'franca']
  };
  const teamVariants = value => {
    const key = normalize(value);
    const entry = Object.entries(aliases).find(([canonical, variants]) => canonical === key || variants.includes(key));
    return entry ? entry[1] : [key];
  };
  const teamTokens = value => normalize(value).split(' ').filter(token => token.length > 2 && !ignoredTokens.has(token));
  const matchesTeam = (text, team) => {
    if (globalThis.PlanilhaTeamMatcher) return globalThis.PlanilhaTeamMatcher.matches(text, team);
    return teamVariants(team).some(variant => {
      const tokens = teamTokens(variant);
      return tokens.length > 0 && tokens.every(token => text.includes(token));
    });
  };
  const routeKey = () => `${normalize(target?.home)}|${normalize(target?.away)}`;
  const rememberValidatedRoute = async () => {
    if (!target || !/#\/IP\/EV\d+C\d+/i.test(location.href)) return;
    const saved = await chrome.storage.local.get('bet365_event_routes');
    const routes = saved.bet365_event_routes && typeof saved.bet365_event_routes === 'object' ? saved.bet365_event_routes : {};
    routes[routeKey()] = { href: location.href, savedAt: Date.now() };
    await chrome.storage.local.set({ bet365_event_routes: routes });
  };
  const openCachedRoute = async () => {
    if (!target || cachedRouteAttempted) return false;
    cachedRouteAttempted = true;
    const saved = await chrome.storage.local.get('bet365_event_routes');
    const entry = saved.bet365_event_routes?.[routeKey()];
    if (!entry?.href || Date.now() - Number(entry.savedAt || 0) > 12 * 60 * 60 * 1000) return false;
    if (location.href === entry.href) return false;
    location.href = entry.href;
    return true;
  };
  const visible = element => !!element && element.getClientRects().length > 0;
  const decimal = value => {
    const match = String(value || '').trim().match(/^(\d+(?:[.,]\d+)?)$/);
    return match ? match[1].replace(',', '.') : null;
  };

  async function publish(data) {
    if (!target) return;
    const payload = {
      feedId: target.feedId,
      provider: 'bet365',
      home: target.home,
      away: target.away,
      ...data,
      capturedAt: Date.now()
    };
    const signature = JSON.stringify({ status: payload.status, prices: payload.prices, goalLines: payload.goalLines, htGoalLines: payload.htGoalLines, primaryFtGoalLine: payload.primaryFtGoalLine, primaryHtGoalLine: payload.primaryHtGoalLine, currentGoals: payload.currentGoals, liveScore: payload.liveScore, liveClock: payload.liveClock, livePeriod: payload.livePeriod, marketState: payload.marketState, marketStates: payload.marketStates, href: location.href });
    if (signature === lastSignature) return;
    lastSignature = signature;
    try {
      await fetch(API, { method: 'POST', headers: HEADERS, body: JSON.stringify(payload) });
    } catch (_) {}
  }

  function leafElements(root = document) {
    return Array.from(root.querySelectorAll('span, div, button, a')).filter(element => !element.children.length && visible(element));
  }

  function oddsIn(root) {
    const preferred = Array.from(root.querySelectorAll('[class*="Odds"], [class*="Price"]'))
      .filter(element => visible(element) && !element.querySelector('[class*="Odds"], [class*="Price"]'))
      .map(element => decimal(element.textContent)).filter(Boolean);
    if (preferred.length) return preferred;
    return leafElements(root).map(element => decimal(element.textContent)).filter(Boolean);
  }

  function parseLiveMatchState() {
    const box = smallestContainer(text => matchesTeam(text, target?.home) && matchesTeam(text, target?.away), 700);
    if (!box?.element) return null;
    const tokens = leafElements(box.element)
      .map(element => String(element.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const homeIndex = tokens.findIndex(token => matchesTeam(normalize(token), target.home));
    const awayIndex = tokens.findIndex((token, index) => index > homeIndex && matchesTeam(normalize(token), target.away));
    if (homeIndex < 0 || awayIndex < 0) return null;
    const scoreElements = Array.from(box.element.querySelectorAll('[class*="Score"], [class*="score"]'))
      .filter(element => visible(element) && !element.querySelector('[class*="Score"], [class*="score"]'))
      .map(element => String(element.textContent || '').trim())
      .filter(token => /^\d{1,2}$/.test(token))
      .map(Number)
      .filter(value => value >= 0 && value <= 20);
    const betweenTeams = tokens.slice(homeIndex + 1, awayIndex)
      .filter(token => /^\d{1,2}$/.test(token))
      .map(Number)
      .filter(value => value >= 0 && value <= 20);
    const afterAway = tokens.slice(awayIndex + 1, awayIndex + 7)
      .filter(token => /^\d{1,2}$/.test(token))
      .map(Number)
      .filter(value => value >= 0 && value <= 20);
    const allIntegers = tokens
      .filter(token => /^\d{1,2}$/.test(token))
      .map(Number)
      .filter(value => value >= 0 && value <= 20);
    const splitScore = betweenTeams.length === 1 && afterAway.length ? [betweenTeams[0], afterAway[0]] : [];
    const scoreValues = scoreElements.length >= 2
      ? scoreElements
      : (betweenTeams.length >= 2 ? betweenTeams : (splitScore.length ? splitScore : allIntegers));
    if (scoreValues.length < 2) return null;
    const raw = String(box.raw || '');
    const clockMatch = raw.match(/\b(\d{1,3}):([0-5]\d)\b/) || raw.match(/\b(\d{1,3})['’]\b/);
    const safeClockMatch = raw.match(/\b(\d{1,3}):([0-5]\d)\b/) || raw.match(/\b(\d{1,3})['\u2019]\b/);
    const clock = safeClockMatch
      ? (safeClockMatch[2] != null ? `${safeClockMatch[1]}:${safeClockMatch[2]}` : `${safeClockMatch[1]}'`)
      : '';
    const minute = Number(safeClockMatch?.[1] || 0);
    const period = normalize(raw).includes('intervalo') ? 'interval' : minute > 45 ? 'second' : 'first';
    return { score: { home: scoreValues[0], away: scoreValues[1] }, clock, period };
  }

  function smallestContainer(matcher, maxLength = 2400) {
    let best = null;
    Array.from(document.querySelectorAll('div, section, article')).forEach(element => {
      const raw = String(element.innerText || '').trim();
      const text = normalize(raw);
      if (!raw || raw.length > maxLength || !matcher(text, raw)) return;
      if (!best || raw.length < best.raw.length) best = { element, raw, text };
    });
    return best;
  }

  function marketContainer(titleMatcher) {
    let best = null;
    leafElements().forEach(label => {
      const text = normalize(label.textContent);
      if (!titleMatcher(text)) return;
      let parent = label.parentElement;
      for (let depth = 0; depth < 8 && parent; depth += 1, parent = parent.parentElement) {
        const raw = String(parent.innerText || '').trim();
        const values = oddsIn(parent);
        if (values.length < 2 || raw.length > 2600) continue;
        if (!best || raw.length < best.raw.length) best = { element: parent, raw, values };
      }
    });
    return best;
  }

  function parseMatchOdds() {
    const market = marketContainer(text =>
      text === 'resultado da partida'
      || text === 'resultado final'
      || text === 'vencedor da partida');
    if (!market) return {};
    const selections = [];
    market.element.querySelectorAll('[class*="Participant"], [class*="Selection"], button').forEach(element => {
      const raw = String(element.innerText || '').replace(/\s+/g, ' ').trim();
      const values = oddsIn(element);
      if (!raw || values.length !== 1 || raw.length > 180) return;
      selections.push({ raw, text: normalize(raw), odd: values[0], element });
    });
    const unique = [];
    const seen = new Set();
    selections.forEach(selection => {
      const key = `${selection.text}|${selection.odd}`;
      if (!seen.has(key)) { seen.add(key); unique.push(selection); }
    });
    const home = unique.find(item => matchesTeam(item.text, target.home) || /^1\b/.test(item.text));
    const draw = unique.find(item => item.text.includes('empate') || item.text === 'x' || /^x\b/.test(item.text));
    const away = unique.find(item => matchesTeam(item.text, target.away) || /^2\b/.test(item.text));
    if (home || draw || away) return { home: home?.odd, draw: draw?.odd, away: away?.odd };
    const values = market.values.filter((value, index, array) => index === 0 || value !== array[index - 1]);
    return values.length === 3 ? { home: values[0], draw: values[1], away: values[2] } : {};
  }

  function explicitlySuspended(element) {
    if (!element) return false;
    const text = normalize(element.innerText || '');
    if (/mercado suspenso|apostas suspensas|\bsuspenso\b|mercado fechado/.test(text)) return true;
    return Array.from(element.querySelectorAll('[class], [aria-disabled="true"], [disabled]')).some(item => {
      const className = String(item.className || '');
      return visible(item) && /suspend|locked|closed/i.test(className);
    });
  }

  function targetMarketSuspended(mode) {
    if (mode === 'mo') {
      return explicitlySuspended(marketContainer(text =>
        text === 'resultado da partida' || text === 'resultado final' || text === 'vencedor da partida')?.element);
    }
    const halfTime = mode === 'lht';
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, span, div')).filter(element => {
      const text = normalize(element.textContent);
      const isHalf = (text.includes('1 tempo') || text.includes('1o tempo') || text.includes('primeiro tempo'))
        && !text.includes('2 tempo') && !text.includes('2o tempo') && !text.includes('segundo tempo');
      return String(element.textContent || '').trim().length < 90
        && isHalf === halfTime
        && (mode === 'lft'
          ? text === 'partida gols'
          : mode === 'laft'
            ? text.startsWith('partida gols mais opcoes')
            : text.includes('gols'));
    });
    return headings.map(goalMarketContainer).filter(Boolean).some(explicitlySuspended);
  }

  function parseGoalLines(root = document) {
    const result = new Map();
    Array.from(root.querySelectorAll('[class*="Participant"], [class*="Selection"], button, div')).forEach(element => {
      const raw = String(element.innerText || '').replace(/\s+/g, ' ').trim();
      if (!raw || raw.length > 220) return;
      const match = raw.match(/\b(mais|menos)\s+(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:gols?)?/i);
      if (!match) return;
      const values = oddsIn(element);
      if (!values.length) return;
      const line = match[2].replace(',', '.');
      const entry = result.get(line) || { line };
      entry[normalize(match[1]) === 'mais' ? 'over' : 'under'] = values[values.length - 1];
      result.set(line, entry);
    });
    return Array.from(result.values())
      .filter(item => item.over || item.under)
      .sort((left, right) => Number(left.line) - Number(right.line));
  }

  function goalMarketContainer(heading) {
    let best = null;
    let market = heading?.parentElement;
    for (let depth = 0; depth < 8 && market; depth += 1, market = market.parentElement) {
      const raw = String(market.innerText || '').trim();
      const text = normalize(raw);
      if (!text.includes('mais de') || !text.includes('menos de') || raw.length > 1800) continue;
      if (!best || raw.length < best.raw.length) best = { element: market, raw };
    }
    return best?.element || null;
  }

  function rowsFromGoalMarket(market) {
    if (!market) return [];
    const validLine = value => {
      const numeric = Number(value);
      return Number.isFinite(numeric) && numeric >= 0.5 && numeric <= 20 && Math.abs((numeric * 2) - Math.round(numeric * 2)) < 0.001 && Math.round(numeric * 2) % 2 === 1;
    };
    const validOdd = value => Number.isFinite(Number(value)) && Number(value) > 1 && Number(value) <= 1000;
    const semanticRows = [];
    market.querySelectorAll('[role="row"], tr, li, [class*="Row"], [class*="Participant"], div').forEach(element => {
      const raw = String(element.innerText || '').replace(/\s+/g, ' ').trim();
      if (!raw || raw.length > 180) return;
      const points = leafElements(element).map(item => {
        const value = decimal(item.textContent);
        const rect = item.getBoundingClientRect();
        return value ? { value, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;
      }).filter(Boolean).sort((left, right) => left.x - right.x);
      if (points.length !== 3) return;
      const ySpread = Math.max(...points.map(point => point.y)) - Math.min(...points.map(point => point.y));
      const xSpread = points[2].x - points[0].x;
      if (ySpread > 12 || xSpread < 80) return;
      const values = points.map(point => point.value);
      if (!validLine(values[0]) || !validOdd(values[1]) || !validOdd(values[2])) return;
      semanticRows.push({ line: values[0], over: values[1], under: values[2], rawLength: raw.length });
    });
    const semanticMap = new Map();
    semanticRows.forEach(row => {
      const current = semanticMap.get(row.line);
      if (!current || row.rawLength < current.rawLength) semanticMap.set(row.line, row);
    });
    if (semanticMap.size) return Array.from(semanticMap.values()).map(({ rawLength, ...row }) => row).sort((left, right) => Number(left.line) - Number(right.line));
    const points = leafElements(market).map(element => {
      const value = decimal(element.textContent);
      const rect = element.getBoundingClientRect();
      return value && rect.width > 0 && rect.height > 0
        ? { value, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : null;
    }).filter(Boolean);
    const visualRows = [];
    points.sort((left, right) => left.y - right.y || left.x - right.x).forEach(point => {
      let row = visualRows.find(item => Math.abs(item.y - point.y) <= 8);
      if (!row) {
        row = { y: point.y, points: [] };
        visualRows.push(row);
      }
      if (!row.points.some(item => Math.abs(item.x - point.x) < 3 && item.value === point.value)) row.points.push(point);
    });
    const visualResult = visualRows.map(row => row.points.sort((left, right) => left.x - right.x))
      .filter(row => row.length >= 3)
      .map(row => ({ line: row[0].value, over: row[1].value, under: row[2].value }))
      .filter(row => validLine(row.line) && validOdd(row.over) && validOdd(row.under))
      .sort((left, right) => Number(left.line) - Number(right.line));
    if (visualResult.length) return visualResult;
    const textValues = String(market.innerText || '').split(/\r?\n/)
      .map(value => decimal(value.replace(/\s+/g, ' ').trim()))
      .filter(Boolean);
    const textResult = [];
    for (let index = 0; index + 2 < textValues.length; index += 3) {
      const line = Number(textValues[index]);
      if (!validLine(line) || !validOdd(textValues[index + 1]) || !validOdd(textValues[index + 2])) continue;
      textResult.push({ line: textValues[index], over: textValues[index + 1], under: textValues[index + 2] });
    }
    return textResult.sort((left, right) => Number(left.line) - Number(right.line));
  }

  function parseExpandedGoalMarkets() {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, span, div')).filter(element => {
      const text = normalize(element.textContent);
      return String(element.textContent || '').trim().length < 90
        && (text === 'partida gols' || text.startsWith('partida gols mais opcoes')
          || ((text.includes('1 tempo') || text.includes('1o tempo') || text.includes('primeiro tempo'))
            && !text.includes('2 tempo') && !text.includes('2o tempo') && !text.includes('segundo tempo')
            && text.includes('gols')));
    });
    const ft = new Map();
    const ht = new Map();
    let ftPrimary = null;
    let htPrimary = null;
    headings.forEach(heading => {
      const text = normalize(heading.textContent);
      const firstHalfHeading = (text.includes('1 tempo') || text.includes('1o tempo') || text.includes('primeiro tempo'))
        && !text.includes('2 tempo') && !text.includes('2o tempo') && !text.includes('segundo tempo');
      const targetMap = firstHalfHeading ? ht : ft;
      const primary = text === 'partida gols'
        || (firstHalfHeading && text.includes('gols') && !text.includes('mais opcoes'));
      const marketRows = rowsFromGoalMarket(goalMarketContainer(heading));
      marketRows.forEach((row, rowIndex) => {
        // Only the first visual row of the principal block is the limit line.
        // Marking every row as primary made the last line overwrite the first.
        const isPrimaryLine = primary && rowIndex === 0;
        const scoped = { ...row, scope: targetMap === ht ? 'HT' : 'FT', primary: isPrimaryLine };
        const current = targetMap.get(row.line);
        if (!current || isPrimaryLine) targetMap.set(row.line, scoped);
        if (isPrimaryLine && targetMap === ht && htPrimary === null) htPrimary = row.line;
        if (isPrimaryLine && targetMap === ft && ftPrimary === null) ftPrimary = row.line;
      });
    });
    return {
      ft: Array.from(ft.values()).sort((left, right) => Number(left.line) - Number(right.line)),
      ht: Array.from(ht.values()).sort((left, right) => Number(left.line) - Number(right.line)),
      ftPrimary,
      htPrimary
    };
  }

  function requestPeriodMarkets() {
    if (periodTabState !== 'idle' || !lastFtGoalLines.length) return;
    const label = leafElements().find(element => {
      const text = normalize(element.textContent);
      return text === '1 tempo 2 tempo' || text === '1o tempo 2o tempo' || text === 'primeiro tempo segundo tempo';
    });
    const tab = label?.closest('[role="tab"], button, [role="button"]') || label;
    if (!tab) { periodTabState = 'done'; return; }
    periodTabState = 'requested';
    periodTabRequestedAt = Date.now();
    tab.click();
  }

  function restorePopularTab() {
    const popularLabel = leafElements().find(element => normalize(element.textContent) === 'popular');
    const popularTab = popularLabel?.closest('[role="tab"], button, [role="button"]') || popularLabel;
    popularTab?.click();
    popularTabEnsured = true;
    periodTabState = 'done';
  }

  function ensureMoreGoalsExpanded() {
    const heading = leafElements().find(element => normalize(element.textContent).startsWith('partida gols mais opcoes'));
    if (!heading || Date.now() - lastGoalExpandClickAt < 1200) return;
    const existingMarket = goalMarketContainer(heading);
    if (existingMarket && rowsFromGoalMarket(existingMarket).length) {
      moreGoalsExpandRequested = false;
      return;
    }
    const immediate = heading.closest('[aria-expanded], button, [role="button"], [class*="Header"]') || heading.parentElement || heading;
    if (immediate.getAttribute?.('aria-expanded') === 'true' && existingMarket) return;
    lastGoalExpandClickAt = Date.now();
    moreGoalsExpandRequested = true;
    immediate.click();
  }

  function findMatchCard() {
    const scoreTeam = (text, team) => globalThis.PlanilhaTeamMatcher?.score
      ? globalThis.PlanilhaTeamMatcher.score(text, team)
      : (matchesTeam(text, team) ? 1 : 0);
    const candidates = [];
    Array.from(document.querySelectorAll('div, section, article')).forEach(element => {
      const raw = String(element.innerText || '').trim();
      if (!raw || raw.length > 1200 || !/\d+[.,]\d+/.test(raw)) return;
      const text = normalize(raw);
      const homeScore = scoreTeam(text, target.home);
      const awayScore = scoreTeam(text, target.away);
      if (homeScore < 0.72 || awayScore < 0.72) return;
      candidates.push({ element, raw, text, matchScore: homeScore + awayScore });
    });
    return candidates.sort((left, right) => right.matchScore - left.matchScore || left.raw.length - right.raw.length)[0] || null;
  }

  function pricesFromMatchCard(card) {
    const values = oddsIn(card?.element || document);
    return values.length >= 3 ? { home: values[0], draw: values[1], away: values[2] } : {};
  }

  function eventIdFromMatchCard(card) {
    let scope = card?.element;
    for (let depth = 0; depth < 6 && scope; depth += 1, scope = scope.parentElement) {
      const elements = [scope, ...scope.querySelectorAll('*')];
      for (const element of elements) {
        for (const attribute of Array.from(element.attributes || [])) {
          const source = `${attribute.name}=${attribute.value}`;
          const explicit = source.match(/(?:event|fixture)[^0-9]{0,30}(\d{8,})/i);
          if (explicit) return explicit[1];
          if (/(?:event|fixture|id)/i.test(attribute.name)) {
            const digits = String(attribute.value || '').match(/(?:EV)?(\d{8,})/i);
            if (digits) return digits[1];
          }
          const generic = String(attribute.value || '').match(/\b(\d{12})\b/);
          if (generic) return generic[1];
        }
      }
      const route = String(scope.outerHTML || '').match(/(?:#\/IP\/)?EV(\d{8,})C\d+/i);
      if (route) return route[1];
      const embeddedId = String(scope.outerHTML || '').match(/\b(\d{12})\b/);
      if (embeddedId) return embeddedId[1];
    }
    return null;
  }

  function navigateToMatchCard(card) {
    const eventId = eventIdFromMatchCard(card);
    if (!eventId) return false;
    const targetHash = `#/IP/EV${eventId}C1`;
    if (location.hash === targetHash) return false;
    location.hash = targetHash;
    return true;
  }

  function clickMatch(card) {
    if (!card || Date.now() - lastMatchClickAt < 900) return false;
    const teamLabel = leafElements(card.element).find(element => {
      const text = normalize(element.textContent);
      return matchesTeam(text, target.home) || matchesTeam(text, target.away);
    });
    let scope = card.element;
    for (let depth = 0; depth < 4 && scope; depth += 1, scope = scope.parentElement) {
      const link = Array.from(scope.querySelectorAll('a[href]')).find(anchor => /(?:EV|event|fixture)/i.test(anchor.getAttribute('href') || ''));
      if (link?.href) {
        location.href = link.href;
        lastMatchClickAt = Date.now();
        matchClickAttempts += 1;
        return true;
      }
    }
    const selectedHeader = Array.from(document.querySelectorAll('div, header')).filter(element => {
      const text = normalize(element.innerText);
      const rect = element.getBoundingClientRect();
      return visible(element)
        && rect.left > window.innerWidth * 0.5
        && String(element.innerText || '').length < 420
        && matchesTeam(text, target.home)
        && matchesTeam(text, target.away);
    }).sort((left, right) => String(left.innerText || '').length - String(right.innerText || '').length)[0];
    const clickable = matchClickAttempts > 0
      ? (selectedHeader || teamLabel || card.element)
      : (teamLabel || card.element);
    if (!clickable) return false;
    openedMatch = true;
    lastMatchClickAt = Date.now();
    matchClickAttempts += 1;
    clickable.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = clickable.getBoundingClientRect();
    const topElement = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) || clickable;
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(type => {
      const EventType = type.startsWith('pointer') ? PointerEvent : MouseEvent;
      topElement.dispatchEvent(new EventType(type, { bubbles: true, cancelable: true, view: window, button: 0, buttons: type.endsWith('down') ? 1 : 0 }));
    });
    return true;
  }

  function isFullEventPage() {
    if (!/#\/IP\/EV\d+C\d+/i.test(location.href)) return false;
    const text = normalize(document.body?.innerText || '');
    if (!matchesTeam(text, target.home) || !matchesTeam(text, target.away)) return false;
    const verifiedHeader = Array.from(document.querySelectorAll('h1, h2, h3, header, [class*="Header"], [class*="Fixture"], div')).some(element => {
      const raw = String(element.innerText || '').trim();
      const normalized = normalize(raw);
      return visible(element) && raw.length > 0 && raw.length < 240 && matchesTeam(normalized, target.home) && matchesTeam(normalized, target.away);
    });
    if (!verifiedHeader) return false;
    const labels = new Set(leafElements().map(element => normalize(element.textContent)));
    return labels.has('popular') && labels.has('gols') && labels.has('criar aposta');
  }

  function openSearch() {
    const input = Array.from(document.querySelectorAll('input')).find(element =>
      visible(element) && /pesquis|buscar|search/i.test(`${element.placeholder || ''} ${element.ariaLabel || ''}`));
    if (input) {
      const variants = globalThis.PlanilhaTeamMatcher
        ? [...globalThis.PlanilhaTeamMatcher.variants(target.home), ...globalThis.PlanilhaTeamMatcher.variants(target.away)]
        : [...teamVariants(target.home), ...teamVariants(target.away)];
      const candidates = Array.from(new Set([target.home, ...variants, target.away].map(value => String(value || '').trim()).filter(Boolean)));
      if (Date.now() - lastSearchAt > 2200 && normalize(input.value) === normalize(candidates[searchVariantIndex] || '')) {
        searchVariantIndex = (searchVariantIndex + 1) % Math.max(1, candidates.length);
      }
      const desired = candidates[searchVariantIndex] || target.home;
      if (normalize(input.value) !== normalize(desired)) {
        lastSearchAt = Date.now();
        input.focus();
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(input, desired);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      }
      return true;
    }
    const searchButton = Array.from(document.querySelectorAll('button, [role="button"], a')).find(element =>
      visible(element) && /pesquis|buscar|search/i.test(`${element.ariaLabel || ''} ${element.title || ''} ${element.textContent || ''}`));
    searchButton?.click();
    return false;
  }

  function scan() {
    if (!target) return;
    const fullEventPage = isFullEventPage();
    if (fullEventPage) rememberValidatedRoute().catch(() => {});
    const match = findMatchCard();
    if (!fullEventPage && !match) {
      openCachedRoute().then(opened => { if (!opened) openSearch(); }).catch(() => openSearch());
      publish({ status: 'searching', href: location.href });
      return;
    }
    if (!fullEventPage) {
      if (!navigateToMatchCard(match)) clickMatch(match);
      publish({ status: 'opening-match', href: location.href });
      return;
    }
    if (!popularTabEnsured) {
      popularTabEnsured = true;
      const popularLabel = leafElements().find(element => normalize(element.textContent) === 'popular');
      const popularTab = popularLabel?.closest('[role="tab"], button, [role="button"]') || popularLabel;
      popularTab?.click();
    }
    const parsedPrices = parseMatchOdds();
    if (Object.values(parsedPrices).some(Boolean)) lastMatchPrices = parsedPrices;
    const liveMatch = parseLiveMatchState();
    ensureMoreGoalsExpanded();
    const parsedGoalMarkets = parseExpandedGoalMarkets();
    if (parsedGoalMarkets.ft.length) lastFtGoalLines = parsedGoalMarkets.ft;
    const currentGoals = liveMatch
      ? Number(liveMatch.score.home || 0) + Number(liveMatch.score.away || 0)
      : Number(target?.score?.home || 0) + Number(target?.score?.away || 0);
    if (parsedGoalMarkets.ht.length) lastHtGoalLines = parsedGoalMarkets.ht;
    if (parsedGoalMarkets.ftPrimary) primaryFtGoalLine = parsedGoalMarkets.ftPrimary;
    if (parsedGoalMarkets.htPrimary) primaryHtGoalLine = parsedGoalMarkets.htPrimary;
    if (periodTabState === 'requested' && (lastHtGoalLines.length || Date.now() - periodTabRequestedAt > 1800)) restorePopularTab();
    else requestPeriodMarkets();
    const pageText = normalize(document.body?.innerText || '');
    const varActive = /\bvar\b|revisao do var|analise do var/.test(pageText);
    const marketStates = Object.fromEntries(['mo', 'lht', 'lft', 'laft'].map(mode => [
      mode,
      varActive ? 'var' : (targetMarketSuspended(mode) ? 'closed' : 'open')
    ]));
    const marketState = marketStates[target?.viewMode] || (varActive ? 'var' : 'open');
    publish({
      status: Object.values(lastMatchPrices).some(Boolean) ? 'found' : 'loading-market',
      prices: lastMatchPrices,
      goalLines: lastFtGoalLines,
      ftGoalLines: lastFtGoalLines,
      htGoalLines: lastHtGoalLines,
      primaryFtGoalLine,
      primaryHtGoalLine,
      currentGoals,
      liveScore: liveMatch?.score || null,
      liveClock: liveMatch?.clock || '',
      livePeriod: liveMatch?.period || '',
      goals: lastFtGoalLines[0] || null,
      marketState,
      marketStates,
      matchVerified: true,
      href: location.href
    });
  }

  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === 'planilha-scan') {
      scan();
      return;
    }
    if (message?.type === 'planilha-target' && message.command) {
      const changedMatch = !target || normalize(target.home) !== normalize(message.command.home) || normalize(target.away) !== normalize(message.command.away);
      target = message.command;
      if (changedMatch) {
        cachedRouteAttempted = false;
        openedMatch = false;
        matchClickAttempts = 0;
        popularTabEnsured = false;
        moreGoalsExpandRequested = false;
        lastMatchPrices = {};
        lastFtGoalLines = [];
        lastHtGoalLines = [];
        periodTabState = 'idle';
        primaryFtGoalLine = null;
        primaryHtGoalLine = null;
        searchVariantIndex = 0;
        lastSearchAt = 0;
      }
      lastSignature = '';
      scan();
    }
  });

  new MutationObserver(() => {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 180);
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  setInterval(scan, 1200);
})();
