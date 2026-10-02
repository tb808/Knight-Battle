import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/actor.js';
import { CombatSystem } from '../src/combat.js';
import { AnatomySystem } from '../src/anatomy.js';
import { WEAPONS, WEAPON_CONTROL } from '../src/config.js';
import { sweepWeapons } from '../src/collision.js';

function yard(distance=1.4) {
  const scene=new THREE.Scene(),events=[];
  const player=new Character(scene,{name:'Player',player:true});
  const enemy=new Character(scene,{name:'Enemy',position:[0,0,-distance]});
  enemy.root.rotation.y=Math.PI;enemy.animate(0,0);
  const combat=new CombatSystem({sound(){},burst(){}},event=>events.push(event));
  const step=(count=1)=>{for(let i=0;i<count;i++){
    combat.time+=1/60;
    player.weaponPrevious=player.bladeWorld();enemy.weaponPrevious=enemy.bladeWorld();
    combat.tick(player,1/60);combat.tick(enemy,1/60);
    player.weaponControl.step(1/60);enemy.weaponControl.step(1/60);
    player.animate(1/60,combat.time);enemy.animate(1/60,combat.time);
    combat.resolve(player,[enemy],1/60);combat.resolve(enemy,[player],1/60);
  }};
  return {player,enemy,combat,events,step};
}

test('Mouse selects bounded directions without moving the idle weapon or spending stamina',()=>{
  const d=yard(4),c=d.player.weaponControl,initial=d.player.bladeWorld().tip.clone();
  for(let i=0;i<40;i++){c.addMouseDelta(50000,0);d.step();}
  assert.deepEqual(c.aim,{x:1,y:0});assert.equal(c.phase,'ready');
  assert.ok(initial.distanceTo(d.player.bladeWorld().tip)<.04);
  assert.equal(d.player.stamina,100);
  c.addMouseDelta(NaN,Infinity);d.step();assert.ok(Number.isFinite(c.yaw));
  d.step(12);c.addMouseDelta(0,40);assert.equal(c.aimName,'OVERHEAD');
  d.step(12);c.addMouseDelta(-30,-30);assert.equal(c.aimName,'LEFT DIAGONAL');
  c.addMouseDelta(80,0);assert.equal(c.aimName,'RIGHT CUT','a new horizontal gesture must shed the previous diagonal');
});

test('A click makes one complete stroke and settles without oscillation',()=>{
  const d=yard(4),c=d.player.weaponControl;assert.equal(c.requestAttack(),true);
  const phases=new Set();let peak=-Infinity;
  for(let i=0;i<90;i++){d.step();phases.add(c.phase);peak=Math.max(peak,c.yaw);}
  assert.ok(phases.has('windup')&&phases.has('swing')&&phases.has('recovery'));
  assert.ok(peak>.65);assert.equal(c.phase,'ready');
  assert.ok(Math.abs(c.yaw-WEAPON_CONTROL.readyYaw)<.01);
  assert.ok(Math.abs(c.yawVelocity)<.02);
});

test('Direction adjusts during preparation and stays stable during the committed sweep',()=>{
  const d=yard(4),c=d.player.weaponControl;c.requestAttack();
  c.addMouseDelta(0,50);assert.equal(c.attack.direction.y,-1);
  while(c.phase!=='swing')d.step();
  const committed={...c.attack.direction};c.addMouseDelta(-120,0);
  assert.deepEqual(c.attack.direction,committed);
});

test('One buffered follow-up connects strokes; extra clicks never create an attack backlog',()=>{
  const d=yard(4),c=d.player.weaponControl;c.requestAttack();d.step(15);
  for(let i=0;i<20;i++)c.requestAttack('cut',{x:-1,y:0});
  d.step(80);assert.equal(c.attackId,2);assert.equal(c.phase,'ready');assert.equal(c.queued,null);
});

test('Guard cancels preparation and queued attacks, release restores attack control',()=>{
  const d=yard(),c=d.player.weaponControl;c.requestAttack();c.requestAttack();
  c.setGuard(true);d.step();assert.equal(c.phase,'guard');assert.equal(c.queued,null);
  assert.equal(c.requestAttack(),false);c.setGuard(false);assert.equal(c.requestAttack(),true);
});

test('Exhaustion, stagger and dodge reject attack inputs without spending stamina',()=>{
  const d=yard(),c=d.player.weaponControl;d.player.stamina=1;assert.equal(c.requestAttack(),false);
  d.player.stamina=100;d.player.stagger=.2;assert.equal(c.requestAttack(),false);
  d.player.stagger=0;d.player.dodge=.2;assert.equal(c.requestAttack(),false);
  assert.equal(d.player.stamina,100);
});

test('All six weapons can strike inside their reach and return to ready',()=>{
  for(const key of Object.keys(WEAPONS)){
    const d=yard({dagger:.9,mace:1.2,spear:2.3}[key]||1.4);
    d.player.equip(key);d.player.animate(0,0);
    d.player.weaponControl.requestAttack(['dagger','spear'].includes(key)?'thrust':'cut');
    d.step(90);
    assert.ok(d.events.some(e=>e.type==='hit'),`${key} should make contact`);
    assert.equal(d.player.weaponControl.phase,'ready');
  }
});

test('Overhead, rising and diagonal strokes move through distinct blade paths',()=>{
  for(const direction of [{x:0,y:-1},{x:0,y:1},{x:.707,y:-.707}]){
    const d=yard(4),c=d.player.weaponControl;c.requestAttack('cut',direction);
    const points=[];for(let i=0;i<35;i++){d.step();points.push(d.player.bladeWorld().tip.clone());}
    const ys=points.map(p=>p.y);assert.ok(Math.max(...ys)-Math.min(...ys)>.7);
    if(direction.x)assert.ok(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x))>1);
  }
});

test('Thrust extends and retracts automatically and makes a penetrating hit',()=>{
  const d=yard(1.9),c=d.player.weaponControl;c.requestAttack('thrust');let maxReach=0;
  for(let i=0;i<90;i++){d.step();maxReach=Math.max(maxReach,c.reach);}
  assert.ok(maxReach>.3);assert.ok(c.reach<.01);
  const hit=d.events.find(e=>e.type==='hit');assert.ok(hit);assert.equal(hit.result.attackType,'thrust');
  assert.equal(hit.result.damageType,'pierce');
});

test('A stroke hits once; ready, preparation and recovery cause no extra damage',()=>{
  const d=yard();d.player.weaponControl.requestAttack();d.step(90);
  assert.equal(d.events.filter(e=>e.type==='hit').length,1);
  d.step(120);assert.equal(d.events.filter(e=>e.type==='hit').length,1);
  d.player.weaponControl.requestAttack();d.step(90);
  assert.equal(d.events.filter(e=>e.type==='hit').length,2);
});

test('Held frontal guard blocks a stroke without moving either fighter backwards',()=>{
  const d=yard();d.enemy.weaponControl.setGuard(true);d.step(20);
  d.player.previousPosition=new THREE.Vector3(2,0,2);d.enemy.previousPosition=new THREE.Vector3(2,0,2);
  const before=d.player.position.clone();d.player.weaponControl.requestAttack();d.step(60);
  assert.equal(d.events.filter(e=>e.type==='block').length,1);
  assert.equal(d.events.filter(e=>e.type==='hit').length,0);
  assert.equal(d.enemy.anatomy.lastHit,null);assert.ok(d.player.position.equals(before));
  assert.equal(d.player.weaponControl.phase,'ready','contact must not trap the blade');
});

test('Timed guard parries and insufficient guard breaks',()=>{
  for(const mode of ['parry','guardBreak']){
    const d=yard();
    if(mode==='parry'){
      d.player.weaponControl.requestAttack();d.step(13);d.enemy.weaponControl.setGuard(true);
    }else{
      d.enemy.weaponControl.setGuard(true);d.step(20);d.enemy.guard=1;
      d.player.weaponControl.requestAttack();
    }
    d.step(mode==='parry'?14:27);
    assert.ok(d.events.some(e=>e.type===mode),mode);
  }
});

test('Guard cannot protect the back',()=>{
  const d=yard();d.enemy.root.rotation.y=0;d.enemy.weaponControl.setGuard(true);d.step(20);
  d.player.weaponControl.requestAttack();d.step(60);assert.ok(d.events.some(e=>e.type==='hit'));
});

test('Dodge evades committed blade contact, cancels preparation and costs stamina',()=>{
  const d=yard();d.player.weaponControl.requestAttack();
  d.enemy.weaponControl.requestAttack();
  assert.equal(d.combat.dodge(d.enemy,new THREE.Vector3(1,0,0)),true);
  assert.equal(d.enemy.weaponControl.attack,null);
  const stamina=d.enemy.stamina;assert.equal(d.combat.dodge(d.enemy,new THREE.Vector3(1,0,0)),false);
  assert.equal(d.enemy.stamina,stamina);d.step(10);assert.equal(d.enemy.anatomy.lastHit,null);
});

test('Blade sweeps detect crossing segments between frames',()=>{
  const a={hilt:new THREE.Vector3(-1,0,0),tip:new THREE.Vector3(-1,1,0)};
  const b={hilt:new THREE.Vector3(1,0,0),tip:new THREE.Vector3(1,1,0)};
  const fixed={hilt:new THREE.Vector3(0,.2,-.5),tip:new THREE.Vector3(0,.8,.5)};
  assert.ok(sweepWeapons(a,b,fixed,fixed));
});

test('Slow contact causes negligible trauma and flat contact loses cutting power',()=>{
  const base={weapon:WEAPONS.longsword,bodyPart:'torso',attackType:'cut',relativeVelocity:.5};
  assert.equal(new AnatomySystem({unarmored:true}).receiveHit(base).magnitude,0);
  const clean=new AnatomySystem({unarmored:true}).receiveHit({...base,relativeVelocity:7,edgeAlignment:1});
  const flat=new AnatomySystem({unarmored:true}).receiveHit({...base,relativeVelocity:7,edgeAlignment:0});
  assert.equal(clean.damageType,'cut');assert.equal(flat.damageType,'blunt');assert.ok(clean.magnitude>flat.magnitude);
});
