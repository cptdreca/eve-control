const {app,BrowserWindow,Menu,shell,session}=require('electron');
const path=require('node:path');
const {HOME,internal,external}=require('./navigation.cjs');
let window;
app.enableSandbox();
if(!app.requestSingleInstanceLock()){app.quit();}else{
 app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.focus();}});
 app.whenReady().then(async()=>{
  const intel=require('./intel-window.cjs'); await intel.init();
  const isolated=session.fromPartition('persist:eve-control');
  isolated.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  isolated.setPermissionCheckHandler(()=>false);
  isolated.on('will-download',event=>event.preventDefault());
  window=new BrowserWindow({width:1280,height:900,minWidth:390,minHeight:600,title:'EVE-Control',backgroundColor:'#04090c',icon:path.join(__dirname,'icon.png'),show:false,webPreferences:{partition:'persist:eve-control',nodeIntegration:false,nodeIntegrationInWorker:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false,webviewTag:false}});
  Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'EVE-Control',submenu:[{label:'Dashboard',click:()=>window.loadURL(HOME)},{label:'Intel-Alarm',accelerator:'CmdOrCtrl+I',click:()=>intel.open()},{label:'Neu laden',accelerator:'CmdOrCtrl+R',click:()=>window.loadURL(HOME)},{type:'separator'},{label:'Neue Desktop-Version herunterladen',click:()=>shell.openExternal('https://github.com/cptdreca/eve-control/releases')},{role:'quit',label:'Beenden'}]},{label:'Ansicht',submenu:[{role:'zoomIn',label:'Vergrößern'},{role:'zoomOut',label:'Verkleinern'},{role:'resetZoom',label:'Originalgröße'},{role:'togglefullscreen',label:'Vollbild'}]}]));
  window.webContents.on('will-attach-webview',event=>event.preventDefault());
  window.webContents.on('will-navigate',(event,url)=>{if(!internal(url)){event.preventDefault();if(external(url))void shell.openExternal(url);}});
  window.webContents.on('will-redirect',(event,url)=>{if(!internal(url))event.preventDefault();});
  window.webContents.setWindowOpenHandler(({url})=>{if(internal(url))void window.loadURL(url);else if(external(url))void shell.openExternal(url);return {action:'deny'};});
  window.webContents.on('did-fail-load',(_event,code,_description,_url,isMainFrame)=>{if(isMainFrame&&code!==-3)void window.loadFile(path.join(__dirname,'offline.html'));});
  window.once('ready-to-show',()=>window.show());
  window.on('closed',()=>{window=null;});
  void window.loadURL(HOME);
 });
 app.on('window-all-closed',()=>app.quit());
}
