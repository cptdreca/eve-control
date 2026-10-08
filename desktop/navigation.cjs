const HOME='https://app.eve-control.de/';
const allowed=new Set(['https://app.eve-control.de','https://eve-character-control.mgerdts1986.chatgpt.site','https://login.eveonline.com']);
function internal(value){try{const u=new URL(value);return !u.username&&!u.password&&allowed.has(u.origin);}catch{return false;}}
function external(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}}
module.exports={HOME,internal,external};
