function allowedSender(event,window){
 if(!window||window.isDestroyed()||event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame)return false;
 try{const u=new URL(event.senderFrame.url);return !u.username&&!u.password&&['https://app.eve-control.de','https://eve-character-control.mgerdts1986.chatgpt.site'].includes(u.origin);}catch{return false;}
}
module.exports={allowedSender};
