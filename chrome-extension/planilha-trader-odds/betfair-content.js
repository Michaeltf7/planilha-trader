(() => {
  const API = 'http://127.0.0.1:38465/odds';
  const BASE_HEADERS = { 'content-type': 'application/json', 'x-planilha-trader': 'extension-v1' };
  let target = null;
  let lastSignature = '';
  let eventNavigationStarted = false;
  let mutationScanTimer = null;
  let goalsTabOpened = false;
  let lastFtGoalLines = [];
  let lastHtGoalLines = [];
  let periodTabState = 'idle';
  let periodTabRequestedAt = 0;
  let requestedHtLine = null;
  let htTargetIndex = 0;

  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const aliases = {
    croatia: ['croatia', 'croacia'], morocco: ['morocco', 'marrocos'], germany: ['germany', 'alemanha'], england: ['england', 'inglaterra'],
    spain: ['spain', 'espanha'], netherlands: ['netherlands', 'holanda', 'paises baixos'], 'ivory coast': ['ivory coast', 'costa do marfim'],
    'south korea': ['south korea', 'coreia do sul'], usa: ['usa', 'estados unidos', 'eua'], switzerland: ['switzerland', 'suica'],
    algeria: ['algeria', 'argelia'], egypt: ['egypt', 'egito'], 'cape verde': ['cape verde', 'cape verde islands', 'cabo verde', 'ilhas de cabo verde'], japan: ['japan', 'japao'],
    norway: ['norway', 'noruega'], sweden: ['sweden', 'suecia'], belgium: ['belgium', 'belgica'], france: ['france', 'franca']
  };
  const teamKeys = value => {
    if (globalThis.PlanilhaTeamMatcher) return globalThis.PlanilhaTeamMatcher.variants(value);
    const key = normalize(value);
    const entry = Object.entries(aliases).find(([canonical, variants]) => canonical === key || variants.includes(key));
    return entry ? entry[1] : [key];
  };
  const ignoredTeamTokens = new Set(['fc', 'sc', 'ac', 'cf', 'club', 'clube', 'u20', 'u21', 'women', 'feminino', 'islands', 'ilhas']);
  const teamMatches = (text, keys) => keys.some(key => {
    if (globalThis.PlanilhaTeamMatcher?.matches(text, key)) return true;
    if (text.includes(key)) return true;
    const tokens = key.split(' ').filter(token => token.length > 2 && !ignoredTeamTokens.has(token));
    return tokens.length > 0 && tokens.every(token => text.includes(token));
  });
  const includesTeam = (text, keys) => teamMatches(text, keys);
  const leafs = root => Array.from((root || document).querySelectorAll('a, span, div, p, td, button')).filter(element => !element.children.length);
  const offers = root => {
    const text = String(root?.innerText || '').replace(/\u00a0/g, ' ');
    const values = [];
    const regex = /(?:^|\n)\s*(\d+(?:[.,]\d+)?)\s*(?:\n|\s)+(?:R\$|£|BRL)\s*[\d.,]+/gim;
    let match;
    while ((match = regex.exec(text))) values.push(match[1].replace(',', '.'));
    return values;
  };
  const bestExchangePair = values => {
    const prices = (values || []).map(value => String(value || '').replace(',', '.')).filter(Boolean);
    if (prices.length >= 6) {
      const backs = prices.slice(0, 3).map(Number).filter(Number.isFinite);
      const lays = prices.slice(3, 6).map(Number).filter(Number.isFinite);
      return {
        back: backs.length ? String(Math.max(...backs)) : null,
        lay: lays.length ? String(Math.min(...lays)) : null
      };
    }
    return prices.length >= 2 ? { back: prices[0], lay: prices[1] } : null;
  };
  const validGoalLine = value => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0.5 && numeric <= 20 && Math.abs((numeric * 2) - Math.round(numeric * 2)) < 0.001 && Math.round(numeric * 2) % 2 === 1;
  };
  const validPair = pair => pair && Number(pair.back) > 1 && Number(pair.lay) > 1 && Number(pair.back) <= Number(pair.lay);
  const sanitizeGoalLines = lines => (lines || []).filter(item => validGoalLine(item.line) && (validPair(item.over) || validPair(item.under)));
  const expectedHtLines = () => {
    const goals = Number(target?.score?.home || 0) + Number(target?.score?.away || 0);
    return [goals + 0.5, goals + 1.5];
  };
  const firstHalfLineFromText = value => {
    const text = normalize(value);
    const firstHalf = text.includes('primeiro tempo') || text.includes('1o tempo') || text.includes('1 tempo');
    if (!firstHalf || !text.includes('gol')) return null;
    const match = text.match(/(?:mais menos de\s+)?(\d+)\s+(\d+)\s+gols?/)
      || text.match(/(\d+)\s+(\d+).*gols?/);
    if (!match) return null;
    const line = Number(`${match[1]}.${match[2]}`);
    return validGoalLine(line) ? line : null;
  };
  const clickDirectHtMarket = line => {
    const directCandidate = leafs(document).find(element => {
      if (!element.getClientRects().length) return false;
      const marketLine = firstHalfLineFromText(element.textContent);
      return marketLine !== null && Math.abs(marketLine - Number(line)) < 0.001;
    });
    const candidate = directCandidate || leafs(document).find(element => {
      if (!element.getClientRects().length) return false;
      const raw = String(element.textContent || '').replace(/\s+/g, ' ').trim();
      const match = raw.match(/^(\d+(?:[.,]\d+)?)\s+gols?\s+no\s+(?:1(?:º|o)?|primeiro)\s+tempo$/i);
      return match && Math.abs(Number(match[1].replace(',', '.')) - Number(line)) < 0.001;
    });
    const clickable = candidate?.closest('a, button, [role="button"], li') || candidate;
    if (!clickable) return false;
    requestedHtLine = Number(line);
    periodTabState = 'requested';
    periodTabRequestedAt = Date.now();
    clickable.click();
    return true;
  };
  const requestNextHtMarket = () => {
    const targets = expectedHtLines();
    if (htTargetIndex >= targets.length) return false;
    return clickDirectHtMarket(targets[htTargetIndex]);
  };
  const parseDirectHtMarket = line => {
    const expected = Number(line);
    const mainLeft = Math.min(210, window.innerWidth * 0.16);
    const activeHeading = Array.from(document.querySelectorAll('h1, h2, h3, h4, header, span, div, p')).find(element => {
      const rect = element.getBoundingClientRect();
      return element.getClientRects().length
        && rect.width > 0
        && rect.height > 0
        && rect.left >= mainLeft
        && String(element.textContent || '').trim().length <= 100
        && Math.abs(Number(firstHalfLineFromText(element.textContent)) - expected) < 0.001;
    });
    if (activeHeading) {
      const pairForSelection = selectionName => {
        const expectedText = normalize(`${selectionName} de ${line} gols`);
        let selected = null;
        leafs(document).forEach(element => {
          const rect = element.getBoundingClientRect();
          if (!element.getClientRects().length || rect.left < mainLeft || normalize(element.textContent) !== expectedText) return;
          let parent = element;
          for (let depth = 0; depth < 7 && parent; depth += 1, parent = parent.parentElement) {
            const values = offers(parent);
            const raw = String(parent.innerText || '');
            if (values.length < 2 || raw.length > 900) continue;
            if (!selected || raw.length < selected.raw.length) selected = { raw, values };
          }
        });
        return selected ? bestExchangePair(selected.values) : null;
      };
      const directUnder = pairForSelection('menos');
      const directOver = pairForSelection('mais');
      if (validPair(directUnder) || validPair(directOver)) {
        return { line: String(line), under: directUnder, over: directOver, scope: 'HT' };
      }
    }
    let best = null;
    Array.from(document.querySelectorAll('h1, h2, h3, h4, header, span, div, p')).forEach(element => {
      const headingRect = element.getBoundingClientRect();
      if (!element.getClientRects().length || headingRect.width <= 0 || headingRect.height <= 0 || headingRect.left < Math.min(210, window.innerWidth * 0.16)) return;
      const heading = normalize(element.textContent);
      const firstHalf = heading.includes('primeiro tempo') || heading.includes('1o tempo') || heading.includes('1 tempo');
      const headingLine = firstHalfLineFromText(element.textContent);
      const hasLine = headingLine !== null && Math.abs(headingLine - expected) < 0.001;
      if (!firstHalf || !hasLine || String(element.textContent || '').trim().length > 100) return;
      let parent = element;
      for (let depth = 0; depth < 10 && parent; depth += 1, parent = parent.parentElement) {
        const parentRect = parent.getBoundingClientRect();
        if (!parent.getClientRects().length || parentRect.width <= 0 || parentRect.height <= 0) continue;
        const raw = String(parent.innerText || '');
        const text = normalize(raw);
        const values = offers(parent);
        if (!text.includes('mais de') || !text.includes('menos de') || values.length < 4 || raw.length > 2200) continue;
        if (!best || raw.length < best.raw.length) best = { raw, values, top: parentRect.top };
      }
    });
    if (!best) return null;
    let under;
    let over;
    if (best.values.length >= 12) {
      under = bestExchangePair(best.values.slice(0, 6));
      over = bestExchangePair(best.values.slice(6, 12));
    } else {
      under = bestExchangePair(best.values.slice(0, 2));
      over = bestExchangePair(best.values.slice(2, 4));
    }
    if (!validPair(under) && !validPair(over)) return null;
    return { line: String(line), under, over, scope: 'HT' };
  };
  const pairNearLabel = matcher => {
    let best = null;
    leafs(document).filter(element => matcher(normalize(element.textContent))).forEach(element => {
      let parent = element;
      for (let depth = 0; depth < 6 && parent; depth += 1, parent = parent.parentElement) {
        const values = offers(parent);
        const raw = String(parent.innerText || '');
        if (values.length < 2 || raw.length > 700) continue;
        if (!best || raw.length < best.raw.length) best = { raw, values };
      }
    });
    return best ? bestExchangePair(best.values) : null;
  };
  const marketNearHeading = (headingMatcher, minimumOffers = 2) => {
    let best = null;
    Array.from(document.querySelectorAll('h1, h2, h3, h4, header, span, div, p')).forEach(element => {
      const heading = normalize(element.textContent);
      if (!headingMatcher(heading)) return;
      let parent = element;
      for (let depth = 0; depth < 10 && parent; depth += 1, parent = parent.parentElement) {
        const values = offers(parent);
        const raw = String(parent.innerText || '');
        if (values.length < minimumOffers || raw.length > 5000) continue;
        if (!best || raw.length < best.raw.length) best = { raw, values, element: parent };
      }
    });
    return best;
  };
  const selectionRows = market => {
    if (!market?.element) return [];
    const candidates = [];
    market.element.querySelectorAll('tr, li, [role="row"], div').forEach(element => {
      const values = offers(element);
      const raw = String(element.innerText || '').trim();
      if (values.length !== 6 || raw.length > 900) return;
      candidates.push({ element, raw, values });
    });
    const unique = new Map();
    candidates.forEach(candidate => {
      const signature = candidate.values.join('|');
      const current = unique.get(signature);
      if (!current || candidate.raw.length < current.raw.length) unique.set(signature, candidate);
    });
    return Array.from(unique.values()).sort((left, right) => {
      const position = left.element.compareDocumentPosition(right.element);
      return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
  };

  async function publish(data) {
    if (!target) return;
    const payload = { feedId: target.feedId, provider: 'betfair', home: target.home, away: target.away, ...data, capturedAt: Date.now() };
    const signature = JSON.stringify({ status: payload.status, prices: payload.prices, goalLines: payload.goalLines, htGoalLines: payload.htGoalLines, primaryFtGoalLine: payload.primaryFtGoalLine, primaryHtGoalLine: payload.primaryHtGoalLine, htDebug: payload.htDebug, marketState: payload.marketState, href: payload.href });
    if (signature === lastSignature) return;
    lastSignature = signature;
    try {
      const headers = target.collectorToken
        ? { ...BASE_HEADERS, 'x-planilha-client': target.collectorToken }
        : BASE_HEADERS;
      await fetch(API, { method: 'POST', headers, body: JSON.stringify(payload) });
    } catch (_) {}
  }

  function scrapeListing() {
    const homeKeys = teamKeys(target.home);
    const awayKeys = teamKeys(target.away);
    const links = Array.from(document.querySelectorAll('a[href*="apostas-"]')).filter(anchor => {
      const text = normalize(anchor.innerText);
      return includesTeam(text, homeKeys) && includesTeam(text, awayKeys);
    });
    const anchor = links.sort((a, b) => String(a.innerText || '').length - String(b.innerText || '').length)[0];
    if (!anchor) return publish({ status: 'searching' });
    let row = anchor;
    let values = [];
    for (let depth = 0; depth < 8 && row; depth += 1, row = row.parentElement) {
      const candidate = offers(row);
      if (candidate.length >= 6 && String(row.innerText || '').length < 1600) { values = candidate; break; }
    }
    const prices = values.length >= 6 ? {
      home: { back: values[0], lay: values[1] }, draw: { back: values[2], lay: values[3] }, away: { back: values[4], lay: values[5] }
    } : {};
    publish({ status: 'opening-match', prices, href: anchor.href });
    if (!eventNavigationStarted) {
      eventNavigationStarted = true;
      location.href = String(anchor.href || '').replace('/exchange/plus/pt/pt/', '/exchange/plus/pt/');
    }
  }

  function scrapeEvent() {
    const homeKeys = teamKeys(target.home);
    const awayKeys = teamKeys(target.away);
    const matchMarket = marketNearHeading(text =>
      text === 'resultado da partida'
      || text === 'resultado final'
      || text === 'match odds', 6);
    const matchRows = selectionRows(matchMarket);
    const prices = matchRows.length >= 3 ? {
      home: bestExchangePair(matchRows[0].values),
      away: bestExchangePair(matchRows[1].values),
      draw: bestExchangePair(matchRows[2].values)
    } : {
      home: pairNearLabel(text => homeKeys.some(key => text === key)),
      draw: pairNearLabel(text => text === 'empate'),
      away: pairNearLabel(text => awayKeys.some(key => text === key))
    };
    if (!goalsTabOpened && periodTabState !== 'requested') {
      const goalsTabLabel = Array.from(document.querySelectorAll('[role="tab"], button, a, li, span')).find(element =>
        normalize(element.textContent) === 'gols' && element.getClientRects().length > 0);
      const goalsTab = goalsTabLabel?.closest('[role="tab"], button, a, li') || goalsTabLabel;
      if (goalsTab) {
        goalsTabOpened = true;
        goalsTab.click();
      }
    }
    const goalLines = {};
    Array.from(document.querySelectorAll('h1, h2, h3, h4, header, span, div, p')).forEach(element => {
      const rawHeading = String(element.textContent || '').replace(/\s+/g, ' ').trim();
      const heading = normalize(rawHeading);
      const headingMatch = rawHeading.match(/^mais\s*\/\s*menos de\s+(\d+(?:[.,]\d+)?)\s+gols?(?:\s*(?:-|no)?\s*(?:1(?:º|o)?|primeiro)\s*tempo)?$/i);
      if (!headingMatch) return;
      const line = headingMatch[1].replace(',', '.');
      if (goalLines[line]) return;
      const market = marketNearHeading(text => text === heading, 4);
      if (!market?.values?.length) return;
      if (market.values.length >= 12) {
        goalLines[line] = {
          line,
          under: bestExchangePair(market.values.slice(0, 6)),
          over: bestExchangePair(market.values.slice(6, 12))
        };
      } else if (market.values.length >= 4) {
        goalLines[line] = {
          line,
          under: bestExchangePair(market.values.slice(0, 2)),
          over: bestExchangePair(market.values.slice(2, 4))
        };
      }
    });
    leafs(document).forEach(element => {
      const rawSelection = String(element.textContent || '').replace(/\s+/g, ' ').trim();
      const text = normalize(rawSelection);
      const selection = rawSelection.match(/^(mais|menos) de\s+(\d+(?:[.,]\d+)?)\s+gols?(?:\s*(?:-|no)?\s*(?:1(?:º|o)?|primeiro)\s*tempo)?$/i);
      if (!selection) return;
      const pair = pairNearLabel(value => value === text);
      if (!pair) return;
      const line = selection[2].replace(',', '.');
      goalLines[line] ||= { line };
      goalLines[line][normalize(selection[1]) === 'mais' ? 'over' : 'under'] ||= pair;
    });
    const orderedGoalLines = Object.values(goalLines)
      .filter(item => item.over || item.under)
      .sort((left, right) => Number(left.line) - Number(right.line));
    const validatedLines = sanitizeGoalLines(orderedGoalLines);
    if (periodTabState === 'requested') {
      const requestAge = Date.now() - periodTabRequestedAt;
      const selectedLine = requestAge > 600 ? parseDirectHtMarket(requestedHtLine) : null;
      if (requestAge > 600 && selectedLine) {
        const withoutCurrent = lastHtGoalLines.filter(line => Math.abs(Number(line.line) - Number(requestedHtLine)) >= 0.001);
        lastHtGoalLines = [...withoutCurrent, selectedLine].sort((left, right) => Number(left.line) - Number(right.line));
      }
      if ((requestAge > 600 && selectedLine) || requestAge > 6000) {
        htTargetIndex += 1;
        periodTabState = 'idle';
        requestedHtLine = null;
        if (requestNextHtMarket()) return;
        const goalsLabel = Array.from(document.querySelectorAll('[role="tab"], button, a, li, span')).find(element => normalize(element.textContent) === 'gols' && element.getClientRects().length > 0);
        (goalsLabel?.closest('[role="tab"], button, a, li') || goalsLabel)?.click();
        periodTabState = 'done';
      }
    } else if (validatedLines.length) {
      lastFtGoalLines = validatedLines.map(item => ({ ...item, scope: 'FT' }));
    }
    if (periodTabState === 'idle' && lastFtGoalLines.length) {
      if (htTargetIndex >= expectedHtLines().length) periodTabState = 'done';
      else requestNextHtMarket();
    }
    const goals = lastFtGoalLines.find(item => item.over && item.under) || lastFtGoalLines[0] || null;
    publish({
      status: Object.values(prices).some(Boolean) ? 'found' : 'loading-market',
      prices,
      goals,
      goalLines: lastFtGoalLines,
      ftGoalLines: lastFtGoalLines,
      htGoalLines: lastHtGoalLines,
      primaryFtGoalLine: lastFtGoalLines[0]?.line || null,
      primaryHtGoalLine: lastHtGoalLines[0]?.line || null,
      htDebug: { state: periodTabState, requestedLine: requestedHtLine, targetIndex: htTargetIndex, capturedLines: lastHtGoalLines.map(line => line.line) },
      marketState: 'open',
      matchVerified: true,
      href: location.href
    });
  }

  function scan() {
    if (!target) return;
    if (/futebol-apostas-1\/?$/i.test(location.pathname)) scrapeListing();
    else scrapeEvent();
  }

  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === 'planilha-scan') {
      scan();
      return;
    }
    if (message?.type === 'planilha-target' && message.command) {
      const changedMatch = !target || normalize(target.home) !== normalize(message.command.home) || normalize(target.away) !== normalize(message.command.away);
      const changedScore = !!target && (Number(target.score?.home || 0) !== Number(message.command.score?.home || 0) || Number(target.score?.away || 0) !== Number(message.command.score?.away || 0));
      target = message.command;
      if (changedMatch) {
        eventNavigationStarted = false;
        goalsTabOpened = false;
        lastFtGoalLines = [];
        lastHtGoalLines = [];
        periodTabState = 'idle';
        requestedHtLine = null;
        htTargetIndex = 0;
      }
      if (!changedMatch && changedScore) {
        lastHtGoalLines = [];
        periodTabState = 'idle';
        requestedHtLine = null;
        htTargetIndex = 0;
      }
      lastSignature = '';
      scan();
    }
  });
  new MutationObserver(() => {
    clearTimeout(mutationScanTimer);
    mutationScanTimer = setTimeout(scan, 120);
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  setInterval(scan, 900);
})();
