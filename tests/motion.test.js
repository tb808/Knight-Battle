import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { accelerate, PoseInterpolation } from '../src/motion.js';
import { Character } from '../src/actor.js';

test('Acceleration and braking are bounded and consistent across frame rates',()=>{
  for(const hz of [30,60,144]){
    const v=new THREE.Vector3(),target=new THREE.Vector3(2.8,0,0);
    accelerate(v,target,18,1/hz);assert.ok(v.x<=18/hz);
    for(let i=0;i<hz;i++)accelerate(v,target,18,1/hz);
    assert.ok(v.distanceTo(target)<1e-6);
    for(let i=0;i<hz;i++)accelerate(v,new THREE.Vector3(),24,1/hz);
    assert.ok(v.length()<1e-6);
  }
});

test('Interpolation smooths display and restores exact simulation transforms',()=>{
  const o=new THREE.Object3D(),poses=new PoseInterpolation([o]);poses.beforeStep();
  o.position.x=2;o.rotation.y=Math.PI/2;poses.afterStep();poses.render(.5);
  assert.ok(Math.abs(o.position.x-1)<1e-6);assert.ok(Math.abs(o.rotation.y-Math.PI/4)<1e-6);
  poses.restore();assert.equal(o.position.x,2);assert.ok(Math.abs(o.rotation.y-Math.PI/2)<1e-6);
  o.position.x=10;poses.snap();poses.render(.1);assert.equal(o.position.x,10);
});

test('The same stroke traces similar positions at 30, 60 and 144 Hz',()=>{
  const sample=hz=>{
    const p=new Character(new THREE.Scene(),{name:'Player'}),c=p.weaponControl;c.requestAttack();
    for(let i=0;i<Math.round(hz*.3);i++)c.step(1/hz);
    return c.yaw;
  };
  assert.ok(Math.abs(sample(30)-sample(60))<.18);
  assert.ok(Math.abs(sample(144)-sample(60))<.18);
});
