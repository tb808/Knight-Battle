async (page) => {
  await page.bringToFront();
  const result=await page.evaluate(()=>{
    const g=window.__IRON_SINEW__;g.started=true;g.reset();g.ai.passive=false;g.paused=false;g.ai.attackTimer=.1;
    for(let i=0;i<1800&&!g.ended;i++)g.step(1/60);
    const ai={playerInjuries:Object.values(g.player.anatomy.parts).filter(p=>p.injuries.length).map(p=>p.id),lastHit:g.player.anatomy.lastHit?.bodyPart,elapsed:g.elapsed,enemyDistance:g.player.position.distanceTo(g.enemy.position)};
    g.reset();g.ai.passive=true;g.paused=true;g.locked=false;
    const boundaries=[];
    for(const [x,z,yaw]of [[10.1,0,-Math.PI/2],[-10.1,0,Math.PI/2],[0,9.3,0],[0,-9.3,Math.PI]]){
      g.player.position.set(x,0,z);g.cameraYaw=yaw;g.updateCamera(1);boundaries.push(g.camera.position.toArray());
    }
    const cameraSafe=boundaries.every(([x,y,z])=>x>=-10.551&&x<=10.551&&z>=-9.701&&z<=10.001&&y>.3);
    g.reset();g.started=false;g.paused=false;g.ai.passive=false;g.ui.inspectEnemy=false;document.querySelector('#inspect-toggle').innerHTML='YOU <span>⇄</span>';document.querySelector('#start-prompt').classList.remove('hidden');g.ui.update(0,true);
    window.__AI_TEST_REPORT__={ai,cameraSafe,boundaries};return window.__AI_TEST_REPORT__;
  });
  if(!result.ai.playerInjuries.length)throw new Error('AI failed to inflict an anatomical injury in 30 seconds');
  if(!result.cameraSafe)throw new Error('Camera exceeded arena collision bounds');
  await page.setViewportSize({width:1024,height:768});
  await page.screenshot({path:'output/playwright/arena-1024.png'});
  const panels=await page.evaluate(()=>Array.from(document.querySelectorAll('.injury-panel,.weapons,header')).map(el=>{const r=el.getBoundingClientRect();return {name:el.className||el.tagName,left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
  if(panels.some(p=>p.left<0||p.right>1024||p.bottom>768))throw new Error('HUD falls outside 1024 × 768');
  await page.setViewportSize({width:1600,height:950});
  await page.screenshot({path:'output/playwright/arena-final.png'});
}
