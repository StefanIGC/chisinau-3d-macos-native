const { app, BrowserWindow, Menu, net, protocol, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'chisinau',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      codeCache: true,
    },
  },
]);

app.setName('Chișinău 3D');

function installApplicationMenu() {
  const template = [
    {
      label: 'Chișinău 3D',
      submenu: [
        { role: 'about', label: 'Despre Chișinău 3D' },
        { type: 'separator' },
        { role: 'hide', label: 'Ascunde Chișinău 3D' },
        { role: 'hideOthers', label: 'Ascunde celelalte' },
        { role: 'unhide', label: 'Arată tot' },
        { type: 'separator' },
        { role: 'quit', label: 'Închide Chișinău 3D' },
      ],
    },
    {
      label: 'Editare',
      submenu: [
        { role: 'undo', label: 'Anulează' },
        { role: 'redo', label: 'Refă' },
        { type: 'separator' },
        { role: 'cut', label: 'Taie' },
        { role: 'copy', label: 'Copiază' },
        { role: 'paste', label: 'Lipește' },
        { role: 'selectAll', label: 'Selectează tot' },
      ],
    },
    {
      label: 'Vizualizare',
      submenu: [
        { role: 'togglefullscreen', label: 'Ecran complet' },
      ],
    },
    {
      label: 'Fereastră',
      submenu: [
        { role: 'minimize', label: 'Minimizează' },
        { role: 'zoom', label: 'Mărește' },
        { role: 'front', label: 'Adu în față' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function registerGameProtocol() {
  const distRoot = path.resolve(__dirname, '..', 'dist');
  await protocol.handle('chisinau', (request) => {
    const url = new URL(request.url);
    let relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (!relativePath) relativePath = 'index.html';
    const filePath = path.resolve(distRoot, relativePath);
    if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${path.sep}`)) {
      return new Response('Acces refuzat', { status: 403 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function createWindow() {
  const window = new BrowserWindow({
    title: 'Chișinău 3D',
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#15282e',
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      autoplayPolicy: 'user-gesture-required',
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('chisinau://')) {
      event.preventDefault();
      if (/^https?:/i.test(url)) void shell.openExternal(url);
    }
  });
  window.once('ready-to-show', () => window.show());
  void window.loadURL('chisinau://game/');
}

app.whenReady().then(async () => {
  installApplicationMenu();
  await registerGameProtocol();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
