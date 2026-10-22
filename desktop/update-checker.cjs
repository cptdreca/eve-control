const API='https://api.github.com/repos/cptdreca/eve-control/releases?per_page=30';
function version(value){return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)?value.split('.').map(Number):null;}
function newer(a,b){const x=version(a),y=version(b);if(!x||!y)return false;for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]>y[i];}return false;}
function latestRelease(rows,current){
 if(!Array.isArray(rows))throw Error('Ungültige Update-Antwort.');let latest=null;
 for(const row of rows){
  const v=typeof row.tag_name==='string'?row.tag_name.replace(/^desktop-v/,''):'';
  if(row.draft||row.prerelease||row.tag_name!==`desktop-v${v}`||!version(v)||!newer(v,current))continue;
  if(!row.assets?.some(a=>a.name===`EVE-Control-Setup-${v}-x64.exe`&&a.state==='uploaded'&&a.size>0))continue;
  if(!latest||newer(v,latest.version))latest={version:v,url:`https://github.com/cptdreca/eve-control/releases/tag/desktop-v${v}`};
 }return latest;
}
function createChecker({current,readState,writeState,notify,request=fetch}){
 let pending=null;
 return {check(notifyUser=true){if(pending)return pending;pending=(async()=>{
  const response=await request(API,{headers:{Accept:'application/vnd.github+json','User-Agent':`EVE-Control/${current}`},signal:AbortSignal.timeout(15000),redirect:'error'});
  if(!response.ok)throw Error('Update-Prüfung derzeit nicht möglich. Bitte später erneut versuchen.');
  const release=latestRelease(await response.json(),current);if(!release)return {available:false};
  const saved=await readState();
  if(notifyUser&&saved?.lastNotified!==release.version&&await notify(release))await writeState({lastNotified:release.version});
  return {available:true,...release};
 })().finally(()=>{pending=null;});return pending;}};
}
module.exports={newer,latestRelease,createChecker};
