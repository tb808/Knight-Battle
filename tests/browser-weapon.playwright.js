async (page) => {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.bringToFront();await page.setViewportSize({width:1600,height:950});
  await page.getByRole('button',{name:'Enter the yard →'}).click();
  await page.evaluate(()=>{window.__IRON_SINEW__.ai.passive=true;});
  const prepare=async()=>page.evaluate(()=>{
    const g=window.__IRON_SINEW__;g.reset();g.started=true;g.paused=false;g.ai.passive=true;
    g.player.position.set(0,0,0);g.enemy.position.set(0,0,-1.6);
    g.player.root.rotation.y=0;g.enemy.root.rotation.y=Math.PI;g.cameraYaw=0;
    const ec=g.enemy.weaponControl;ec.config.readyYaw=1.2;ec.config.readyPitch=.7;ec.yaw=ec.desiredYaw=1.2;ec.pitch=ec.desiredPitch=.7;
    g.player.animate(0,g.time);g.enemy.animate(0,g.time);g.updateCamera(1);
  });
  await prepare();
  await page.mouse.move(500,450);
  const yawBefore=await page.evaluate(()=>window.__IRON_SINEW__.cameraYaw);
  await page.mouse.down({button:'left'});
  await page.mouse.move(690,390,{steps:6});
  const moving=await page.evaluate(()=>{
    const g=window.__IRON_SINEW__,c=g.player.weaponControl;
    return {active:c.active,desiredYaw:c.desiredYaw,desiredPitch:c.desiredPitch,yaw:c.yaw,cameraYaw:g.cameraYaw};
  });
  if(!moving.active||moving.desiredYaw<=-.1||moving.desiredPitch<=.28)throw new Error('Held left mouse did not guide the weapon');
  if(Math.abs(moving.cameraYaw-yawBefore)>.08)throw new Error('Weapon movement turned the locked camera');
  await page.mouse.move(510,470,{steps:5});
  const reversed=await page.evaluate(()=>window.__IRON_SINEW__.player.weaponControl.desiredYaw);
  if(reversed>=moving.desiredYaw)throw new Error('Reverse mouse motion did not reverse weapon intent');
  await page.mouse.up({button:'left'});
  if(await page.evaluate(()=>window.__IRON_SINEW__.player.weaponControl.active))throw new Error('Left mouse release left manual control active');
  await page.keyboard.press('KeyV');
  if(!await page.locator('#weapon-debug').isVisible())throw new Error('Weapon diagnostics did not appear');
  const impact=await page.evaluate(()=>{
    const g=window.__IRON_SINEW__;g.reset();g.started=true;g.paused=false;g.ai.passive=true;
    g.player.position.set(0,0,0);g.enemy.position.set(0,0,-1.6);g.player.root.rotation.y=0;g.enemy.root.rotation.y=Math.PI;
    const ec=g.enemy.weaponControl;ec.config.readyYaw=1.2;ec.config.readyPitch=.7;ec.yaw=ec.desiredYaw=1.2;ec.pitch=ec.desiredPitch=.7;
    g.player.animate(0,g.time);g.enemy.animate(0,g.time);
    const c=g.player.weaponControl;c.setActive(true);c.addMouseDelta(180,0);
    for(let i=0;i<90;i++)g.step(1/60);
    c.setActive(false);
    const hit=g.enemy.anatomy.lastHit;
    return {part:hit?.bodyPart,speed:hit?.relativeVelocity,edge:hit?.edgeAlignment,wounds:g.enemy.wounds.length};
  });
  if(!impact.part||impact.speed<=1||impact.edge<0||!impact.wounds)throw new Error('Manual blade contact failed: '+JSON.stringify(impact));
  await page.screenshot({path:'output/playwright/manual-weapon-control.png'});
  await page.evaluate(report=>{window.__WEAPON_TEST_REPORT__=report;},{moving,reversed,impact,errors});
  if(errors.length)throw new Error(errors.join('\n'));
}
