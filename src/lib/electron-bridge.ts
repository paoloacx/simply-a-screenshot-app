/**
 * Minimal typed bridge to the Electron preload script.
 * In a plain browser (`npm run dev`) `window.electronAPI` is absent and every
 * helper is a no-op, so components do not need to know which shell they run in.
 */
export type ElectronAPI = {
  isElectron: true;
  platform: string;
  /** Registers the flush hook the main process calls before closing the window. */
  onBeforeClose?: (callback: () => Promise<void> | void) => void;
  /** Rebuilds the native menu in the selected interface language. */
  setUiLocale?: (locale: string) => void;
};

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

/** Runs `callback` when the shell is about to close, so edits reach the disk. */
export function onElectronBeforeClose(callback: () => Promise<void> | void): void {
  if (typeof window === "undefined") return;
  window.electronAPI?.onBeforeClose?.(callback);
}

export const isElectron = (): boolean =>
  typeof window !== "undefined" && window.electronAPI?.isElectron === true;
