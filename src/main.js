import * as THREE from 'three';
import './style.css';
import './hud-fixes.css';
import { BALANCE, DEFAULT_CONTROLS, WEAPONS } from './config.js';
import { Character } from './actor.js';
import { CombatSystem, EnemyAI } from './combat.js';
import { createArena } from './environment.js';
import { Effects } from './effects.js';
import { UI } from './ui.js';
import { PoseInterpolation, accelerate } from './motion.js';

class Game {
  constructor(){
    this.canvas=document.querySelector('#game');
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#a7bece');this.scene.fog=new THREE.Fog('#b1bec2',28,115);
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,BALANCE.performance.pixelRatio));this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.14;
    this.camera=new THREE.PerspectiveCamera(53,innerWidth/innerHeight,.06,190);
    this.scene.add(new THREE.HemisphereLight('#c3d4de','#8b7754',1.75));
    const sun=new THREE.DirectionalLight('#ffe1ab',3.4);sun.position.set(-9,17,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-17;sun.shadow.camera.right=17;sun.shadow.camera.top=17;sun.shadow.camera.bottom=-17;sun.shadow.camera.near=.5;sun.shadow.camera.far=55;sun.shadow.bias=-.0006;sun.shadow.normalBias=.018;this.scene.add(sun);
    this.arena=createArena(this.scene);
    this.player=new Character(this.scene,{name:'Player',player:true,color:'#73392e',position:[-.45,0,2.55]});
    this.enemy=new Character(this.scene,{name:'Training knight',color:'#7c4938',position:[.2,0,-.45]});
    this.enemy.root.rotation.y=Math.PI;this.actors=[this.player,this.enemy];this.effects=new Effects(this.scene);
    this.controls={...DEFAULT_CONTROLS};try{Object.assign(this.controls,JSON.parse(localStorage.getItem('iron-sinew-controls-v2')||'{}'));}catch{/* Defaults remain available when storage is disabled. */}
    this.keys=new Set();this.guardPressed=false;this.locked=true;this.started=false;this.ended=false;this.paused=false;this.menuOpen=false;this.elapsed=0;this.time=0;this.cameraYaw=0;this.cameraPitch=.17;this.cameraDistance=3.3;this.shake=0;this.scratch=new THREE.Vector3();this.footstep=0;this.resultTimer=0;this.accumulator=0;this.debugVisible=false;
    this.combat=new CombatSystem(this.effects,event=>{this.ui.event(event);if(event.type==='hit'){this.shake=Math.min(.085,(event.actor.isPlayer?.035:.012)+(event.impact||0)*.024);}if(event.type==='parry')this.shake=.045;});
    this.ai=new EnemyAI(this.enemy);this.ui=new UI(this);this.bindInput();
    this.player.animate(0,0);this.enemy.animate(0,0);this.updateCamera(1);this.ui.update(0,true);
    this.interpolation=new PoseInterpolation([this.camera,...this.actors.flatMap(actor=>[actor.root,actor.rig,actor.weaponHolder,...Object.values(actor.parts).map(part=>part.node)])]);
    this.last=performance.now();this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);
  }
  start(){
    this.started=true;this.paused=false;document.querySelector('#pause-simulation').checked=false;document.querySelector('#pause-badge').classList.add('hidden');this.effects.unlock();document.querySelector('#start-prompt').classList.add('hidden');
    this.capturePointer();this.ui.notify('Find your rhythm.','Mouse chooses direction · Click to strike · Right mouse to guard');
  }
  capturePointer(){
    if(this.ui.debugOpen||this.menuOpen||this.ended)return;
    try{const request=this.canvas.requestPointerLock?.();request?.catch(()=>{document.querySelector('#pointer-hint').textContent='MOVE TO AIM · CLICK TO STRIKE · RIGHT MOUSE TO GUARD';});}catch{document.querySelector('#pointer-hint').textContent='MOVE TO AIM · CLICK TO STRIKE · RIGHT MOUSE TO GUARD';}
  }
  releaseInput(){this.keys.clear();this.guardPressed=false;this.player.weaponControl.cancel();}
  attack(type=['spear','dagger'].includes(this.player.weaponKey)?'thrust':'cut'){if(!this.player.weaponControl.requestAttack(type)&&this.player.stamina<22)this.ui.notify('Catch your breath','Let your stamina recover.');}
  equip(key){this.player.equip(key);if(!['longsword','arming'].includes(key))this.player.halfSword=false;this.ui.notify(WEAPONS[key].name,`${WEAPONS[key].reach.toFixed(2)} m reach · ${WEAPONS[key].type==='blunt'?'Blunt trauma':WEAPONS[key].type==='pierce'?'Penetrating strikes':'Cut & thrust'}`);}
  reset(){
    this.interpolation?.restore();
    this.releaseInput();
    this.player.reset([-.45,0,2.55]);this.enemy.reset([.2,0,-.45]);this.player.root.rotation.y=0;this.enemy.root.rotation.y=Math.PI;this.ai.attackTimer=2.2;this.ai.phase='idle';this.effects.reset();this.elapsed=0;this.ended=false;this.resultTimer=0;this.keys.clear();this.locked=true;this.cameraYaw=0;
    document.querySelector('#result').classList.add('hidden');document.querySelector('#event-log').innerHTML='';this.ui.notify('A new lesson','Steel yourself.');this.ui.update(0,true);
    this.cameraLook=null;this.updateCamera(1);
    this.interpolation?.snap();
    if(!this.started)this.start();
  }
  bindInput(){
    window.addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);});
    window.addEventListener('keydown',e=>{
      if(this.ui.binding){e.preventDefault();this.controls[this.ui.binding]=e.code;document.querySelector(`[data-bind="${this.ui.binding}"]`).textContent=e.code.replace('Key','').replace('Arrow','').replace('Left','');this.ui.binding=null;try{localStorage.setItem('iron-sinew-controls-v2',JSON.stringify(this.controls));}catch{}this.updateKeyHints();return;}
      if(['INPUT','SELECT'].includes(e.target.tagName))return;
      if(e.code==='Escape'){this.releaseInput();document.exitPointerLock?.();return;}
      if(Object.values(this.controls).includes(e.code)||e.code.startsWith('Digit'))e.preventDefault();
      if(e.repeat)return;this.keys.add(e.code);
      if(e.code===this.controls.debug){this.ui.toggleDebug();return;}
      if(e.code==='KeyV'){this.debugVisible=!this.debugVisible;this.ui.setWeaponDebug(this.debugVisible);return;}
      if(this.menuOpen||this.ended)return;
      if(e.code==='Enter'&&!this.started){this.start();return;}
      if(e.code===this.controls.lock){this.locked=!this.locked;this.ui.notify(this.locked?'Target locked':'Free camera',this.locked?'Camera follows the opponent':'Mouse turns the camera when the weapon is idle');}
      if(e.code===this.controls.stance){const stances=['Balanced','Aggressive','Defensive'];this.player.stance=stances[(stances.indexOf(this.player.stance)+1)%3];this.ui.notify(`${this.player.stance} stance`,this.player.stance==='Aggressive'?'More impact · higher stamina cost':this.player.stance==='Defensive'?'Stronger guard · lighter strikes':'Steady guard · measured strikes');}
      if(e.code===this.controls.halfSword){if(['longsword','arming'].includes(this.player.weaponKey)){this.player.halfSword=!this.player.halfSword;this.ui.notify(this.player.halfSword?'Half-sword':'Full grip',this.player.halfSword?'Precision thrusts · shortened grip':'Full reach restored');}else this.ui.notify('Sword stance','Equip a longsword or arming sword to half-sword.');}
      const weapons=['longsword','dagger','axe','spear','mace','arming'];if(/^Digit[1-6]$/.test(e.code))this.equip(weapons[Number(e.code.slice(-1))-1]);
      if(this.started&&!this.paused&&!this.ui.debugOpen){
        if(e.code===this.controls.thrust)this.attack('thrust');
        if(e.code===this.controls.dodge){let dir=this.inputDirection();if(dir.lengthSq()<.1)dir=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),this.player.root.rotation.y);this.combat.dodge(this.player,dir);}
      }
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.code));
    window.addEventListener('blur',()=>this.releaseInput());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.releaseInput();});
    this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
    this.canvas.addEventListener('mousedown',e=>{
      if(!this.started){this.start();return;}if(this.ended||this.paused||this.menuOpen||this.ui.debugOpen)return;
      this.effects.unlock();
      if(e.button===0){this.attack();if(document.pointerLockElement!==this.canvas)this.capturePointer();}
      if(e.button===2){e.preventDefault();this.guardPressed=true;this.player.weaponControl.setGuard(true);if(document.pointerLockElement!==this.canvas)this.capturePointer();}
      if(e.button===1){e.preventDefault();this.locked=!this.locked;}
    });
    window.addEventListener('mouseup',e=>{if(e.button===2){this.guardPressed=false;this.player.weaponControl.setGuard(false);}});
    document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==this.canvas)this.releaseInput();document.querySelector('#pointer-hint').textContent=document.pointerLockElement===this.canvas?'MOUSE: DIRECTION · CLICK: STRIKE · RIGHT MOUSE: GUARD · SPACE: THRUST':'CLICK THE ARENA · MOUSE: DIRECTION · RIGHT MOUSE: GUARD';});
    window.addEventListener('mousemove',e=>{
      if(!this.started||this.paused||this.menuOpen||this.ui.debugOpen||this.ended)return;
      if(document.pointerLockElement!==this.canvas&&e.target!==this.canvas)return;
      this.player.weaponControl.addMouseDelta(e.movementX||0,e.movementY||0);
      if(this.locked)return;
      this.cameraYaw-=(e.movementX||0)*.002;
      this.cameraPitch=THREE.MathUtils.clamp(this.cameraPitch+(e.movementY||0)*.0016,-.25,.85);
    });
    this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.cameraDistance=THREE.MathUtils.clamp(this.cameraDistance+e.deltaY*.002,2.5,6);},{passive:false});
    this.updateKeyHints();
  }
  updateKeyHints(){for(const el of document.querySelectorAll('[data-control]'))el.textContent=this.controls[el.dataset.control].replace('Key','').replace('Left','').toUpperCase();}
  inputDirection(){
    const x=(this.keys.has(this.controls.right)?1:0)-(this.keys.has(this.controls.left)?1:0),z=(this.keys.has(this.controls.back)?1:0)-(this.keys.has(this.controls.forward)?1:0);
    const yaw=this.locked&&this.enemy.alive?Math.atan2(this.player.position.x-this.enemy.position.x,this.player.position.z-this.enemy.position.z):this.cameraYaw;
    return new THREE.Vector3(x,0,z).applyAxisAngle(new THREE.Vector3(0,1,0),yaw).normalize();
  }
  move(actor,direction,dt,speed,impulse=false){
    if(!actor.alive)return;
    const target=direction.clone().multiplyScalar(speed);
    const velocity=impulse?target:accelerate(actor.moveVelocity,target,direction.lengthSq()>0?BALANCE.movement.acceleration:BALANCE.movement.braking,dt);
    const movement=velocity.clone().multiplyScalar(dt);actor.position.add(movement);
    actor.position.x=THREE.MathUtils.clamp(actor.position.x,-10.1,10.1);actor.position.z=THREE.MathUtils.clamp(actor.position.z,-9.3,9.3);
    for(const obstacle of this.arena.obstacles){const dx=actor.position.x-obstacle.x,dz=actor.position.z-obstacle.z,d=Math.hypot(dx,dz),r=obstacle.radius+.34;if(d<r&&d>.001){actor.position.x=obstacle.x+dx/d*r;actor.position.z=obstacle.z+dz/d*r;}}
    if(!impulse)actor.moving=velocity.length();
  }
  step(dt){
    this.time+=dt;this.combat.time=this.time;
    const active=this.started&&!this.paused&&!this.menuOpen&&!document.hidden;
    if(active&&!this.ended){
      this.elapsed+=dt;
      const previousPositions=this.actors.map(actor=>actor.position.clone());
      for(const [index,actor]of this.actors.entries())actor.previousPosition=previousPositions[index];
      for(const actor of this.actors)actor.weaponPrevious=actor.bladeWorld();
      for(const actor of this.actors)this.combat.tick(actor,dt);
      this.player.weaponControl.setGuard(this.guardPressed);
      this.player.weaponControl.step(dt);
      const p=this.player,mod=p.anatomy.modifiers;
      let direction=this.inputDirection();
      if(p.stagger>0)direction.set(0,0,0);
      if(p.dodge>0){
        const duration=.22*mod.movement+.1,progress=1-p.dodge/duration;
        this.move(p,p.dodgeVector,dt,BALANCE.movement.dodgeSpeed*mod.movement*(.4+.6*Math.sin(progress*Math.PI)),true);
        p.moveVelocity.copy(p.dodgeVector).multiplyScalar(BALANCE.movement.speed);p.moving=BALANCE.movement.speed;
      }
      else this.move(p,direction,dt,BALANCE.movement.speed*mod.movement*(p.blocking?.7:p.weaponControl.attack?.88:1));
      if(this.locked&&this.enemy.alive)p.face(this.enemy.position,dt);
      else p.face(p.position.clone().add(new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),this.cameraYaw)),dt);
      this.ai.update(dt,p,this.combat,this.move.bind(this));
      this.enemy.weaponControl.step(dt);
      // Character separation is movement collision only; damage always uses the blade sweep.
      const difference=this.enemy.position.clone().sub(p.position);difference.y=0;const distance=difference.length();
      if(distance<.68&&distance>.001){difference.normalize().multiplyScalar((.68-distance)*.5);p.position.sub(difference);this.enemy.position.add(difference);}
      for(const [index,actor]of this.actors.entries()){
        const moving=actor.moving;
        if(actor.impactVelocity.lengthSq()>.0001)this.move(actor,actor.impactVelocity,dt,1,true);
        actor.moving=moving;actor.impactVelocity.multiplyScalar(Math.exp(-dt*9));
        actor.frameVelocity.copy(actor.position).sub(previousPositions[index]).divideScalar(dt);
        actor.animate(dt,this.time);
      }
      for(const actor of this.actors)this.combat.resolve(actor,this.actors,dt);
      if(p.moving>.1){this.footstep+=dt*p.moving;if(this.footstep>.95){this.footstep=0;this.effects.sound('step');}}
      if(this.actors.some(a=>!a.alive)){this.ended=true;this.resultTimer=0;this.releaseInput();}
    }else if(this.ended){
      this.resultTimer+=dt;for(const actor of this.actors)actor.animate(dt,this.time);
      if(this.resultTimer>=1.5&&this.resultTimer-dt<1.5)this.ui.showResult();
    }else if(!this.paused&&!this.menuOpen){for(const actor of this.actors)actor.animate(dt,this.time);}
    if(active)this.effects.update(dt,this.actors);
    this.arena.update(this.time);this.updateCamera(dt);this.ui.update(this.time);this.updateWeaponDebug();
    this.interpolation?.afterStep();
  }
  updateCamera(dt){
    const p=this.player;
    if(this.locked&&this.enemy.alive){
      const desiredYaw=Math.atan2(p.position.x-this.enemy.position.x,p.position.z-this.enemy.position.z);
      this.cameraYaw+=Math.atan2(Math.sin(desiredYaw-this.cameraYaw),Math.cos(desiredYaw-this.cameraYaw))*(1-Math.exp(-dt*6));
    }
    const rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),this.cameraYaw);
    const pivot=p.position.clone().add(new THREE.Vector3(1.18,1.43,0).applyQuaternion(rotation));
    const desired=pivot.clone().add(new THREE.Vector3(0,Math.sin(this.cameraPitch)*this.cameraDistance,Math.cos(this.cameraPitch)*this.cameraDistance).applyQuaternion(rotation));
    // Shorten the camera boom at all four yard boundaries before smoothing.
    let fraction=1;const offset=desired.clone().sub(pivot);
    for(const [axis,min,max]of [['x',-10.55,10.55],['z',-9.7,10]]){
      if(desired[axis]<min&&offset[axis]<0)fraction=Math.min(fraction,(min-pivot[axis])/offset[axis]);
      if(desired[axis]>max&&offset[axis]>0)fraction=Math.min(fraction,(max-pivot[axis])/offset[axis]);
    }
    for(const obstacle of this.arena.obstacles){
      const o=new THREE.Vector3(obstacle.x,.8,obstacle.z),line=offset.clone();const t=THREE.MathUtils.clamp(o.clone().sub(pivot).dot(line)/line.lengthSq(),0,fraction);const near=pivot.clone().addScaledVector(line,t);if(near.y<1.9&&Math.hypot(near.x-o.x,near.z-o.z)<obstacle.radius+.2)fraction=Math.max(.12,t-.15);
    }
    desired.copy(pivot).addScaledVector(offset,Math.max(.07,fraction));desired.y=Math.max(.35,desired.y);
    if(fraction<.55)desired.y=Math.max(desired.y,2.85);
    this.camera.position.lerp(desired,1-Math.exp(-dt*9));
    this.camera.position.x=THREE.MathUtils.clamp(this.camera.position.x,-10.55,10.55);this.camera.position.z=THREE.MathUtils.clamp(this.camera.position.z,-9.7,10);
    this.shake=Math.max(0,this.shake-dt*.3);this.camera.position.x+=Math.sin(this.time*91)*this.shake;this.camera.position.y+=Math.cos(this.time*77)*this.shake*.6;
    const look=this.locked&&this.enemy.alive?this.enemy.position.clone().add(new THREE.Vector3(0,1.4,0)):
      pivot.clone().add(new THREE.Vector3(-1.18,-.04-Math.sin(this.cameraPitch)*2,-3).applyQuaternion(rotation));
    this.cameraLook??=look.clone();this.cameraLook.lerp(look,1-Math.exp(-dt*8));
    this.camera.lookAt(this.cameraLook);
    const enemyPoint=this.enemy.position.clone().add(new THREE.Vector3(0,2.3,0)).project(this.camera),marker=document.querySelector('#target-marker');
    marker.style.left=`${(enemyPoint.x*.5+.5)*innerWidth}px`;marker.style.top=`${(-enemyPoint.y*.5+.5)*innerHeight}px`;marker.style.display=this.enemy.alive&&enemyPoint.z<1&&Math.abs(enemyPoint.x)<1?'flex':'none';marker.style.opacity=this.locked?'1':'.35';
  }
  updateWeaponDebug(){
    if(!this.debugVisible){if(this.weaponDebugGroup)this.weaponDebugGroup.visible=false;return;}
    if(!this.weaponDebugGroup){
      this.weaponDebugGroup=new THREE.Group();this.scene.add(this.weaponDebugGroup);
      const colors={target:'#f4d676',current:'#76d8e9',sweep:'#df7655',velocity:'#9beb85',impact:'#f54e75'};
      this.weaponDebugLines={};
      for(const [name,color] of Object.entries(colors)){
        const line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color,depthTest:false}));
        this.weaponDebugGroup.add(line);this.weaponDebugLines[name]=line;
      }
      const material=new THREE.MeshBasicMaterial({color:'#f4d676',depthTest:false});
      this.weaponDebugTarget=new THREE.Mesh(new THREE.SphereGeometry(.065,8,6),material);this.weaponDebugGroup.add(this.weaponDebugTarget);
      this.weaponDebugImpact=new THREE.Mesh(new THREE.SphereGeometry(.075,8,6),new THREE.MeshBasicMaterial({color:'#e85b49',depthTest:false}));this.weaponDebugGroup.add(this.weaponDebugImpact);
    }
    this.weaponDebugGroup.visible=true;
    const control=this.player.weaponControl,blade=this.player.bladeWorld(),previous=this.player.weaponPrevious||blade;
    const desired=this.player.rig.localToWorld(this.player.weaponHolder.position.clone().addScaledVector(control.direction(control.desiredYaw,control.desiredPitch),WEAPONS[this.player.weaponKey].reach));
    this.weaponDebugTarget.position.copy(desired);
    const velocity=blade.tip.clone().sub(previous.tip).multiplyScalar(5);
    const impact=control.lastImpact;
    const impactPoint=impact?new THREE.Vector3(impact.point.x,impact.point.y,impact.point.z):blade.tip;
    const paths={target:[blade.hilt,desired],current:[blade.hilt,blade.tip],sweep:[previous.tip,blade.tip],velocity:[blade.tip,blade.tip.clone().add(velocity)],impact:[impactPoint,impactPoint.clone().addScaledVector(impact?.direction||new THREE.Vector3(),impact?.speed*.12||0)]};
    for(const [name,points] of Object.entries(paths)){this.weaponDebugLines[name].geometry.dispose();this.weaponDebugLines[name].geometry=new THREE.BufferGeometry().setFromPoints(points);}
    this.weaponDebugImpact.visible=!!control.lastImpact;
    if(control.lastImpact)this.weaponDebugImpact.position.set(control.lastImpact.point.x,control.lastImpact.point.y,control.lastImpact.point.z);
  }
  frame(now){
    this.interpolation.restore();
    const delta=Math.min(.1,(now-this.last)/1000);this.last=now;this.accumulator+=delta;
    // Fixed simulation steps make fast blade sweeps and bleeding independent of frame rate.
    let iterations=0;while(this.accumulator>=1/60&&iterations<6){this.interpolation.beforeStep();this.step(1/60);this.accumulator-=1/60;iterations++;}
    this.interpolation.render(this.accumulator*60);
    this.renderer.render(this.scene,this.camera);requestAnimationFrame(this.frame);
  }
}

try{
  const game=new Game();
  // Explicit, inspectable test seam; the live game and laboratory use the same systems.
  window.__IRON_SINEW__=game;
}catch(error){
  console.error(error);document.querySelector('#ui').innerHTML='<div class="modal-shade"><div class="result-card"><h2>The yard could not load.</h2><p>This game needs WebGL. Enable hardware acceleration or use a browser with WebGL support, then reload.</p></div></div>';
}
