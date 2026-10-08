const {test}=require('node:test'),assert=require('node:assert/strict');
const {DotlanDistance,parseRoute}=require('./intel-distance.cjs');
const from={id:30000142,name:'Jita'},to={id:30000144,name:'Perimeter'};
function page(ids=[from.id,to.id]){return '<input id="wp_type1" checked="checked"><h2>Route: Jita - Perimeter</h2><table>'+ids.map((id,i)=>`<tr><td>${i+1}.</td><td><a class="igb link-5-${id}">System</a></td><td>99999</td></tr>`).join('')+'</table>';}
test('DOTLAN counts route transitions, not traffic statistics',()=>{assert.equal(parseRoute(page(),from,to),1);assert.equal(parseRoute(page([from.id,30000143,to.id]),from,to),2);});
test('DOTLAN rejects wrong endpoints, route modes and error pages',()=>{for(const html of [page([to.id,from.id]),page().replace('wp_type1','wp_type2'),'<h2>Not found</h2>',page().replace('2.</td>','3.</td>')])assert.throws(()=>parseRoute(html,from,to));});
test('DOTLAN cache, same-system case and fixed source',async()=>{let calls=0;const api=new DotlanDistance(async(url,options)=>{calls++;assert.equal(url,'https://evemaps.dotlan.net/route/1:Jita:Perimeter');assert.equal(options.redirect,'error');return {ok:true,text:async()=>page()};});assert.equal((await api.distance(from,from)).distance,0);assert.equal(calls,0);assert.equal((await api.distance(from,to)).distance,1);await api.distance(from,to);assert.equal(calls,1);});
test('failed DOTLAN calls back off and cannot become a distance',async()=>{let calls=0;const api=new DotlanDistance(async()=>{calls++;return {ok:false,status:503};});await assert.rejects(()=>api.distance(from,to),/503/);await assert.rejects(()=>api.distance(from,to),/Minute/);assert.equal(calls,1);});
const {IntelService}=require('./intel-service.cjs');
test('alarm radius validates and includes selected boundary including zero',async()=>{
 for(const radius of [0,1,5,20]){
  const s=new IntelService(()=>{});s.configure({...s.config,radius,autoLocation:false});s.running=true;s.generation=1;s.current=from;s.own={id:1,alliance_id:7};s.friendIds=new Set();s.names=async()=>({characters:[{id:2,name:'Erwin'}]});s.esi=async p=>({alliance_id:p==='/characters/1/'?7:8});
  s.distances={distance:async()=>({distance:radius+1,source:'DOTLAN'})};const item={gen:1,line:{text:'WMH-SO Erwin Thorax',time:Date.now()}};await s.process(item);assert.equal(s.alerts.length,0);
  s.distances={distance:async()=>({distance:radius,source:'DOTLAN'})};await s.process(item);assert.equal(s.alerts.length,1);assert.equal(s.alerts[0].distanceSource,'DOTLAN');
 }
 const s=new IntelService(()=>{});for(const radius of [-1,21,1.5,'5',NaN])assert.throws(()=>s.configure({...s.config,radius}));
});
