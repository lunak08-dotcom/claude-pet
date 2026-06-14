const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("petAPI", {
  onState: (cb) => ipcRenderer.on("pet-state", (_e, s) => cb(s)),
  drag: (dx, dy) => ipcRenderer.send("pet-drag", { dx, dy }),
  quit: () => ipcRenderer.send("pet-quit")
});
