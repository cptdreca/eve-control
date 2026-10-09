const {BrowserWindow,ipcMain,dialog,Notification,shell,app,session}=require('electron');
const path=require('node:path'),fs=require('node:fs/promises');const {pathToFileURL}=require('node:url');
const {IntelService}=require('./intel-service.cjs');
let panel,lastSound=0,detecting=false,candidates=[];const url=pathToFileURL(path.join(__dirname,'intel.html')).href;
const service=new IntelService(state=>{if(panel&&!panel.isDestroyed())panel.webContents.send('intel:state',state);});
service.onAlert=alert=>{if(Date.now()-lastSound>5000){shell.beep();lastSound=Date.now();}if(Notification.isSupported()){const n=new Notification({title:`Intel · ${alert.distance} Sprünge · ${alert.system}`,body:`${alert.pilot}${alert.reportedShip?' · '+alert.reportedShip:''}\n${alert.relation}`,icon:path.join(__dirname,'icon.png')});n.on('click',open);n.show();}};
function trusted(event){if(!panel||event.sender!==panel.webContents||event.senderFrame!==panel.webContents.mainFrame||event.senderFrame.url!==url)throw Error('Zugriff verweigert');}
function handle(name,fn){ipcMain.handle('intel:'+name,async(event,...args)=>{trusted(event);try{return {ok:true,value:await fn(...args)};}catch(e){return {ok:false,error:String(e.message).slice(0,500)};}});}
async function init(){service.locationProvider=id=>require('./intel-location.cjs').readLocation(session.fromPartition('persist:eve-control'),id);app.setAppUserModelId('de.eve-control.desktop');try{const saved=JSON.parse(await fs.readFile(path.join(app.getPath('userData'),'intel-settings.json'),'utf8'));for(const key of Object.keys(service.config))if(typeof saved[key]===typeof service.config[key])service.config[key]=saved[key];}catch{}
handle('characters',()=>require('./intel-location.cjs').readCharacters(session.fromPartition('persist:eve-control')));
handle('detect',async pilot=>{
 if(service.running||service.starting||detecting)throw Error('Alarm zuerst stoppen bzw. Suche abwarten.');
 if(typeof pilot!=='string'||!pilot.trim()||pilot.length>100)throw Error('Bitte deinen EVE-Charakter eintragen.');
 detecting=true;try{
  const previousPilot=service.config.pilot;service.configure({...service.config,pilot});
  if(previousPilot.toLowerCase()!==pilot.trim().toLowerCase())service.config.channels='';
  const {folders,discover,choose}=require('./intel-discovery.cjs');
  const result=await discover(folders({documents:app.getPath('documents'),home:app.getPath('home'),env:process.env,saved:service.config.folder}),pilot);
  candidates=result.candidates;const selected=choose(candidates,service.config);
  if(selected)Object.assign(service.config,selected);else service.config.channels='';
  service.emit();return {...result,selected:Boolean(selected),state:service.state()};
 }finally{detecting=false;}
});
handle('select-log',indices=>{
 if(service.running||service.starting||detecting)throw Error('Alarm zuerst stoppen bzw. Suche abwarten.');
 const selection=require('./intel-discovery.cjs').selectChannels(candidates,indices,service.config.pilot);
 Object.assign(service.config,selection);service.emit();return service.state();
});
handle('state',()=>service.state());handle('folder',async()=>{if(service.running||service.starting)throw Error('Alarm zuerst stoppen.');const result=await dialog.showOpenDialog(panel,{title:'EVE Chatlogs auswählen',defaultPath:path.join(app.getPath('documents'),'EVE','logs','Chatlogs'),properties:['openDirectory']});if(!result.canceled){service.config.folder=result.filePaths[0];service.emit();}return service.state();});
handle('save',async input=>{if(!input||typeof input!=='object')throw Error('Ungültige Einstellungen');service.configure(input);await fs.writeFile(path.join(app.getPath('userData'),'intel-settings.json'),JSON.stringify(service.config));return service.state();});
handle('start',()=>{if(detecting)throw Error('Logsuche bitte abwarten.');return service.start();});handle('stop',()=>service.stop());handle('killboard',id=>service.killboard(id));handle('open-killboard',async id=>{if(!Number.isSafeInteger(id)||id<=0||!service.alerts.some(a=>a.characterId===id))throw Error('Pilot ist nicht in der Intel-Liste.');await shell.openExternal('https://zkillboard.com/character/'+id+'/');return true;});handle('test',()=>{shell.beep();if(Notification.isSupported())new Notification({title:'EVE-Control Intel-Test',body:'Benachrichtigungen funktionieren.',icon:path.join(__dirname,'icon.png')}).show();return true;});
app.on('before-quit',()=>service.stop());}
function open(pilot){if(typeof pilot==='string'&&pilot&&!service.running&&!service.starting&&!detecting){if(service.config.pilot.toLowerCase()!==pilot.toLowerCase())service.config.channels='';service.config.pilot=pilot;}if(panel&&!panel.isDestroyed()){panel.show();panel.focus();if(!service.running&&!detecting)panel.webContents.send('intel:setup',service.state());return;}panel=new BrowserWindow({title:'EVE-Control · Intel-Alarm',width:1020,height:900,minWidth:480,minHeight:650,backgroundColor:'#04090c',icon:path.join(__dirname,'icon.png'),webPreferences:{preload:path.join(__dirname,'intel-preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});panel.setMenu(null);panel.webContents.on('will-navigate',e=>e.preventDefault());panel.webContents.on('will-redirect',e=>e.preventDefault());panel.webContents.setWindowOpenHandler(()=>({action:'deny'}));panel.webContents.on('will-attach-webview',e=>e.preventDefault());panel.webContents.session.setPermissionRequestHandler((_w,_p,cb)=>cb(false));panel.webContents.session.setPermissionCheckHandler(()=>false);void panel.loadURL(url);}
module.exports={init,open};
