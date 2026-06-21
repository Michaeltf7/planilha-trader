const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('replicaBridge', {
  onFrame(callback) {
    ipcRenderer.on('replica-frame', (_event, dataUrl) => callback(dataUrl));
  },
  showMenu() {
    ipcRenderer.send('replica:show-menu');
  },
  zoom(direction) {
    ipcRenderer.send('replica:zoom', direction);
  },
  beginDrag(x, y) {
    ipcRenderer.send('replica:begin-drag', { x, y });
  },
  dragTo(x, y) {
    ipcRenderer.send('replica:drag-to', { x, y });
  },
  endDrag() {
    ipcRenderer.send('replica:end-drag');
  }
});
