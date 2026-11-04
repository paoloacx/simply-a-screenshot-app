const { contextBridge, ipcRenderer } = require("electron");

// The window uses `hiddenInset`: the traffic lights float over the page, so the
// toolbar needs to reserve room for them. This class is set before React
// hydrates, which keeps the layout stable from the first paint.
// `document.documentElement` can still be null at preload time (it runs at
// document-start), so never assume it exists.
if (process.platform === "darwin") {
  const markElectronMac = () => {
    document.documentElement?.classList.add("electron-mac");
  };
  document.addEventListener("DOMContentLoaded", markElectronMac, { once: true });
  markElectronMac();
}

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,
  /**
   * Lets the app write pending edits before the window closes. The main process
   * waits for `app:flush-done` (or a timeout) before actually closing.
   */
  onBeforeClose: (callback) => {
    if (typeof callback !== "function") return;
    ipcRenderer.removeAllListeners("app:flush-before-close");
    ipcRenderer.on("app:flush-before-close", async () => {
      try {
        await callback();
      } catch (error) {
        console.error("Flush before close failed:", error);
      } finally {
        ipcRenderer.send("app:flush-done");
      }
    });
  },
  setUiLocale: (locale) => {
    if (locale === "en" || locale === "es") {
      ipcRenderer.send("app:set-ui-locale", locale);
    }
  },
});
