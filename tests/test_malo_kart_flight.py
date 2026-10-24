"""Rampes, vol dirigé, collections et déblocages : Playwright + Edge."""
import functools
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.tmp/malo-flight-checks'
OUT.mkdir(parents=True, exist_ok=True)

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
source = (ROOT / 'web/malo-kart-phase1/game.js').read_text(encoding='utf-8')
hook = '''window.testFlight={start,tick,menu,menus,garage,input,
get simulation(){return simulation},get track(){return track},get race(){return race},
render(){view.update(simulation.state,0,mode==='menu',true);raceView.update(0,mode!=='menu');updateHUD();renderer.render(view.scene,view.camera)},
get glider(){return view.kart.getObjectByName('glider')},stop(){window.requestAnimationFrame=()=>0}};'''
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800}, has_touch=True)
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.route('**/malo-kart-phase1/game.js', lambda r: r.fulfill(body=source.replace('  applyQuality(); menu();', hook+'\n  applyQuality(); menu();'), content_type='application/javascript'))
        page.goto(f'http://127.0.0.1:{server.server_port}/web/malo-kart-phase1/')
        page.wait_for_function('window.testFlight')
        page.evaluate('testFlight.stop()')
        page.wait_for_timeout(100)
        checks = page.evaluate('''()=>{
          const api=MaloPrototype,track=testFlight.track,sim=api.createSimulation(track),s=sim.state,checks={};
          function cross(zone,reverse=false,side=0){
            sim.reset();const sign=reverse?-1:1;
            Object.assign(s,{x:zone.x-zone.tx*.1*sign+zone.tz*side,z:zone.z-zone.tz*.1*sign-zone.tx*side,
              yaw:Math.atan2(zone.tx*sign,zone.tz*sign),vx:zone.tx*20*sign,vz:zone.tz*20*sign,speed:20});
            sim.step(1/60,{gas:true});
          }
          const pad=track.zones[0],ramp=track.zones[1];cross(pad);checks.boost=s.boost>1;
          cross(pad,true);checks.noReverseBoost=s.boost===0;
          cross(pad,false,6.5);checks.outsidePad=s.boost===0;
          cross(ramp);checks.takeoff=s.y>0 && s.flight===3;
          const yaw=s.yaw;for(let i=0;i<30;i++)sim.step(1/120,{gas:true,left:true,drift:true});
          checks.airSteering=s.yaw!==yaw && !s.drift;
          const race=api.createRace(track,sim,testFlight.garage.state);s.y=8;
          race.hazards.push({x:s.x,z:s.z,owner:1,ttl:14});race.step(1/120);
          checks.flyOverBanana=s.stun===0 && race.hazards.length===1;
          function duration(brake){cross(ramp);let steps=0;while(s.y>0 && steps<1200){sim.step(1/120,{gas:!brake,brake});steps++;}return steps;}
          const normal=duration(false),braked=duration(true);
          checks.landing=normal<1200 && braked<1200 && s.y===0 && s.vy===0 && s.flight===0;
          checks.liftControl=braked>normal;
          sim.reset();checks.reset=s.y===0 && s.flight===0;
          const key='malo-kart-garage-v1',raw=localStorage.getItem(key);
          localStorage.setItem(key,JSON.stringify({coins:19,owned:['original','gold'],paint:'gold'}));
          const garage=api.createGarage();checks.oldUnlockPreserved=garage.state.owned.includes('gold');
          garage.credit(1);checks.threshold=garage.state.owned.includes('coral') && garage.state.coins===20;
          garage.select('paint','coral');checks.noSpending=garage.state.coins===20;
          checks.invalidCredits=garage.credit(-1)===0 && garage.credit(Infinity)===0 && garage.credit(NaN)===0;
          garage.credit(100000);checks.noCap=api.createGarage().state.coins===100020;
          if(raw===null)localStorage.removeItem(key);else localStorage.setItem(key,raw);
          return checks;
        }''')
        print('FLIGHT_AND_PROGRESSION', json.dumps(checks), flush=True)
        assert all(checks.values()), checks
        page.evaluate("testFlight.menus.show('course')")
        previews = []
        for cup in range(6):
            page.locator('#cup-select').select_option(str(cup))
            assert page.locator('.card').count() == 4
            page.wait_for_function('Array.from(document.querySelectorAll(".card img")).every(img=>img.complete&&img.naturalWidth>0)')
            previews.extend(page.locator('.card img').evaluate_all('(images)=>images.map(img=>img.src)'))
            page.screenshot(path=str(OUT/f'collection-{cup}.png'))
        assert len(set(previews)) == 24
        page.locator('#start').tap()
        page.evaluate('''()=>{
          const t=testFlight;for(let i=0;i<361;i++)t.tick(1/120);
          const s=t.simulation.state,r=t.track.zones[1];
          Object.assign(s,{x:r.x-r.tx*.1,z:r.z-r.tz*.1,yaw:Math.atan2(r.tx,r.tz),vx:r.tx*25,vz:r.tz*25,speed:25});
          for(let i=0;i<90;i++) {
            const n=MaloPrototype.nearestPoint(t.track.points,s.x,s.z),p=t.track.points[(n.index+12)%480];
            const angle=Math.atan2(p.x-s.x,p.z-s.z)-s.yaw,error=Math.atan2(Math.sin(angle),Math.cos(angle));
            t.input.left=error>.025;t.input.right=error<-.025;t.tick(1/120);
          }
          t.input.left=t.input.right=false;t.render();
        }''')
        assert page.evaluate('testFlight.simulation.state.y') > 3
        assert page.evaluate('testFlight.glider.scale.x') == 1
        page.screenshot(path=str(OUT/'flight-tablet.png'))
        page.locator('#pause').tap()
        before = page.evaluate('JSON.stringify(testFlight.simulation.state)')
        page.evaluate('for(let i=0;i<240;i++)testFlight.tick(1/120)')
        assert page.evaluate('JSON.stringify(testFlight.simulation.state)') == before
        page.locator('#resume').tap()
        cdp = page.context.new_cdp_session(page)
        rect = page.locator('[data-drive=left]').bounding_box()
        cdp.send('Input.dispatchTouchEvent', {'type':'touchStart', 'touchPoints':[{'x':rect['x']+rect['width']/2,'y':rect['y']+rect['height']/2,'id':1}]})
        yaw = page.evaluate('testFlight.simulation.state.yaw')
        page.evaluate('for(let i=0;i<20;i++)testFlight.tick(1/120)')
        assert page.evaluate('testFlight.simulation.state.yaw') != yaw
        cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
        assert not page.evaluate('testFlight.input.left')
        page.evaluate('testFlight.start();testFlight.render()')
        assert page.evaluate('testFlight.simulation.state.y===0 && testFlight.glider.scale.x===.15')
        assert not errors, errors
        print('24_PREVIEWS_AIRBORNE_PAUSE_GLIDER_RESTART_OK', flush=True)
        browser.close()
finally:
    server.shutdown()
    server.server_close()
