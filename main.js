const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {

    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,

        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            cache: false
        },

        backgroundColor: '#0f172a',
        autoHideMenuBar: true,
        title: 'Sistem Perpustakaan Digital'

    });

    win.loadFile('index.html');
    win.center();
}


app.whenReady().then(() => {
    createWindow();

    app.on('activate', function() {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') app.quit();
});