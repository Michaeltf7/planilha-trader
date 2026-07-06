const { contextBridge, ipcRenderer } = require('electron');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function startSelection() {
  const oldOverlay = document.getElementById('trader-highlight-overlay');
  if (oldOverlay) oldOverlay.remove();

  const overlay = document.createElement('div');
  overlay.id = 'trader-highlight-overlay';
  overlay.innerHTML = `
    <div class="trader-highlight-tip">Arraste para selecionar o pedaço que quer destacar. ESC cancela.</div>
    <div class="trader-highlight-box"></div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #trader-highlight-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      cursor: crosshair;
      background: rgba(0,0,0,.18);
      user-select: none;
    }
    .trader-highlight-tip {
      position: fixed;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(5,9,20,.96);
      color: #fff;
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 10px;
      padding: 10px 14px;
      font: 800 13px Arial,sans-serif;
      pointer-events: none;
    }
    .trader-highlight-box {
      position: fixed;
      display: none;
      border: 2px solid #f59e0b;
      background: rgba(245,158,11,.13);
      box-shadow: 0 0 0 9999px rgba(0,0,0,.45);
      pointer-events: none;
    }
  `;
  overlay.appendChild(style);
  document.documentElement.appendChild(overlay);

  const box = overlay.querySelector('.trader-highlight-box');
  let start = null;
  let rect = null;

  const cleanup = () => {
    window.removeEventListener('keydown', onKeydown, true);
    overlay.remove();
  };

  const onKeydown = (event) => {
    if (event.key === 'Escape') cleanup();
  };

  const draw = (event) => {
    if (!start) return;
    const x = clamp(event.clientX, 0, window.innerWidth);
    const y = clamp(event.clientY, 0, window.innerHeight);
    const left = Math.min(start.x, x);
    const top = Math.min(start.y, y);
    const width = Math.abs(x - start.x);
    const height = Math.abs(y - start.y);
    rect = { x: left, y: top, width, height };
    Object.assign(box.style, {
      display: 'block',
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`
    });
  };

  overlay.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    start = {
      x: clamp(event.clientX, 0, window.innerWidth),
      y: clamp(event.clientY, 0, window.innerHeight)
    };
    overlay.setPointerCapture(event.pointerId);
    draw(event);
  });

  overlay.addEventListener('pointermove', draw);
  overlay.addEventListener('pointerup', async () => {
    start = null;
    if (!rect || rect.width < 24 || rect.height < 24) return;
    cleanup();
    await ipcRenderer.invoke('highlight:create-replica', rect);
  });

  window.addEventListener('keydown', onKeydown, true);
}

contextBridge.exposeInMainWorld('traderDesktopHighlight', {
  startSelection,
  openUrl: (url) => ipcRenderer.invoke('highlight:open-url', url)
});

contextBridge.exposeInMainWorld('traderWRadarRealMod', {
  openWindow: (payload) => ipcRenderer.invoke('wradar-real-mod:open-window', payload),
  resizeWindow: (payload) => ipcRenderer.invoke('wradar-real-mod:resize-window', payload),
  chooseRadarIcon: (payload) => ipcRenderer.invoke('wradar-real-mod:choose-icon', payload),
  dragOverlayWindow: (payload = {}) => {
    const point = { x: Number(payload.x) || 0, y: Number(payload.y) || 0 };
    if (payload.phase === 'start') ipcRenderer.send('replica:begin-drag', point);
    else if (payload.phase === 'move') ipcRenderer.send('replica:drag-to', point);
    else if (payload.phase === 'end' || payload.phase === 'cancel') ipcRenderer.send('replica:end-drag');
  },
  resizeOverlayWindow: (payload = {}) => {
    const point = { x: Number(payload.x) || 0, y: Number(payload.y) || 0 };
    if (payload.phase === 'start') ipcRenderer.send('replica:begin-resize', point);
    else if (payload.phase === 'move') ipcRenderer.send('replica:resize-to', point);
    else if (payload.phase === 'end' || payload.phase === 'cancel') ipcRenderer.send('replica:end-resize');
  },
  overlayState: () => ipcRenderer.invoke('replica:state'),
  showOverlayMenu: () => ipcRenderer.send('replica:show-menu'),
  toggleOverlayAlwaysOnTop: () => ipcRenderer.invoke('replica:toggle-always-on-top'),
  resetOverlayWindow: () => ipcRenderer.invoke('replica:reset-window'),
  startFeed: (payload) => ipcRenderer.invoke('wradar-real-mod:start', payload),
  stopFeed: (feedId) => ipcRenderer.invoke('wradar-real-mod:stop', feedId),
  onUpdate: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('wradar-real-mod:update', listener);
    return () => ipcRenderer.removeListener('wradar-real-mod:update', listener);
  }
});

contextBridge.exposeInMainWorld('traderPublicOdds', {
  openWindow: payload => ipcRenderer.invoke('public-odds:open-window', payload),
  openOverlay: payload => ipcRenderer.invoke('public-odds:open-overlay', payload),
  highlight: payload => ipcRenderer.invoke('public-odds:highlight', payload),
  start: payload => ipcRenderer.invoke('public-odds:start', payload),
  stop: feedId => ipcRenderer.invoke('public-odds:stop', feedId),
  showDiagnostics: feedId => ipcRenderer.invoke('public-odds:diagnostics', feedId),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('public-odds:toggle-always-on-top'),
  resizeLayout: layout => ipcRenderer.invoke('public-odds:resize-layout', layout),
  resizeGoalSides: count => ipcRenderer.invoke('public-odds:resize-goal-sides', count),
  setLayoutMinimum: layout => ipcRenderer.invoke('public-odds:set-layout-minimum', layout),
  showMenu: () => ipcRenderer.send('public-odds:show-menu'),
  onUpdate: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('public-odds:update', listener);
    return () => ipcRenderer.removeListener('public-odds:update', listener);
  },
  onMenuAction: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('public-odds:menu-action', listener);
    return () => ipcRenderer.removeListener('public-odds:menu-action', listener);
  }
});

contextBridge.exposeInMainWorld('traderWorldCupData', {
  sync: () => ipcRenderer.invoke('worldcup:sync'),
  syncEspn: () => ipcRenderer.invoke('worldcup:espn-sync'),
  matchDetails: (payload) => ipcRenderer.invoke('worldcup:match-details', payload)
});

contextBridge.exposeInMainWorld('traderCompetitionData', {
  sync: (payload) => ipcRenderer.invoke('competitions:sync', payload),
  matchDetails: (payload) => ipcRenderer.invoke('competitions:match-details', payload)
});

contextBridge.exposeInMainWorld('traderSofascoreData', {
  momentum: (payload) => ipcRenderer.invoke('sofascore:momentum', payload),
  eventDetails: (payload) => ipcRenderer.invoke('sofascore:event-details', payload),
  tournamentLogo: (payload) => ipcRenderer.invoke('sofascore:tournament-logo', payload),
  tournamentCalendar: (payload) => ipcRenderer.invoke('sofascore:tournament-calendar', payload)
});

contextBridge.exposeInMainWorld('traderCalendarData', {
  byDate: (payload) => ipcRenderer.invoke('calendar:by-date', payload)
});

contextBridge.exposeInMainWorld('traderAppInfo', {
  get: () => ipcRenderer.invoke('app:info')
});

ipcRenderer.on('highlight:start-selection', () => startSelection());
