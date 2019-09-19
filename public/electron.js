const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;
const isDev = require("electron-is-dev");
const path = require('path');

var meta = require('./core/meta.json');


let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1920, height: 1200,
        title: "Isaiah Explorer",
        resizable: true,
        maximizable: true,
        titleBarStyle: "default",
        zoomToPageWidth: true,
        webPreferences: {
            devTools: true
        }
    });
    mainWindow.loadURL(isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`);
    mainWindow.on('closed', () => mainWindow = null);


    let contents = mainWindow.webContents
  //  console.log(contents)

}

app.on('ready', function () {

    createWindow();
   // console.log(meta.structure);
   // console.log(app);

    var structureMenu = [{ label: "Previous Structure", accelerator: 'Insert' }, { label: "Next Structure", accelerator: 'Delete' }, { type: 'separator' }];
    for (let shortcode in meta.structure) {
        let item = meta.structure[shortcode];
        structureMenu.push({
            label: item.title,
            click: function (menuItem, forcedWindow, options) {
                forcedWindow.webContents.send('ping', 'whoooooooh!')
                forcedWindow.webContents.sendInputEvent({type: 'keyDown', keyCode: 'Down'});
                forcedWindow.webContents.sendInputEvent({type: 'keyUp', keyCode: 'Down'});
            }
        })
    }

    var outlineMenu = [{ label: "Previous Outline", accelerator: 'Home' }, { label: "Next Outline", accelerator: 'End' }, { type: 'separator' }];
    for (let shortcode in meta.outline) {
        let item = meta.outline[shortcode];
        outlineMenu.push({
            label: item.title,
            click: function () {
                console.log(shortcode);
            }
        })
    }

    var versionMenu = [{ label: "Previous Version", accelerator: 'PageUp' }, { label: "Next Version", accelerator: 'PageDown' }, { type: 'separator' }];
    for (let shortcode in meta.version) {
        let item = meta.version[shortcode];
        versionMenu.push({
            label: item.title,
            click: function () {
                console.log(shortcode);
            }
        })
    }

    const template = [
        {
            label: 'File', submenu: [
                { label: 'Play Audio', accelerator: 'Space' },
                { type: 'separator' },
                { label: 'Previous Verse', accelerator: 'Up' },
                { label: 'Next Verse', accelerator: 'Down' },
                { type: 'separator' },
                { label: 'Previous Passage', accelerator: 'Left' },
                { label: 'Next Passage', accelerator: 'Right' },
                { type: 'separator' },
                { label: 'Next Tag', accelerator: '=' },
                { type: 'separator' },
                { label: 'Show Commentary', accelerator: '~' },
                { type: 'separator' },
                { label: 'Quit', role: 'quit' }
            ]
        },
        {
            label: 'Structural Sections', submenu: structureMenu
        },
        {
            label: 'Section Passages', submenu: outlineMenu
        },
        {
            label: 'Passage Verses', submenu: versionMenu
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