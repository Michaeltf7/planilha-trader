const path = require('path');
const fs = require('fs');
const http = require('http');
const { pathToFileURL } = require('url');
const { spawn } = require('child_process');
const { app, BrowserWindow, ipcMain, Menu, shell, session, nativeImage, dialog, screen } = require('electron');

const childWindows = new Set();
const replicaWindows = new Map();
const nativeReplicaProcesses = new Set();
const wradarRealModFeeds = new Map();
const publicOddsFeeds = new Map();
const extensionOddsSubscriptions = new Map();
const extensionOddsCommands = new Map();
let extensionOddsServer = null;
let extensionOddsLastContact = 0;
let extensionOddsLastBrowserLaunch = 0;
const extensionOddsPort = 38465;
const customWRadarWindowDefaultBounds = { width: 1220, height: 460 };
const customWRadarWindowMinBounds = { width: 520, height: 260 };
const customRadarHighlightMinBounds = { width: 260, height: 120 };

if (process.env.PLANILHA_TRADER_PORTABLE_DATA) {
  app.setPath('userData', path.resolve(process.env.PLANILHA_TRADER_PORTABLE_DATA));
}

function getSettingsFilePath(fileName) {
  return path.join(app.getPath('userData'), fileName);
}

function readJsonFile(fileName) {
  try {
    return JSON.parse(fs.readFileSync(getSettingsFilePath(fileName), 'utf8'));
  } catch (_) {
    return null;
  }
}

function writeJsonFile(fileName, data) {
  try {
    const target = getSettingsFilePath(fileName);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {}
}

function normalizeWindowBounds(bounds, fallback = customWRadarWindowDefaultBounds, minBounds = customWRadarWindowMinBounds) {
  const width = Math.max(minBounds.width, Math.round(Number(bounds?.width) || fallback.width));
  const height = Math.max(minBounds.height, Math.round(Number(bounds?.height) || fallback.height));
  const normalized = { width, height };
  if (Number.isFinite(Number(bounds?.x)) && Number.isFinite(Number(bounds?.y))) {
    normalized.x = Math.round(Number(bounds.x));
    normalized.y = Math.round(Number(bounds.y));
  }
  return normalized;
}

function boundsIntersectDisplay(bounds, minBounds = customWRadarWindowMinBounds) {
  try {
    const rect = normalizeWindowBounds(bounds, customWRadarWindowDefaultBounds, minBounds);
    return screen.getAllDisplays().some(display => {
      const area = display.workArea || display.bounds;
      const right = rect.x + rect.width;
      const bottom = rect.y + rect.height;
      const areaRight = area.x + area.width;
      const areaBottom = area.y + area.height;
      const visibleWidth = Math.min(right, areaRight) - Math.max(rect.x, area.x);
      const visibleHeight = Math.min(bottom, areaBottom) - Math.max(rect.y, area.y);
      return visibleWidth >= 160 && visibleHeight >= 100;
    });
  } catch (_) {
    return false;
  }
}

function getCustomRadarHighlightBounds(fallback) {
  const safeFallback = normalizeWindowBounds(fallback, customWRadarWindowDefaultBounds, customRadarHighlightMinBounds);
  const saved = normalizeWindowBounds(readJsonFile('custom-radar-highlight-bounds.json'), safeFallback, customRadarHighlightMinBounds);
  if (Number.isFinite(saved.x) && Number.isFinite(saved.y) && boundsIntersectDisplay(saved, customRadarHighlightMinBounds)) {
    return saved;
  }
  if (Number.isFinite(safeFallback.x) && Number.isFinite(safeFallback.y) && boundsIntersectDisplay(safeFallback, customRadarHighlightMinBounds)) {
    return safeFallback;
  }

  try {
    const area = screen.getPrimaryDisplay().workArea;
    return {
      ...safeFallback,
      x: Math.max(area.x, Math.round(area.x + ((area.width - safeFallback.width) / 2))),
      y: Math.max(area.y, Math.round(area.y + ((area.height - safeFallback.height) / 2)))
    };
  } catch (_) {
    return safeFallback;
  }
}

function readCustomRadarPositionSlots() {
  const saved = readJsonFile('custom-radar-highlight-slots.json');
  const source = saved && typeof saved.slots === 'object' ? saved.slots : {};
  const slots = {};
  Object.entries(source).forEach(([id, bounds]) => {
    if (!/^\d+$/.test(id)) return;
    const normalized = normalizeWindowBounds(bounds, customWRadarWindowDefaultBounds, customRadarHighlightMinBounds);
    if (Number.isFinite(normalized.x) && Number.isFinite(normalized.y) && boundsIntersectDisplay(normalized, customRadarHighlightMinBounds)) {
      slots[id] = normalized;
    }
  });
  return slots;
}

function writeCustomRadarPositionSlots(slots) {
  writeJsonFile('custom-radar-highlight-slots.json', { slots });
}

function occupiedCustomRadarSlots(exceptItem = null) {
  return new Set(Array.from(replicaWindows.values())
    .filter(item => item !== exceptItem && item.isLiveOverlay && item.positionSlot && item.window && !item.window.isDestroyed())
    .map(item => String(item.positionSlot)));
}

function chooseCustomRadarPositionSlot(parentWindow) {
  const slots = readCustomRadarPositionSlots();
  const occupied = occupiedCustomRadarSlots();
  const configuredIds = Object.keys(slots).sort((a, b) => Number(a) - Number(b));
  return new Promise(resolve => {
    let settled = false;
    let menu = null;
    const finish = result => {
      if (settled) return;
      settled = true;
      resolve(result);
      try { menu?.closePopup(parentWindow); } catch (_) {}
    };
    const template = [
      ...configuredIds.map(id => ({
        label: occupied.has(id) ? `Posicao ${id} (em uso)` : `Posicao ${id}`,
        enabled: !occupied.has(id),
        click: () => finish({ cancelled: false, slot: id })
      })),
      ...(configuredIds.length ? [{ type: 'separator' }] : []),
      { label: 'Livre (sem posicao salva)', click: () => finish({ cancelled: false, slot: null }) },
      { type: 'separator' },
      { label: 'Cancelar', click: () => finish({ cancelled: true, slot: null }) }
    ];
    menu = Menu.buildFromTemplate(template);
    const contentBounds = parentWindow && !parentWindow.isDestroyed()
      ? parentWindow.getContentBounds()
      : { width: 720, height: 420 };
    const estimatedWidth = 190;
    const estimatedHeight = Math.min(300, Math.max(120, template.length * 30));
    const menuX = Math.max(12, Math.round((contentBounds.width - estimatedWidth) / 2));
    const menuY = Math.max(12, Math.round((contentBounds.height - estimatedHeight) / 2));
    menu.popup({
      window: parentWindow && !parentWindow.isDestroyed() ? parentWindow : undefined,
      x: menuX,
      y: menuY,
      callback: () => finish({ cancelled: true, slot: null })
    });
  });
}

function saveCustomRadarSlot(item, slotId, bounds = null) {
  if (!item || !item.window || item.window.isDestroyed()) return false;
  const id = String(slotId || '');
  if (!/^\d+$/.test(id)) return false;
  const slots = readCustomRadarPositionSlots();
  const current = bounds || (typeof item.window.getNormalBounds === 'function' ? item.window.getNormalBounds() : item.window.getBounds());
  slots[id] = normalizeWindowBounds(current, customWRadarWindowDefaultBounds, customRadarHighlightMinBounds);
  writeCustomRadarPositionSlots(slots);
  item.positionSlot = id;
  return true;
}

function moveCustomRadarToSlot(item, slotId) {
  if (!item || !item.window || item.window.isDestroyed()) return false;
  const id = String(slotId || '');
  if (!/^\d+$/.test(id) || occupiedCustomRadarSlots(item).has(id)) return false;
  const slots = readCustomRadarPositionSlots();
  if (!slots[id]) return saveCustomRadarSlot(item, id);
  item.positionSlot = id;
  item.window.setBounds(slots[id]);
  return true;
}

function removeCustomRadarSlot(item, slotId) {
  const id = String(slotId || '');
  if (!/^\d+$/.test(id)) return false;
  const slots = readCustomRadarPositionSlots();
  delete slots[id];
  writeCustomRadarPositionSlots(slots);
  if (item?.positionSlot === id) item.positionSlot = null;
  return true;
}

function rememberCustomRadarHighlightBounds(item) {
  const win = item?.window;
  let saveTimer = null;
  const save = () => {
    if (!win || win.isDestroyed() || win.isMinimized()) return;
    if (item.positionSlot) return;
    const bounds = typeof win.getNormalBounds === 'function' ? win.getNormalBounds() : win.getBounds();
    const normalized = normalizeWindowBounds(bounds, customWRadarWindowDefaultBounds, customRadarHighlightMinBounds);
    writeJsonFile('custom-radar-highlight-bounds.json', normalized);
  };
  const schedule = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 350);
  };

  win.on('move', schedule);
  win.on('resize', schedule);
  win.on('close', () => {
    clearTimeout(saveTimer);
    save();
  });
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
    width: customWRadarWindowDefaultBounds.width,
    height: customWRadarWindowDefaultBounds.height,
    minWidth: customWRadarWindowMinBounds.width,
    minHeight: customWRadarWindowMinBounds.height,
    title: 'Radar MOD Proprio',
    backgroundColor: '#08111f',
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

ipcMain.handle('wradar-real-mod:choose-icon', async (event, payload = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const type = String(payload.type || 'icon').replace(/[^a-z0-9_-]/gi, '').slice(0, 48) || 'icon';
  const result = await dialog.showOpenDialog(win || undefined, {
    title: 'Escolher icone do Radar MOD',
    properties: ['openFile'],
    filters: [
      { name: 'Icones', extensions: ['svg', 'png'] },
      { name: 'SVG', extensions: ['svg'] },
      { name: 'PNG', extensions: ['png'] }
    ]
  });
  if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true };

  const source = result.filePaths[0];
  const ext = path.extname(source).toLowerCase();
  if (!['.svg', '.png'].includes(ext)) return { ok: false, error: 'Formato invalido.' };

  const targetDir = path.join(app.getPath('userData'), 'custom-radar-icons');
  fs.mkdirSync(targetDir, { recursive: true });
  const target = path.join(targetDir, `${type}${ext}`);
  fs.copyFileSync(source, target);

  return {
    ok: true,
    icon: {
      type,
      name: path.basename(source),
      path: target,
      src: pathToFileURL(target).href
    }
  };
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

  const positionChoice = await chooseCustomRadarPositionSlot(sourceWindow);
  if (positionChoice.cancelled) return false;

  const fallbackBounds = {
    width: Math.max(260, normalizedRect.width),
    height: Math.max(120, normalizedRect.height),
    x: sourceX + normalizedRect.x,
    y: sourceY + normalizedRect.y
  };
  const positionSlot = positionChoice.slot;
  const configuredSlots = readCustomRadarPositionSlots();
  const overlayBounds = positionSlot && configuredSlots[positionSlot]
    ? configuredSlots[positionSlot]
    : getCustomRadarHighlightBounds(fallbackBounds);
  const overlay = new BrowserWindow({
    ...overlayBounds,
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
      width: overlayBounds.width,
      height: overlayBounds.height
    },
    captureDelay: 250,
    quality: 72,
    paused: false,
    captureInProgress: false,
    drag: null,
    timer: null,
    isLiveOverlay: true,
    positionSlot
  };

  replicaWindows.set(id, item);
  configureReplicaControls(item);
  rememberCustomRadarHighlightBounds(item);
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

  win.webContents.on('context-menu', event => {
    event.preventDefault();
    showReplicaMenu(item);
  });
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

ipcMain.handle('public-odds:start', async (event, rawPayload = {}) => {
  const payload = normalizePublicOddsPayload(rawPayload);
  if (!payload) throw new Error('Times invalidos para buscar odds.');
  const owner = event.sender;
  const feedId = `extension:${owner.id}`;
  const sessionId = `match:${normalizeOddsSessionTeam(payload.home)}:${normalizeOddsSessionTeam(payload.away)}`;
  cleanupExtensionOddsFeed(feedId);
  extensionOddsSubscriptions.set(feedId, { owner, payload, sessionId });
  if (!extensionOddsCommands.has(sessionId)) extensionOddsCommands.set(sessionId, { ...payload, feedId: sessionId });
  owner.once('destroyed', () => cleanupExtensionOddsFeed(feedId));
  ensureOddsExtensionConnection(Date.now(), owner);
  setTimeout(() => {
    if (!owner.isDestroyed()) owner.send('public-odds:update', {
      feedId,
      source: 'betfair-extension',
      data: { status: 'waiting-extension', home: payload.home, away: payload.away, capturedAt: Date.now() }
    });
  }, 50);
  return { feedId, source: 'betfair-extension' };
});

ipcMain.handle('public-odds:open-window', async (_event, rawPayload = {}) => {
  const payload = normalizePublicOddsPayload(rawPayload);
  if (!payload) throw new Error('Times invalidos para abrir o Radar de Odds.');
  const win = createPublicOddsWindow(payload);
  return { ok: true, windowId: win.id };
});

ipcMain.handle('public-odds:open-overlay', async (_event, rawPayload = {}) => {
  const payload = normalizePublicOddsPayload(rawPayload);
  if (!payload) throw new Error('Times invalidos para abrir o mercado destacado.');
  const overlay = createPublicOddsWindow(payload, { overlay: true });
  return { ok: true, windowId: overlay.id };
});

ipcMain.handle('public-odds:highlight', async (event, rawPayload = {}) => {
  const payload = normalizePublicOddsPayload(rawPayload);
  if (!payload) throw new Error('Times invalidos para destacar o Radar de Odds.');
  const source = BrowserWindow.fromWebContents(event.sender);
  const overlay = createPublicOddsWindow(payload, { overlay: true });
  overlay.webContents.once('did-finish-load', () => {
    if (source && !source.isDestroyed()) source.close();
  });
  return { ok: true, windowId: overlay.id };
});

ipcMain.handle('public-odds:stop', async (_event, feedId) => {
  cleanupExtensionOddsFeed(String(feedId || ''));
  return true;
});

ipcMain.handle('public-odds:diagnostics', async (_event, feedId) => {
  const subscription = extensionOddsSubscriptions.get(String(feedId || ''));
  if (!subscription) return { ok: false };
  shell.openExternal('https://www.betfair.bet.br/exchange/plus/pt/futebol-apostas-1');
  return { ok: true, mode: 'chrome-extension' };
});

ipcMain.handle('public-odds:toggle-always-on-top', async event => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return { ok: false };
  const next = !win.isAlwaysOnTop();
  win.setAlwaysOnTop(next, 'screen-saver');
  return { ok: true, alwaysOnTop: next };
});

ipcMain.handle('public-odds:resize-layout', async (event, layout) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return { ok: false };
  const compact = layout === 'compact';
  const size = compact ? { width: 320, height: 130 } : { width: 760, height: 540 };
  win.setMinimumSize(compact ? 280 : 520, compact ? 100 : 360);
  win.setSize(size.width, size.height);
  return { ok: true, ...size };
});

ipcMain.handle('public-odds:set-layout-minimum', async (event, layout) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return { ok: false };
  const compact = layout === 'compact';
  const minimum = { width: compact ? 280 : 520, height: compact ? 100 : 360 };
  win.setMinimumSize(minimum.width, minimum.height);
  const bounds = win.getBounds();
  if (bounds.width < minimum.width || bounds.height < minimum.height) {
    win.setSize(Math.max(bounds.width, minimum.width), Math.max(bounds.height, minimum.height));
  }
  return { ok: true };
});

ipcMain.handle('public-odds:resize-goal-sides', async (event, rawCount) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return { ok: false };
  const count = Number(rawCount) === 1 ? 1 : 2;
  const bounds = win.getBounds();
  const height = Math.max(count === 1 ? 105 : 120, bounds.height);
  const width = count === 1 ? Math.max(135, Math.round(height * 1.29)) : Math.max(240, Math.round(height * 2));
  win.setAspectRatio(count === 1 ? 1.29 : 2);
  win.setMinimumSize(count === 1 ? 135 : 240, count === 1 ? 105 : 120);
  win.setSize(width, height);
  return { ok: true, width, height };
});

ipcMain.on('public-odds:show-menu', event => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) showPublicOddsMenu(win);
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

ipcMain.handle('sofascore:momentum', async (_event, payload = {}) => {
  return fetchSofascoreMomentum(payload);
});

ipcMain.handle('sofascore:event-details', async (_event, payload = {}) => {
  return fetchSofascoreEventDetails(payload);
});

ipcMain.handle('sofascore:tournament-logo', async (_event, payload = {}) => {
  return fetchSofascoreTournamentLogo(payload);
});

ipcMain.handle('sofascore:tournament-calendar', async (_event, payload = {}) => {
  return fetchSofascoreTournamentCalendar(payload);
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
  if (item.isLiveOverlay) {
    showLiveRadarMenu(item).catch(error => {
      item.menuOpen = false;
      console.error('Falha ao abrir menu nativo do Radar MOD:', error);
    });
    return;
  }
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

function normalizePublicOddsPayload(payload = {}) {
  const home = String(payload.home || '').trim();
  const away = String(payload.away || '').trim();
  if (!home || !away) return null;
  const requestedMode = String(payload.viewMode || '').toLowerCase();
  const legacyModes = { ulht: 'lht', ufht: 'lht', ulft: 'lft', ufft: 'laft', up: 'lft' };
  const migratedMode = legacyModes[requestedMode] || requestedMode;
  const viewMode = ['mo', 'lht', 'lft', 'laft'].includes(migratedMode) ? migratedMode : '';
  const period = ['first', 'interval', 'second'].includes(payload.period) ? payload.period : 'first';
  return {
    home,
    away,
    title: String(payload.title || `${home} x ${away}`),
    viewMode,
    period,
    clock: String(payload.clock || ''),
    score: {
      home: Math.max(0, Number(payload.score?.home) || 0),
      away: Math.max(0, Number(payload.score?.away) || 0)
    }
  };
}

function normalizeOddsSessionTeam(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function extensionOddsResponse(response, status, data) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-planilha-trader',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(data));
}

function readOddsBrowserPreference() {
  const saved = readJsonFile('public-odds-browser.json') || {};
  return {
    browser: ['chrome', 'edge', 'brave', 'opera'].includes(saved.browser) ? saved.browser : 'chrome',
    autoLaunch: saved.autoLaunch !== false
  };
}

function browserExecutableCandidates() {
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const localAppData = process.env.LOCALAPPDATA || '';
  return {
    chrome: [
      path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe')
    ],
    edge: [
      path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
    ],
    brave: [
      path.join(programFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      path.join(programFilesX86, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')
    ],
    opera: [
      path.join(localAppData, 'Programs', 'Opera', 'launcher.exe'),
      path.join(localAppData, 'Programs', 'Opera GX', 'launcher.exe')
    ]
  };
}

function launchOddsBrowser(browser, force = false) {
  const preference = readOddsBrowserPreference();
  const selectedBrowser = ['chrome', 'edge', 'brave', 'opera'].includes(browser) ? browser : preference.browser;
  if (!force && (!preference.autoLaunch || Date.now() - extensionOddsLastContact < 5000 || Date.now() - extensionOddsLastBrowserLaunch < 12000)) return false;
  const candidates = browserExecutableCandidates();
  const executable = (candidates[selectedBrowser] || []).find(candidate => candidate && fs.existsSync(candidate));
  if (!executable) return false;
  extensionOddsLastBrowserLaunch = Date.now();
  try {
    const child = spawn(executable, ['--no-startup-window'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
    return true;
  } catch (_) {
    return false;
  }
}

function ensureOddsBrowserAvailable() {
  return launchOddsBrowser(readOddsBrowserPreference().browser, false);
}

function ensureOddsExtensionConnection(startedAt, owner) {
  [0, 2500, 6500, 13000].forEach(delay => {
    setTimeout(() => {
      if (owner?.isDestroyed?.() || extensionOddsLastContact >= startedAt) return;
      ensureOddsBrowserAvailable();
    }, delay);
  });
}

function broadcastExtensionOdds(payload = {}) {
  const sessionId = String(payload.feedId || '');
  let accepted = false;
  extensionOddsSubscriptions.forEach((subscription, feedId) => {
    if (subscription.sessionId !== sessionId || subscription.owner.isDestroyed()) return;
    subscription.owner.send('public-odds:update', {
      feedId,
      source: 'betfair-extension',
      data: { ...payload, feedId, capturedAt: Number(payload.capturedAt) || Date.now() }
    });
    accepted = true;
  });
  return accepted;
}

function startExtensionOddsServer() {
  if (extensionOddsServer) return;
  extensionOddsServer = http.createServer((request, response) => {
    if (request.method === 'OPTIONS') return extensionOddsResponse(response, 204, {});
    if (request.headers['x-planilha-trader'] !== 'extension-v1') return extensionOddsResponse(response, 403, { ok: false });
    const url = new URL(request.url || '/', `http://127.0.0.1:${extensionOddsPort}`);
    if (request.method === 'GET' && url.pathname === '/commands') {
      const reportedBrowser = String(url.searchParams.get('browser') || '').toLowerCase();
      if (reportedBrowser === readOddsBrowserPreference().browser) extensionOddsLastContact = Date.now();
      return extensionOddsResponse(response, 200, {
        ok: true,
        selectedBrowser: readOddsBrowserPreference().browser,
        commands: Array.from(extensionOddsCommands.entries()).map(([feedId, payload]) => ({ feedId, ...payload }))
      });
    }
    if (request.method === 'GET' && url.pathname === '/status') {
      return extensionOddsResponse(response, 200, { ok: true, app: 'Planilha Trader', commands: extensionOddsCommands.size });
    }
    if (request.method === 'POST' && url.pathname === '/odds') {
      let body = '';
      request.on('data', chunk => {
        if (body.length < 512000) body += chunk;
      });
      request.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          const accepted = broadcastExtensionOdds(payload);
          extensionOddsResponse(response, accepted ? 200 : 404, { ok: accepted });
        } catch (error) {
          extensionOddsResponse(response, 400, { ok: false, error: error?.message || 'JSON invalido' });
        }
      });
      return;
    }
    extensionOddsResponse(response, 404, { ok: false });
  });
  extensionOddsServer.on('error', error => console.warn('Falha no servidor da extensao de odds:', error?.message || error));
  extensionOddsServer.listen(extensionOddsPort, '127.0.0.1');
}

function cleanupExtensionOddsFeed(feedId) {
  const subscription = extensionOddsSubscriptions.get(feedId);
  extensionOddsSubscriptions.delete(feedId);
  if (!subscription?.sessionId) return;
  const inUse = Array.from(extensionOddsSubscriptions.values()).some(item => item.sessionId === subscription.sessionId);
  if (!inUse) extensionOddsCommands.delete(subscription.sessionId);
}

function createBetfairPublicWindow(payload) {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    show: false,
    title: `Betfair Exchange - ${payload.title}`,
    backgroundColor: '#f5a800',
    autoHideMenuBar: true,
    webPreferences: {
      ...baseWebPreferences(),
      partition: 'persist:planilha-trader-betfair',
      backgroundThrottling: false
    }
  });
  win.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  win.loadURL('https://www.betfair.bet.br/exchange/plus/pt/futebol-apostas-1');
  return win;
}

function createPublicOddsWindow(payload, options = {}) {
  const overlay = !!options.overlay;
  const widget = overlay && ['mo', 'lht', 'lft', 'laft'].includes(payload.viewMode);
  const matchWidget = widget && payload.viewMode === 'mo';
  const fallback = { width: overlay ? (matchWidget ? 280 : (widget ? 360 : 320)) : 760, height: overlay ? (matchWidget ? 140 : (widget ? 180 : 130)) : 540 };
  const minBounds = overlay ? { width: matchWidget ? 240 : (widget ? 330 : 280), height: matchWidget ? 120 : (widget ? 165 : 100) } : { width: 520, height: 360 };
  const boundsFile = widget ? `public-odds-overlay-bounds-${payload.viewMode}.json` : 'public-odds-overlay-bounds.json';
  const saved = overlay ? readJsonFile(boundsFile) : null;
  const bounds = normalizeWindowBounds(saved, fallback, minBounds);
  const child = new BrowserWindow({
    ...bounds,
    minWidth: minBounds.width,
    minHeight: minBounds.height,
    title: `Radar de Odds - ${payload.home} x ${payload.away}`,
    backgroundColor: overlay ? '#00000000' : '#07111f',
    autoHideMenuBar: true,
    resizable: true,
    maximizable: !overlay,
    frame: !overlay,
    transparent: overlay,
    alwaysOnTop: overlay,
    skipTaskbar: overlay,
    webPreferences: baseWebPreferences()
  });
  if (widget) child.setAspectRatio(2);
  childWindows.add(child);
  child.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  child.on('closed', () => childWindows.delete(child));
  if (overlay) {
    const saveBounds = () => {
      if (!child.isDestroyed()) writeJsonFile(boundsFile, child.getBounds());
    };
    child.on('moved', saveBounds);
    child.on('resized', saveBounds);
  }
  const encodedPayload = Buffer.from(JSON.stringify({ ...payload, overlay }), 'utf8').toString('base64url');
  child.loadFile(path.join(__dirname, 'odds-radar-window.html'), { query: { payload: encodedPayload } });
  return child;
}

function scrapeBetfairPublicScript(payload) {
  return `(() => {
    const home = ${JSON.stringify(payload.home)};
    const away = ${JSON.stringify(payload.away)};
    const normalize = value => String(value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const aliases = {
      croatia: ['croatia', 'croacia'], morocco: ['morocco', 'marrocos'], germany: ['germany', 'alemanha'], england: ['england', 'inglaterra'],
      spain: ['spain', 'espanha'], netherlands: ['netherlands', 'holanda', 'paises baixos'], 'ivory coast': ['ivory coast', 'costa do marfim'],
      'south korea': ['south korea', 'coreia do sul'], usa: ['usa', 'estados unidos', 'eua'], switzerland: ['switzerland', 'suica'],
      algeria: ['algeria', 'argelia'], egypt: ['egypt', 'egito'], 'cape verde': ['cape verde', 'cabo verde'], japan: ['japan', 'japao'],
      norway: ['norway', 'noruega'], sweden: ['sweden', 'suecia'], belgium: ['belgium', 'belgica'], france: ['france', 'franca']
    };
    const teamKeys = value => {
      const key = normalize(value);
      const entry = Object.entries(aliases).find(([canonical, variants]) => canonical === key || variants.includes(key));
      return entry ? entry[1] : [key];
    };
    const homeKeys = teamKeys(home);
    const awayKeys = teamKeys(away);
    const includesTeam = (text, keys) => keys.some(key => text.includes(key));
    const leafs = root => Array.from((root || document).querySelectorAll('a, span, div, p, td, button')).filter(element => !element.children.length);
    const offers = root => {
      const text = String(root?.innerText || '').replace(/\\u00a0/g, ' ');
      const values = [];
      const regex = /(?:^|\\n)\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:\\n|\\s)+(?:R\\$|£|BRL)\\s*[\\d.,]+/gim;
      let match;
      while ((match = regex.exec(text))) values.push(match[1].replace(',', '.'));
      return values;
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
      return best ? { back: best.values[0], lay: best.values[1] } : null;
    };
    const onListing = /futebol-apostas-1\\/?$/i.test(location.pathname);
    if (onListing) {
      const links = Array.from(document.querySelectorAll('a[href*="apostas-"]')).filter(anchor => {
        const text = normalize(anchor.innerText);
        return includesTeam(text, homeKeys) && includesTeam(text, awayKeys);
      });
      const anchor = links.sort((a, b) => String(a.innerText || '').length - String(b.innerText || '').length)[0];
      if (!anchor) return { ok: false, status: 'searching', home, away, capturedAt: Date.now() };
      let row = anchor;
      let rowOffers = [];
      for (let depth = 0; depth < 8 && row; depth += 1, row = row.parentElement) {
        const values = offers(row);
        if (values.length >= 6 && String(row.innerText || '').length < 1600) { rowOffers = values; break; }
      }
      const prices = rowOffers.length >= 6 ? {
        home: { back: rowOffers[0], lay: rowOffers[1] },
        draw: { back: rowOffers[2], lay: rowOffers[3] },
        away: { back: rowOffers[4], lay: rowOffers[5] }
      } : {};
      const eventUrl = String(anchor.href || '').replace('/exchange/plus/pt/pt/', '/exchange/plus/pt/');
      return { ok: false, status: 'opening-match', home, away, prices, eventUrl, capturedAt: Date.now() };
    }
    const prices = {
      home: pairNearLabel(text => homeKeys.some(key => text === key)),
      draw: pairNearLabel(text => text === 'empate'),
      away: pairNearLabel(text => awayKeys.some(key => text === key))
    };
    const goalLines = {};
    leafs(document).forEach(element => {
      const text = normalize(element.textContent);
      const selection = text.match(/^(mais|menos) de (\\d+(?:[.,]\\d+)?) gols?$/i);
      if (!selection) return;
      const pair = pairNearLabel(value => value === text);
      if (!pair) return;
      const line = selection[2].replace(',', '.');
      goalLines[line] ||= { line };
      goalLines[line][selection[1] === 'mais' ? 'over' : 'under'] = pair;
    });
    const goals = Object.values(goalLines).find(item => item.over && item.under)
      || Object.values(goalLines).find(item => item.over || item.under)
      || null;
    const hasMatchOdds = prices.home || prices.draw || prices.away;
    return { ok: !!hasMatchOdds, status: hasMatchOdds ? 'found' : 'loading-market', home, away, prices, goals, href: location.href, capturedAt: Date.now() };
  })()`;
}

async function showPublicOddsMenu(win) {
  if (!win || win.isDestroyed()) return;
  let state = {};
  try {
    state = await win.webContents.executeJavaScript('window.__publicOddsMenuState?.() || ({})', true);
  } catch (_) {}
  const send = (action, value, key) => {
    if (!win.isDestroyed()) win.webContents.send('public-odds:menu-action', { action, value, key });
  };
  const opacity = Math.round(win.getOpacity() * 100);
  const browserPreference = readOddsBrowserPreference();
  Menu.buildFromTemplate([
    ...(state.viewMode ? [{
      label: 'Mercado',
      submenu: [
        ['mo', 'MO - Match Odds'],
        ['lht', 'LHT - Limite do primeiro tempo'],
        ['lft', 'LFT - Limite da partida'],
        ['laft', 'LAFT - Limite a frente FT']
      ].map(([key, label]) => ({
        label,
        type: 'radio',
        checked: state.viewMode === key,
        click: () => send('switch-market', key)
      }))
    }] : []),
    ...(state.viewMode && state.viewMode !== 'mo' ? [{
      label: 'Exibicao das odds',
      submenu: [
        {
          label: 'Over',
          type: 'checkbox',
          checked: state.goalSides?.over !== false,
          enabled: state.goalSides?.over === false || state.goalSides?.under !== false,
          click: item => send('show-goal-side', item.checked, 'over')
        },
        {
          label: 'Under',
          type: 'checkbox',
          checked: state.goalSides?.under !== false,
          enabled: state.goalSides?.under === false || state.goalSides?.over !== false,
          click: item => send('show-goal-side', item.checked, 'under')
        }
      ]
    }] : []),
    {
      label: 'Layout',
      submenu: [
        { label: 'Comparativo', type: 'radio', checked: state.layoutMode !== 'compact', click: () => send('layout-mode', 'comparison') },
        { label: 'Compacto', type: 'radio', checked: state.layoutMode === 'compact', click: () => send('layout-mode', 'compact') }
      ]
    },
    {
      label: 'Fontes',
      submenu: [
        { label: 'bet365', type: 'checkbox', checked: state.showBet365 !== false, click: item => send('show-provider', item.checked, 'bet365') }
      ]
    },
    {
      label: 'Navegador',
      submenu: [
        ...[
          { key: 'chrome', label: 'Google Chrome' },
          { key: 'edge', label: 'Microsoft Edge' },
          { key: 'brave', label: 'Brave' },
          { key: 'opera', label: 'Opera' }
        ].map(option => ({
          label: option.label,
          type: 'radio',
          checked: browserPreference.browser === option.key,
          click: () => {
            writeJsonFile('public-odds-browser.json', { ...browserPreference, browser: option.key });
            launchOddsBrowser(option.key, true);
          }
        })),
        { type: 'separator' },
        {
          label: 'Abrir automaticamente',
          type: 'checkbox',
          checked: browserPreference.autoLaunch,
          click: item => writeJsonFile('public-odds-browser.json', { ...browserPreference, autoLaunch: item.checked })
        }
      ]
    },
    ...(!state.viewMode ? [{
      label: 'Match Odds',
      submenu: [
        { label: 'Exibir mercado', type: 'checkbox', checked: state.showMatchOdds !== false, click: item => send('show-match-odds', item.checked) },
        { type: 'separator' },
        { label: 'Casa', type: 'checkbox', checked: state.outcomes?.home !== false, click: item => send('show-outcome', item.checked, 'home') },
        { label: 'Empate', type: 'checkbox', checked: state.outcomes?.draw !== false, click: item => send('show-outcome', item.checked, 'draw') },
        { label: 'Visitante', type: 'checkbox', checked: state.outcomes?.away !== false, click: item => send('show-outcome', item.checked, 'away') }
      ]
    },
    {
      label: 'Linhas de gols',
      submenu: [
        { label: 'Exibir mercado', type: 'checkbox', checked: state.showGoals !== false, click: item => send('show-goals', item.checked) },
        { type: 'separator' },
        ...(state.availableGoalLines || []).map(line => ({
          label: `${line} gols`,
          type: 'checkbox',
          checked: state.goalSelectionCustomized ? state.goalLineVisibility?.[line] === true : state.goalLineVisibility?.[line] !== false,
          click: item => send('show-goal-line', item.checked, line)
        }))
      ]
    }] : []),
    { label: win.isAlwaysOnTop() ? 'Desligar sempre por cima' : 'Ligar sempre por cima', click: () => win.setAlwaysOnTop(!win.isAlwaysOnTop(), 'screen-saver') },
    {
      label: `Opacidade (${opacity}%)`,
      submenu: [100, 80, 60, 40, 20].map(value => ({ label: `${value}%`, type: 'radio', checked: opacity === value, click: () => win.setOpacity(value / 100) }))
    },
    { type: 'separator' },
    { label: 'Janela normal', click: () => send('restore-window') },
    { label: 'Fechar', click: () => win.close() }
  ]).popup({ window: win });
}

function scrapeBet365PublicScript(payload) {
  return `(() => {
    const home = ${JSON.stringify(payload.home)};
    const away = ${JSON.stringify(payload.away)};
    const normalize = value => String(value || '')
      .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const aliases = {
      croatia: ['croatia', 'croacia'], morocco: ['morocco', 'marrocos'], germany: ['germany', 'alemanha'],
      england: ['england', 'inglaterra'], spain: ['spain', 'espanha'], netherlands: ['netherlands', 'holanda', 'paises baixos'],
      'ivory coast': ['ivory coast', 'costa do marfim'], 'south korea': ['south korea', 'coreia do sul'],
      usa: ['usa', 'estados unidos', 'eua'], switzerland: ['switzerland', 'suica'], algeria: ['algeria', 'argelia'],
      egypt: ['egypt', 'egito'], 'cape verde': ['cape verde', 'cabo verde'], japan: ['japan', 'japao'],
      norway: ['norway', 'noruega'], sweden: ['sweden', 'suecia'], belgium: ['belgium', 'belgica'],
      france: ['france', 'franca'], austria: ['austria'], canada: ['canada'], portugal: ['portugal']
    };
    const teamKeys = value => {
      const key = normalize(value);
      const entry = Object.entries(aliases).find(([canonical, variants]) => canonical === key || variants.includes(key));
      return entry ? entry[1] : [key];
    };
    const homeKeys = teamKeys(home);
    const awayKeys = teamKeys(away);
    const includesTeam = (text, keys) => keys.some(key => text.includes(key));
    const visible = element => !!element && element.getClientRects().length > 0;
    const leafs = () => Array.from(document.querySelectorAll('span, div, p')).filter(element => !element.children.length && visible(element));
    const clickText = text => {
      const key = normalize(text);
      const target = leafs().find(element => normalize(element.textContent) === key);
      const clickable = target?.closest('button, [role="button"], a') || target;
      if (clickable) clickable.click();
      return !!clickable;
    };
    const findMatchContainer = () => {
      const candidates = leafs().filter(element => {
        const value = normalize(element.textContent);
        return homeKeys.some(key => value === key || value.includes(key) || key.includes(value));
      });
      let best = null;
      candidates.forEach(candidate => {
        let parent = candidate;
        for (let depth = 0; depth < 9 && parent; depth += 1, parent = parent.parentElement) {
          const text = normalize(parent.innerText);
          if (!includesTeam(text, homeKeys) || !includesTeam(text, awayKeys)) continue;
          const raw = String(parent.innerText || '').trim();
          if (raw.length > 900 || !/\\d+[.,]\\d{2}/.test(raw)) continue;
          if (!best || raw.length < best.raw.length) best = { element: parent, raw };
        }
      });
      return best;
    };
    const readPrices = container => {
      const prices = {};
      Array.from(container.querySelectorAll('div, button, [role="button"]')).forEach(element => {
        const lines = String(element.innerText || '').split(/\\n+/).map(value => value.trim()).filter(Boolean);
        if (lines.length !== 2 || !/^(1|x|2)$/i.test(lines[0]) || !/^\\d+[.,]\\d+$/.test(lines[1])) return;
        const key = lines[0].toLowerCase() === 'x' ? 'draw' : (lines[0] === '1' ? 'home' : 'away');
        if (!prices[key]) prices[key] = lines[1].replace(',', '.');
      });
      if (Object.keys(prices).length < 2) {
        const decimals = Array.from(container.querySelectorAll('span'))
          .map(element => String(element.textContent || '').trim())
          .filter(value => /^\\d+[.,]\\d{2,3}$/.test(value));
        if (decimals.length >= 3) [prices.home, prices.draw, prices.away] = decimals.slice(-3).map(value => value.replace(',', '.'));
      }
      return prices;
    };
    const readGoalLine = () => {
      const lines = {};
      Array.from(document.querySelectorAll('div, button, [role="button"]')).forEach(element => {
        const parts = String(element.innerText || '').split(/\\n+/).map(value => value.trim()).filter(Boolean);
        if (parts.length < 2 || parts.length > 3) return;
        const selection = parts[0].match(/^(mais|menos)\\s+de\\s+(\\d+(?:[.,]\\d+)?)(?:\\s+gols?)?$/i);
        const odd = parts.slice(1).find(value => /^\\d+[.,]\\d+$/.test(value));
        if (!selection || !odd) return;
        const line = selection[2].replace(',', '.');
        lines[line] ||= { line };
        lines[line][normalize(selection[1]) === 'mais' ? 'over' : 'under'] = odd.replace(',', '.');
      });
      return Object.values(lines).find(item => item.over && item.under) || null;
    };
    const cookieButton = leafs().find(element => /somente os essenciais|aceitar todos/i.test(String(element.textContent || '')));
    (cookieButton?.closest('button') || cookieButton)?.click?.();
    const match = findMatchContainer();
    if (match) {
      const prices = readPrices(match.element);
      const goals = readGoalLine();
      if (!goals) {
        const teamTarget = Array.from(match.element.querySelectorAll('span, div, p')).find(element => !element.children.length && includesTeam(normalize(element.textContent), homeKeys));
        const clickable = teamTarget?.closest('button, [role="button"], a') || teamTarget || match.element;
        const rect = clickable.getBoundingClientRect();
        return { ok: false, status: 'opening-match', home, away, prices, clickPoint: { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) }, capturedAt: Date.now() };
      }
      return { ok: Object.keys(prices).length >= 2, status: 'found', home, away, prices, goals, raw: match.raw, capturedAt: Date.now() };
    }
    const search = document.querySelector('input[type="search"], input[placeholder*="Pesquisar" i], input[aria-label*="Pesquisar" i]');
    if (!search) {
      clickText('Pesquisar');
      return { ok: false, status: 'opening-search', home, away, capturedAt: Date.now() };
    }
    if (!homeKeys.includes(normalize(search.value))) {
      search.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(search, home);
      search.dispatchEvent(new Event('input', { bubbles: true }));
      search.dispatchEvent(new Event('change', { bubbles: true }));
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      search.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    }
    return { ok: false, status: 'searching', home, away, capturedAt: Date.now() };
  })()`;
}

async function pollBetfairPublicFeed(feedId) {
  const feed = publicOddsFeeds.get(feedId);
  if (!feed || feed.window.isDestroyed() || feed.owner.isDestroyed()) return cleanupPublicOddsFeed(feedId);
  try {
    const data = await feed.window.webContents.executeJavaScript(scrapeBetfairPublicScript(feed.payload), true);
    const signature = JSON.stringify({ status: data?.status, prices: data?.prices, goals: data?.goals, raw: data?.raw });
    if (signature !== feed.lastSignature) {
      feed.lastSignature = signature;
      feed.owner.send('public-odds:update', { feedId, source: 'betfair', data });
    }
    if (data?.eventUrl && !feed.eventNavigated) {
      feed.eventNavigated = true;
      feed.window.loadURL(data.eventUrl);
    }
  } catch (error) {
    feed.owner.send('public-odds:update', { feedId, source: 'betfair', error: error?.message || 'Falha ao ler a Betfair Exchange.' });
  } finally {
    const active = publicOddsFeeds.get(feedId);
    if (active) active.timer = setTimeout(() => pollBetfairPublicFeed(feedId), 1200);
  }
}

function cleanupPublicOddsFeed(feedId) {
  const feed = publicOddsFeeds.get(feedId);
  if (!feed) return;
  clearTimeout(feed.timer);
  if (!feed.window.isDestroyed()) feed.window.close();
  publicOddsFeeds.delete(feedId);
}

async function showLiveRadarMenu(item) {
  if (!item || !item.window || item.window.isDestroyed() || item.menuOpen) return;
  const win = item.window;
  item.menuOpen = true;

  const radarState = await win.webContents.executeJavaScript(`
    (() => window.__customRadarNativeMenuState ? window.__customRadarNativeMenuState() : ({}))()
  `, true).catch(() => ({}));
  if (win.isDestroyed()) {
    item.menuOpen = false;
    return;
  }

  const sendAction = (action, value) => {
    if (win.isDestroyed()) return;
    const payload = JSON.stringify({ action, value });
    win.webContents.executeJavaScript(`
      (() => window.__customRadarNativeMenuAction ? window.__customRadarNativeMenuAction(${payload}) : null)()
    `, true).catch(() => {});
  };
  const fontPercent = Math.round((Number(radarState.fontScale) || 1) * 100);
  const opacityPercent = Math.round((Number(radarState.overlayOpacity) || 1) * 100);
  const radarLayout = radarState.radarLayout === 'ticker' ? 'ticker' : 'standard';
  const contentMode = ['current', 'events', 'full'].includes(radarState.overlayContentMode)
    ? radarState.overlayContentMode
    : 'full';
  const heatmapMode = ['off', 'match', 'home', 'away', 'teams'].includes(radarState.heatmapMode)
    ? radarState.heatmapMode
    : 'off';
  const heatmapStyle = ['candles', 'dots', 'wave', 'bar'].includes(radarState.heatmapStyle)
    ? radarState.heatmapStyle
    : 'candles';
  const intelligenceSettings = radarState.intelligenceSettings || {};
  const alertSettings = radarState.alertSettings || {};
  const configuredPositionSlots = readCustomRadarPositionSlots();
  const occupiedPositionSlots = occupiedCustomRadarSlots(item);
  const positionSlotIds = ['1', '2', '3', '4', '5', '6'];

  const menu = Menu.buildFromTemplate([
    {
      label: 'Layout visual',
      submenu: [
        { label: 'Modelo atual', type: 'radio', checked: radarLayout === 'standard', click: () => sendAction('radar-layout', 'standard') },
        { label: 'Faixa compacta', type: 'radio', checked: radarLayout === 'ticker', click: () => sendAction('radar-layout', 'ticker') }
      ]
    },
    { type: 'separator' },
    {
      label: radarState.layoutEditMode ? 'Concluir edicao do layout' : 'Editar layout',
      type: 'checkbox',
      checked: !!radarState.layoutEditMode,
      click: () => sendAction('toggle-layout-editor')
    },
    {
      label: 'Restaurar layout padrao',
      click: () => sendAction('reset-card-layout')
    },
    { type: 'separator' },
    {
      label: `Fonte (${fontPercent}%)`,
      submenu: [
        { label: 'Menor', click: () => sendAction('font-scale-down') },
        { label: 'Padrao (100%)', click: () => sendAction('font-scale-reset') },
        { label: 'Maior', click: () => sendAction('font-scale-up') },
        { type: 'separator' },
        ...[135, 120, 100, 80, 60, 50, 40, 35].map(value => ({
          label: `${value}%`,
          type: 'radio',
          checked: fontPercent === value,
          click: () => sendAction('font-scale', value / 100)
        }))
      ]
    },
    {
      label: `Opacidade (${opacityPercent}%)`,
      submenu: [100, 80, 60, 40, 20].map(value => ({
        label: `${value}%`,
        type: 'radio',
        checked: opacityPercent === value,
        click: () => sendAction('overlay-opacity', value)
      }))
    },
    {
      label: 'Conteudo',
      submenu: [
        { label: 'So lance atual', type: 'radio', checked: contentMode === 'current', click: () => sendAction('overlay-content', 'current') },
        { label: 'Lance + eventos', type: 'radio', checked: contentMode === 'events', click: () => sendAction('overlay-content', 'events') },
        { label: 'Completo', type: 'radio', checked: contentMode === 'full', click: () => sendAction('overlay-content', 'full') },
        { type: 'separator' },
        { label: 'Grafico SofaScore', type: 'checkbox', checked: !!radarState.showPressureChart, click: () => sendAction('toggle-pressure-chart') },
        { label: 'Grafico Radar MOD', type: 'checkbox', checked: !!radarState.showRadarPressureChart, click: () => sendAction('toggle-radar-pressure-chart') }
      ]
    },
    {
      label: 'Mapa de calor',
      submenu: [
        { label: 'Desligado', type: 'radio', checked: heatmapMode === 'off', click: () => sendAction('heatmap-mode', 'off') },
        { label: 'Partida', type: 'radio', checked: heatmapMode === 'match', click: () => sendAction('heatmap-mode', 'match') },
        { label: 'Time da casa', type: 'radio', checked: heatmapMode === 'home', click: () => sendAction('heatmap-mode', 'home') },
        { label: 'Time visitante', type: 'radio', checked: heatmapMode === 'away', click: () => sendAction('heatmap-mode', 'away') },
        { label: 'Times separados', type: 'radio', checked: heatmapMode === 'teams', click: () => sendAction('heatmap-mode', 'teams') },
        { type: 'separator' },
        {
          label: 'Visual',
          submenu: [
            { label: 'Velas', type: 'radio', checked: heatmapStyle === 'candles', click: () => sendAction('heatmap-style', 'candles') },
            { label: 'Bolinhas', type: 'radio', checked: heatmapStyle === 'dots', click: () => sendAction('heatmap-style', 'dots') },
            { label: 'Onda', type: 'radio', checked: heatmapStyle === 'wave', click: () => sendAction('heatmap-style', 'wave') },
            { label: 'Barra ao vivo', type: 'radio', checked: heatmapStyle === 'bar', click: () => sendAction('heatmap-style', 'bar') }
          ]
        }
      ]
    },
    {
      label: 'Inteligencia ao vivo',
      submenu: [
        { label: 'Ativar modulo', type: 'checkbox', checked: !!radarState.showLiveIntelligence, click: () => sendAction('toggle-live-intelligence') },
        { type: 'separator' },
        { label: 'Balanca de dominio', type: 'checkbox', checked: intelligenceSettings.balance !== false, click: () => sendAction('intelligence-setting', 'balance') },
        { label: 'Sequencia ofensiva', type: 'checkbox', checked: intelligenceSettings.sequence !== false, click: () => sendAction('intelligence-setting', 'sequence') },
        { label: 'Indice de perigo', type: 'checkbox', checked: intelligenceSettings.danger !== false, click: () => sendAction('intelligence-setting', 'danger') },
        { label: 'Mudanca de dominio', type: 'checkbox', checked: intelligenceSettings.dominance !== false, click: () => sendAction('intelligence-setting', 'dominance') },
        { label: 'Comparador de periodos', type: 'checkbox', checked: intelligenceSettings.comparison !== false, click: () => sendAction('intelligence-setting', 'comparison') },
        { label: 'Pressao sustentada', type: 'checkbox', checked: intelligenceSettings.sustained !== false, click: () => sendAction('intelligence-setting', 'sustained') }
      ]
    },
    {
      label: 'Alertas e resumo',
      submenu: [
        { label: 'Ativar alertas', type: 'checkbox', checked: !!alertSettings.enabled, click: () => sendAction('toggle-alerts') },
        { label: 'Som', type: 'checkbox', checked: alertSettings.sound !== false, click: () => sendAction('alert-setting', 'sound') },
        { label: 'Destaque visual', type: 'checkbox', checked: alertSettings.visual !== false, click: () => sendAction('alert-setting', 'visual') },
        { label: 'Notificacao do sistema', type: 'checkbox', checked: !!alertSettings.notification, click: () => sendAction('alert-setting', 'notification') },
        { type: 'separator' },
        { label: 'Pressao crescente', type: 'checkbox', checked: alertSettings.pressure !== false, click: () => sendAction('alert-setting', 'pressure') },
        { label: 'Ataques perigosos', type: 'checkbox', checked: alertSettings.sequence !== false, click: () => sendAction('alert-setting', 'sequence') },
        { label: 'Muitos remates', type: 'checkbox', checked: alertSettings.shots !== false, click: () => sendAction('alert-setting', 'shots') },
        { label: 'Cartao vermelho', type: 'checkbox', checked: alertSettings.redCard !== false, click: () => sendAction('alert-setting', 'redCard') },
        { label: 'Momento perigoso', type: 'checkbox', checked: alertSettings.goalChance !== false, click: () => sendAction('alert-setting', 'goalChance') },
        { type: 'separator' },
        { label: 'Resumo automatico', type: 'checkbox', checked: !!radarState.showAutoSummary, click: () => sendAction('toggle-auto-summary') }
      ]
    },
    {
      label: `Posicao (${item.positionSlot || 'livre'})`,
      submenu: [
        ...positionSlotIds.map(id => ({
          label: configuredPositionSlots[id] ? `Posicao ${id}` : `Posicao ${id} (salvar aqui)`,
          type: 'radio',
          checked: String(item.positionSlot || '') === id,
          enabled: !occupiedPositionSlots.has(id),
          click: () => moveCustomRadarToSlot(item, id)
        })),
        { type: 'separator' },
        {
          label: 'Salvar local atual',
          submenu: positionSlotIds.map(id => ({
            label: `Como posicao ${id}`,
            enabled: !occupiedPositionSlots.has(id),
            click: () => saveCustomRadarSlot(item, id)
          }))
        },
        {
          label: 'Liberar posicao desta janela',
          enabled: !!item.positionSlot,
          click: () => { item.positionSlot = null; }
        },
        {
          label: 'Excluir posicao salva',
          submenu: positionSlotIds.map(id => ({
            label: `Posicao ${id}`,
            enabled: !!configuredPositionSlots[id] && !occupiedPositionSlots.has(id) && String(item.positionSlot || '') !== id,
            click: () => removeCustomRadarSlot(item, id)
          }))
        }
      ]
    },
    {
      label: 'Janela',
      submenu: [
        {
          label: 'Sempre acima',
          type: 'checkbox',
          checked: win.isAlwaysOnTop(),
          click: menuItem => {
            if (!win.isDestroyed()) win.setAlwaysOnTop(!!menuItem.checked, 'screen-saver');
          }
        },
        {
          label: 'Resetar posicao e tamanho',
          click: () => resetReplicaWindow(item)
        }
      ]
    },
    { type: 'separator' },
    { label: 'Fechar janela', click: () => win.close() }
  ]);

  menu.popup({
    window: win,
    callback: () => {
      item.menuOpen = false;
    }
  });
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

ipcMain.on('replica:begin-resize', (event, point) => {
  const item = getReplicaBySender(event.sender);
  if (!item || item.window.isDestroyed()) return;
  const bounds = item.window.getBounds();
  item.resize = {
    startX: Number(point.x) || 0,
    startY: Number(point.y) || 0,
    bounds
  };
});

ipcMain.on('replica:resize-to', (event, point) => {
  const item = getReplicaBySender(event.sender);
  if (!item || !item.resize || item.window.isDestroyed()) return;
  const start = item.resize.bounds;
  const width = Math.max(customRadarHighlightMinBounds.width, Math.round(start.width + ((Number(point.x) || 0) - item.resize.startX)));
  const height = Math.max(customRadarHighlightMinBounds.height, Math.round(start.height + ((Number(point.y) || 0) - item.resize.startY)));
  item.window.setBounds({ x: start.x, y: start.y, width, height });
});

ipcMain.on('replica:end-resize', (event) => {
  const item = getReplicaBySender(event.sender);
  if (!item || item.window.isDestroyed()) return;
  item.resize = null;
  const bounds = item.window.getBounds();
  writeJsonFile('custom-radar-highlight-bounds.json', normalizeWindowBounds(bounds, customWRadarWindowDefaultBounds, customRadarHighlightMinBounds));
});

ipcMain.handle('replica:state', async (event) => {
  const item = getReplicaBySender(event.sender);
  if (!item || item.window.isDestroyed()) return { ok: false };
  return {
    ok: true,
    alwaysOnTop: item.window.isAlwaysOnTop(),
    bounds: item.window.getBounds()
  };
});

ipcMain.handle('replica:toggle-always-on-top', async (event) => {
  const item = getReplicaBySender(event.sender);
  if (!item || item.window.isDestroyed()) return { ok: false };
  const next = !item.window.isAlwaysOnTop();
  item.window.setAlwaysOnTop(next, 'screen-saver');
  return { ok: true, alwaysOnTop: next };
});

ipcMain.handle('replica:reset-window', async (event) => {
  const item = getReplicaBySender(event.sender);
  if (!item || item.window.isDestroyed()) return { ok: false };
  return resetReplicaWindow(item);
});

function resetReplicaWindow(item) {
  if (!item || item.window.isDestroyed()) return { ok: false };
  const display = screen.getDisplayMatching(item.window.getBounds()) || screen.getPrimaryDisplay();
  const area = display.workArea || display.bounds;
  const width = customWRadarWindowDefaultBounds.width;
  const height = customWRadarWindowDefaultBounds.height;
  const bounds = {
    width,
    height,
    x: Math.round(area.x + ((area.width - width) / 2)),
    y: Math.round(area.y + ((area.height - height) / 2))
  };
  item.window.setBounds(bounds);
  writeJsonFile('custom-radar-highlight-bounds.json', normalizeWindowBounds(bounds, customWRadarWindowDefaultBounds, customRadarHighlightMinBounds));
  return { ok: true, bounds };
}

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

async function fetchSofascoreMomentum(payload = {}) {
  const eventId = Number(payload.sofascoreId || payload.eventId || 0);
  if (!eventId) {
    return { ok: false, source: 'Sofascore', error: 'Jogo sem ID do Sofascore.' };
  }
  const scriptPath = getAppResourcePath('tools', 'worldcup_sofascore_cffi.py');
  return runPythonJsonScript(scriptPath, 30000, ['momentum', String(eventId)]);
}

async function fetchSofascoreEventDetails(payload = {}) {
  const eventId = Number(payload.sofascoreId || payload.eventId || 0);
  if (!eventId) {
    return { ok: false, source: 'Sofascore', error: 'Jogo sem ID do Sofascore.' };
  }
  const scriptPath = getAppResourcePath('tools', 'worldcup_sofascore_cffi.py');
  return runPythonJsonScript(scriptPath, 30000, ['event-details', String(eventId)]);
}

async function fetchSofascoreTournamentLogo(payload = {}) {
  const queries = Array.isArray(payload.queries)
    ? payload.queries.map(item => String(item || '').trim()).filter(Boolean)
    : [];
  if (queries.length) {
    const scriptPath = getAppResourcePath('tools', 'worldcup_sofascore_cffi.py');
    return runPythonJsonScript(scriptPath, 90000, ['tournament-search-batch', JSON.stringify([...new Set(queries)])]);
  }

  const query = String(payload.query || payload.name || '').trim();
  if (!query) {
    return { ok: false, source: 'Sofascore', error: 'Nome da competicao invalido.' };
  }
  const scriptPath = getAppResourcePath('tools', 'worldcup_sofascore_cffi.py');
  return runPythonJsonScript(scriptPath, 45000, ['tournament-search', query]);
}

async function fetchSofascoreTournamentCalendar(payload = {}) {
  const dateKey = String(payload.date || payload.dateKey || '').trim();
  const queries = Array.isArray(payload.queries)
    ? payload.queries.map(item => {
        if (item && typeof item === 'object') {
          const id = Number(item.id || item.uniqueTournamentId || 0) || null;
          const name = String(item.name || item.query || '').trim();
          return id || name ? { id, name, query: String(item.query || name || id || '').trim() } : null;
        }
        const query = String(item || '').trim();
        return query || null;
      }).filter(Boolean)
    : [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { ok: false, source: 'Sofascore', error: 'Data invalida para calendario por competicoes.' };
  }
  if (!queries.length) {
    return { ok: true, source: 'Sofascore', date: dateKey, count: 0, matches: [], tournaments: [] };
  }
  const scriptPath = getAppResourcePath('tools', 'worldcup_sofascore_cffi.py');
  const seen = new Set();
  const uniqueQueries = queries.filter(item => {
    const key = item && typeof item === 'object'
      ? String(item.id || item.name || item.query || '').toLowerCase()
      : String(item || '').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return runPythonJsonScript(scriptPath, 120000, ['calendar-tournaments', dateKey, JSON.stringify(uniqueQueries)]);
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
  startExtensionOddsServer();
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
  if (extensionOddsServer) {
    extensionOddsServer.close();
    extensionOddsServer = null;
  }
  for (const child of nativeReplicaProcesses) {
    try {
      if (!child.killed) child.kill();
    } catch (_) {}
  }
  nativeReplicaProcesses.clear();
});
