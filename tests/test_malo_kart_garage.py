import functools
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.tmp/malo-garage-checks'
OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*_): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
source=(ROOT/'web/malo-kart-phase1/game.js').read_text(encoding='utf-8')
hook='''window.testGarage={garage,renderer,start,tick,menu,menus,input,
  get simulation(){return simulation;},get track(){return track;},get view(){return view;},get mode(){return mode;},
  render(){view.update(simulation.state,0,mode==='menu',true);updateHUD();renderer.render(view.scene,view.camera);},
  stop(){window.requestAnimationFrame=()=>0;}
};'''
script=source.replace('  applyQuality(); menu();',hook+'\n  applyQuality(); menu();')
url=f'http://127.0.0.1:{server.server_port}/web/malo-kart-phase1/'
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge',headless=True)
        page=browser.new_page(viewport={'width':1440,'height':900})
        errors=[]
        page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE_ERROR',str(e),flush=True)))
        page.on('console',lambda m:(errors.append(m.text),print('CONSOLE_ERROR',m.text,flush=True)) if m.type=='error' else None)
        page.route('**/malo-kart-phase1/game.js',lambda r:r.fulfill(body=script,content_type='application/javascript'))
        page.goto(url)
        page.wait_for_function('window.testGarage')
        page.screenshot(path=str(OUT/'home.png'))
        page.locator('#play').click()
        assert page.locator('.card').count()==4
        thumbnails=page.locator('.card img').evaluate_all('(images)=>images.map(i=>i.src)')
        assert len(set(thumbnails))==4
        for driver in ['malo','nova','rocky','zephyr']:
            page.locator(f'[data-choice={driver}]').click()
            assert page.evaluate('testGarage.garage.state.driver')==driver
            page.evaluate('testGarage.render()')
            page.screenshot(path=str(OUT/f'driver-{driver}.png'))
        page.locator('#continue').click()
        assert page.locator('.card').count()==3
        for vehicle in ['standard','turbo','compact']:
            page.locator(f'[data-choice={vehicle}]').click()
            assert page.evaluate('testGarage.garage.state.vehicle')==vehicle
        page.screenshot(path=str(OUT/'vehicles.png'))
        page.locator('#continue').click()
        assert page.locator('.card').count()==3
        layouts=[]
        for course in ['azur','neon','desert']:
            page.locator(f'[data-choice={course}]').click()
            assert page.evaluate('testGarage.track.id')==course
            layouts.append(page.evaluate('JSON.stringify(testGarage.track.points)'))
            page.evaluate('testGarage.render()')
            page.screenshot(path=str(OUT/f'course-{course}.png'))
        assert len(set(layouts))==3
        page.reload();page.wait_for_function('window.testGarage')
        saved=page.evaluate('testGarage.garage.state')
        assert (saved['driver'],saved['vehicle'],saved['course'])==('zephyr','compact','desert')
        print('SELECTIONS_PREVIEWS_SAVE_OK',flush=True)
        page.locator('#home [data-screen=shop]').click()
        page.locator('[data-choice=gold]').click()
        assert page.locator('#continue').is_disabled()
        assert page.evaluate('testGarage.garage.state.coins')==0
        page.screenshot(path=str(OUT/'shop-empty.png'))
        page.evaluate('testGarage.stop()');page.wait_for_timeout(100)
        collected=page.evaluate('''()=>{
          const t=testGarage;t.start();for(let i=0;i<361;i++)t.tick(1/120);
          const s=t.simulation.state,coins=t.view.coins;
          function collect(c){Object.assign(s,{x:c.x,z:c.z,vx:0,vz:0,speed:0});t.tick(1/120);}
          collect(coins[0]);const first=t.garage.state.coins;for(let i=0;i<20;i++)t.tick(1/120);
          const once=t.garage.state.coins===first;
          for(const c of coins)collect(c);const aboveTen=t.garage.state.coins>10;
          s.laps=1;for(const c of coins)collect(c);
          const cap=t.garage.state.coins===100;t.menu();return {once,aboveTen,cap};
        }''')
        assert all(collected.values()),collected
        page.locator('#home [data-screen=shop]').click()
        page.locator('[data-choice=gold]').click()
        assert not page.locator('#continue').is_disabled()
        page.locator('#continue').click()
        assert page.evaluate('testGarage.garage.state.coins')==20
        assert page.evaluate('testGarage.garage.state.paint')=='gold'
        assert page.evaluate("testGarage.garage.state.owned.includes('gold')")
        assert not page.evaluate("testGarage.garage.buy('gold')")
        assert page.evaluate('testGarage.garage.state.coins')==20
        page.locator('[data-choice=mint]').click()
        assert page.locator('#continue').is_disabled()
        assert page.evaluate('testGarage.garage.state.paint')=='gold','Preview must not change owned/equipped paint'
        page.locator('[data-choice=gold]').click()
        page.evaluate('testGarage.render()')
        page.screenshot(path=str(OUT/'shop-gold.png'))
        page.reload();page.wait_for_function('window.testGarage')
        assert page.evaluate('testGarage.garage.state.coins')==20
        assert page.evaluate('testGarage.garage.state.paint')=='gold'
        page.locator('#options').click()
        page.locator('#quality').select_option('low')
        assert not page.evaluate('testGarage.renderer.shadowMap.enabled')
        page.locator('#options-close').click()
        page.locator('#options').click();page.keyboard.press('Escape')
        assert not page.locator('#options-dialog').is_visible()
        print('COINS_100_SHOP_PURCHASE_PERSISTENCE_OPTIONS_OK',flush=True)
        courses=page.evaluate('''()=>{
          const results=[];
          for(const course of Object.keys(MaloPrototype.courses))for(const vehicle of Object.keys(MaloPrototype.vehicles)){
            const track=MaloPrototype.createTrack(THREE,course),sim=MaloPrototype.createSimulation(track,MaloPrototype.vehicles[vehicle]);
            let frames=0;
            while(!sim.state.finished && frames<40000){
              const s=sim.state,n=MaloPrototype.nearestPoint(track.points,s.x,s.z),target=track.points[(n.index+12)%480];
              const desired=Math.atan2(target.x-s.x,target.z-s.z),error=Math.atan2(Math.sin(desired-s.yaw),Math.cos(desired-s.yaw));
              const slow=Math.abs(error)>.32 && s.speed>22;
              sim.step(1/120,{gas:!slow,brake:slow,left:error>.025,right:error<-.025});frames++;
            }
            results.push({course,vehicle,finished:sim.state.finished,laps:sim.state.laps,frames});
          }
          return results;
        }''')
        print('ALL_9_RACES',json.dumps(courses),flush=True)
        assert all(r['finished'] and r['laps']==2 for r in courses),courses
        stats=page.evaluate('''()=>{
          const api=MaloPrototype,points=[{x:0,z:0},{x:0,z:10000},{x:10000,z:10000},{x:10000,z:0},{x:0,z:1}];
          const track={points,halfWidth:8,gates:[{x:0,z:0,tx:0,tz:1},{x:0,z:9000,tx:0,tz:1}]};
          return Object.fromEntries(Object.entries(api.vehicles).map(([id,v])=>{
            const sim=api.createSimulation(track,v),s=sim.state;Object.assign(s,{x:0,z:10,yaw:0});
            for(let i=0;i<120;i++)sim.step(1/120,{gas:true});const acceleration=s.speed;
            for(let i=0;i<3600;i++)sim.step(1/120,{gas:true});
            return [id,{acceleration,speed:s.speed}];
          }));
        }''')
        assert stats['compact']['acceleration']>stats['standard']['acceleration']>stats['turbo']['acceleration'],stats
        assert stats['turbo']['speed']>stats['standard']['speed']>stats['compact']['speed'],stats
        print('REAL_VEHICLE_STATS',json.dumps(stats),flush=True)
        page.evaluate("localStorage.setItem('malo.activeProfile','garage-test-a')")
        page.reload();page.wait_for_function('window.testGarage')
        assert page.evaluate('testGarage.garage.state.coins')==0
        page.evaluate("localStorage.setItem('malo.activeProfile','garage-test-b');testGarage.garage.credit(30)")
        assert page.evaluate("JSON.parse(localStorage.getItem('malo.profileData.garage-test-a.malo-kart-garage-v1')).coins")==30
        page.reload();page.wait_for_function('window.testGarage')
        assert page.evaluate('testGarage.garage.state.coins')==0
        blocked=browser.new_page()
        blocked.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}})")
        blocked.route('**/malo-kart-phase1/game.js',lambda r:r.fulfill(body=script,content_type='application/javascript'))
        blocked.goto(url);blocked.wait_for_function('window.testGarage')
        assert blocked.evaluate("testGarage.garage.credit(50)===50 && testGarage.garage.buy('coral') && testGarage.garage.state.coins===30")
        blocked.evaluate('testGarage.menus.show("shop")')
        assert 'session' in blocked.locator('#save-status').inner_text()
        assert not errors,errors
        print('PROFILE_ISOLATION_STORAGE_FALLBACK_OK; ERRORS',errors,flush=True)
        browser.close()
finally:
    server.shutdown();server.server_close()
