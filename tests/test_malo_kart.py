import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.tmp' / 'kart-checks'
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
    source = (ROOT / 'web' / 'malo-kart.js').read_text(encoding='utf-8')
    hook = '''window.kartTest = { player, racers, keys, pickups, pads, hazards, projectiles, LENGTH, step, resetRace, startRace, updateHUD, updateKart, updateCamera, updateInteractions, useItem, sample, hit, renderer,
      get state(){return {mode, elapsed, driftCharge, bestLap, lastLap, countdown}},
      render(){ racers.forEach(r => updateKart(r, .016)); updateCamera(1, true); updateHUD(); renderer.render(scene, camera); }
    };'''
    source = source.replace('  resetRace(); drawMap', hook + '\n  resetRace(); drawMap')
    page.route('**/malo-kart.js', lambda route: route.fulfill(body=source, content_type='application/javascript'))
    page.goto('http://127.0.0.1:8000/web/malo-kart.html', wait_until='load')
    page.wait_for_function('window.kartTest && !document.getElementById("start").disabled')
    page.screenshot(path=str(OUT / 'menu.png'))
    page.get_by_role('button', name='LES COMMANDES').click()
    assert page.locator('#help-dialog').is_visible()
    page.locator('#help-close').click()
    page.get_by_role('button', name='Kart bleu', exact=True).click()
    assert page.get_by_role('button', name='Kart bleu', exact=True).get_attribute('aria-pressed') == 'true'
    page.get_by_role('button', name='Kart rouge', exact=True).click()
    page.locator('#start').click()
    page.evaluate('for(let i=0;i<430;i++) kartTest.step(1/120)')
    assert page.evaluate('kartTest.state.mode') == 'race'
    page.keyboard.down('ArrowUp')
    page.evaluate('for(let i=0;i<240;i++) kartTest.step(1/120)')
    page.keyboard.up('ArrowUp')
    print('KEYBOARD', page.evaluate('({keys:kartTest.keys,state:kartTest.state,speed:kartTest.player.speed,lane:kartTest.player.lane})'), flush=True)
    assert page.evaluate('kartTest.player.speed') > 20
    old_lane = page.evaluate('kartTest.player.lane')
    page.keyboard.down('ArrowLeft')
    page.evaluate('for(let i=0;i<30;i++) kartTest.step(1/120)')
    page.keyboard.up('ArrowLeft')
    assert page.evaluate('kartTest.player.lane') < old_lane, 'Left key must steer left'
    page.keyboard.press('Escape')
    assert page.locator('#pause-dialog').is_visible()
    before = page.evaluate('kartTest.state.elapsed')
    page.evaluate('for(let i=0;i<120;i++) kartTest.step(1/120)')
    assert page.evaluate('kartTest.state.elapsed') == before, 'Pause must freeze race'
    page.locator('#resume').click()
    assert page.evaluate('kartTest.state.mode') == 'race'
    page.keyboard.press('r')
    assert abs(page.evaluate('kartTest.player.lane')) < .2

    mechanics = page.evaluate('''() => {
      const t=kartTest, r=t.player, results={};
      t.startRace(); for(let i=0;i<425;i++)t.step(1/120);
      t.racers.slice(1).forEach((a,i)=>{a.progress=100+i*15; a.lane=-6});
      r.progress=20; r.lane=0; r.speed=28;
      t.keys.gas=true; t.keys.left=true; t.keys.drift=true;
      for(let i=0;i<125;i++){t.step(1/120); r.lane=0;}
      results.driftCharge=t.state.driftCharge;
      t.keys.drift=false; t.keys.left=false; t.step(1/120);
      results.driftBoost=r.boost;
      r.item=null; const box=t.pickups[0]; box.cooldown=0; r.progress=box.progress; r.lane=box.lane; r.speed=0; r.heading=0; r.lateralSpeed=0; t.keys.gas=false; t.step(1/120);
      results.pickup=!!r.item; results.pickupCooldown=box.cooldown;
      r.item='shield'; t.useItem(r); t.hit(r,'test'); results.shieldAbsorbed=r.shield===0&&r.stun===0;
      r.item='turbo'; t.useItem(r); results.turbo=r.boost===3;
      r.item='mine'; t.useItem(r); results.mine=t.hazards.length===1;
      t.racers.slice(1).forEach((a,i)=>{a.progress=r.progress-200-i*10}); t.racers[1].progress=r.progress+15; t.racers[1].shield=0;
      r.item='missile'; t.useItem(r); results.missile=t.projectiles.length===1;
      for(let i=0;i<120;i++)t.step(1/120);
      results.missileHit=t.racers[1].stun>0;
      r.progress=t.pads[0].progress; r.lane=t.pads[0].lane; r.boost=0; r.padCooldown=0; t.step(1/120);
      results.pad=r.boost>0;
      r.lane=12; r.speed=35; r.collision=0; t.step(1/120); results.barrier=Math.abs(r.lane)<=11.2&&r.speed<30;
      t.render(); return results;
    }''')
    print('MECHANICS', json.dumps(mechanics), flush=True)
    assert mechanics['driftCharge'] >= .75 and mechanics['driftBoost'] > 1
    assert all(mechanics[k] for k in ['pickup','shieldAbsorbed','turbo','mine','missile','missileHit','pad','barrier'])
    missile_collisions = page.evaluate('''() => {
      const t=kartTest;
      function fire(lane, progress=100) {
        t.startRace(); for(let i=0;i<425;i++)t.step(1/120);
        t.racers.slice(1).forEach((r,i)=>{r.progress=progress-200-i*10;});
        Object.assign(t.player,{progress,lane:-6,speed:0,item:'missile'});
        Object.assign(t.racers[1],{progress:progress+4,lane,speed:0,stun:0,shield:0});
        t.useItem(t.player);
        t.updateInteractions(1/60);
      }
      fire(6);
      const oppositeLaneMiss=t.racers[1].stun===0 && t.projectiles.length===1;
      for(let i=0;i<60;i++)t.updateInteractions(1/60);
      const noHitAfterPassing=t.racers[1].stun===0;
      fire(-6);
      const sameLaneHit=t.racers[1].stun>0 && t.projectiles.length===0;
      fire(-6,t.LENGTH-3);
      const finishLineHit=t.racers[1].stun>0 && t.projectiles.length===0;
      return {oppositeLaneMiss,noHitAfterPassing,sameLaneHit,finishLineHit};
    }''')
    print('MISSILE_COLLISIONS', json.dumps(missile_collisions), flush=True)
    assert all(missile_collisions.values()), missile_collisions
    page.evaluate('''() => {const t=kartTest; t.startRace(); for(let i=0;i<425;i++)t.step(1/120); t.player.progress=100; t.player.lane=1; t.player.speed=33; t.racers.slice(1).forEach((r,i)=>{r.progress=110+i*10;r.lane=i%2?3:-3;});t.render();}''')
    page.screenshot(path=str(OUT / 'race.png'))
    full_race = page.evaluate('''() => {
      const t=kartTest;t.startRace(); for(let i=0;i<425;i++)t.step(1/120);
      t.keys.gas=true;
      let frames=0;
      while(t.state.mode==='race'&&frames<24000){
        const r=t.player;
        const error=r.heading + r.lane*.06;
        t.keys.left=error>.015; t.keys.right=error<-.015;
        if(r.item)t.useItem(r);
        t.step(1/60);frames++;
      }
      t.render();
      return {mode:t.state.mode,elapsed:t.state.elapsed,lap:t.state.lastLap,best:t.state.bestLap,frames,progress:t.player.progress,length:t.LENGTH,finite:t.racers.every(r=>Number.isFinite(r.progress)&&Number.isFinite(r.lane)),rows:document.querySelectorAll('#standings li').length,record:localStorage.getItem('malo-kart-record-v1')};
    }''')
    print('FULL_RACE', json.dumps(full_race), flush=True)
    assert full_race['mode'] == 'finished' and full_race['lap'] == 3 and full_race['finite'] and full_race['rows'] == 8 and full_race['record']
    page.screenshot(path=str(OUT / 'results.png'))
    page.locator('#replay').click()
    assert page.evaluate('kartTest.state.mode') == 'countdown'
    assert page.evaluate('kartTest.state.elapsed') == 0
    assert page.evaluate('kartTest.hazards.length + kartTest.projectiles.length') == 0
    page.keyboard.press('Escape')
    page.locator('#quit').click()
    assert page.locator('#menu').is_visible()
    print('DRAW_CALLS', page.evaluate('kartTest.renderer.info.render.calls'), flush=True)

    def finish_profile_race():
        return page.evaluate('''() => {
          const t=kartTest; t.startRace(); for(let i=0;i<425;i++)t.step(1/120);
          for(let lap=1;lap<=3;lap++){
            t.player.progress=t.LENGTH*lap-.1; t.player.speed=30; t.step(.02);
          }
          return t.state.mode;
        }''')

    guest_record = page.evaluate("localStorage.getItem('malo-kart-record-v1')")
    page.evaluate("localStorage.setItem('malo.activeProfile','kart-test-a')")
    page.reload(wait_until='load')
    page.wait_for_function('window.kartTest')
    assert 'PREMIER DÉPART' in page.locator('#record').inner_text(), 'A profile must not inherit the shared record'
    # An already-open race must keep its owner if another tab selects a profile.
    page.evaluate("localStorage.setItem('malo.activeProfile','kart-test-b')")
    assert finish_profile_race() == 'finished'
    profile_a_record = page.evaluate("localStorage.getItem('malo.profileData.kart-test-a.malo-kart-record-v1')")
    assert profile_a_record, 'The race must save to the profile that opened the page'
    assert page.evaluate("localStorage.getItem('malo.profileData.kart-test-b.malo-kart-record-v1')") is None
    page.reload(wait_until='load')
    page.wait_for_function('window.kartTest')
    assert 'PREMIER DÉPART' in page.locator('#record').inner_text(), 'A new profile must have its own record'
    assert finish_profile_race() == 'finished'
    assert page.evaluate("localStorage.getItem('malo.profileData.kart-test-b.malo-kart-record-v1')")
    assert page.evaluate("localStorage.getItem('malo.profileData.kart-test-a.malo-kart-record-v1')") == profile_a_record
    assert page.evaluate("localStorage.getItem('malo-kart-record-v1')") == guest_record
    page.evaluate("localStorage.setItem('malo.activeProfile','kart-test-a')")
    page.reload(wait_until='load')
    page.wait_for_function('window.kartTest')
    assert 'TON RECORD' in page.locator('#record').inner_text(), 'The saved profile record must load again'
    print('PROFILE_RECORDS_OK', flush=True)
    assert not errors, errors
    print('ERRORS', errors, flush=True)
    mobile = browser.new_context(viewport={'width':390,'height':844}, device_scale_factor=1, is_mobile=True, has_touch=True)
    mp = mobile.new_page()
    mp.goto('http://127.0.0.1:8000/web/malo-kart.html', wait_until='load')
    mp.locator('#start').wait_for(state='visible')
    mp.screenshot(path=str(OUT / 'mobile-menu.png'))
    assert mp.evaluate('document.documentElement.scrollWidth <= innerWidth')
    mp.locator('#start').click()
    assert mp.locator('#touch-controls').is_visible()
    mp.screenshot(path=str(OUT / 'mobile-race.png'))
    mp.set_viewport_size({'width':844,'height':390})
    mp.screenshot(path=str(OUT / 'mobile-landscape.png'))
    print('MOBILE_OK', flush=True)
    browser.close()
