const { contextBridge, ipcRenderer } = require("electron");
contextBridge?.exposeInMainWorld?.("desktopApi", {
  send: (ch, data) => ipcRenderer?.send?.(ch, data)
});