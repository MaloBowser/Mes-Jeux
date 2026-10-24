"""Sélecteurs centrés, médaillons, décors et classement responsive."""
import functools
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.tmp/malo-presentation-checks'
OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*_): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
source=(ROOT/'web/malo-kart-phase1/game.js').read_text(encoding='utf-8')
hook='''window.testPresentation={start,tick,menu,menus,garage,
get state(){return simulation.state},get track(){return track},get view(){return view},
render(){view.update(simulation.state,0,mode==='menu',true);raceView.update(0,mode!=='menu');updateHUD();renderer.render(view.scene,view.camera)},
stop(){window.requestAnimationFrame=()=>0}};'''
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge',headless=True)
        page=browser.new_page(viewport={'width':1280,'height':800},has_touch=True)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        page.route('**/malo-kart-phase1/game.js',lambda r:r.fulfill(body=source.replace('  applyQuality(); menu();',hook+'\n  applyQuality(); menu();'),content_type='application/javascript'))
        page.goto(f'http://127.0.0.1:{server.server_port}/web/malo-kart-phase1/')
        page.wait_for_function('window.testPresentation')
        page.evaluate('testPresentation.stop()');page.wait_for_timeout(100)
        page.evaluate("testPresentation.menus.show('vehicle');testPresentation.render()")
        for field,label in [('vehicle','Kart'),('tire','Roues'),('glider','Aile')]:
            initial=page.evaluate('(field)=>testPresentation.garage.state[field]',field)
            page.get_by_role('button',name=label+' suivant',exact=True).tap()
            assert page.evaluate('(field)=>testPresentation.garage.state[field]',field)!=initial
            page.get_by_role('button',name=label+' précédent',exact=True).tap()
            assert page.evaluate('(field)=>testPresentation.garage.state[field]',field)==initial
        assert page.evaluate('''()=>[...document.querySelectorAll('.part-reel')].every(reel=>{
          const a=reel.getBoundingClientRect(),b=reel.querySelector('[aria-pressed=true]').getBoundingClientRect();return Math.abs(a.y+a.height/2-b.y-b.height/2)<3;
        })''')
        reel=page.locator('.part-reel').first
        reel.evaluate('el=>{el.scrollTop=el.scrollHeight;el.dispatchEvent(new Event("scroll"));}')
        page.wait_for_function("testPresentation.garage.state.vehicle==='hover'")
        page.evaluate('testPresentation.render()')
        page.screenshot(path=str(OUT/'garage.png'))
        page.evaluate("testPresentation.menus.show('course')")
        assert page.locator('.cup-medal').count()==6
        for cup in range(6):
            page.locator(f'[data-cup="{cup}"]').tap()
            assert page.locator(f'[data-cup="{cup}"]').get_attribute('aria-pressed')=='true'
            assert page.locator('.card').count()==4
            assert page.evaluate('MaloPrototype.courses[testPresentation.garage.state.course].cup')==cup
        page.screenshot(path=str(OUT/'cups.png'))
        for cup,course,index in [(0,'azur',20),(5,'rainbowRoad',470)]:
            page.locator(f'[data-cup="{cup}"]').tap()
            page.locator(f'[data-choice="{course}"]').tap()
            page.locator('#start').tap()
            page.evaluate('''index=>{
              const t=testPresentation;for(let i=0;i<450;i++)t.tick(1/120);const p=t.track.points[index];
              Object.assign(t.state,{x:p.x,z:p.z,y:0,yaw:Math.atan2(p.tx,p.tz),speed:0,vx:0,vz:0});t.render();
            }''',index)
            assert page.locator('#lap').is_visible()
            page.screenshot(path=str(OUT/f'{course}.png'))
            if course=='azur':page.evaluate("testPresentation.menu();testPresentation.menus.show('course')")
        page.evaluate('testPresentation.state.finished=true;testPresentation.state.laps=2;testPresentation.tick(.01);testPresentation.render()')
        assert page.locator('#results li').count()==6
        assert page.locator('#results .is-player').count()==1
        assert 'Toi' in page.locator('#results .is-player').inner_text()
        assert not page.locator('#lap').is_visible()
        page.wait_for_function('Array.from(document.querySelectorAll("#results img")).every(img=>img.complete&&img.naturalWidth>0)')
        for width,height in [(1280,800),(390,844),(844,390)]:
            page.set_viewport_size({'width':width,'height':height});page.evaluate('testPresentation.render()')
            for selector in ['#replay','#finish-back']:
                page.locator(selector).scroll_into_view_if_needed()
                assert page.locator(selector).evaluate('el=>{const r=el.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.bottom<=innerHeight&&r.right<=innerWidth;}')
            page.screenshot(path=str(OUT/f'results-{width}.png'))
        page.locator('#replay').tap()
        assert page.locator('#lap').is_visible()
        assert not page.evaluate("document.body.classList.contains('finished')")
        assert not errors,errors
        print('CENTERED_REELS_SCROLL_ARROWS_SIX_CUPS_TWO_SCENERIES_RESULTS_REPLAY_OK',flush=True)
        browser.close()
finally:
    server.shutdown();server.server_close()
