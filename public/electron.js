const electron = require('electron');
const app = electron.app;
const ipcMain = electron.ipcMain;
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;
const isDev = require("electron-is-dev");
const path = require('path');

var meta = require('./core/meta.json');


let settings = {
    version: null,
    outline: null,
    structure: null,
    top_versions: [],
    top_outlines: [],
    top_structures: [],
    version_views: 0,
    commentary_order: []
}

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
            devTools: true,
            preload: __dirname + '/preload.js'
        }
    });
    mainWindow.loadURL(isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`);
    mainWindow.on('closed', () => mainWindow = null);


    let contents = mainWindow.webContents
    //  console.log(contents)

}

app.on('ready', function () {

    createWindow();
    Menu.setApplicationMenu(Menu.buildFromTemplate(createMenuTemplate(settings)));
    ipcMain.on('saveSettings', (e, newSettings) => {
        Menu.setApplicationMenu(Menu.buildFromTemplate(createMenuTemplate(newSettings)));
    })

  

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







function createStructureMenu(structure, top_structures) {
    var structureMenu = [{
        label: "Previous Structure", accelerator: 'Insert', click: function (i, webapp) {
            webapp.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Insert' });
            webapp.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Insert' });
        }
    }, {
        label: "Next Structure", accelerator: 'Delete', click: function (i, webapp) {
            webapp.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Delete' });
            webapp.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Delete' });
        }
    }, { type: 'separator' }];
    for (let i in top_structures) {
        let shortcode = top_structures[i];
        let item = meta.structure[shortcode];
        structureMenu.push({
            label: (parseInt(i) + 1) + "—" + item.title,
            type: 'checkbox',
            checked: (structure === shortcode) ? true : false,
            click: function (i, webapp) {
                webapp.webContents.send('structure', shortcode)
            }
        })
    }
    structureMenu.push({ type: 'separator' })
    for (let shortcode in meta.structure) {
        if (top_structures.indexOf(shortcode) >= 0) continue;
        let item = meta.structure[shortcode];
        structureMenu.push({
            label: item.title,
            type: 'checkbox',
            checked: (structure === shortcode) ? true : false,
            click: function (i, webapp) {
                webapp.webContents.send('structure', shortcode)
            }
        })
    }
    return structureMenu;
}


function createOutlineMenu(outline, top_outlines) {

    var outlineMenu = [{
        label: "Previous Outline", accelerator: 'Home', click: function (i, webapp) {
            webapp.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Home' });
            webapp.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Home' });
        }
    }, {
        label: "Next Outline", accelerator: 'End', click: function (i, webapp) {
            webapp.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'End' });
            webapp.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'End' });
        }
    }, { type: 'separator' }];
    for (let i in top_outlines) {
        let shortcode = top_outlines[i];
        let item = meta.outline[shortcode];
        outlineMenu.push({
            label: (parseInt(i) + 1) + "—" + item.title,
            type: 'checkbox',
            checked: (outline === shortcode) ? true : false,
            click: function (i, webapp) {
                webapp.webContents.send('outline', shortcode)
            }
        })
    }
    outlineMenu.push({ type: 'separator' })
    for (let shortcode in meta.outline) {
        if (top_outlines.indexOf(shortcode) >= 0) continue;
        let item = meta.outline[shortcode];
        outlineMenu.push({
            label: item.title,
            type: 'checkbox',
            checked: (outline === shortcode) ? true : false,
            click: function (i, webapp) {
                webapp.webContents.send('outline', shortcode)
            }
        })
    }
    return outlineMenu;
}

function createVersionMenu(version, top_versions) {

    var versionMenu = [{
        label: "Previous Version", accelerator: 'PageUp', click: function (i, webapp) {
            webapp.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'PageUp' });
            webapp.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'PageUp' });
        }
    }, {
        label: "Next Version", accelerator: 'PageDown', click: function (i, webapp) {
            webapp.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'PageDown' });
            webapp.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'PageDown' });
        }
    }, { type: 'separator' }];
    for (let i in top_versions) {
        let shortcode = top_versions[i];
        let item = meta.version[shortcode];
        versionMenu.push({
            label: (parseInt(i) + 1) + "—" + item.title,
            type: 'checkbox',
            checked: (version === shortcode) ? true : false,
            click: function (i, webapp) {
                webapp.webContents.send('version', shortcode)
            }
        })
    }
    versionMenu.push({ type: 'separator' })
    for (let shortcode in meta.version) {
        if (top_versions.indexOf(shortcode) >= 0) continue;
        let item = meta.version[shortcode];
        versionMenu.push({
            label: item.title,
            type: 'checkbox',
            checked: (version === shortcode) ? true : false,
            click: function (i, webapp) {
                webapp.webContents.send('version', shortcode)
            }
        })
    }
    return versionMenu;

    return versionMenu;
}


function createMenuTemplate(settings) {
    const template = [
        {
            label: app.getName(), submenu: [
                { role: 'toggledevtools' },
                { type: 'separator' },
                {
                    label: 'Play Audio', accelerator: 'Space', click: function (i, webapp) {
                        webapp.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Space' });
                        webapp.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Space' });
                    }
                },
                { type: 'separator' },
                {
                    label: 'Select/Release Verse', accelerator: 'Enter', click: function (i, webapp) {
                        webapp.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
                        webapp.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
                    }
                },
                {
                    label: 'Previous Verse', accelerator: 'Up', click: function (i, webapp) {
                        webapp.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Up' });
                        webapp.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Up' });
                    }
                },
                {
                    label: 'Next Verse', accelerator: 'Down', click: function (i, webapp) {
                        webapp.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Down' });
                        webapp.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Down' });
                    }
                },
                { type: 'separator' },
                {
                    label: 'Previous Passage', accelerator: 'Left', click: function (i, webapp) {
                        webapp.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Left' });
                        webapp.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Left' });
                    }
                },
                {
                    label: 'Next Passage', accelerator: 'Right', click: function (i, webapp) {
                        webapp.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Right' });
                        webapp.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Right' });
                    }
                },
                { type: 'separator' },
                {
                    label: 'Show/Hide Hebrew', accelerator: '*', click: function (i, webapp) {
                        webapp.webContents.sendInputEvent({ type: 'keyDown', keyCode: '*' });
                        webapp.webContents.sendInputEvent({ type: 'keyUp', keyCode: '*' });
                    }
                },
                {

                    label: 'Show/Hide Dead Sea Scroll Facsimile', accelerator: '*', click: function (i, webapp) {
                        webapp.webContents.sendInputEvent({ type: 'keyDown', keyCode: '*' });
                        webapp.webContents.sendInputEvent({ type: 'keyUp', keyCode: '*' });
                    }
                },
                { type: 'separator' },
                {
                    label: 'Show/Hide Tag', accelerator: '/', click: function (i, webapp) {
                        webapp.webContents.sendInputEvent({ type: 'keyDown', keyCode: '/' });
                        webapp.webContents.sendInputEvent({ type: 'keyUp', keyCode: '/' });
                    }
                },
                {

                    label: 'Next Tag', accelerator: '=', click: function (i, webapp) {
                        webapp.webContents.sendInputEvent({ type: 'keyDown', keyCode: '=' });
                        webapp.webContents.sendInputEvent({ type: 'keyUp', keyCode: '=' });
                    }
                },
                { type: 'separator' },
                {
                    label: 'Show Commentary', accelerator: '~', click: function (i, webapp) {
                        webapp.webContents.sendInputEvent({ type: 'keyDown', keyCode: '~' });
                        webapp.webContents.sendInputEvent({ type: 'keyUp', keyCode: '~' });
                    }
                },
                { type: 'separator' },
                { label: 'Quit', role: 'quit' }
            ]
        },
        {
            label: 'Structural Sections', submenu: createStructureMenu(settings.structure, settings.top_structures)
        },
        {
            label: 'Section Passages', submenu: createOutlineMenu(settings.outline, settings.top_outlines)
        },
        {
            label: 'Passage Verses', submenu: createVersionMenu(settings.version, settings.top_versions)
        },
        {
            label: 'Side-by-side Versions', submenu: [{ label: "None" },{ type: 'separator' }, { label: "2—KJV, NIV" }, { label:  "3—KJV, NIV, NRSV" }, { label: "4—KJV, NIV, NRSV, MSG"  }, { label: "5—KJV, NIV, NRSV, MSG, NASB" }]
        }
    ];
    return template;
}
