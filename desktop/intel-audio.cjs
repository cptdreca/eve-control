const {BrowserWindow,app}=require('electron');const path=require('node:path');const {validate}=require('./intel-sounds.cjs');let player,ready;
async function play(sound,volume){validate(sound,volume);if(sound==='silent'||volume===0)return;
 if(!player||player.isDestroyed()){player=new BrowserWindow({show:false,width:1,height:1,skipTaskbar:true,webPreferences:{preload:path.join(__dirname,'sound-preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,backgroundThrottling:false,autoplayPolicy:'no-user-gesture-required'}});player.webContents.setWindowOpenHandler(()=>({action:'deny'}));player.webContents.on('will-navigate',event=>event.preventDefault());ready=player.loadFile(path.join(__dirname,'sound-player.html'));}
 await ready;if(player&&!player.isDestroyed())player.webContents.send('sound:play',{sound,volume});
}
app.on('before-quit',()=>{if(player&&!player.isDestroyed())player.destroy();});
module.exports={play};

app.on('browser-window-created',(_event,window)=>{window.on('closed',()=>{if(player&&!player.isDestroyed()&&BrowserWindow.getAllWindows().every(w=>w===player))player.destroy();});});
