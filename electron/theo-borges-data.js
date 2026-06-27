const DEFAULT_BASE_URL = 'https://clube.theoborges.com';

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function cleanText(value) {
  return decodeHtml(String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim());
}

function attr(html, name) {
  const match = String(html || '').match(new RegExp(`${name}=["']([^"']+)["']`, 'i'));
  return match ? decodeHtml(match[1]) : '';
}

function firstMatch(html, pattern) {
  const match = String(html || '').match(pattern);
  return match ? cleanText(match[1]) : '';
}

function absoluteUrl(url, baseUrl = DEFAULT_BASE_URL) {
  try {
    return new URL(decodeHtml(url), baseUrl).toString();
  } catch (_) {
    return decodeHtml(url || '');
  }
}

function normalizeTheoConfig(input = {}) {
  const rawUrl = input.url || input.sourceUrl || '';
  let baseUrl = input.baseUrl || DEFAULT_BASE_URL;
  let token = input.token || input.t || '';
  let day = input.day || input.dia || 'hoje';

  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      baseUrl = `${parsed.protocol}//${parsed.host}`;
      token = token || parsed.searchParams.get('t') || '';
      day = input.day || input.dia || parsed.searchParams.get('dia') || day;
    } catch (_) {}
  }

  return { baseUrl, token, day };
}

function buildTheoUrl(path, params = {}, baseUrl = DEFAULT_BASE_URL) {
  const url = new URL(path, baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    }
  });
  if (!response.ok) throw new Error(`Theo Borges HTTP ${response.status}`);
  return response.text();
}

function parseTheoMatches(html, sourceUrl = '') {
  const matches = [];
  const rowRegex = /<a\b([^>]*class=["'][^"']*\bmatch-row\b[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html))) {
    const openTag = rowMatch[1] || '';
    const body = rowMatch[2] || '';
    const href = attr(openTag, 'href');
    const matchId = attr(openTag, 'data-match-id') || (href.match(/\/game\/(\d+)/) || [])[1] || '';
    const name = firstMatch(body, /<span[^>]*class=["'][^"']*\bmatch-name\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    const time = firstMatch(body, /<span[^>]*class=["'][^"']*\bmatch-date\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    const league = firstMatch(body, /<span[^>]*class=["'][^"']*\bmatch-league\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    const imgs = [...body.matchAll(/<img\b([^>]*)>/gi)].map(match => ({
      src: absoluteUrl(attr(match[1], 'src'), sourceUrl || DEFAULT_BASE_URL),
      alt: attr(match[1], 'alt')
    })).filter(image => image.src || image.alt);
    const [homeName, awayName] = name.split(/\s+-\s+/).map(part => part.trim());

    matches.push({
      id: matchId,
      detailUrl: absoluteUrl(href, sourceUrl || DEFAULT_BASE_URL),
      homeId: attr(openTag, 'data-home-id'),
      awayId: attr(openTag, 'data-away-id'),
      home: { name: homeName || imgs[0]?.alt || '', logo: imgs[0]?.src || '' },
      away: { name: awayName || imgs[1]?.alt || '', logo: imgs[1]?.src || '' },
      name,
      time,
      league
    });
  }

  return {
    source: 'theo-borges',
    sourceUrl,
    count: matches.length,
    matches
  };
}

function parseTeamHeader(html, side) {
  const sideRegex = new RegExp(`<div class=["'][^"']*card-match-teams-block\\s+${side}[^"']*["'][\\s\\S]*?<img\\b([^>]*)>[\\s\\S]*?<span[^>]*class=["'][^"']*card-match-teams-name[^"']*["'][^>]*>([\\s\\S]*?)<\\/span>`, 'i');
  const match = String(html || '').match(sideRegex);
  return {
    name: match ? cleanText(match[2]) : '',
    logo: match ? absoluteUrl(attr(match[1], 'src')) : '',
    id: match ? attr(match[0], 'data-team-id') : ''
  };
}

function parseFormPayloads(html) {
  const payloads = [...String(html || '').matchAll(/<script[^>]*class=["'][^"']*\bpg-team-form-payload\b[^"']*["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => {
      try {
        return JSON.parse(decodeHtml(match[1] || '[]'));
      } catch (_) {
        return [];
      }
    });

  return {
    home: payloads[0] || [],
    away: payloads[1] || []
  };
}

function parseStatTables(html) {
  const labels = [...String(html || '').matchAll(/<div[^>]*class=["'][^"']*\bpg-tstable-colheader-label\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)]
    .map(match => ({ index: match.index, title: cleanText(match[1]) }))
    .filter(item => item.title);

  return labels.map((item, index) => {
    const nextIndex = labels[index + 1]?.index || html.length;
    const slice = html.slice(item.index, nextIndex);
    const rows = [...slice.matchAll(/<div[^>]*class=["'][^"']*\bpg-tstable-row\b[^"']*["'][^>]*>\s*<div[^>]*class=["'][^"']*\bpgcv\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class=["'][^"']*\bpg-tstable-label\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class=["'][^"']*\bpgcv\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)]
      .map(match => ({
        label: cleanText(match[2]),
        home: cleanText(match[1]),
        away: cleanText(match[3])
      }))
      .filter(row => row.label || row.home || row.away);
    return { title: item.title, rows };
  }).filter(table => table.rows.length);
}

function parseTrends(html) {
  const start = html.indexOf('match-insights-card--trends');
  if (start < 0) return [];
  const endCandidates = ['player-leaderboard-card', 'league-table-card']
    .map(term => html.indexOf(term, start + 1))
    .filter(index => index > start);
  const end = endCandidates.length ? Math.min(...endCandidates) : html.length;
  const slice = html.slice(start, end);
  const teamHeads = [...slice.matchAll(/<div[^>]*class=["'][^"']*\bmatch-insights-team-head\b[^"']*["'][^>]*>[\s\S]*?<img\b([^>]*)>[\s\S]*?<span[^>]*class=["'][^"']*\bmatch-insights-team-name\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi)]
    .map(match => ({ index: match.index, name: cleanText(match[2]), logo: absoluteUrl(attr(match[1], 'src')) }));

  return teamHeads.map((team, index) => {
    const nextIndex = teamHeads[index + 1]?.index || slice.length;
    const block = slice.slice(team.index, nextIndex);
    const items = [...block.matchAll(/<div[^>]*class=["'][^"']*\bmatch-insights-team-row\b[^"']*["'][^>]*>[\s\S]*?<span[^>]*class=["'][^"']*\bmatch-insights-team-label\b[^"']*["'][^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class=["'][^"']*\bmatch-insights-team-value\b([^"']*)["'][^>]*>([\s\S]*?)<\/span>/gi)]
      .map(match => ({ label: cleanText(match[1]), value: cleanText(match[3]), tone: cleanText(match[2]).replace(/^--/, '') }))
      .filter(item => item.label || item.value);
    return { team: team.name, logo: team.logo, items };
  }).filter(team => team.items.length);
}

function parseLeaderboards(html) {
  const titles = [...String(html || '').matchAll(/<span[^>]*class=["'][^"']*\bplayer-leaderboard-title\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi)]
    .map(match => ({ index: match.index, title: cleanText(match[1]) }))
    .filter(item => item.title);

  return titles.map((item, index) => {
    const nextIndex = titles[index + 1]?.index || html.length;
    const slice = html.slice(item.index, nextIndex);
    const headers = [...slice.matchAll(/<div[^>]*class=["'][^"']*\bplayer-leaderboard-head\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)]
      .flatMap(match => [...match[1].matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)].map(span => cleanText(span[1])))
      .filter(Boolean);
    const metricHeaders = headers.slice(1);
    const rows = [...slice.matchAll(/<div[^>]*class=["'][^"']*\bplayer-leaderboard-row\b[^"']*["'][^>]*>([\s\S]*?)(?=<div[^>]*class=["'][^"']*\bplayer-leaderboard-row\b|<\/div>\s*<\/div>\s*<div[^>]*class=["'][^"']*\bgame-card\b|$)/gi)]
      .map(match => {
        const row = match[1];
        const metrics = [...row.matchAll(/<span[^>]*class=["'][^"']*\bplayer-leaderboard-badge\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi)].map(metric => cleanText(metric[1]));
        return {
          name: firstMatch(row, /<span[^>]*class=["'][^"']*\bplayer-leaderboard-name\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i),
          team: firstMatch(row, /<span[^>]*class=["'][^"']*\bplayer-leaderboard-team-name\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i),
          avatar: absoluteUrl(attr((row.match(/<img\b[^>]*class=["'][^"']*\bplayer-leaderboard-avatar\b[^>]*>/i) || [''])[0], 'src')),
          metrics: Object.fromEntries(metricHeaders.map((header, metricIndex) => [header, metrics[metricIndex] || '']))
        };
      })
      .filter(row => row.name);
    return { title: item.title, headers, rows };
  }).filter(board => board.rows.length);
}

function parseTheoGame(html, sourceUrl = '') {
  const match = {
    id: (sourceUrl.match(/\/game\/(\d+)/) || [])[1] || '',
    sourceUrl,
    competition: firstMatch(html, /<div[^>]*class=["'][^"']*\bcard-match-competition\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i),
    time: firstMatch(html, /<span[^>]*class=["'][^"']*\bcard-match-center-time\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i),
    date: firstMatch(html, /<span[^>]*class=["'][^"']*\bcard-match-center-date\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i),
    status: firstMatch(html, /<span[^>]*class=["'][^"']*\bcard-match-center-status\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i),
    home: parseTeamHeader(html, 'home'),
    away: parseTeamHeader(html, 'away')
  };

  return {
    source: 'theo-borges',
    match,
    recentForm: parseFormPayloads(html),
    tables: parseStatTables(html),
    trends: parseTrends(html),
    leaderboards: parseLeaderboards(html)
  };
}

async function fetchTheoMatches(input = {}) {
  const config = normalizeTheoConfig(input);
  let url = input.url && /\/matches\b/i.test(input.url)
    ? input.url
    : buildTheoUrl('/matches', { dia: config.day, t: config.token }, config.baseUrl);
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('dia', config.day);
    if (config.token) parsed.searchParams.set('t', config.token);
    url = parsed.toString();
  } catch (_) {}
  const html = await fetchHtml(url);
  return parseTheoMatches(html, url);
}

async function fetchTheoGame(input = {}) {
  const config = normalizeTheoConfig(input);
  const url = input.url || input.detailUrl || (input.id
    ? buildTheoUrl(`/game/${input.id}`, { dia: config.day, mode: input.mode || 'overall', t: config.token }, config.baseUrl)
    : '');
  if (!url) throw new Error('Informe url/detailUrl ou id do jogo Theo Borges.');
  const html = await fetchHtml(url);
  return parseTheoGame(html, url);
}

module.exports = {
  fetchTheoMatches,
  fetchTheoGame,
  parseTheoMatches,
  parseTheoGame
};
