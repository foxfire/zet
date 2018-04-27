const electron = require('electron')
// Module to control application life.
const app = electron.app
const {ipcMain} = electron;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

// alwaysOnTop:true, focusable: false, maximizable = false

function createWindows() {
  let screenElectron = electron.screen;
  let mainScreen = screenElectron.getPrimaryDisplay();
  let allscreen = screenElectron.getAllDisplays();
  let secondaryScreen = allscreen[0];
  let dimension

  // Create the browser window.
  if (secondaryScreen.bounds.x === 0){
    dimension = mainScreen.bounds.width/2;
  } else{
    dimension = secondaryScreen.bounds.x/2;
  }
  clockWindow = new BrowserWindow({
    x: Math.floor(-450 + dimension),
    y: secondaryScreen.bounds.y,
    width: 900,
    height: 600,
    frame: false,
    skipTaskbar: true,
    resizable: false
  });
  mainWindow = new BrowserWindow({ width: 1280, height: 700 });

  ipcMain.on('resize', function (e, y) {
    clockWindow.setSize(900, Math.floor(y));
  });

  let minmax = true;
  ipcMain.on('minmax', function (e, y) {
    
    if(!minmax){
      BrowserWindow.fromId(1).restore();
      clockWindow.setSize(900, 600);
      minmax=true;
    }else{
      BrowserWindow.fromId(1).minimize();
      minmax=false;
    }
  });

  (mainWindow, clockWindow).once('ready-to-show', () => {
    (clockWindow, mainWindow).show();
  });

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);
  clockWindow.loadURL(`file://${__dirname}/stopwatch.html`);

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
    clockWindow.close();
    clockWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindows);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindows();
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
