let audio,active=[];
const tones={sonar:[[0,0.7,1100,400,'sine']],double:[[0,0.18,880,880,'sine'],[0.28,0.18,880,880,'sine']],pulse:[[0,0.24,660,1200,'triangle'],[0.32,0.24,660,1200,'triangle'],[0.64,0.24,660,1200,'triangle']],low:[[0,0.5,240,180,'triangle'],[0.65,0.5,240,180,'triangle']]};
window.soundPlayer.onPlay(async({sound,volume})=>{
 if(!tones[sound]||!Number.isFinite(volume)||volume<=0||volume>1)return;
 try{audio??=new AudioContext();await audio.resume();for(const o of active){try{o.stop();}catch{}}active=[];
 for(const [offset,duration,from,to,type] of tones[sound]){const start=audio.currentTime+0.02+offset,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(from,start);o.frequency.exponentialRampToValueAtTime(to,start+duration);g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(volume*0.22,start+0.02);g.gain.exponentialRampToValueAtTime(0.001,start+duration);o.connect(g);g.connect(audio.destination);o.start(start);o.stop(start+duration+0.02);o.onended=()=>{o.disconnect();g.disconnect();active=active.filter(x=>x!==o);};active.push(o);}
 }catch(e){console.error('Intel audio unavailable',e.message);}
});
