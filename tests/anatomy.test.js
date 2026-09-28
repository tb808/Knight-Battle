import test from 'node:test';
import assert from 'node:assert/strict';
import { AnatomySystem } from '../src/anatomy.js';
import { WEAPONS, BODY_PARTS, BALANCE } from '../src/config.js';
import { segmentSphere, sweepBlade } from '../src/collision.js';

const hit=(anatomy,part,key='longsword',attackType='left',velocity=5.5)=>anatomy.receiveHit({weapon:WEAPONS[key],bodyPart:part,attackType,relativeVelocity:velocity,power:1});

test('Every actor has 15 independent anatomical regions',()=>{
  const player=new AnatomySystem(),enemy=new AnatomySystem();
  assert.equal(BODY_PARTS.length,15);assert.equal(Object.keys(player.parts).length,15);
  hit(player,'leftForearm');assert.equal(enemy.parts.leftForearm.tissue,0);assert.equal(player.parts.rightForearm.tissue,0);assert.ok(player.parts.leftForearm.tissue>0);
});
test('Plate reduces cutting compared with an exposed hand',()=>{
  const a=new AnatomySystem();const chest=hit(a,'torso'),hand=hit(a,'leftHand');
  assert.ok(chest.magnitude<hand.magnitude);assert.ok(chest.protection>hand.protection);assert.ok(a.parts.torso.armorCondition<100);
});
test('A mace causes a fracture through plate',()=>{
  const a=new AnatomySystem();const result=hit(a,'rightLowerLeg','mace');
  assert.equal(result.damageType,'blunt');assert.ok(a.parts.rightLowerLeg.fracture>=1);assert.ok(a.modifiers.movement<1);
});
test('Arm trauma weakens attacks; leg trauma reduces mobility',()=>{
  const a=new AnatomySystem();a.addInjury('rightForearm','severeFracture',40);
  assert.ok(a.modifiers.attack<.85);const movement=a.modifiers.movement;
  a.addInjury('leftThigh','fracture',40);assert.ok(a.modifiers.movement<movement);assert.ok(a.modifiers.limpLeft>0);
});
test('Neck penetration causes bleeding and gradual collapse, never instant blood loss',()=>{
  const a=new AnatomySystem();const result=hit(a,'neck','spear','thrust',8);
  assert.equal(result.injuryType,'hemorrhage');assert.equal(a.blood,100);assert.equal(a.collapsed,false);
  a.update(1);assert.ok(a.blood<100&&a.blood>80);const speed=a.modifiers.movement;
  for(let i=0;i<1200&&!a.collapsed;i++)a.update(1/60);
  assert.equal(a.collapsed,true);assert.ok(a.blood<=BALANCE.blood.collapse||a.consciousness<8);assert.ok(a.modifiers.movement<speed);
});
test('Bleeding progresses equivalently at different frame rates',()=>{
  const a=new AnatomySystem(),b=new AnatomySystem();a.addInjury('leftForearm','deepCut',25);b.addInjury('leftForearm','deepCut',25);
  for(let i=0;i<600;i++)a.update(1/60);for(let i=0;i<300;i++)b.update(1/30);
  assert.ok(Math.abs(a.blood-b.blood)<.005);
});
test('Bruises do not produce external bleeding',()=>{const a=new AnatomySystem();a.addInjury('torso','bruise',25);a.update(10);assert.equal(a.bleeding,0);assert.equal(a.blood,100);});
test('Armor damage changes subsequent protection',()=>{const a=new AnatomySystem();const first=hit(a,'torso','axe');for(let i=0;i<3;i++)hit(a,'torso','axe');const last=hit(a,'torso','axe');assert.ok(last.protection<first.protection);});
test('Reset restores function, blood, armor, and injuries',()=>{const a=new AnatomySystem();a.addInjury('head','concussion',40);a.addInjury('neck','hemorrhage',30);a.update(10);a.reset();assert.equal(a.blood,100);assert.equal(a.consciousness,100);assert.equal(a.bleeding,0);assert.equal(a.collapsed,false);assert.equal(a.modifiers.attack,1);});
test('Segment collision misses nearby bodies outside the blade path',()=>{
  assert.equal(segmentSphere({x:0,y:0,z:0},{x:0,y:0,z:2},{x:1,y:0,z:1},.2),null);
  assert.ok(segmentSphere({x:0,y:0,z:0},{x:0,y:0,z:2},{x:0,y:0,z:1},.2));
});
test('A fast blade sweep catches a small body region between frames',()=>{
  const previous={hilt:{x:-1,y:1,z:0},tip:{x:-1,y:1,z:2}};
  const current={hilt:{x:1,y:1,z:0},tip:{x:1,y:1,z:2}};
  const hit=sweepBlade(previous,current,[{id:'neck',center:{x:0,y:1,z:1},radius:.12}]);
  assert.equal(hit.bodyPart,'neck');assert.ok(hit.sweepTime>0&&hit.sweepTime<1);
});
test('Blade height selects a leg rather than the torso',()=>{
  const blade={hilt:{x:0,y:.4,z:0},tip:{x:0,y:.4,z:2}};
  const hit=sweepBlade(blade,blade,[{id:'torso',center:{x:0,y:1.3,z:1},radius:.3},{id:'leftLowerLeg',center:{x:0,y:.4,z:1},radius:.15}]);
  assert.equal(hit.bodyPart,'leftLowerLeg');
});
