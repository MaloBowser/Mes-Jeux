import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
(ROOT/'.tmp/kart-checks').mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto((ROOT/'web/malo-kart.html').as_uri())
    page.wait_for_function('!document.getElementById("start").disabled')
    page.locator('#start').click()
    assert page.evaluate('!document.getElementById("hud").hidden')
    assert page.locator('#position').inner_text()=='8'
    print('OFFLINE_FILE_OK',flush=True)
    page.close()
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage blocked for test')}})")
    source=(ROOT/'web/malo-kart.js').read_text(encoding='utf-8')
    hook='''window.kartTest={player,racers,keys,step,startRace,resetRace,sample,updateAI,renderer,LENGTH,get state(){return {mode,elapsed,driftCharge}},getAudio(){return {soundOn,active:!!audio}},render(){racers.forEach(r=>updateKart(r,.016));updateCamera(1,true);updateHUD();renderer.render(scene,camera)}};'''
    page.route('**/malo-kart.js',lambda route:route.fulfill(body=source.replace('  resetRace(); drawMap',hook+'\n  resetRace(); drawMap'),content_type='application/javascript'))
    page.goto('http://127.0.0.1:8000/web/malo-kart.html')
    page.wait_for_function('window.kartTest')
    page.locator('#sound').click()
    assert page.evaluate('kartTest.getAudio().soundOn && kartTest.getAudio().active')
    result=page.evaluate('''()=>{
      const t=kartTest,r=t.player;t.startRace();for(let i=0;i<425;i++)t.step(1/120);
      t.racers.slice(1).forEach((a,i)=>{a.progress=500+i*15});
      r.progress=20;r.lane=-5;r.speed=32;t.keys.gas=true;t.keys.drift=true;t.keys.right=true;
      for(let i=0;i<250;i++)t.step(1/120);
      const charge=t.state.driftCharge,lane=r.lane;
      t.keys.drift=false;t.keys.right=false;t.step(1/120);const boost=r.boost;
      t.keys.gas=false;t.keys.brake=true;for(let i=0;i<500;i++)t.step(1/120);
      const stopped=r.speed===0;t.keys.brake=false;
      const ai=t.racers[1];ai.speed=0;ai.stun=0;ai.boost=0;ai.finish=null;ai.progress=0;
      document.getElementById('difficulty').value='easy';t.updateAI(ai,1);const easy=ai.speed;
      ai.speed=0;ai.progress=0;document.getElementById('difficulty').value='hard';t.updateAI(ai,1);const hard=ai.speed;
      for(let lap=1;lap<=3;lap++){r.progress=t.LENGTH*lap-.1;r.speed=30;t.step(.02);}
      return {charge,lane,boost,stopped,easy,hard,finished:t.state.mode==='finished',storageMessage:document.getElementById('result-record').textContent};
    }''')
    print('EDGE_CASES',json.dumps(result),flush=True)
    assert result['charge']>=2 and result['boost']>2 and abs(result['lane'])<8.5
    assert result['stopped'] and result['hard']>result['easy'] and result['finished']
    assert 'indisponible' in result['storageMessage']
    page.locator('#results-menu').click()
    page.locator('#start').click()
    page.evaluate("window.dispatchEvent(new Event('blur'))")
    assert page.locator('#pause-dialog').is_visible()
    page.locator('#resume').click()
    page.evaluate("document.getElementById('game').dispatchEvent(new Event('webglcontextlost',{cancelable:true}))")
    assert page.locator('#error').is_visible()
    print('FOCUS_AND_CONTEXT_LOSS_OK',flush=True)
    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    mp=mobile.new_page()
    mp.route('**/malo-kart.js',lambda route:route.fulfill(body=source.replace('  resetRace(); drawMap',hook+'\n  resetRace(); drawMap'),content_type='application/javascript'))
    mp.goto('http://127.0.0.1:8000/web/malo-kart.html')
    mp.wait_for_function('window.kartTest')
    mp.screenshot(path=str(ROOT/'.tmp/kart-checks/mobile-menu-final.png'))
    mp.locator('#start').click()
    cdp=mobile.new_cdp_session(mp)
    rect=mp.locator('[data-key=gas]').bounding_box()
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':rect['x']+rect['width']/2,'y':rect['y']+rect['height']/2}]})
    assert mp.evaluate('kartTest.keys.gas')
    cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]})
    assert not mp.evaluate('kartTest.keys.gas')
    print('TOUCH_RELEASE_OK',flush=True)
    assert not errors,errors
    print('ERRORS',errors,flush=True)
    browser.close()
