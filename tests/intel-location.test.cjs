const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.argv[2]||path.resolve(__dirname,'..');
const ts=require(path.join(root,'node_modules/typescript'));
const source=ts.transpileModule(fs.readFileSync(path.join(root,'app/api/intel-location/route.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function setup({session={activeCharacterId:'99',characters:[{characterId:'42',refreshToken:'old'}]},status=200,failRefresh=false}={}){
 let fetches=0,writes=0;const exports={};
 const json=(body,options={})=>({body,status:options.status||200,headers:options.headers});
 vm.runInNewContext(source,{exports,AbortSignal,Date,fetch:async(url,options)=>{fetches++;assert.equal(url,'https://esi.evetech.net/characters/42/location/');assert.equal(options.headers.Authorization,'Bearer secret');return {status,ok:status===200,json:async()=>({solar_system_id:30000142})};},require:name=>{
  if(name==='next/server')return {NextResponse:{json}};
  if(name.endsWith('/eve'))return {refreshCharacter:async c=>{if(failRefresh)throw Error('secret refresh failure');return {accessToken:'secret',character:{...c,refreshToken:'rotated'}};}};
  if(name.endsWith('/session'))return {readSession:async()=>({id:'session',data:session}),writeSession:async(r,s)=>{writes++;assert.equal(s.activeCharacterId,'99');assert.equal(s.characters[0].refreshToken,'rotated');}};
  throw Error(name);
 }});
 return {get:id=>exports.GET({nextUrl:new URL('https://app.eve-control.de/api/intel-location?characterId='+id)}),counts:()=>({fetches,writes})};
}
test('requires login and membership before any ESI request',async()=>{for(const [options,id,status] of [[{session:null},'42',401],[{},'777',404]]){const t=setup(options);assert.equal((await t.get(id)).status,status);assert.deepEqual(t.counts(),{fetches:0,writes:0});}});
test('returns only requested location without switching active character or exposing tokens',async()=>{const t=setup();const r=await t.get('42');assert.equal(r.status,200);assert.equal(r.body.characterId,'42');assert.equal(r.body.solarSystemId,30000142);assert.equal(r.headers['Cache-Control'],'private, no-store');assert.doesNotMatch(JSON.stringify(r),/secret|rotated|refreshToken|accessToken/);assert.deepEqual(t.counts(),{fetches:1,writes:1});});
test('scope and upstream failures preserve rotated token but disclose no location',async()=>{for(const status of [403,503]){const t=setup({status});const r=await t.get('42');assert.equal(r.status,status===403?403:502);assert.equal(r.body.solarSystemId,undefined);assert.deepEqual(t.counts(),{fetches:1,writes:1});}});
test('refresh failure gives reconnect message without leaking token service details',async()=>{const t=setup({failRefresh:true});const r=await t.get('42');assert.equal(r.status,401);assert.doesNotMatch(JSON.stringify(r),/secret/);assert.deepEqual(t.counts(),{fetches:0,writes:0});});
