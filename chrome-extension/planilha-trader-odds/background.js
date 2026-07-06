const API = 'http://127.0.0.1:38465';
const HEADERS = { 'x-planilha-trader': 'extension-v1' };
const PROVIDERS = {
  bet365: 'https://www.bet365.bet.br/#/IP/B1'
};
const managedTabs = new Map();
let detectedBrowserPromise = null;
let managedTabsRestored = false;
let pollInFlight = false;

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
    if (managed?.tabId && await tabExists(managed.tabId)) managedTabs.set(key, managed);
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

async function sendTarget(tabId, command) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'planilha-target', command });
  } catch (_) {}
}

async function ensureCommandTab(command, provider) {
  const managedKey = `${command.feedId}:${provider}`;
  let managed = managedTabs.get(managedKey);
  let tabId = managed?.tabId;
  if (tabId && !(await tabExists(tabId))) {
    managedTabs.delete(managedKey);
    tabId = null;
  }
  if (!tabId) {
    try {
      const created = await chrome.windows.create({ url: PROVIDERS[provider], focused: false, state: 'minimized', type: 'popup' });
      const tab = created.tabs?.[0];
      tabId = tab?.id;
      managed = { tabId, windowId: created.id, managedWindow: true };
      if (created.id) chrome.windows.update(created.id, { state: 'minimized', focused: false }).catch(() => {});
    } catch (_) {
      const tab = await chrome.tabs.create({ url: PROVIDERS[provider], active: false });
      tabId = tab.id;
      managed = { tabId, windowId: tab.windowId, managedWindow: false };
    }
    if (!tabId) return;
    managedTabs.set(managedKey, managed);
    await persistManagedTabs();
    if (managed.managedWindow && managed.windowId) chrome.windows.update(managed.windowId, { state: 'minimized', focused: false }).catch(() => {});
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
    const response = await fetch(`${API}/commands?browser=${encodeURIComponent(browser)}`, { headers: HEADERS, cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    if (data.selectedBrowser && data.selectedBrowser !== await detectedBrowser()) {
      await closeManagedTabs(true);
      return;
    }
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
    detectedBrowser().then(browser => fetch(`${API}/commands?browser=${encodeURIComponent(browser)}`, { headers: HEADERS, cache: 'no-store' }))
      .then(response => response.json())
      .then(async data => {
        if (data.selectedBrowser && data.selectedBrowser !== await detectedBrowser()) {
          await closeManagedTabs(true);
          return;
        }
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
