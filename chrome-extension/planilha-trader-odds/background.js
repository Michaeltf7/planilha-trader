const API = 'http://127.0.0.1:38465';
const BASE_HEADERS = { 'x-planilha-trader': 'extension-v1' };
const PROVIDERS = {
  bet365: 'https://www.bet365.bet.br/#/IP/B1'
};
const managedTabs = new Map();
let detectedBrowserPromise = null;
let managedTabsRestored = false;
let pollInFlight = false;
let collectorTokenValue = '';

async function collectorToken() {
  const tabs = await chrome.tabs.query({ url: 'https://www.bet365.bet.br/*' }).catch(() => []);
  const candidates = tabs.map(tab => {
    try {
      const token = new URL(tab.url || tab.pendingUrl || '').searchParams.get('planilha_collector') || '';
      return { token, lastAccessed: Number(tab.lastAccessed) || 0 };
    } catch (_) {
      return { token: '', lastAccessed: 0 };
    }
  }).filter(item => item.token).sort((left, right) => right.lastAccessed - left.lastAccessed);
  if (candidates[0]?.token) {
    collectorTokenValue = candidates[0].token;
    await chrome.storage.local.set({ planilha_collector_token: collectorTokenValue }).catch(() => {});
  }
  if (collectorTokenValue) return collectorTokenValue;
  const saved = await chrome.storage.local.get('planilha_collector_token').catch(() => ({}));
  collectorTokenValue = String(saved?.planilha_collector_token || '');
  return collectorTokenValue;
}

async function apiHeaders() {
  const token = await collectorToken();
  return token ? { ...BASE_HEADERS, 'x-planilha-client': token } : BASE_HEADERS;
}

async function persistManagedTabs() {
  const records = Object.fromEntries(managedTabs.entries());
  await chrome.storage.local.set({ planilha_managed_odds_tabs: records }).catch(() => {});
}

async function restoreManagedTabs() {
  if (managedTabsRestored) return;
  managedTabsRestored = true;
  const saved = await chrome.storage.local.get('planilha_managed_odds_tabs').catch(() => ({}));
  const records = saved?.planilha_managed_odds_tabs || {};
  for (const [key, managed] of Object.entries(records)) {
    const provider = key.slice(key.lastIndexOf(':') + 1);
    if (managed?.tabId && await isProviderTab(managed.tabId, provider)) managedTabs.set(key, managed);
  }
  await persistManagedTabs();
}

async function detectedBrowser() {
  if (!detectedBrowserPromise) detectedBrowserPromise = (async () => {
    const userAgent = navigator.userAgent || '';
    if (/Edg\//i.test(userAgent)) return 'edge';
    if (/OPR\//i.test(userAgent)) return 'opera';
    try {
      if (navigator.brave && await navigator.brave.isBrave()) return 'brave';
    } catch (_) {}
    return 'chrome';
  })();
  return detectedBrowserPromise;
}

async function closeManagedTabs(includeOrphanPopups = false) {
  const windowIds = new Set();
  for (const [managedKey, managed] of managedTabs.entries()) {
    managedTabs.delete(managedKey);
    if (managed.managedWindow && managed.windowId) windowIds.add(managed.windowId);
    else if (await tabExists(managed.tabId)) chrome.tabs.remove(managed.tabId).catch(() => {});
  }
  if (includeOrphanPopups) {
    const tabs = await chrome.tabs.query({ url: ['https://www.bet365.bet.br/*', 'https://www.betfair.bet.br/exchange/plus/*'] }).catch(() => []);
    for (const tab of tabs) {
      const browserWindow = await chrome.windows.get(tab.windowId).catch(() => null);
      if (browserWindow?.type === 'popup') windowIds.add(tab.windowId);
    }
  }
  for (const windowId of windowIds) await chrome.windows.remove(windowId).catch(() => {});
  await persistManagedTabs();
}

async function tabExists(tabId) {
  try {
    await chrome.tabs.get(tabId);
    return true;
  } catch (_) {
    return false;
  }
}

async function isProviderTab(tabId, provider) {
  try {
    const tab = await chrome.tabs.get(tabId);
    const url = String(tab?.url || tab?.pendingUrl || '');
    if (provider === 'bet365') return /^https:\/\/(?:www\.)?bet365\.bet\.br\//i.test(url);
    if (provider === 'betfair') return /^https:\/\/(?:www\.)?betfair\.bet\.br\//i.test(url);
    return false;
  } catch (_) {
    return false;
  }
}

async function sendTarget(tabId, command) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'planilha-target',
      command: { ...command, collectorToken: await collectorToken() }
    });
    return true;
  } catch (_) {}
  return false;
}

async function claimAvailableProviderTab(provider) {
  const claimedIds = new Set(Array.from(managedTabs.values()).map(item => item.tabId));
  const patterns = provider === 'bet365'
    ? ['https://www.bet365.bet.br/*']
    : ['https://www.betfair.bet.br/*'];
  const tabs = await chrome.tabs.query({ url: patterns }).catch(() => []);
  const tab = tabs.find(candidate => Number.isInteger(candidate.id) && !claimedIds.has(candidate.id));
  if (!tab) return null;
  return { tabId: tab.id, windowId: tab.windowId, managedWindow: true };
}

async function ensureCommandTab(command, provider) {
  const managedKey = `${command.feedId}:${provider}`;
  let managed = managedTabs.get(managedKey);
  let tabId = managed?.tabId;
  if (tabId && !(await isProviderTab(tabId, provider))) {
    managedTabs.delete(managedKey);
    tabId = null;
  }
  if (!tabId) {
    managed = await claimAvailableProviderTab(provider);
    tabId = managed?.tabId;
    if (tabId) {
      managedTabs.set(managedKey, managed);
      await persistManagedTabs();
      chrome.tabs.update(tabId, { autoDiscardable: false }).catch(() => {});
    }
  }
  if (!tabId) {
    try {
      const created = await chrome.windows.create({
        url: PROVIDERS[provider],
        type: 'popup',
        focused: true,
        width: 1180,
        height: 820
      });
      const tab = created.tabs?.[0];
      tabId = tab?.id;
      managed = { tabId, windowId: created.id, managedWindow: true };
    } catch (_) {
      const tab = await chrome.tabs.create({ url: PROVIDERS[provider], active: true });
      tabId = tab.id;
      managed = { tabId, windowId: tab.windowId, managedWindow: false };
    }
    if (!tabId) return;
    managedTabs.set(managedKey, managed);
    await persistManagedTabs();
    chrome.tabs.update(tabId, { autoDiscardable: false }).catch(() => {});
  }
  await sendTarget(tabId, { ...command, provider });
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'planilha-scan' });
  } catch (_) {}
}

async function pollCommands() {
  if (pollInFlight) return;
  pollInFlight = true;
  try {
    await restoreManagedTabs();
    const browser = await detectedBrowser();
    const response = await fetch(`${API}/commands?browser=${encodeURIComponent(browser)}`, { headers: await apiHeaders(), cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    const commands = Array.isArray(data.commands) ? data.commands : [];
    const activeIds = new Set(commands.flatMap(command => Object.keys(PROVIDERS).map(provider => `${command.feedId}:${provider}`)));
    for (const command of commands) {
      for (const provider of Object.keys(PROVIDERS)) await ensureCommandTab(command, provider);
    }
    for (const [managedKey, managed] of managedTabs.entries()) {
      if (activeIds.has(managedKey)) continue;
      managedTabs.delete(managedKey);
      if (managed.managedWindow && managed.windowId) chrome.windows.remove(managed.windowId).catch(() => {});
      else if (await tabExists(managed.tabId)) chrome.tabs.remove(managed.tabId).catch(() => {});
    }
    await persistManagedTabs();
  } catch (_) {
  } finally {
    pollInFlight = false;
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'complete') return;
  for (const [managedKey, managed] of managedTabs.entries()) {
    if (managed.tabId !== tabId) continue;
    const separator = managedKey.lastIndexOf(':');
    const feedId = managedKey.slice(0, separator);
    const provider = managedKey.slice(separator + 1);
    detectedBrowser().then(async browser => fetch(`${API}/commands?browser=${encodeURIComponent(browser)}`, { headers: await apiHeaders(), cache: 'no-store' }))
      .then(response => response.json())
      .then(async data => {
        const command = (data.commands || []).find(item => item.feedId === feedId);
        if (command) sendTarget(tabId, { ...command, provider });
      })
      .catch(() => {});
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  for (const [managedKey, managed] of managedTabs.entries()) {
    if (managed.tabId === tabId) managedTabs.delete(managedKey);
  }
  persistManagedTabs();
});

chrome.alarms.create('planilha-odds-poll', { periodInMinutes: 0.1 });
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'planilha-odds-poll') pollCommands();
});
setInterval(pollCommands, 1500);
pollCommands();
