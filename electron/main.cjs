const { app, BrowserWindow, Menu, shell, dialog, ipcMain, session } = require("electron");
const path = require("path");
const http = require("http");
const net = require("net");

let mainWindow = null;
let serverInstance = null;
// Set by `before-quit` so the window's close handler knows whether to close the
// window or quit the whole app once pending work has been flushed.
let quitting = false;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

async function startServer(appDir) {
  // next.config.mjs reads this at runtime. The `conf` passed to next() is not
  // enough: Next loads the cache handler from its own config.
  process.env.NEXT_CACHE_HANDLER = path.join(__dirname, "cache-handler.cjs");
  const next = require("next");
  const port = await getFreePort();

  const nextApp = next({
    dev: false,
    dir: appDir,
    conf: {
      distDir: ".next",
    },
  });

  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      handle(req, res);
    });

    server.listen(port, "127.0.0.1", (err) => {
      if (err) return reject(err);
      console.log(`[Next.js Server] Ready on http://127.0.0.1:${port}`);
      resolve({ server, port });
    });
  });
}

const MENU_TEXT = {
  en: {
    about: "About Simply a screenshot app",
    hide: "Hide Simply a screenshot app",
    hideOthers: "Hide Others",
    showAll: "Show All",
    quit: "Quit Simply a screenshot app",
    edit: "Edit",
    undo: "Undo",
    redo: "Redo",
    cut: "Cut",
    copy: "Copy",
    paste: "Paste",
    selectAll: "Select All",
    view: "View",
    reload: "Reload",
    forceReload: "Force Reload",
    devTools: "Developer Tools",
    actualSize: "Actual Size",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    fullscreen: "Toggle Full Screen",
    showData: "Show Data Folder",
    window: "Window",
    minimize: "Minimize",
    zoom: "Zoom",
    front: "Bring All to Front",
    close: "Close",
    help: "Help",
    appStoreConnect: "Visit App Store Connect",
  },
  es: {
    about: "Acerca de Simply a screenshot app",
    hide: "Ocultar Simply a screenshot app",
    hideOthers: "Ocultar otros",
    showAll: "Mostrar todo",
    quit: "Salir de Simply a screenshot app",
    edit: "Edición",
    undo: "Deshacer",
    redo: "Rehacer",
    cut: "Cortar",
    copy: "Copiar",
    paste: "Pegar",
    selectAll: "Seleccionar todo",
    view: "Ver",
    reload: "Recargar",
    forceReload: "Forzar recarga",
    devTools: "Herramientas de desarrollador",
    actualSize: "Tamaño real",
    zoomIn: "Acercar zoom",
    zoomOut: "Alejar zoom",
    fullscreen: "Pantalla completa",
    showData: "Mostrar carpeta de datos",
    window: "Ventana",
    minimize: "Minimizar",
    zoom: "Zoom",
    front: "Traer todo al frente",
    close: "Cerrar",
    help: "Ayuda",
    appStoreConnect: "Visitar App Store Connect",
  },
};

function createMenu(locale = "en") {
  const isMac = process.platform === "darwin";
  const text = MENU_TEXT[locale] || MENU_TEXT.en;
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about", label: text.about },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide", label: text.hide },
              { role: "hideOthers", label: text.hideOthers },
              { role: "unhide", label: text.showAll },
              { type: "separator" },
              { role: "quit", label: text.quit },
            ],
          },
        ]
      : []),
    {
      label: text.edit,
      submenu: [
        { role: "undo", label: text.undo },
        { role: "redo", label: text.redo },
        { type: "separator" },
        { role: "cut", label: text.cut },
        { role: "copy", label: text.copy },
        { role: "paste", label: text.paste },
        { role: "selectAll", label: text.selectAll },
      ],
    },
    {
      label: text.view,
      submenu: [
        { role: "reload", label: text.reload },
        { role: "forceReload", label: text.forceReload },
        // DevTools must not be reachable in the distributed app.
        ...(app.isPackaged
          ? []
          : [
              { role: "toggleDevTools", label: text.devTools },
              { type: "separator" },
            ]),
        { role: "resetZoom", label: text.actualSize },
        { role: "zoomIn", label: text.zoomIn },
        { role: "zoomOut", label: text.zoomOut },
        { type: "separator" },
        { role: "togglefullscreen", label: text.fullscreen },
        { type: "separator" },
        {
          label: text.showData,
          click: () => {
            shell.openPath(path.join(app.getPath("userData"), "data"));
          },
        },
      ],
    },
    {
      label: text.window,
      submenu: [
        { role: "minimize", label: text.minimize },
        { role: "zoom", label: text.zoom },
        ...(isMac
          ? [
              { type: "separator" },
              { role: "front", label: text.front },
              { type: "separator" },
              { role: "window" },
            ]
          : [{ role: "close", label: text.close }]),
      ],
    },
    {
      role: "help",
      label: text.help,
      submenu: [
        {
          label: text.appStoreConnect,
          click: async () => {
            await shell.openExternal("https://appstoreconnect.apple.com");
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

ipcMain.on("app:set-ui-locale", (_event, locale) => {
  if (locale === "en" || locale === "es") createMenu(locale);
});



/**
 * Every export (ZIP, project JSON, PNG) goes through Chromium's download
 * manager. Without this handler Electron drops the file in ~/Downloads with no
 * feedback; here the user picks the destination and the file is revealed in
 * Finder when it finishes.
 */
function setupDownloadHandler() {
  session.defaultSession.on("will-download", (event, item) => {
    const filename = item.getFilename();
    const ext = path.extname(filename).toLowerCase();
    const filters =
      ext === ".zip"
        ? [{ name: "Archivo ZIP", extensions: ["zip"] }]
        : ext === ".json"
          ? [{ name: "Proyecto JSON", extensions: ["json"] }]
          : ext === ".png"
            ? [{ name: "Imagen PNG", extensions: ["png"] }]
            : [];

    const options = {
      title: "Guardar archivo",
      buttonLabel: "Guardar",
      defaultPath: path.join(app.getPath("downloads"), filename),
      ...(filters.length ? { filters } : {}),
    };

    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    const filePath = win
      ? dialog.showSaveDialogSync(win, options)
      : dialog.showSaveDialogSync(options);

    if (!filePath) {
      event.preventDefault();
      return;
    }

    item.setSavePath(filePath);
    item.once("done", (_event, state) => {
      if (state === "completed") {
        shell.showItemInFolder(filePath);
      }
    });
  });
}

/** Only the editor's own origin may load inside the window. */
function hardenWindow(win, appOrigin) {
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (
      target.startsWith("http://") ||
      target.startsWith("https://") ||
      target.startsWith("mailto:")
    ) {
      shell.openExternal(target);
    }
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, target) => {
    try {
      if (new URL(target).origin !== appOrigin) event.preventDefault();
    } catch {
      event.preventDefault();
    }
  });

  win.webContents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
}

/**
 * Closes the window only after the renderer has written pending edits to disk.
 * Without this, Electron's default `beforeunload` handling can silently cancel
 * the close (and therefore Cmd+Q) when the autosave debounce has not fired yet.
 */
function flushBeforeClose(win, finish) {
  let done = false;
  const complete = () => {
    if (done) return;
    done = true;
    ipcMain.removeListener("app:flush-done", complete);
    clearTimeout(timer);
    finish();
  };
  const timer = setTimeout(complete, 2500);
  ipcMain.once("app:flush-done", complete);
  if (win.isDestroyed() || win.webContents.isDestroyed()) {
    complete();
    return;
  }
  win.webContents.send("app:flush-before-close");
}

async function createWindow(url) {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    title: "Simply a screenshot app",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: "#09090b",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: true,
    },
    show: false,
  });
  mainWindow = win;

  let allowClose = false;
  let flushing = false;
  win.on("close", (event) => {
    if (allowClose) return;
    event.preventDefault();
    if (flushing) return;
    flushing = true;
    flushBeforeClose(win, () => {
      allowClose = true;
      if (win.isDestroyed()) return;
      if (quitting) app.quit();
      else win.close();
    });
  });

  // The page's own beforeunload is a browser-only safety net; by this point the
  // renderer has already flushed, so never let it veto the close.
  win.webContents.on("will-prevent-unload", (event) => {
    event.preventDefault();
  });

  hardenWindow(win, new URL(url).origin);

  win.once("ready-to-show", () => {
    win.show();
  });

  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });

  await win.loadURL(url);
}

async function bootstrap() {
  createMenu();

  const appDir = path.join(__dirname, "..");
  // Next runs inside this process, so these are how the server finds bundled
  // assets and the user's data. Never rely on process.cwd(): a packaged app
  // opened from Finder runs with cwd "/".
  process.env.APP_ROOT = appDir;
  process.env.APP_DATA_DIR = process.env.APP_DATA_DIR || path.join(app.getPath("userData"), "data");
  // Builds before this one stored everything in a folder named after the npm
  // package or after the previous app name; the server imports it once, without
  // deleting the original.
  process.env.APP_LEGACY_DATA_DIRS = [
    path.join(app.getPath("appData"), "Capturas App Store", "data"),
    path.join(app.getPath("appData"), "simply-a-screenshot-app"),
  ].join(path.delimiter);

  // The editor never asks for camera, microphone, geolocation, etc. The only
  // permission it needs is writing to the clipboard (copy buttons).
  const allowedPermissions = new Set(["clipboard-sanitized-write"]);
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(allowedPermissions.has(permission));
  });
  session.defaultSession.setPermissionCheckHandler((_wc, permission) =>
    allowedPermissions.has(permission),
  );

  setupDownloadHandler();

  let targetUrl = "http://localhost:3000";

  if (app.isPackaged || process.env.ELECTRON_PROD) {
    try {
      const { server, port } = await startServer(appDir);
      serverInstance = server;
      targetUrl = `http://127.0.0.1:${port}`;
    } catch (error) {
      console.error("Could not start the editor server:", error);
      dialog.showErrorBox(
        "Simply a screenshot app no pudo iniciarse",
        error instanceof Error ? error.message : String(error),
      );
      app.quit();
      return;
    }
  }

  await createWindow(targetUrl);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(targetUrl);
    }
  });
}

// Two instances would start two Next servers writing to the same project files;
// the write queue only serializes inside one process.
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(bootstrap);
}

app.on("web-contents-created", (_event, contents) => {
  contents.on("will-attach-webview", (event) => event.preventDefault());
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  quitting = true;
});

// The server lives and dies with the app; on macOS closing the window keeps it
// running so the window can be reopened instantly.
app.on("will-quit", () => {
  if (serverInstance) {
    serverInstance.close();
    serverInstance = null;
  }
});
