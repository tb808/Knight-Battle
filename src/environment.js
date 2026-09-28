import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, mesh, cylinder, beam, mat, weaponModel, shield } from './geometry.js';

function surfaceTexture(kind){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.fillStyle=kind==='ground'?'#e2d7b9':'#b9a086';ctx.fillRect(0,0,256,256);
  let seed=301;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<(kind==='ground'?18000:700);i++){
    const n=rand();ctx.fillStyle=n>.5?'rgba(255,249,215,.13)':'rgba(63,44,27,.08)';
    const x=rand()*256,y=rand()*256;ctx.fillRect(x,y,kind==='ground'?1+rand()*2:.5+rand(),kind==='ground'?1+rand()*2:8+rand()*55);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(kind==='ground'?70:1,kind==='ground'?70:2);return texture;
}

// Original procedural placeholder art, deliberately separate from gameplay systems.
export function createArena(scene) {
  const world = new THREE.Group(); scene.add(world);
  const stone=mat('#8d8978'), stoneLight=mat('#aaa38e'), stoneDark=mat('#77796d');
  const wood=mat('#594431'), timber=mat('#796044'), darkWood=mat('#3c3027');
  const grain=surfaceTexture('wood');wood.map=grain;timber.map=grain;darkWood.map=grain;
  const red=mat('#813c32'), iron=mat('#343a37',.6), straw=mat('#b59c62');
  const cloth = new THREE.MeshStandardMaterial({color:'#8b3d32',side:THREE.DoubleSide,roughness:1,flatShading:true});
  let seed=42;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const soil=mat('#a99c79');soil.map=surfaceTexture('ground');
  const ground=mesh(new THREE.PlaneGeometry(240,240),soil,world);ground.rotation.x=-Math.PI/2;
  // Stone paving uses instancing rather than hundreds of draw calls.
  const pavingGeometry=new THREE.CylinderGeometry(1,1,.029,5);
  const paving=new THREE.InstancedMesh(pavingGeometry,mat('#b8ad8e'),1000);paving.receiveShadow=true;world.add(paving);
  const dummy=new THREE.Object3D();
  for(let i=0;i<1000;i++){
    const x=(random()-.5)*29,z=(random()-.5)*29;
    dummy.position.set(x,.018,z);dummy.rotation.set(0,random()*6.28,0);dummy.scale.set(.14+random()*.38,1,.12+random()*.3);dummy.updateMatrix();paving.setMatrixAt(i,dummy.matrix);
    paving.setColorAt(i,new THREE.Color().setHSL(.105+random()*.018,.15+random()*.08,.43+random()*.16));
  }
  const dustRing=mesh(new THREE.RingGeometry(3.7,3.73,64),mat('#c6b58c'),world,[0,.052,0]);dustRing.rotation.x=-Math.PI/2;dustRing.material.transparent=true;dustRing.material.opacity=.4;
  const obstacles=[];
  function banner(x,y,z,w=1.2,h=3,rot=0){
    const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;world.add(g);
    const geom=new THREE.PlaneGeometry(w,h,6,8),positions=geom.attributes.position;
    for(let i=0;i<positions.count;i++){
      const px=positions.getX(i),py=positions.getY(i);
      positions.setZ(i,Math.sin(px*5+py*1.5)*.08+Math.cos(py*2)*.035);
      if(py<-h*.49)positions.setY(i,py+.28*Math.abs(px)/(w/2));
    }
    geom.computeVertexNormals();mesh(geom,cloth,g);
    beam(g,[-w*.64,h/2+.07,0],[w*.64,h/2+.07,0],.055,timber);
    const gold=mat('#c8b88e');
    box(g,[w*.12,h*.4,.015],[0,.15,.1],gold);box(g,[w*.56,h*.075,.015],[0,h*.06,.1],gold);
    for(const s of [-1,1]){const d=box(g,[w*.14,w*.14,.02],[s*w*.23,h*.06,.11],gold);d.rotation.z=Math.PI/4;}
    return g;
  }
  function wall(x,z,length,rot=0){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;world.add(g);
    box(g,[length,3.2,.72],[0,1.6,0],stone);
    for(let y=.35;y<3.2;y+=.52)for(let a=-length/2+.45;a<length/2;a+=.93){
      box(g,[.87,.46,.08],[a+((Math.round(y/.52)%2)*.22),y,.4],random()>.5?stoneLight:stoneDark);
    }
    for(let a=-length/2;a<=length/2;a+=1.2)box(g,[.65,.68,.84],[a,3.49,0],stoneLight);
  }
  wall(0,-13,29);wall(-13,0,26,Math.PI/2);wall(13,0,26,Math.PI/2);wall(0,13,26,Math.PI);
  function fence(x,z,length,rot=0){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;world.add(g);
    for(let a=-length/2;a<=length/2;a+=.49){
      const h=2.75+random()*.25;
      cylinder(g,.135,.18,h,5,[a,h/2,0],random()>.45?wood:timber);
      mesh(new THREE.ConeGeometry(.15,.36,5),timber,g,[a,h+.14,0]);
    }
    box(g,[length,.14,.19],[0,.65,.18],darkWood);box(g,[length,.14,.19],[0,2.1,.18],darkWood);
  }
  fence(-7,-10.3,8.1);fence(7,-10.3,8.1);fence(-11,0,20,Math.PI/2);fence(11,0,20,Math.PI/2);fence(0,10.5,21,Math.PI);
  // The central gate sits behind the fighting area.
  for(const x of [-2.55,2.55])box(world,[.7,4,.9],[x,2,-10.2],stoneLight);
  box(world,[5.8,.8,1],[0,3.8,-10.2],stone);
  for(let x=-2.15;x<2.3;x+=.24)box(world,[.2,3,.18],[x,1.5,-10.22],darkWood);
  for(const y of [.6,2.1])box(world,[4.6,.13,.12],[0,y,-10.05],iron);
  banner(0,4.8,-9.96,.9,2.2);
  function tower(x,z){
    const g=new THREE.Group();g.position.set(x,0,z);world.add(g);
    cylinder(g,1.55,1.8,7,8,[0,3.5,0],stone);
    for(let y=.6;y<6.5;y+=.65){
      const ring=cylinder(g,1.8-y*.034,1.8-y*.034,.045,8,[0,y,0],stoneDark);ring.castShadow=false;
    }
    cylinder(g,1.76,1.6,.45,8,[0,6.8,0],stoneLight);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;const tooth=box(g,[.6,.9,.6],[Math.sin(a)*1.53,7.37,Math.cos(a)*1.53],stoneLight);tooth.rotation.y=a;
    }
    for(const y of [3.8,5.3])box(g,[.17,.65,.045],[0,y,1.77],darkWood);
    banner(x,5,z+1.78,.8,2.6);
  }
  tower(-9,-15);tower(9,-15);tower(2,-23);
  // Timber viewing galleries on both sides of the yard.
  function gallery(side){
    const x=side*9.4;
    for(let z=-8;z<=7;z+=3){
      box(world,[.24,5,.24],[x,2.5,z],timber);
      beam(world,[x,.3,z],[x,2.8,z+2.1],.13,wood);
      beam(world,[x,2.8,z],[x-side*1.4,4,z],.11,wood);
    }
    box(world,[2.8,.19,16.5],[x,2.75,-.5],wood);
    box(world,[.15,.16,16.5],[x-side*1.35,3.55,-.5],timber);
    for(let z=-8;z<=7.5;z+=1.1)box(world,[.1,.8,.1],[x-side*1.35,3.16,z],wood);
    const roof=box(world,[3.5,.13,17],[x,5,-.5],darkWood);roof.rotation.z=side*.13;
    for(const z of [-6,-1,4])banner(x-side*1.44,2,z,.95,1.8,side*Math.PI/2);
    for(const z of [-5,-1.5,2,5.5]){
      const sx=x-side*.75;
      cylinder(world,.19,.24,.64,6,[sx,3.39,z],random()>.5?red:stoneDark);
      mesh(new THREE.IcosahedronGeometry(.15,0),stoneLight,world,[sx,3.88,z]);
      mesh(new THREE.ConeGeometry(.17,.19,6),iron,world,[sx,3.99,z]);
      for(const sign of [-1,1])beam(world,[sx+sign*.2,3.61,z],[sx+sign*.31,3.32,z-.12],.09,stoneDark);
    }
  }
  gallery(-1);gallery(1);
  for(const [x,z] of [[-6.7,-8],[6.7,-8],[-9,4],[9,4]]){
    cylinder(world,.052,.07,6.5,7,[x,3.25,z],timber);
    banner(x+.55,4.7,z,1.25,2.9);
  }
  function barrel(x,z,s=1){
    const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);world.add(g);
    cylinder(g,.31,.31,.85,10,[0,.425,0],wood);
    cylinder(g,.36,.31,.43,10,[0,.24,0],timber);cylinder(g,.31,.36,.43,10,[0,.64,0],timber);
    for(const y of [.14,.43,.73])cylinder(g,y===.43?.366:.341,y===.43?.366:.341,.045,10,[0,y,0],iron);
    cylinder(g,.31,.31,.026,10,[0,.865,0],wood);
    obstacles.push({x,z,radius:.4*s});
  }
  for(const [x,z,s]of [[7,-6,1.2],[7.8,-6.6,1],[7.5,-5.1,.95],[-7,-7,1.1],[-7.8,-6.7,.8],[-8,5,1.15],[8,6,1.2]])barrel(x,z,s);
  function crate(x,z,s=1){
    box(world,[s,s,s],[x,s/2,z],wood);
    for(const dx of [-.42,.42])box(world,[.09,s,.04],[x+dx*s,s/2,z+s/2+.02],timber);
    beam(world,[x-s*.43,.08,z+s/2+.06],[x+s*.43,s-.08,z+s/2+.06],.095,timber,.035);
    obstacles.push({x,z,radius:s*.65});
  }
  crate(8,-3);crate(8.1,-1.7,.85);crate(-8,-3,.9);crate(8,-3,.6);
  // Training dummies and a rack of usable-looking equipment.
  for(const [x,z] of [[-6,-4],[5.8,-6.8]]){
    cylinder(world,.075,.09,1.75,6,[x,.875,z],wood);
    cylinder(world,.22,.3,.68,7,[x,1.25,z],straw);
    mesh(new THREE.IcosahedronGeometry(.21,0),straw,world,[x,1.82,z]);
    beam(world,[x-.6,1.47,z],[x+.6,1.47,z],.15,straw);
    for(const sign of [-1,1])beam(world,[x, .2,z],[x+sign*.5,.06,z+.3],.12,wood);
    box(world,[.04,.44,.015],[x,1.27,z+.28],red);box(world,[.3,.04,.015],[x,1.3,z+.282],red);
    obstacles.push({x,z,radius:.55});
  }
  for(const x of [6.5,8.3]){beam(world,[x,0,1],[x,1.6,1.3],.1,timber);beam(world,[x,0,1.9],[x,1.6,1.3],.1,timber);}
  box(world,[2.2,.16,.16],[7.4,1.2,1.25],wood);
  for(let i=0;i<5;i++){const w=weaponModel(i%2?'spear':'longsword',world);w.position.set(6.7+i*.32,.22,1.38);w.rotation.z=-.1;w.rotation.x=.2;}
  const spareShield=shield(world,red,iron,1.2).group;spareShield.position.set(8.8,.57,1.7);spareShield.rotation.set(-.25,.5,.15);
  // Low-poly hills and distant peaks frame the architecture.
  for(let i=0;i<18;i++){
    const x=(i-8.5)*10,z=-48-random()*18,h=10+random()*16;
    const width=7+random()*8,segments=7,rows=4,rings=[];
    for(let row=0;row<=rows;row++){
      const ring=[];for(let s=0;s<segments;s++){const a=s/segments*Math.PI*2,radius=row===rows?0:width*(1-row/rows)*(.75+random()*.5);ring.push([Math.cos(a)*radius+(row/rows)*2,(row/rows)*h+(row===0||row===rows?0:(random()-.5)*2),Math.sin(a)*radius]);}rings.push(ring);
    }
    const vertices=[],colors=[];
    for(let row=0;row<rows;row++)for(let s=0;s<segments;s++){
      const next=(s+1)%segments;vertices.push(...rings[row][s],...rings[row+1][s],...rings[row][next],...rings[row][next],...rings[row+1][s],...rings[row+1][next]);
      const c=new THREE.Color(row===rows-1&&h>19?'#d2d7d1':i%2?'#85939c':'#96a0a2');c.multiplyScalar(.87+random()*.22);for(let k=0;k<6;k++)colors.push(c.r,c.g,c.b);
    }
    const mountain=new THREE.BufferGeometry();mountain.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));mountain.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));mountain.computeVertexNormals();
    mesh(mountain,new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1}),world,[x,-1,z]);
  }
  const cloudMaterial=new THREE.MeshBasicMaterial({color:'#e8e8d9',transparent:true,opacity:.5,depthWrite:false});
  for(let i=0;i<12;i++){
    const x=(i-5.5)*15,y=24+random()*9,z=-68-random()*12;
    for(let j=0;j<3;j++){const cloud=mesh(new THREE.IcosahedronGeometry(2.8+random()*2,1),cloudMaterial,world,[x+j*3,y+random(),z]);cloud.scale.set(1.7,.42,1);cloud.castShadow=false;cloud.receiveShadow=false;}
  }
  const needles=[mat('#59695a'),mat('#64725b')];
  for(let i=0;i<24;i++){
    const x=(random()-.5)*70,z=-22-random()*17;
    const h=2+random()*4;cylinder(world,.08,.17,h,5,[x,h/2,z],wood);
    for(let j=0;j<3;j++)mesh(new THREE.ConeGeometry((h*.24)*(1-j*.23),h*.46,5),needles[j%2],world,[x,h*.5+j*h*.18,z]);
  }
  // A few tufts at the edge of the paving.
  const grassMaterial=mat('#73794d');
  for(let i=0;i<70;i++){
    const a=random()*Math.PI*2,r=7+random()*3,x=Math.cos(a)*r,z=Math.sin(a)*r;
    for(let j=0;j<3;j++){const grass=mesh(new THREE.ConeGeometry(.025,.15+random()*.12,3),grassMaterial,world,[x+j*.036,.1,z]);grass.rotation.z=(random()-.5)*.45;}
  }
  const fires=[];
  for(const [x,z]of [[-4.5,-8],[4.5,-8]]){
    for(let i=0;i<3;i++){const a=i*2.094;beam(world,[x+Math.cos(a)*.32,0,z+Math.sin(a)*.32],[x,1.04,z],.06,iron);}
    cylinder(world,.32,.16,.22,8,[x,1.05,z],iron);
    const flame=mesh(new THREE.ConeGeometry(.19,.55,5),new THREE.MeshBasicMaterial({color:'#ffc079'}),world,[x,1.41,z]);
    const core=mesh(new THREE.ConeGeometry(.12,.4,5),new THREE.MeshBasicMaterial({color:'#ffe6a2'}),world,[x,1.36,z+.06]);
    const light=new THREE.PointLight('#ff9b43',3,5,2);light.position.set(x,1.5,z);world.add(light);fires.push({flame,core,light});
  }
  // Static props batch by material; combatants, fire, and instanced paving stay independent.
  const animated=new Set(fires.flatMap(f=>[f.flame,f.core]));
  const batches=new Map();world.updateMatrixWorld(true);
  world.traverse(object=>{
    if(!object.isMesh||object.isInstancedMesh||animated.has(object)||object.material.transparent)return;
    const key=`${object.material.uuid}:${object.castShadow}:${object.receiveShadow}:${Object.keys(object.geometry.attributes).sort().join(',')}`;
    if(!batches.has(key))batches.set(key,[]);batches.get(key).push(object);
  });
  for(const objects of batches.values()){
    if(objects.length<2)continue;
    const geometries=objects.map(object=>{const geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();geometry.applyMatrix4(object.matrixWorld);return geometry;});
    const combined=mergeGeometries(geometries,false);
    for(const geometry of geometries)geometry.dispose();
    if(!combined)continue;
    const batch=new THREE.Mesh(combined,objects[0].material);batch.castShadow=objects[0].castShadow;batch.receiveShadow=objects[0].receiveShadow;world.add(batch);
    for(const object of objects){object.removeFromParent();object.geometry.dispose();}
  }
  return {world,obstacles, update(time){for(const {flame,core,light}of fires){flame.scale.set(1+Math.sin(time*9)*.12,1+Math.sin(time*13)*.16,1);core.rotation.y=time*3;light.intensity=3+Math.sin(time*15)*.3;}}};
}
