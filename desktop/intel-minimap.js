(function(root){
 function build(state,now=Date.now()){
  const nodes=new Map(),edges=new Map();let count=0;
  const add=(name,depth)=>{if(!nodes.has(name))nodes.set(name,{name,depth,pilots:[]});else nodes.get(name).depth=Math.min(nodes.get(name).depth,depth);return nodes.get(name);};
  if(!state.current)return {nodes:[],edges:[],count:0,width:640,height:220};add(state.current,0);
  for(const a of (state.alerts||[])){
   const age=now-Date.parse(a.time),route=a.routeSystems;
   if(!Number.isFinite(age)||age<0||age>300000||a.from!==state.current||!Array.isArray(route)||!route.length||route.length>21||route[0].name!==state.current||route.at(-1).name!==a.system||route.length-1!==a.distance)continue;
   if(nodes.size+route.filter(s=>!nodes.has(s.name)).length>120)continue;
   route.forEach((s,i)=>{add(s.name,i);if(i){const names=[route[i-1].name,s.name];edges.set([...names].sort().join('|'),names);}});
   add(a.system,a.distance).pilots.push(a);count++;
  }
  const layers=new Map();for(const n of nodes.values()){if(!layers.has(n.depth))layers.set(n.depth,[]);layers.get(n.depth).push(n);}
  const rows=Math.max(...[...layers.values()].map(a=>a.length));const height=Math.max(220,rows*85+80);
  for(const [depth,layer] of layers){layer.sort((a,b)=>a.name.localeCompare(b.name));layer.forEach((n,i)=>{n.x=90+depth*150;n.y=(i+1)*height/(layer.length+1)-10;});}
  return {nodes:[...nodes.values()],edges:[...edges.values()],count,width:Math.max(640,180+Math.max(...layers.keys())*150),height};
 }
 if(typeof module!=='undefined')module.exports={build};else root.IntelMinimap={build};
})(typeof globalThis!=='undefined'?globalThis:this);
