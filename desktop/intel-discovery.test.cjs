const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {folders,discover,choose}=require('./intel-discovery.cjs');
const {allowedSender}=require('./dashboard-bridge.cjs');
test('dashboard bridge rejects other windows, frames and origins',()=>{
 const frame={url:'https://app.eve-control.de/'};const contents={mainFrame:frame};const win={webContents:contents,isDestroyed:()=>false};const event={sender:contents,senderFrame:frame};
 assert.equal(allowedSender(event,win),true);assert.equal(allowedSender({...event,sender:{}},win),false);assert.equal(allowedSender({...event,senderFrame:{url:frame.url}},win),false);
 for(const url of ['https://login.eveonline.com/','https://app.eve-control.de.evil.test/','https://user@app.eve-control.de/','file:///intel.html']){frame.url=url;assert.equal(allowedSender(event,win),false);}
});
test('known documents and OneDrive folders are deduplicated',()=>{
 const roots=folders({documents:path.join(os.tmpdir(),'Documents'),home:os.tmpdir(),env:{OneDrive:path.join(os.tmpdir(),'OneDrive'),OneDriveConsumer:path.join(os.tmpdir(),'OneDrive')}});
 assert.equal(roots.length,2);assert.ok(roots.every(p=>p.endsWith(path.join('EVE','logs','Chatlogs'))));
});
test('only unambiguous Intel or still-valid saved channels are selected',()=>{
 const a={folder:'x',prefix:'intel',recommended:true},b={folder:'x',prefix:'other-intel',recommended:true};const empty={folder:'',channels:''};
 assert.deepEqual(choose([a],empty),{folder:'x',channels:'intel'});assert.equal(choose([a,b],empty),null);
 assert.deepEqual(choose([a,b],{folder:'x',channels:'intel, other-intel'}),{folder:'x',channels:'intel, other-intel'});
 assert.equal(choose([{...a,recommended:false}],empty),null);
});
test('discovery matches listener, excludes Local and old logs, supports UTF16 and recognizes user format locally',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'eve-log-discovery-'));
 try{
  async function log(channel,pilot,stamp='120000',utf16=false,text=''){
   const file=path.join(root,channel+'_20261008_'+stamp+'.txt');const raw=`Channel Name: ${channel}\r\nListener: ${pilot}\r\n${text}`;
   await fs.writeFile(file,utf16?Buffer.concat([Buffer.from([255,254]),Buffer.from(raw,'utf16le')]):raw);return file;
  }
  await log('Alliance Intel','Own','120000',true);await log('Alliance Intel','Own','130000',true);
  await log('Other Intel','Other');await log('Local','Own');const old=await log('Old Intel','Own');await fs.utimes(old,new Date(Date.now()-2*86400000),new Date(Date.now()-2*86400000));
  await log('Reports','Own','120000',false,'[ 2026.10.08 12:00:00 ] Reporter > WMH-SO Erwin Thorax\r\n');
  await log('Social','Own');
  const result=await discover([root],'Own');assert.deepEqual(result.candidates.map(c=>c.channel).sort(),['Alliance Intel','Reports','Social']);
  assert.equal(result.candidates.find(c=>c.channel==='Reports').recommended,true);assert.equal(result.candidates.find(c=>c.channel==='Social').recommended,false);assert.equal(result.errors,0);
 }finally{if(!path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep))throw Error('Unsafe temporary path');await fs.rm(root,{recursive:true,force:true});}
});
const {selectChannels}=require('./intel-discovery.cjs');
test('multi-channel selection stays bound to character and folder',()=>{const candidates=[{pilot:'Own',folder:'x',prefix:'I. Ftn Intel'},{pilot:'Own',folder:'x',prefix:'I. Delve & Q Intel'},{pilot:'Other',folder:'x',prefix:'Intel'},{pilot:'Own',folder:'y',prefix:'Intel'}];assert.deepEqual(selectChannels(candidates,[0,1,0],'Own'),{folder:'x',channels:'I. Ftn Intel, I. Delve & Q Intel'});for(const indices of [[],[2],[0,3],[9],['0']])assert.throws(()=>selectChannels(candidates,indices,'Own'));});
