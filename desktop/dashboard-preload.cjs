const {contextBridge,ipcRenderer}=require('electron');
if(window.top===window&&['https://app.eve-control.de','https://eve-character-control.mgerdts1986.chatgpt.site'].includes(location.origin)){
 contextBridge.exposeInMainWorld('eveDesktop',{openIntel:pilot=>ipcRenderer.invoke('desktop:open-intel',pilot)});
}
