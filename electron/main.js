const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { app, BrowserWindow, ipcMain, Menu, shell, session, nativeImage, dialog } = require('electron');

const childWindows = new Set();
const replicaWindows = new Map();
const nativeReplicaProcesses = new Set();
const wradarRealModFeeds = new Map();

if (process.env.PLANILHA_TRADER_PORTABLE_DATA) {
  app.setPath('userData', path.resolve(process.env.PLANILHA_TRADER_PORTABLE_DATA));
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1420,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Planilha Trader',
    backgroundColor: '#f4f7fe',
    autoHideMenuBar: true,
    show: false,
    webPreferences: baseWebPreferences()
  });

  configureWindow(win, true);
  win.once('ready-to-show', () => {
    if (win.isDestroyed()) return;
    win.maximize();
    win.show();
  });
  win.loadFile(path.join(__dirname, '..', 'index.html'));
  return win;
}

function getAppResourcePath(...parts) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', ...parts);
  }
  return path.join(__dirname, '..', ...parts);
}

function setupAutoUpdater(win) {
  if (!app.isPackaged || process.env.PLANILHA_TRADER_DISABLE_AUTO_UPDATE === '1') return;

  let autoUpdater;
  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch (error) {
    console.warn('Auto-update indisponivel:', error?.message || error);
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', error => {
    console.warn('Falha no auto-update:', error?.message || error);
  });

  autoUpdater.on('update-downloaded', info => {
    if (!win || win.isDestroyed()) return;
    dialog.showMessageBox(win, {
      type: 'info',
      buttons: ['Reiniciar agora', 'Depois'],
      defaultId: 0,
      cancelId: 1,
      title: 'Atualizacao pronta',
      message: `Planilha Trader ${info?.version || ''} foi baixado.`,
      detail: 'Reinicie o programa para aplicar a nova versao.'
    }).then(result => {
      if (result.response === 0) autoUpdater.quitAndInstall(false, true);
    }).catch(() => {});
  });

  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(error => {
      console.warn('Nao foi possivel verificar atualizacoes:', error?.message || error);
    });
  }, 5000);
}

function baseWebPreferences() {
  return {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false,
    webSecurity: true,
    backgroundThrottling: false
  };
}

function configureWindow(win, isMain = false) {
  win.setMenuBarVisibility(false);
  const windowWebContentsId = win.webContents.id;

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(about|javascript|data|blob|devtools):/i.test(url)) {
      return { action: 'deny' };
    }

    if (/^file:\/\//i.test(url)) {
      const child = createExternalWindow(url);
      return { action: 'deny' };
    }

    if (!/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }

    const child = createExternalWindow(url);
    return { action: 'deny' };
  });

  win.webContents.on('did-finish-load', () => {
    if (!isMain && !win.isDestroyed() && !win.webContents.isDestroyed()) injectHighlightButton(win);
  });

  win.on('closed', () => {
    childWindows.delete(win);
    for (const [id, item] of replicaWindows.entries()) {
      if (item.sourceId === windowWebContentsId) {
        clearInterval(item.timer);
        if (!item.window.isDestroyed()) item.window.close();
        replicaWindows.delete(id);
      }
    }
  });
}

function createExternalWindow(url) {
  const child = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 760,
    minHeight: 520,
    title: 'Planilha Trader - Externo',
    backgroundColor: '#050914',
    autoHideMenuBar: true,
    webPreferences: baseWebPreferences()
  });

  childWindows.add(child);
  child.setResizable(true);
  child.setMaximizable(true);
  configureWindow(child, false);
  child.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  child.loadURL(url);
  return child;
}

function createCustomWRadarWindow(payload) {
  const child = new BrowserWindow({
    width: 1220,
    height: 260,
    minWidth: 520,
    minHeight: 150,
    title: 'Radar MOD Proprio',
    backgroundColor: '#f8fafc',
    transparent: false,
    frame: true,
    resizable: true,
    maximizable: true,
    thickFrame: true,
    autoHideMenuBar: true,
    webPreferences: baseWebPreferences()
  });

  childWindows.add(child);
  configureWindow(child, false);
  const encodedPayload = Buffer.from(JSON.stringify(payload || {}), 'utf8').toString('base64url');
  child.loadFile(path.join(__dirname, 'custom-radar-window.html'), {
    query: { payload: encodedPayload }
  });
  return child;
}

ipcMain.handle('wradar-real-mod:open-window', async (_event, payload) => {
  const win = createCustomWRadarWindow(payload);
  return { ok: true, windowId: win.id };
});

ipcMain.handle('wradar-real-mod:resize-window', async (event, payload = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return { ok: false };
  const [width, height] = win.getSize();
  const nextWidth = Math.max(520, Math.min(1800, width + Math.round(Number(payload.widthDelta) || 0)));
  const nextHeight = Math.max(180, Math.min(1000, height + Math.round(Number(payload.heightDelta) || 0)));
  win.setSize(nextWidth, nextHeight, true);
  return { ok: true, width: nextWidth, height: nextHeight };
});

function injectHighlightButton(win) {
  if (win.isDestroyed()) return;
  win.webContents.executeJavaScript(`
    (() => {
      if (window.__traderHighlightInjected) return;
      window.__traderHighlightInjected = true;
      const btn = document.createElement('button');
      btn.id = 'trader-highlight-button';
      btn.type = 'button';
      btn.textContent = 'Destacar';
      btn.title = 'Selecionar area e destacar em janela always-on-top';
      Object.assign(btn.style, {
        position: 'fixed',
        right: '14px',
        top: '14px',
        zIndex: '2147483647',
        border: '1px solid rgba(245,158,11,.55)',
        borderRadius: '10px',
        background: '#f59e0b',
        color: '#111827',
        padding: '8px 11px',
        fontFamily: 'Arial,sans-serif',
        fontSize: '12px',
        fontWeight: '900',
        cursor: 'pointer',
        boxShadow: '0 8px 20px rgba(0,0,0,.28)'
      });
      btn.addEventListener('click', () => window.traderDesktopHighlight.startSelection());
      document.documentElement.appendChild(btn);
    })();
  `).catch(() => {});
}

async function createReplica(sourceWebContents, rect, title) {
  const id = `${sourceWebContents.id}-${Date.now()}`;
  const replica = new BrowserWindow({
    width: Math.max(260, Math.round(rect.width)),
    height: Math.max(160, Math.round(rect.height)),
    minWidth: 180,
    minHeight: 100,
    title: `Destaque - ${title || 'Janela'}`,
    alwaysOnTop: true,
    resizable: true,
    movable: true,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#00000000',
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'replica-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  replica.setAlwaysOnTop(true, 'screen-saver');
  replica.loadFile(path.join(__dirname, 'replica.html'));

  const item = {
    id,
    sourceId: sourceWebContents.id,
    sourceWebContents,
    rect: normalizeRect(rect),
    window: replica,
    originalSize: {
      width: Math.max(260, Math.round(rect.width)),
      height: Math.max(160, Math.round(rect.height))
    },
    captureDelay: 250,
    quality: 72,
    paused: false,
    captureInProgress: false,
    drag: null,
    timer: null
  };

  replicaWindows.set(id, item);
  configureReplicaControls(item);

  replica.on('closed', () => {
    clearTimeout(item.timer);
    replicaWindows.delete(id);
  });

  replica.webContents.once('did-finish-load', () => scheduleReplicaUpdate(item, true));
}

async function createCustomRadarOverlayReplica(sourceWebContents, rect, title) {
  const id = `${sourceWebContents.id}-radar-overlay-${Date.now()}`;
  const normalizedRect = normalizeRect(rect);
  const sourceWindow = BrowserWindow.fromWebContents(sourceWebContents);
  const [sourceX, sourceY] = sourceWindow && !sourceWindow.isDestroyed()
    ? sourceWindow.getPosition()
    : [0, 0];
  const snapshot = await sourceWebContents.executeJavaScript(`
    (() => window.__customRadarOverlaySnapshot ? window.__customRadarOverlaySnapshot() : null)()
  `, true).catch(() => null);

  if (!snapshot?.event?.id) return false;

  const overlay = new BrowserWindow({
    width: Math.max(260, normalizedRect.width),
    height: Math.max(120, normalizedRect.height),
    x: sourceX + normalizedRect.x,
    y: sourceY + normalizedRect.y,
    minWidth: 180,
    minHeight: 80,
    title: `Destaque - ${title || 'Radar MOD'}`,
    alwaysOnTop: true,
    resizable: true,
    movable: true,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#00000000',
    transparent: true,
    webPreferences: baseWebPreferences()
  });

  const payload = {
    event: snapshot.event,
    density: 'compact',
    overlayReplica: true
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.loadFile(path.join(__dirname, 'custom-radar-window.html'), {
    query: { payload: encodedPayload }
  });

  const item = {
    id,
    sourceId: sourceWebContents.id,
    sourceWebContents,
    rect: normalizedRect,
    window: overlay,
    originalSize: {
      width: Math.max(260, normalizedRect.width),
      height: Math.max(120, normalizedRect.height)
    },
    captureDelay: 250,
    quality: 72,
    paused: false,
    captureInProgress: false,
    drag: null,
    timer: null,
    isLiveOverlay: true
  };

  replicaWindows.set(id, item);
  configureReplicaControls(item);
  overlay.on('closed', () => {
    clearTimeout(item.timer);
    replicaWindows.delete(id);
  });
  return true;
}

function configureReplicaControls(item) {
  const win = item.window;
  let moving = false;
  let moveOffset = null;
  let moveTimer = null;

  const stopMoving = () => {
    moving = false;
    moveOffset = null;
    if (moveTimer) {
      clearInterval(moveTimer);
      moveTimer = null;
    }
  };

  const moveToCursor = () => {
    if (!moving || !moveOffset || win.isDestroyed()) return;
    const displayPoint = require('electron').screen.getCursorScreenPoint();
    win.setPosition(displayPoint.x - moveOffset.x, displayPoint.y - moveOffset.y);
  };

  win.webContents.on('context-menu', () => showReplicaMenu(item));
  win.on('blur', stopMoving);
  win.on('closed', stopMoving);

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === '+' || input.key === '=') {
      event.preventDefault();
      zoomReplicaWindow(win, 1.08);
    }
    if (input.key === '-' || input.key === '_') {
      event.preventDefault();
      zoomReplicaWindow(win, 0.92);
    }
    if (String(input.key).toLowerCase() === 'm') {
      event.preventDefault();
      showReplicaMenu(item);
    }
    if (input.key === 'Escape') {
      event.preventDefault();
      win.close();
    }
  });

  win.webContents.on('before-mouse-event', (event, input) => {
    if (input.button === 'right' && input.type === 'mouseDown') {
      event.preventDefault();
      showReplicaMenu(item);
      return;
    }

    if (item.isLiveOverlay) return;

    if (input.type === 'mouseWheel') {
      event.preventDefault();
      zoomReplicaWindow(win, input.deltaY < 0 ? 1.08 : 0.92);
      return;
    }

    if (input.button === 'left' && input.type === 'mouseDown') {
      moving = true;
      const [x, y] = win.getPosition();
      moveOffset = { x: input.x, y: input.y, winX: x, winY: y };
      if (!moveTimer) moveTimer = setInterval(moveToCursor, 16);
      event.preventDefault();
      return;
    }

    if (input.type === 'mouseMove' && moving && moveOffset) {
      moveToCursor();
      event.preventDefault();
      return;
    }

    if (input.button === 'left' && input.type === 'mouseUp') {
      stopMoving();
      event.preventDefault();
    }
  });
}

function normalizeRect(rect) {
  return {
    x: Math.max(0, Math.round(rect.x || 0)),
    y: Math.max(0, Math.round(rect.y || 0)),
    width: Math.max(20, Math.round(rect.width || 20)),
    height: Math.max(20, Math.round(rect.height || 20))
  };
}

async function updateReplica(item) {
  if (!item || item.window.isDestroyed() || item.sourceWebContents.isDestroyed()) return;
  if (item.paused) return;
  if (item.captureInProgress) {
    scheduleReplicaUpdate(item);
    return;
  }

  item.captureInProgress = true;
  try {
    const image = await item.sourceWebContents.capturePage(item.rect);
    if (!image || image.isEmpty()) return;
    const png = shouldChromaKeyReplica(item)
      ? chromaKeyDarkBackground(image).toPNG()
      : image.toPNG();
    item.window.webContents.send('replica-frame', {
      dataUrl: `data:image/png;base64,${png.toString('base64')}`,
      chromaKey: shouldChromaKeyReplica(item)
    });
  } catch (_) {
  } finally {
    item.captureInProgress = false;
    scheduleReplicaUpdate(item);
  }
}

function shouldChromaKeyReplica(item) {
  try {
    const url = item?.sourceWebContents?.getURL?.() || '';
    return url.includes('custom-radar-window.html');
  } catch (_) {
    return false;
  }
}

function chromaKeyDarkBackground(image) {
  const size = image.getSize();
  const bitmap = Buffer.from(image.toBitmap());
  const pixelCount = Math.floor(bitmap.length / 4);

  for (let i = 0; i < pixelCount; i += 1) {
    const offset = i * 4;
    const b = bitmap[offset];
    const g = bitmap[offset + 1];
    const r = bitmap[offset + 2];
    const a = bitmap[offset + 3];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    if (a && max <= 118 && (max - min) <= 42) {
      bitmap[offset + 3] = 0;
    } else if (a && max <= 155 && (max - min) <= 50) {
      bitmap[offset + 3] = Math.round(a * Math.max(0, (max - 118) / 37));
    }
  }

  return nativeImage.createFromBitmap(bitmap, {
    width: size.width,
    height: size.height,
    scaleFactor: image.getScaleFactors?.()[0] || 1
  });
}

function scheduleReplicaUpdate(item, immediate = false) {
  if (!item || item.window.isDestroyed() || item.paused) return;
  clearTimeout(item.timer);
  item.timer = setTimeout(() => updateReplica(item), immediate ? 0 : item.captureDelay);
}

function normalizeWRadarRealModPayload(payload) {
  const eventId = String(payload?.eventId || '').replace(/\D/g, '');
  if (!eventId) return null;
  return {
    eventId,
    title: String(payload?.title || ''),
    locale: String(payload?.locale || 'pt-pt')
  };
}

function buildWRadarScoreboardModUrl(payload) {
  const url = new URL('https://wradar.com.br/scoreboard/index.mod.html');
  url.searchParams.set('eventId', payload.eventId);
  if (payload.title) url.searchParams.set('title', payload.title);
  url.searchParams.set('locale', payload.locale || 'pt-pt');
  return url.toString();
}

function createWRadarRealModWindow(payload) {
  const win = new BrowserWindow({
    width: 980,
    height: 420,
    show: false,
    title: `WRadar Feed ${payload.eventId}`,
    backgroundColor: '#051d41',
    autoHideMenuBar: true,
    webPreferences: {
      ...baseWebPreferences(),
      backgroundThrottling: false
    }
  });

  win.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  win.loadURL(buildWRadarScoreboardModUrl(payload));
  return win;
}

function scrapeWRadarRealModScript() {
  return `(() => {
    const text = (selector, root = document) => (root.querySelector(selector)?.textContent || '').trim();
    const html = (selector, root = document) => root.querySelector(selector)?.innerHTML || '';
    const attr = (selector, name, root = document) => root.querySelector(selector)?.getAttribute(name) || '';
    const clean = value => String(value || '').replace(/\\s+/g, ' ').trim();
    const readScore = () => {
      const raw = clean(text('.topScore[data-push="score"]') || text('[data-push="score"]'));
      const match = raw.match(/(\\d+)\\s*[-:x]\\s*(\\d+)/i);
      return { raw, home: match ? Number(match[1]) : null, away: match ? Number(match[2]) : null };
    };
    const homeName = clean(text('.team_name[data-push="homeName"]'));
    const awayName = clean(text('.team_name[data-push="awayName"]'));
    const escapeRegex = value => String(value || '').replace(/[|\\\\{}()[\\]^$+*?.]/g, '\\\\$&');
    const homeRe = homeName ? new RegExp(escapeRegex(homeName), 'i') : null;
    const awayRe = awayName ? new RegExp(escapeRegex(awayName), 'i') : null;
    const readCommentaries = () => Array.from(document.querySelectorAll('#box_commentaries li, #commentaries li'))
      .map((li, index) => {
        const minute = clean(text('.minute', li));
        const seconds = clean(text('.seconds', li));
        const comment = clean(text('.comment_data', li) || li.textContent);
        const iconEl = li.querySelector('.comment_icon, [class*="comment_icon"]');
        const iconStyle = iconEl ? getComputedStyle(iconEl).backgroundImage : '';
        const all = clean(li.textContent);
        const side = awayRe?.test(all) ? 'away' : (homeRe?.test(all) ? 'home' : (/away|visitante|fora/i.test(all) ? 'away' : (/home|mandante|casa/i.test(all) ? 'home' : '')));
        return { index, minute, seconds, comment, all, side, iconStyle, className: li.className || '' };
      })
      .filter(item => item.comment || item.all);
    const readStats = () => {
      const stats = {};
      document.querySelectorAll('#stats [data-stat], [data-stat]').forEach(node => {
        const key = node.getAttribute('data-stat');
        if (!key || stats[key]) return;
        stats[key] = {
          home: clean(text('.home', node)),
          away: clean(text('.away', node)),
          label: clean(text('.stat-label', node))
        };
      });
      return stats;
    };
    const readTopStrip = () => Array.from(document.querySelectorAll('#svcr-top-stats-strip > *, #bottomContainer li, #bottomContainer span'))
      .map(node => clean(node.textContent))
      .filter(Boolean)
      .slice(0, 20);
    return {
      ok: true,
      href: location.href,
      homeName,
      awayName,
      score: readScore(),
      clock: clean(text('.clockWrapper span[data-push="clock"]') || text('[data-push="clock"]')),
      periodHtml: html('[data-holder="period"]'),
      periodSrc: attr('[data-holder="period"]', 'src'),
      commentaries: readCommentaries(),
      stats: readStats(),
      topStrip: readTopStrip(),
      capturedAt: Date.now()
    };
  })()`;
}

async function pollWRadarRealModFeed(feedId) {
  const feed = wradarRealModFeeds.get(feedId);
  if (!feed || !feed.window || feed.window.isDestroyed() || feed.owner.isDestroyed()) {
    cleanupWRadarRealModFeed(feedId);
    return;
  }

  try {
    const data = await feed.window.webContents.executeJavaScript(scrapeWRadarRealModScript(), true);
    const signature = JSON.stringify({
      score: data?.score,
      clock: data?.clock,
      first: data?.commentaries?.[0],
      count: data?.commentaries?.length,
      stats: data?.stats
    });
    if (signature !== feed.lastSignature) {
      feed.lastSignature = signature;
      feed.owner.send('wradar-real-mod:update', {
        feedId,
        eventId: feed.eventId,
        data
      });
    }
  } catch (error) {
    feed.owner.send('wradar-real-mod:update', {
      feedId,
      eventId: feed.eventId,
      error: error?.message || 'Falha ao ler scoreboard.'
    });
  } finally {
    const stillActive = wradarRealModFeeds.get(feedId);
    if (stillActive) {
      clearTimeout(stillActive.timer);
      stillActive.timer = setTimeout(() => pollWRadarRealModFeed(feedId), 250);
    }
  }
}

function cleanupWRadarRealModFeed(feedId) {
  const feed = wradarRealModFeeds.get(feedId);
  if (!feed) return;
  clearTimeout(feed.timer);
  if (feed.window && !feed.window.isDestroyed()) feed.window.close();
  wradarRealModFeeds.delete(feedId);
}

ipcMain.handle('highlight:create-replica', async (event, rect) => {
  const source = event.sender;
  const win = BrowserWindow.fromWebContents(source);
  if ((source.getURL() || '').includes('custom-radar-window.html')) {
    const opened = await createCustomRadarOverlayReplica(source, rect, win?.getTitle());
    if (opened) return true;
  }
  if (process.platform === 'win32' && createNativeDwmReplica(win, rect)) {
    return true;
  }
  await createReplica(source, rect, win?.getTitle());
  return true;
});

ipcMain.handle('highlight:open-url', async (_event, url) => {
  createExternalWindow(url);
  return true;
});

ipcMain.handle('wradar-real-mod:start', async (event, rawPayload) => {
  const payload = normalizeWRadarRealModPayload(rawPayload);
  if (!payload) throw new Error('EventId invalido para o Radar MOD real.');

  const owner = event.sender;
  const feedId = `${owner.id}:${payload.eventId}`;
  cleanupWRadarRealModFeed(feedId);

  const win = createWRadarRealModWindow(payload);
  const feed = {
    id: feedId,
    eventId: payload.eventId,
    owner,
    window: win,
    timer: null
  };
  wradarRealModFeeds.set(feedId, feed);

  const startPolling = () => {
    const active = wradarRealModFeeds.get(feedId);
    if (!active) return;
    clearTimeout(active.timer);
    active.timer = setTimeout(() => pollWRadarRealModFeed(feedId), 700);
  };

  win.webContents.on('did-finish-load', startPolling);
  win.webContents.on('did-fail-load', (_loadEvent, errorCode, errorDescription) => {
    if (!owner.isDestroyed()) {
      owner.send('wradar-real-mod:update', {
        feedId,
        eventId: payload.eventId,
        error: `${errorCode}: ${errorDescription}`
      });
    }
  });
  win.on('closed', () => cleanupWRadarRealModFeed(feedId));
  owner.once('destroyed', () => cleanupWRadarRealModFeed(feedId));

  return { feedId, eventId: payload.eventId };
});

ipcMain.handle('wradar-real-mod:stop', async (_event, feedId) => {
  cleanupWRadarRealModFeed(String(feedId || ''));
  return true;
});

function normalizeOddsRadarPayload(payload = {}) {
  const rawUrl = String(payload.url || '').trim();
  if (!rawUrl) throw new Error('URL obrigatoria para ler odds.');

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (_error) {
    throw new Error('URL invalida para o Radar de Odds.');
  }

  const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
  const allowedHosts = [
    'betfair.com',
    'betfair.com.br',
    'betfair.bet.br',
    'bet365.com',
    'bet365.com.br'
  ];

  if (!allowedHosts.some(allowed => host === allowed || host.endsWith(`.${allowed}`))) {
    throw new Error('Use uma URL da Betfair ou Bet365.');
  }

  const source = /bet365/i.test(host) ? 'bet365' : 'betfair-exchange';
  return {
    url: parsed.toString(),
    source
  };
}

function createOddsRadarWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    title: 'Radar de Odds',
    backgroundColor: '#f4f7fe',
    autoHideMenuBar: true,
    webPreferences: {
      ...baseWebPreferences(),
      backgroundThrottling: false
    }
  });

  win.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  return win;
}

function waitForOddsRadarLoad(win, timeoutMs = 25000) {
  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve();
    };

    const timer = setTimeout(finish, timeoutMs);
    win.webContents.once('did-finish-load', finish);
    win.webContents.once('did-fail-load', finish);
  });
}

function scrapeOddsRadarScript() {
  return `(() => {
    const clean = value => String(value || '').replace(/\\s+/g, ' ').trim();
    const priceRe = /(?<!\\d)(?:[1-9]\\d?|1)[\\.,]\\d{2}(?!\\d)/;
    const marketMatchRe = /match odds|resultado final|vencedor da partida|resultado da partida|1x2|empate|draw|home|away/i;
    const goalLineRe = /limite de gols|total goals|total de gols|over\\/?under|mais de|menos de|over|under|gols/i;

    const compactContext = text => clean(text).slice(0, 240);
    const readAround = node => {
      const chunks = [];
      let current = node;
      for (let i = 0; i < 4 && current; i += 1) {
        const txt = clean(current.innerText || current.textContent || '');
        if (txt) chunks.push(txt);
        current = current.parentElement;
      }
      return compactContext(chunks.sort((a, b) => b.length - a.length)[0] || clean(node.textContent));
    };

    const getLabel = (context, price) => {
      const cleaned = clean(context.replace(price, ' '));
      const parts = cleaned.split(/\\s(?=\\d+[\\.,]\\d{2})|\\s{2,}|\\|/).map(clean).filter(Boolean);
      return parts.find(part => !priceRe.test(part) && part.length <= 60) || cleaned.slice(0, 60) || 'Odd';
    };

    const nodes = Array.from(document.querySelectorAll('button, [role="button"], a, span, div'))
      .filter(node => {
        const text = clean(node.innerText || node.textContent || '');
        if (!priceRe.test(text)) return false;
        if (text.length > 260) return false;
        const rect = node.getBoundingClientRect?.();
        return !rect || rect.width > 0 || rect.height > 0;
      });

    const seen = new Set();
    const matchOdds = [];
    const goalLines = [];
    const samples = [];

    for (const node of nodes) {
      const text = clean(node.innerText || node.textContent || '');
      const match = text.match(priceRe);
      if (!match) continue;

      const price = match[0];
      const context = readAround(node);
      const key = [price, context.slice(0, 120)].join('|');
      if (seen.has(key)) continue;
      seen.add(key);

      const entry = {
        price,
        label: getLabel(context, price),
        context
      };

      if (goalLineRe.test(context)) goalLines.push(entry);
      else if (marketMatchRe.test(context) || matchOdds.length < 3) matchOdds.push(entry);
      else if (samples.length < 20) samples.push(entry);
    }

    return {
      ok: true,
      url: location.href,
      title: document.title,
      sourceTextLength: clean(document.body?.innerText || '').length,
      matchOdds: matchOdds.slice(0, 24),
      goalLines: goalLines.slice(0, 24),
      samples: samples.slice(0, 20),
      capturedAt: new Date().toISOString()
    };
  })()`;
}

ipcMain.handle('odds-radar:read', async (_event, rawPayload) => {
  const payload = normalizeOddsRadarPayload(rawPayload);
  const win = createOddsRadarWindow();

  try {
    const loadWait = waitForOddsRadarLoad(win);
    win.loadURL(payload.url).catch(() => {});
    await loadWait;
    await new Promise(resolve => setTimeout(resolve, 3500));
    const data = await win.webContents.executeJavaScript(scrapeOddsRadarScript(), true);
    return {
      ...data,
      source: payload.source
    };
  } finally {
    if (!win.isDestroyed()) win.close();
  }
});

ipcMain.handle('worldcup:espn-sync', async () => {
  return syncWorldCupEspn();
});

ipcMain.handle('app:info', async () => {
  return {
    version: app.getVersion(),
    packaged: app.isPackaged
  };
});

ipcMain.handle('worldcup:sync', async () => {
  return syncWorldCupData();
});

ipcMain.handle('worldcup:match-details', async (_event, payload = {}) => {
  return fetchWorldCupMatchDetails(payload);
});

ipcMain.handle('competitions:sync', async (_event, payload = {}) => {
  return syncCompetitionData(payload);
});

ipcMain.handle('competitions:match-details', async (_event, payload = {}) => {
  return fetchWorldCupMatchDetails(payload);
});

ipcMain.handle('calendar:by-date', async (_event, payload = {}) => {
  return fetchCalendarSofascoreDate(payload);
});

ipcMain.on('replica:show-menu', (event) => {
  const item = getReplicaBySender(event.sender);
  if (!item) return;
  showReplicaMenu(item);
});

function showReplicaMenu(item) {
  if (!item || !item.window || item.window.isDestroyed()) return;
  const win = item.window;
  const isTop = win.isAlwaysOnTop();
  const opacity = Math.round(win.getOpacity() * 100);
  const fps = Math.round(1000 / (item.captureDelay || 250));

  const menu = Menu.buildFromTemplate([
    {
      label: isTop ? 'Desligar sempre por cima' : 'Ligar sempre por cima',
      click: () => {
        win.setAlwaysOnTop(!isTop, 'screen-saver');
      }
    },
    { type: 'separator' },
    {
      label: 'Opacidade',
      submenu: [100, 90, 80, 70, 60, 50, 40, 30, 20].map(value => ({
        label: `${value}%`,
        type: 'radio',
        checked: opacity === value,
        click: () => win.setOpacity(value / 100)
      }))
    },
    { type: 'separator' },
    {
      label: item.paused ? 'Retomar captura' : 'Pausar captura',
      click: () => {
        item.paused = !item.paused;
        if (item.paused) clearTimeout(item.timer);
        else scheduleReplicaUpdate(item, true);
      }
    },
    {
      label: 'Desempenho',
      submenu: [2, 4, 6, 8, 12].map(value => ({
        label: `${value} FPS`,
        type: 'radio',
        checked: fps === value,
        click: () => {
          item.captureDelay = Math.round(1000 / value);
          scheduleReplicaUpdate(item, true);
        }
      }))
    },
    {
      label: 'Qualidade',
      submenu: [
        { label: 'Leve', value: 60 },
        { label: 'Normal', value: 72 },
        { label: 'Alta', value: 85 },
        { label: 'Muito alta', value: 92 }
      ].map(option => ({
        label: option.label,
        type: 'radio',
        checked: item.quality === option.value,
        click: () => {
          item.quality = option.value;
          scheduleReplicaUpdate(item, true);
        }
      }))
    },
    { type: 'separator' },
    {
      label: 'Tamanho original',
      click: () => {
        win.setSize(item.originalSize.width, item.originalSize.height);
      }
    },
    {
      label: 'Aumentar',
      click: () => zoomReplicaWindow(win, 1.12)
    },
    {
      label: 'Diminuir',
      click: () => zoomReplicaWindow(win, 0.88)
    },
    { type: 'separator' },
    {
      label: 'Fechar',
      click: () => win.close()
    }
  ]);

  menu.popup({ window: win });
}

ipcMain.on('replica:zoom', (event, direction) => {
  const item = getReplicaBySender(event.sender);
  if (!item) return;
  zoomReplicaWindow(item.window, direction > 0 ? 1.08 : 0.92);
});

ipcMain.on('replica:begin-drag', (event, point) => {
  const item = getReplicaBySender(event.sender);
  if (!item || item.window.isDestroyed()) return;
  const [x, y] = item.window.getPosition();
  item.drag = {
    startX: Number(point.x) || 0,
    startY: Number(point.y) || 0,
    winX: x,
    winY: y
  };
});

ipcMain.on('replica:drag-to', (event, point) => {
  const item = getReplicaBySender(event.sender);
  if (!item || !item.drag || item.window.isDestroyed()) return;
  const x = item.drag.winX + (Number(point.x) || 0) - item.drag.startX;
  const y = item.drag.winY + (Number(point.y) || 0) - item.drag.startY;
  item.window.setPosition(Math.round(x), Math.round(y));
});

ipcMain.on('replica:end-drag', (event) => {
  const item = getReplicaBySender(event.sender);
  if (item) item.drag = null;
});

function getReplicaBySender(sender) {
  for (const item of replicaWindows.values()) {
    if (!item.window.isDestroyed() && item.window.webContents.id === sender.id) return item;
  }
  return null;
}

function zoomReplicaWindow(win, factor) {
  if (!win || win.isDestroyed()) return;
  const [width, height] = win.getSize();
  const nextWidth = Math.max(140, Math.min(1600, Math.round(width * factor)));
  const nextHeight = Math.max(80, Math.min(1000, Math.round(height * factor)));
  win.setSize(nextWidth, nextHeight);
}

function formatEspnDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function formatBrazilIsoDate(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeEspnTeamName(name) {
  const value = String(name || '').trim();
  const aliases = {
    Czechia: 'Czech Republic',
    'Korea Republic': 'South Korea',
    "Côte d'Ivoire": 'Ivory Coast',
    'Cote d Ivoire': 'Ivory Coast',
    "Côte d'Ivoire": 'Ivory Coast',
    'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
    'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
    'Bosnia Herzegovina': 'Bosnia & Herzegovina',
    'Curaçao': 'Curacao',
    'CuraÃ§ao': 'Curacao',
    'United States': 'USA',
    Türkiye: 'Turkey'
  };
  return aliases[value] || value;
}

function getEspnParticipantName(event, index = 0) {
  return event?.participants?.[index]?.athlete?.displayName || '';
}

function incrementLeader(map, player, team, field) {
  if (!player || !team) return;
  const key = `${player}|${team}`;
  const item = map.get(key) || {
    player,
    team,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    games: 0,
    min: 0
  };
  item[field] += 1;
  map.set(key, item);
}

function inferWorldCupGroup(event) {
  const note = event?.competitions?.[0]?.altGameNote || event?.season?.slug || '';
  const match = String(note).match(/Group\s+([A-Z])/i);
  return match ? match[1] : '-';
}

function normalizeEspnStatus(status) {
  const type = status?.type || {};
  if (type.completed) return 'Encerrado';
  if (type.state === 'in') return 'Ao vivo';
  if (type.state === 'pre') return 'Agendado';
  return type.description || 'Agendado';
}

function normalizeEspnEvent(event) {
  const competition = event?.competitions?.[0] || {};
  const competitors = competition.competitors || [];
  const home = competitors.find(item => item.homeAway === 'home') || competitors[0] || {};
  const away = competitors.find(item => item.homeAway === 'away') || competitors[1] || {};
  const homeName = normalizeEspnTeamName(home.team?.displayName || home.team?.name || home.team?.shortDisplayName);
  const awayName = normalizeEspnTeamName(away.team?.displayName || away.team?.name || away.team?.shortDisplayName);
  const date = new Date(event.date || competition.date || competition.startDate || Date.now());
  const status = normalizeEspnStatus(event.status || competition.status);
  const completedOrLive = status === 'Encerrado' || status === 'Ao vivo';
  const venue = competition.venue || event.venue || {};
  const address = venue.address || {};
  const broadcasts = (competition.broadcasts || [])
    .flatMap(item => Array.isArray(item.names) ? item.names : [])
    .filter(Boolean);
  const links = Object.fromEntries((event.links || []).map(link => [link.shortText || link.text || link.rel?.[0], link.href]).filter(item => item[0] && item[1]));

  return {
    id: `espn-${event.id}`,
    espnId: event.id,
    group: inferWorldCupGroup(event),
    date: formatBrazilIsoDate(date),
    time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }),
    home: homeName,
    away: awayName,
    venue: venue.fullName || venue.displayName || event.venue?.displayName || '',
    city: address.city || '',
    status,
    statusDetail: event.status?.type?.shortDetail || competition.status?.type?.shortDetail || '',
    clock: event.status?.displayClock || competition.status?.displayClock || '',
    homeScore: completedOrLive && home.score !== undefined ? Number(home.score) : null,
    awayScore: completedOrLive && away.score !== undefined ? Number(away.score) : null,
    homeLogo: home.team?.logo || '',
    awayLogo: away.team?.logo || '',
    broadcasts: [...new Set(broadcasts)],
    links,
    source: 'ESPN'
  };
}

async function fetchEspnSummaryLeaders(match) {
  if (!match?.espnId || match.status === 'Agendado') {
    return { scorers: [], assists: [], cards: [] };
  }

  const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${encodeURIComponent(match.espnId)}`, {
    headers: {
      accept: 'application/json',
      'user-agent': 'Mozilla/5.0 PlanilhaTrader/1.0'
    }
  });

  if (!response.ok) return { scorers: [], assists: [], cards: [] };
  const data = await response.json();
  const keyEvents = Array.isArray(data.keyEvents) ? data.keyEvents : [];
  const scorers = [];
  const assists = [];
  const cards = [];

  keyEvents.forEach(event => {
    const type = event?.type?.type || '';
    const team = normalizeEspnTeamName(event?.team?.displayName || '');
    const text = String(event?.text || '');

    if (type === 'goal' && !/own goal/i.test(text)) {
      const scorer = getEspnParticipantName(event, 0);
      const assistant = /assisted by/i.test(text) ? getEspnParticipantName(event, 1) : '';
      if (scorer) scorers.push({ player: scorer, team });
      if (assistant) assists.push({ player: assistant, team });
    }

    if (type === 'yellow-card' || type === 'red-card') {
      const player = getEspnParticipantName(event, 0);
      if (player) cards.push({ player, team, card: type === 'red-card' ? 'red' : 'yellow' });
    }
  });

  return { scorers, assists, cards };
}

async function buildEspnTournamentLeaders(matches) {
  const scorerMap = new Map();
  const assistMap = new Map();
  const cardMap = new Map();
  const played = matches.filter(match => match.status !== 'Agendado' && match.espnId).slice(0, 80);

  for (const match of played) {
    try {
      const summary = await fetchEspnSummaryLeaders(match);
      summary.scorers.forEach(item => incrementLeader(scorerMap, item.player, item.team, 'goals'));
      summary.assists.forEach(item => incrementLeader(assistMap, item.player, item.team, 'assists'));
      summary.cards.forEach(item => incrementLeader(cardMap, item.player, item.team, item.card === 'red' ? 'redCards' : 'yellowCards'));
    } catch (error) {
      console.warn('Falha ao ler resumo ESPN:', match.espnId, error?.message || error);
    }
  }

  const sortBy = field => (a, b) => b[field] - a[field] || a.player.localeCompare(b.player);
  return {
    scorers: Array.from(scorerMap.values()).sort(sortBy('goals')),
    assists: Array.from(assistMap.values()).sort(sortBy('assists')),
    cards: Array.from(cardMap.values()).sort((a, b) => (b.yellowCards + b.redCards) - (a.yellowCards + a.redCards) || a.player.localeCompare(b.player))
  };
}

async function syncWorldCupEspn(options = {}) {
  const includeLeaders = options.includeLeaders !== false;
  const start = new Date('2026-06-11T12:00:00Z');
  const end = new Date('2026-07-19T12:00:00Z');
  const matches = [];
  const errors = [];

  for (let date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    const dateKey = formatEspnDate(date);
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dateKey}`;
    try {
      const response = await fetch(url, {
        headers: {
          accept: 'application/json',
          'user-agent': 'Mozilla/5.0 PlanilhaTrader/1.0'
        }
      });
      if (!response.ok) {
        errors.push({ date: dateKey, status: response.status });
        continue;
      }
      const data = await response.json();
      (data.events || []).forEach(event => {
        const normalized = normalizeEspnEvent(event);
        if (normalized.home && normalized.away) matches.push(normalized);
      });
    } catch (error) {
      errors.push({ date: dateKey, error: error.message });
    }
  }

  const unique = Array.from(new Map(matches.map(match => [match.espnId || `${match.date}-${match.home}-${match.away}`, match])).values())
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const leaders = includeLeaders
    ? await buildEspnTournamentLeaders(unique)
    : { scorers: [], assists: [], cards: [] };

  return {
    ok: unique.length > 0,
    source: 'ESPN',
    generatedAt: new Date().toISOString(),
    count: unique.length,
    matches: unique,
    scorers: leaders.scorers,
    assists: leaders.assists,
    cards: leaders.cards,
    errors
  };
}

function getPythonCandidates() {
  const candidates = [];
  if (process.env.PLANILHA_TRADER_PYTHON) candidates.push({ command: process.env.PLANILHA_TRADER_PYTHON, args: [] });
  const bundledPython = getAppResourcePath('tools', 'python_runtime', process.platform === 'win32' ? 'python.exe' : 'python');
  if (fs.existsSync(bundledPython)) candidates.push({ command: bundledPython, args: [] });
  candidates.push({ command: 'python', args: [] });
  if (process.platform === 'win32') candidates.push({ command: 'py', args: ['-3'] });
  return candidates;
}

function runPythonJsonScript(scriptPath, timeoutMs = 90000, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const candidates = getPythonCandidates();
    let index = 0;

    const tryNext = () => {
      const candidate = candidates[index++];
      if (!candidate) {
        reject(new Error('Python indisponivel para executar coletor Sofascore.'));
        return;
      }

      const child = spawn(candidate.command, [...candidate.args, scriptPath, ...extraArgs], {
        cwd: path.resolve(path.dirname(scriptPath), '..'),
        windowsHide: true,
        env: {
          ...process.env,
          PYTHONPATH: [
            getAppResourcePath('tools', 'python_deps'),
            process.env.PYTHONPATH || ''
          ].filter(Boolean).join(path.delimiter),
          PYTHONIOENCODING: 'utf-8'
        }
      });

      let stdout = '';
      let stderr = '';
      let settled = false;
      let spawnFailed = false;
      const timer = setTimeout(() => {
        settled = true;
        child.kill();
        reject(new Error('Timeout ao consultar Sofascore.'));
      }, timeoutMs);

      child.stdout.on('data', chunk => {
        stdout += chunk.toString('utf8');
      });
      child.stderr.on('data', chunk => {
        stderr += chunk.toString('utf8');
      });
      child.on('error', () => {
        clearTimeout(timer);
        if (settled) return;
        spawnFailed = true;
        tryNext();
      });
      child.on('close', code => {
        clearTimeout(timer);
        if (settled || spawnFailed) return;
        if (code !== 0 && !stdout.trim()) {
          reject(new Error(stderr.trim() || `Coletor Sofascore finalizou com codigo ${code}.`));
          return;
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Resposta invalida do coletor Sofascore: ${error.message}`));
        }
      });
    };

    tryNext();
  });
}

async function syncWorldCupSofascore() {
  const scriptPath = getAppResourcePath('tools', 'worldcup_sofascore_cffi.py');
  return runPythonJsonScript(scriptPath);
}

async function fetchWorldCupMatchDetails(payload = {}) {
  const eventId = Number(payload.sofascoreId || payload.eventId || 0);
  if (!eventId) {
    return { ok: false, source: 'Sofascore', error: 'Jogo sem ID do Sofascore.' };
  }
  const scriptPath = getAppResourcePath('tools', 'worldcup_sofascore_cffi.py');
  return runPythonJsonScript(scriptPath, 60000, ['details', String(eventId)]);
}

async function syncCompetitionData(payload = {}) {
  const uniqueTournamentId = Number(payload.uniqueTournamentId || 17);
  const seasonId = Number(payload.seasonId || 96668);
  const name = String(payload.name || 'Premier League');
  if (!uniqueTournamentId || !seasonId) {
    return { ok: false, source: 'Sofascore', error: 'Competicao sem IDs validos.' };
  }
  const scriptPath = getAppResourcePath('tools', 'worldcup_sofascore_cffi.py');
  return runPythonJsonScript(scriptPath, 120000, ['competition', String(uniqueTournamentId), String(seasonId), name]);
}

async function fetchCalendarSofascoreDate(payload = {}) {
  const dateKey = String(payload.date || payload.dateKey || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { ok: false, source: 'Sofascore', error: 'Data invalida para o calendario.' };
  }
  const scriptPath = getAppResourcePath('tools', 'worldcup_sofascore_cffi.py');
  return runPythonJsonScript(scriptPath, 90000, ['calendar', dateKey]);
}

function normalizeWorldCupName(value) {
  return normalizeEspnTeamName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getWorldCupMatchKey(match) {
  return `${match.date}|${normalizeWorldCupName(match.home)}|${normalizeWorldCupName(match.away)}`;
}

function getWorldCupReverseMatchKey(match) {
  return `${match.date}|${normalizeWorldCupName(match.away)}|${normalizeWorldCupName(match.home)}`;
}

function enrichSofascoreMatchesWithEspn(sofascoreMatches, espnMatches) {
  const espnByKey = new Map();
  for (const match of espnMatches || []) {
    espnByKey.set(getWorldCupMatchKey(match), match);
    espnByKey.set(getWorldCupReverseMatchKey(match), match);
  }

  return (sofascoreMatches || []).map(match => {
    const espn = espnByKey.get(getWorldCupMatchKey(match)) || espnByKey.get(getWorldCupReverseMatchKey(match));
    if (!espn) return match;
    return {
      ...match,
      espnId: espn.espnId || match.espnId,
      venue: match.venue || espn.venue || '',
      city: match.city || espn.city || '',
      broadcasts: Array.isArray(match.broadcasts) && match.broadcasts.length ? match.broadcasts : (espn.broadcasts || []),
      links: match.links || espn.links || {},
      homeLogo: match.homeLogo || espn.homeLogo || '',
      awayLogo: match.awayLogo || espn.awayLogo || ''
    };
  });
}

async function syncWorldCupData() {
  try {
    const sofascoreResult = await syncWorldCupSofascore();
    if (sofascoreResult?.ok && Array.isArray(sofascoreResult.matches) && sofascoreResult.matches.length > 0) {
      return {
        ...sofascoreResult,
        fallbackUsed: false
      };
    }
    return {
      ok: false,
      source: 'Sofascore',
      fallbackUsed: false,
      error: sofascoreResult?.error || 'Sofascore sem dados validos'
    };
  } catch (error) {
    return {
      ok: false,
      source: 'Sofascore',
      fallbackUsed: false,
      error: error?.message || String(error)
    };
  }
}

function createNativeDwmReplica(sourceWin, rect) {
  if (!sourceWin || sourceWin.isDestroyed()) return false;
  try {
    const sourceHwnd = nativeWindowHandleToDecimal(sourceWin.getNativeWindowHandle());
    if (!sourceHwnd || sourceHwnd === '0') return false;

    const display = require('electron').screen.getDisplayMatching(sourceWin.getBounds());
    const scale = display?.scaleFactor || 1;
    const scriptPath = getAppResourcePath('electron', 'dwm-replica.ps1');
    const args = [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      '-SourceHwnd',
      sourceHwnd,
      '-X',
      String(Math.round((rect.x || 0) * scale)),
      '-Y',
      String(Math.round((rect.y || 0) * scale)),
      '-W',
      String(Math.max(20, Math.round((rect.width || 20) * scale))),
      '-H',
      String(Math.max(20, Math.round((rect.height || 20) * scale))),
      '-Title',
      `Destaque - ${sourceWin.getTitle() || 'Janela'}`
    ];

    const child = spawn('powershell.exe', args, {
      detached: false,
      stdio: 'ignore',
      windowsHide: true
    });
    nativeReplicaProcesses.add(child);
    child.on('exit', () => nativeReplicaProcesses.delete(child));
    child.on('error', () => nativeReplicaProcesses.delete(child));
    return true;
  } catch (error) {
    console.warn('Falha ao abrir replica DWM:', error);
    return false;
  }
}

function nativeWindowHandleToDecimal(buffer) {
  if (!Buffer.isBuffer(buffer)) return '';
  if (buffer.length >= 8) return buffer.readBigUInt64LE(0).toString();
  if (buffer.length >= 4) return String(buffer.readUInt32LE(0));
  return '';
}

app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(true));
  const mainWindow = createMainWindow();
  setupAutoUpdater(mainWindow);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  for (const child of nativeReplicaProcesses) {
    try {
      if (!child.killed) child.kill();
    } catch (_) {}
  }
  nativeReplicaProcesses.clear();
});
