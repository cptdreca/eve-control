const {test}=require('node:test'),assert=require('node:assert/strict');
const {readLocation}=require('./intel-location.cjs');
const {IntelService}=require('./intel-service.cjs');
function service(){const s=new IntelService(()=>{});s.running=true;s.generation=1;s.own={id:42};return s;}
test('authenticated location uses fixed origin, session and requested character only',async()=>{
 let calls=0;
 const data=await readLocation({fetch:async(url,options)=>{calls++;assert.equal(url,'https://app.eve-control.de/api/intel-location?characterId=42');assert.equal(options.credentials,'include');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');return {ok:true,json:async()=>({characterId:'42',solarSystemId:30000142})};}},42);
 assert.deepEqual(data,{id:30000142});assert.equal(calls,1);
 await assert.rejects(()=>readLocation({},'42'),/Ungültiger/);
});
test('missing scope and wrong-character replies cannot supply a location',async()=>{
 await assert.rejects(()=>readLocation({fetch:async()=>({ok:false,json:async()=>({error:'Standortberechtigung fehlt'})})},42),/Standortberechtigung/);
 await assert.rejects(()=>readLocation({fetch:async()=>({ok:true,json:async()=>({characterId:'43',solarSystemId:30000142})})},42),/Ungültige Standortantwort/);
});
test('system changes, failures, stale locations and recovery',async()=>{
 const s=service();s.locationProvider=async()=>({id:30000142});await s.refreshLocation(1);assert.equal(s.current.name,'Jita');assert.equal(s.locationReady(),true);
 s.locationProvider=async()=>({id:30002187});await s.refreshLocation(1);assert.equal(s.current.id,30002187);
 s.locationCheckedAt=new Date(Date.now()-61000).toISOString();assert.equal(s.locationReady(),false);
 s.locationProvider=async()=>{throw Error('Bitte anmelden');};await s.refreshLocation(1);assert.equal(s.current,null);assert.match(s.locationError,/Bitte anmelden/);
 s.locationProvider=async()=>({id:30000142});await s.refreshLocation(1);assert.equal(s.locationError,'');assert.equal(s.locationReady(),true);
});
test('location response after stop is ignored',async()=>{
 const s=service();let resolve;s.locationProvider=()=>new Promise(r=>resolve=r);const pending=s.refreshLocation(1);s.stop();resolve({id:30000142});await pending;assert.equal(s.current,null);
});
test('no distance query or alert without current ESI location',async()=>{
 const s=service();s.esi=()=>assert.fail('Must not request distance');await s.process({gen:1,line:{text:'WMH-SO Erwin Thorax',time:Date.now()}});assert.equal(s.alerts.length,0);assert.match(s.locationError,/pausiert/);
});
test('ESI polling is throttled to 30 seconds even if log folder fails',async()=>{
 const s=service();let calls=0;s.locationProvider=async()=>{calls++;return {id:30000142};};await s.poll();await s.poll();assert.equal(calls,1);s.locationAttempt=Date.now()-31000;await s.poll();assert.equal(calls,2);
});
const {readCharacters}=require('./intel-location.cjs');
test('linked character list uses authenticated endpoint and returns only names and IDs',async()=>{const rows=await readCharacters({fetch:async(url,options)=>{assert.equal(url,'https://app.eve-control.de/api/characters');assert.equal(options.credentials,'include');return {ok:true,json:async()=>({characters:[{characterId:'42',name:'Own',wallet:123,refreshToken:'secret'}]})};}});assert.deepEqual(rows,[{id:'42',name:'Own'}]);await assert.rejects(()=>readCharacters({fetch:async()=>({status:401})}),/anmelden/);});
