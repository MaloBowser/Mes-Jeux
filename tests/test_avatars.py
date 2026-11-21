"""Parcours de garde-robe sur un serveur local et dans un navigateur temporaire."""
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class SilentHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def test_avatars():
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(SilentHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_port}/"
    try:
        with sync_playwright() as driver:
            browser = driver.chromium.launch(channel="msedge")
            context = browser.new_context(viewport={"width": 1366, "height": 820})
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(url + "manifest.json")
            # An existing profile, an old game record and the normal first-visit prompts.
            page.evaluate("""() => {
                localStorage.setItem('malo.profiles.v1', JSON.stringify([{id:'original',name:'Malo',emoji:'🦊',image:''}]));
                localStorage.setItem('malo.activeProfile','original');
                localStorage.setItem('malo.profileData.original.recordSnake','27');
                sessionStorage.setItem('malo.introSeen.ribbon-2026-09','1');
            }""")
            page.goto(url)
            page.locator(".malo-profile-card").first.click()
            page.locator(".malo-welcome").wait_for(state="detached")
            page.locator("#recherche").fill("vêtements")
            assert page.locator(".jeu:not(.masque)").count() == 1
            cover = page.locator("#ouvrir-personnalisation img")
            assert cover.evaluate("img => img.complete && img.naturalWidth >= 1000")
            assert page.locator("#jeu-aleatoire").is_disabled()
            cover.click()
            menu = page.locator("malo-wardrobe")
            assert menu.locator(".username").inner_text() == "Malo"
            assert menu.locator(".grid .item").count() > 100
            menu.get_by_role("searchbox").fill("etoiles")
            menu.get_by_role("button", name="Étoiles", exact=True).click()
            for category, choice in [("Hauts","Tee-shirt Ivoire"),("Pantalons","Jean Sable"),("Shorts","Short Prune"),("Chaussures","Baskets Azur")]:
                menu.locator("nav").get_by_role("button",name=category,exact=True).click()
                assert menu.locator(".grid button:enabled").count() == 3
                menu.get_by_role("button",name=choice,exact=True).click()
            menu.locator(".equip").click()
            page.wait_for_function("MaloAvatar.read().outfit.shoes === 'sneakers2'")
            state = page.evaluate("MaloAvatar.read()")
            assert state["outfit"] == {"top":"tee1","bottom":"short1","shoes":"sneakers2","face":"🤩"}, state
            assert page.locator(".malo-account [data-face='🤩']").count() == 1
            assert page.locator(".malo-account [data-part=shoes] path").count() > 0
            menu.locator(".return").click()
            page.reload()
            assert page.evaluate("MaloAvatar.read().outfit") == state["outfit"]

            # An unfinished board, reload, then an actual seven-move win.
            game = url + "web/puissance4.html"
            page.goto(game)
            page.locator(".case").first.click()
            page.reload()
            assert page.evaluate("MaloAvatar.total(MaloAvatar.read())") == 0
            for col in [0,1,0,1,0,1,0]:
                page.locator(".case").nth(col).click()
            page.wait_for_function("MaloAvatar.read().games.puissance4 === 1")
            page.evaluate("MaloAvatar.finish()")
            assert page.evaluate("MaloAvatar.read().games.puissance4") == 1

            # Beginning play in a second tab supersedes the unfinished board in the first.
            page.reload()
            page.locator(".case").first.click()
            other = context.new_page()
            other.goto(url+"manifest.json")
            other.evaluate("sessionStorage.setItem('malo.profileChosenSession','1')")
            other.goto(game)
            other.locator(".case").first.click()
            for col in [1,0,1,0,1,0]:
                page.locator(".case").nth(col).click()
            assert page.evaluate("MaloAvatar.read().games.puissance4") == 1
            for col in [1,0,1,0,1,0]:
                other.locator(".case").nth(col).click()
            other.wait_for_function("MaloAvatar.read().games.puissance4 === 2")
            other.close()
            page.goto(url+"web/pile_face.html")
            for _ in range(3):
                page.locator("button[onclick^='jouer']").first.click()
            reward = page.locator("malo-unlock")
            reward.get_by_role("button",name="Équiper maintenant").click()
            page.wait_for_function("MaloAvatar.read().outfit.top === 'gamer'")
            page.reload()
            assert page.evaluate("MaloAvatar.read().unlocked") == ["gamer"]
            assert page.evaluate("MaloAvatar.read().pending") == []
            assert reward.count() == 0

            page.set_viewport_size({"width":390,"height":844})
            page.locator(".malo-account").click()
            page.locator("[data-dress]").click()
            menu.locator("nav").get_by_role("button",name="Hauts",exact=True).click()
            assert menu.locator(".grid").evaluate("e=>e.clientHeight > 110 && e.scrollHeight > e.clientHeight")
            assert menu.locator("dialog").evaluate("d=>d.scrollWidth <= d.clientWidth")
            assert menu.locator(".model > svg").bounding_box()["height"] > 130
            menu.locator(".switch").click()
            page.locator("[data-add]").click()
            page.locator("[name=username]").fill("Malo")
            page.locator(".malo-dialog button[type=submit]").click()
            page.wait_for_url(url+"index.html")
            assert page.evaluate("MaloAvatar.profile().id") != "original"
            assert page.evaluate("MaloAvatar.total(MaloAvatar.read())") == 0
            assert page.evaluate("MaloAvatar.read().unlocked") == []
            assert page.evaluate("MaloAvatar.read().outfit.top") == "tee0"
            page.get_by_role("button", name="Changer de profil · Malo").click()
            page.locator(".malo-profile-card").first.click()
            page.wait_for_function("MaloAvatar.profile()?.id === 'original' && !document.querySelector('.malo-welcome')")
            assert page.evaluate("MaloAvatar.read().outfit.top") == "gamer"
            assert page.evaluate("localStorage.getItem('recordSnake')") == "27"
            assert page.evaluate("MaloAvatar.total(MaloAvatar.read())") == 5
            assert not errors, json.dumps(errors, ensure_ascii=False)
            # Sur une ancienne page sans viewport mobile, le menu reste à la largeur de l’écran.
            mobile = browser.new_context(is_mobile=True, has_touch=True, viewport={"width":390,"height":844})
            phone = mobile.new_page()
            phone.goto(url+"manifest.json")
            phone.evaluate("""() => {
                const image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aLHsAAAAASUVORK5CYII=";
                localStorage.setItem("malo.profiles.v1", JSON.stringify([{id:"photo",name:"Photo",image,emoji:"😀"}]));
                localStorage.setItem("malo.activeProfile","photo");
                sessionStorage.setItem("malo.profileChosenSession","1");
            }""")
            phone.goto(url+"web/portes.html")
            phone.locator(".malo-account [data-part=face] image").wait_for(state="visible")
            phone.locator(".malo-account").tap()
            phone.locator("[data-dress]").tap()
            closet = phone.locator("malo-wardrobe")
            phone.wait_for_function("innerWidth <= 390")
            assert closet.locator(".model image").count() == 1
            closet.get_by_role("combobox").select_option("Animaux")
            closet.get_by_role("button",name="Koala",exact=True).tap()
            closet.locator(".equip").tap()
            phone.wait_for_function("MaloAvatar.read().outfit.face === '🐨'")
            closet.locator(".return").tap()
            phone.reload()
            phone.locator(".malo-account [data-face='🐨']").wait_for(state="visible")
            phone.locator(".malo-account").tap()
            assert phone.locator(".malo-profile-card").is_visible()
            phone.locator("[data-close]").tap()
            phone.goto(url+"web/Serpent.html")
            phone.locator(".malo-account [data-part=shoes] path").first.wait_for(state="visible")
            phone.locator(".malo-account").tap()
            phone.get_by_role("button",name="Changer de profil").tap()
            phone.locator(".malo-profile-card").first.wait_for(state="visible")
            mobile.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    test_avatars()
    print("Profils, garde-robe, mobile, fins de partie et déblocage vérifiés.")

