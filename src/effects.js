import * as THREE from 'three';
import { BALANCE } from './config.js';

export class Effects {
  constructor(scene) {
    this.scene=scene;this.particles=[];this.marks=[];this.audio=null;this.muted=false;this.bleedTimers=new WeakMap();
    this.geometry=new THREE.IcosahedronGeometry(.027,0);
    this.bloodMat=new THREE.MeshBasicMaterial({color:'#772c22'});
    this.sparkMat=new THREE.MeshBasicMaterial({color:'#ffe0a0'});
    this.markGeo=new THREE.CircleGeometry(1,7);
    this.markMat=new THREE.MeshBasicMaterial({color:'#713629',transparent:true,opacity:.72,depthWrite:false});
  }
  unlock(){try{this.audio??=new (window.AudioContext||window.webkitAudioContext)();this.audio.resume();}catch{/* Audio is optional when a device is unavailable. */}}
  sound(type='hit',strength=1){
    if(!this.audio||this.muted)return;
    const ctx=this.audio,now=ctx.currentTime,duration=type==='parry'?.45:type==='step'?.07:.18;
    const gain=ctx.createGain();gain.gain.setValueAtTime((type==='step'?.025:.06)*strength,now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);gain.connect(ctx.destination);
    if(type==='swing'||type==='hit'||type==='step'||type==='pain'){
      const buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
      const noise=ctx.createBufferSource();noise.buffer=buffer;const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=type==='swing'?1700:type==='step'?350:650;noise.connect(filter);filter.connect(gain);noise.start();
    }else{
      for(const f of [type==='parry'?1250:750,1830,2600]){const osc=ctx.createOscillator();osc.type='triangle';osc.frequency.setValueAtTime(f,now);osc.frequency.exponentialRampToValueAtTime(f*.83,now+duration);osc.connect(gain);osc.start(now);osc.stop(now+duration);}
    }
  }
  burst(position,blood=true,amount=12){
    for(let i=0;i<amount&&this.particles.length<BALANCE.performance.particles;i++){
      const p=new THREE.Mesh(this.geometry,blood?this.bloodMat:this.sparkMat);p.position.copy(position);p.scale.setScalar(blood?.6+Math.random():.45);this.scene.add(p);
      this.particles.push({mesh:p,velocity:new THREE.Vector3((Math.random()-.5)*2.7,Math.random()*2.5,(Math.random()-.5)*2.7),life:.4+Math.random()*.4,blood});
    }
  }
  mark(position,size=.055){
    let mark;
    if(this.marks.length>=BALANCE.performance.groundMarks){mark=this.marks.shift();}else{mark=new THREE.Mesh(this.markGeo,this.markMat);this.scene.add(mark);}
    mark.position.set(position.x,.061+Math.random()*.002,position.z);mark.rotation.set(-Math.PI/2,0,Math.random()*6);mark.scale.set(size,size*.7,1);this.marks.push(mark);
  }
  update(dt,actors){
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;p.velocity.y-=9.8*dt;p.mesh.position.addScaledVector(p.velocity,dt);if(p.mesh.position.y<.06||p.life<=0){if(p.blood&&p.mesh.position.y<.06)this.mark(p.mesh.position);p.mesh.removeFromParent();this.particles.splice(i,1);}}
    for(const actor of actors){
      if(!actor.alive)continue;
      let timer=(this.bleedTimers.get(actor)||0)+dt;
      const rate=actor.anatomy.bleeding;
      if(rate>.05&&timer>Math.max(.09,.8/(rate+.2))){
        timer=0;const bleeding=Object.values(actor.anatomy.parts).filter(p=>p.bleeding>.02);
        const part=bleeding[Math.floor(Math.random()*bleeding.length)];
        if(part){const position=actor.parts[part.id].node.getWorldPosition(new THREE.Vector3());position.z+=.12;this.burst(position,true,Math.min(5,Math.ceil(rate)));this.mark(position,.025+Math.min(.1,rate*.014));}
      }
      this.bleedTimers.set(actor,timer);
    }
  }
  reset(){for(const p of this.particles)p.mesh.removeFromParent();for(const m of this.marks)m.removeFromParent();this.particles=[];this.marks=[];this.bleedTimers=new WeakMap();}
}
