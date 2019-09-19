const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;
const isDev = require("electron-is-dev");
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1920, height: 1200,
        title: "Isaiah Explorer",
        webPreferences: {
            devTools: true
        }
    });
    mainWindow.loadURL(isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`);
    mainWindow.on('closed', () => mainWindow = null);

}

app.on('ready', function () {

    createWindow();
    console.log(app);
    const template = [
        {
            label: 'File', submenu: [
                { label: 'Quit', role: 'quit' }
            ]
        },
        {
            label: 'Structure', submenu: [
                { label: 'Whole', role: 'file-new' },
                { type: 'separator' },
                { label: 'Quit', role: 'quit' }
            ]
        },
        {
            label: 'Outline', submenu: [
                { label: 'Whole', role: 'file-new' },
                { type: 'separator' },
                { label: 'Quit', role: 'quit' }
            ]
        }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});


const image = electron.nativeImage.createFromPath(
    app.getAppPath() + "/public/icon.png"
);
app.dock.setIcon(image);