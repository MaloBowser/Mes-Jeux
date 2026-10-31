"""Arrivée après un vol, marche arrière et décorations : régressions navigateur."""
import functools
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.tmp/malo-fixes-checks'
OUT.mkdir(parents=True, exist_ok=True)


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


source = (ROOT / 'web/malo-kart-phase1/game.js').read_text(encoding='utf-8')
hook = '''window.testFix={input,tick,start,menu,menus,garage,
  get mode(){return mode},get simulation(){return simulation},get track(){return track},get race(){return race},
  render(){view.update(simulation.state,0,mode==='menu',true);renderer.render(view.scene,view.camera)},
  stop(){window.requestAnimationFrame=()=>0}};'''
server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        page = browser.new_page(viewport={'width':1024,'height':768}, has_touch=True, service_workers='block')
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.route('**/malo-kart-phase1/game.js', lambda r: r.fulfill(body=source.replace('  applyQuality(); menu();', hook+'\n  applyQuality(); menu();'), content_type='application/javascript'))
        page.goto(f'http://127.0.0.1:{server.server_port}/web/malo-kart-phase1/')
        page.wait_for_function('window.testFix')
        page.evaluate('testFix.stop()')
        page.wait_for_timeout(100)
        checks = page.evaluate('''()=>{
          const t=testFix,api=MaloPrototype,sim=api.createSimulation(t.track),s=sim.state,checks={};
          const g=t.track.gates[1];
          Object.assign(s,{x:g.x-g.tx*.12+g.tz*10,z:g.z-g.tz*.12-g.tx*10,
            y:8,flight:3,vy:0,yaw:Math.atan2(g.tx,g.tz),vx:g.tx*20,vz:g.tz*20,speed:20});
          for(let i=0;i<20;i++)sim.step(1/120,{gas:true});
          checks.airborneCheckpoint=s.nextGate===2;
          sim.reset();const n=api.nearestPoint(t.track.points,s.x,s.z),side=t.track.halfWidth-1.25;
          Object.assign(s,{x:n.x+n.tz*side,z:n.z-n.tx*side,yaw:Math.atan2(n.tz,-n.tx)});
          for(let i=0;i<60;i++)sim.step(1/120,{gas:true});
          const blocked={x:s.x,z:s.z};
          for(let i=0;i<120;i++)sim.step(1/120,{gas:true,reverse:true});
          checks.reverseEscapesBarrier=Math.hypot(s.x-blocked.x,s.z-blocked.z)>3 && s.vx*Math.sin(s.yaw)+s.vz*Math.cos(s.yaw)<-5;
          checks.reverseLimit=s.speed<=8.01;
          for(let i=0;i<240;i++)sim.step(1/120,{brake:true});
          checks.brakeStopsReverse=s.speed<.001;
          for(let i=0;i<60;i++)sim.step(1/120,{gas:true});
          checks.forwardAgain=s.vx*Math.sin(s.yaw)+s.vz*Math.cos(s.yaw)>0;
          return checks;
        }''')
        print('FLIGHT_AND_REVERSE',json.dumps(checks),flush=True)
        assert all(checks.values()), checks

        page.evaluate('testFix.start();for(let i=0;i<361;i++)testFix.tick(1/120)')
        for key in ['ArrowDown','KeyR']:
            page.keyboard.down(key)
            assert page.evaluate('testFix.input.reverse && !testFix.input.brake && !testFix.input.gas')
            page.evaluate('for(let i=0;i<100;i++)testFix.tick(1/120)')
            assert page.evaluate('(()=>{const s=testFix.simulation.state;return s.vx*Math.sin(s.yaw)+s.vz*Math.cos(s.yaw)<-1})()')
            page.keyboard.up(key)
            assert page.evaluate('!testFix.input.reverse && testFix.input.gas')
        page.keyboard.down('KeyS')
        assert page.evaluate('testFix.input.brake && !testFix.input.reverse && !testFix.input.gas')
        page.keyboard.up('KeyS')
        cdp=page.context.new_cdp_session(page)
        rect=page.locator('[data-drive=reverse]').bounding_box()
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':rect['x']+rect['width']/2,'y':rect['y']+rect['height']/2,'id':1}]})
        assert page.evaluate('testFix.input.reverse && !testFix.input.gas')
        cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]})
        assert page.evaluate('!testFix.input.reverse && testFix.input.gas')
        print('DOWN_ARROW_R_AND_TOUCH_REVERSE_OVERRIDE_AUTOGAS_OK',flush=True)

        result=page.evaluate('''()=>{
          const t=testFix;t.start();for(let i=0;i<361;i++)t.tick(1/120);
          const s=t.simulation.state;
          for(let lap=0;lap<2;lap++)for(const index of [1,2,3,4,5,6,7,0]){
            const g=t.track.gates[index],offset=index===1?10:index===0?8:0;
            Object.assign(s,{x:g.x-g.tx*.12+g.tz*offset,z:g.z-g.tz*.12-g.tx*offset,
              y:8,flight:3,vy:0,yaw:Math.atan2(g.tx,g.tz),vx:g.tx*20,vz:g.tz*20,speed:20});
            for(let i=0;i<20;i++)t.tick(1/120);
            if(index===0 && lap===0 && (s.laps!==1||t.mode!=='race'))return {firstLap:false};
          }
          const before=JSON.stringify({s,elapsed:t.race.elapsed,positions:t.race.standings().map(r=>[r.state.x,r.state.z])});
          for(let i=0;i<600;i++)t.tick(1/120);
          return {mode:t.mode,laps:s.laps,stopped:s.speed===0&&s.y===0,
            frozen:before===JSON.stringify({s,elapsed:t.race.elapsed,positions:t.race.standings().map(r=>[r.state.x,r.state.z])})};
        }''')
        print('TWO_LAPS_AFTER_FLIGHT',json.dumps(result),flush=True)
        assert result=={'mode':'finished','laps':2,'stopped':True,'frozen':True},result
        assert page.locator('#finish-dialog').is_visible()
        assert page.locator('#results li').count()==6
        page.locator('#replay').click()
        assert page.evaluate('testFix.mode==="countdown" && testFix.simulation.state.laps===0 && !testFix.simulation.state.finished')

        result=page.evaluate('''()=>{
          const api=MaloPrototype,t=testFix,paints=Object.values(api.paints),previews=new Set();let accessories=0;
          for(const [id,paint] of Object.entries(api.paints)){
            previews.add(api.paintCanvas(paint).toDataURL());
            const kart=api.createKart(THREE,{...t.garage.state,paint:id});
            if(kart.root.getObjectByName('decoration'))accessories++;
            api.disposeObject(kart.root);
          }
          const locked=!t.garage.select('paint','rally-ruby');t.garage.credit(30);
          const unlocked=t.garage.select('paint','rally-ruby');
          const persisted=api.createGarage().state;
          const saved=unlocked&&persisted.paint==='rally-ruby'&&persisted.coins===30;
          t.garage.credit(2000);t.menu();t.menus.show('shop');
          return {count:paints.length-1,unique:previews.size,accessories,locked,saved,owned:t.garage.state.owned.length-1};
        }''')
        print('CUSTOMIZATIONS',json.dumps(result),flush=True)
        assert result['count']==136 and result['unique']>100 and result['accessories']==120,result
        assert result['locked'] and result['saved'] and result['owned']==136,result
        for category,count in [('Course',20),('Nature',30),('Cosmos',20),('Festif',30),('Mécanique',20),('all',137)]:
            page.locator('#decoration-filter').select_option(category)
            assert page.locator('#cards .card').count()==count,(category,count)
        page.locator('#decoration-filter').select_option('Course')
        page.locator('[data-choice=rally-ruby]').click()
        page.evaluate('testFix.render()')
        page.screenshot(path=str(OUT/'shop-accessory.png'))
        page.reload()
        page.wait_for_function('window.testFix')
        assert page.evaluate('testFix.garage.state.paint==="rally-ruby" && testFix.garage.state.coins===2030')
        assert not errors,errors
        print('SHOP_FILTERS_SAVE_RELOAD_AND_NO_BROWSER_ERRORS_OK',flush=True)
        browser.close()
finally:
    server.shutdown()
    server.server_close()
