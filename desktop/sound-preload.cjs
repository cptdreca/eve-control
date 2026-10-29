const {contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('soundPlayer',{onPlay:callback=>ipcRenderer.on('sound:play',(_event,value)=>callback(value))});
