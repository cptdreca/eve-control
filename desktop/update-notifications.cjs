const {app,Notification,shell,dialog}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path');
const {createChecker}=require('./update-checker.cjs');
let timer,initial,checker;const active=new Set();
function init(){
 const file=path.join(app.getPath('userData'),'update-notifications.json');
 checker=createChecker({current:app.getVersion(),
  readState:async()=>{try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{return {}; }},
  writeState:async data=>fs.writeFile(file,JSON.stringify(data)),
  notify:async release=>{
   if(!Notification.isSupported())return false;
   const notification=new Notification({title:'EVE-Control Update verfügbar',body:`Version ${release.version} ist verfügbar. Zum Download hier klicken.`,icon:path.join(__dirname,'icon.png')});
   active.add(notification);notification.on('click',()=>void shell.openExternal(release.url));notification.on('close',()=>active.delete(notification));notification.on('failed',()=>active.delete(notification));notification.show();return true;
  }
 });
 const automatic=()=>void checker.check().catch(()=>{});
 initial=setTimeout(automatic,15000);initial.unref();timer=setInterval(automatic,6*60*60*1000);timer.unref();
 app.on('before-quit',()=>{clearTimeout(initial);clearInterval(timer);});
}
async function checkNow(){
 try{const result=await checker.check(false);if(result.available){const answer=await dialog.showMessageBox({type:'info',title:'EVE-Control Update',message:`Version ${result.version} ist verfügbar.`,buttons:['Download öffnen','Später'],defaultId:0,cancelId:1});if(answer.response===0)await shell.openExternal(result.url);}
 else await dialog.showMessageBox({type:'info',title:'EVE-Control Updates',message:`Version ${app.getVersion()} ist aktuell.`,buttons:['OK']});
 }catch(e){await dialog.showMessageBox({type:'warning',title:'Update-Prüfung',message:e.message,buttons:['OK']});}
}
module.exports={init,checkNow};
