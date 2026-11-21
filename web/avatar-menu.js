(() => {
  "use strict";
  const api = MaloAvatar, catalog = MaloAvatarCatalogue;
  const drawing = MaloAvatarDessin;
  const icons = {
    Visage:'<circle cx="12" cy="12" r="9"/><path d="M8 14q4 5 8 0M9 9h.01M15 9h.01"/>',
    Hauts:'<path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4q-4 5-8 0z"/>',
    Pantalons:'<path d="M6 3h12l2 18h-6l-2-11-2 11H4zM7 7h10"/>',
    Shorts:'<path d="M5 5h14l2 14h-8l-1-6-1 6H3zM6 9h12"/>',
    Chaussures:'<path d="M3 15q5 0 8-7l4 3 4-1 2 7v2H3zM4 16h15"/>',
    Chapeaux:'<path d="M3 15q0-11 10-11 7 0 8 10-9-3-15 3-4 2-4 0z"/>',
    Accessoires:'<path d="m2 9 2 7q4 4 7-3l1-2 2 2q2 7 7 3l1-7q-5-2-9 1Q7 7 2 9z"/>',
    hanger:'<path d="M9 6a3 3 0 1 1 5 2l-2 2v2l9 6q2 2-1 2H4q-3 0-1-2l9-6"/>',
    star:'<path d="m12 2 3 6.3 7 1-5 5 1 7-6-3.3-6 3.3 1-7-5-5 7-1z"/>',
    gift:'<path d="M3 9h18v4H3zM5 13v8h14v-8M12 9v12M12 9C2 9 6-1 12 9c6-10 10 0 0 0Z"/>',
    search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
  const normalize = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const condition = item => item.goal + (item.game ? " courses de Malo Kart" : " parties terminées");
  function modal(tag, label, html, closed) {
    const host = document.createElement(tag);
    const shadow = host.attachShadow({mode:"open"});
    const sheet = document.createElement("link");
    sheet.rel = "stylesheet"; sheet.href = new URL("avatar-menu.css",api.baseURL);
    const dialog = document.createElement("dialog");
    dialog.setAttribute("aria-label", label);
    dialog.innerHTML = html;
    shadow.append(sheet,dialog);
    document.body.append(host);
    dialog.addEventListener("close", () => {
      host.remove();
      closed?.();
    }, {once:true});
    for (const type of ["keydown","keyup","keypress"]) host.addEventListener(type, e => e.stopPropagation());
    dialog.showModal();
    return dialog;
  }

  function open(chooseProfile) {
    if (document.querySelector("malo-wardrobe")) return;
    const profile = api.profile();
    const opener = document.activeElement;
    let state = api.read(), category = "Visage";
    let changes = {}, switching = false;
    const dialog = modal("malo-wardrobe","Personnalisation",`
      <div class="workshop">
        <header><button class="back" aria-label="Retour au jeu">←</button><h1>${icon("hanger")} Personnalisation</h1><span class="score">${icon("star")} <b></b> pts</span></header>
        <main><aside class="identity panel"><h2>Mon profil</h2><div class="portrait"></div><strong class="username"></strong>
          <button class="switch">Changer de profil ⇄</button><dl></dl></aside>
          <nav aria-label="Catégories de personnalisation"></nav>
          <section class="stage" aria-label="Aperçu du personnage"><div class="floor"></div><div class="ring"></div><div class="model"></div></section>
          <section class="library panel"><div class="libhead"><h2></h2><span class="count"></span></div>
          <div class="filters"><label>${icon("search")}<input type="search" placeholder="Rechercher" aria-label="Rechercher un objet ou un visage"></label><select aria-label="Famille de visages"></select></div>
          <div class="grid"></div></section>
        </main><div class="actions"><button class="return">← Retour au jeu</button><footer class="panel"><span class="gift">${icon("gift")}</span><div class="next"><small>Prochaine récompense</small><strong></strong><div class="track"><i></i></div></div><span class="remaining"></span></footer><button class="equip" disabled>✓ Équiper</button></div>
        <div class="status" role="status"></div>
      </div>`, () => {
        window.removeEventListener("malo-avatar-change", update);
        if (switching) chooseProfile();
        else (opener?.isConnected ? opener : document.querySelector(".malo-account"))?.focus();
      });
    const $ = selector => dialog.querySelector(selector);
    $(".back").onclick = $(".return").onclick = () => dialog.close();
    $(".equip").onclick = async () => {
      try {
        if (await api.equipChanges(changes)) { changes = {}; update(); $(".status").textContent = "Tenue enregistrée."; }
      } catch { $(".status").textContent = "Sauvegarde impossible sur cet appareil."; }
    };
    $(".switch").onclick = () => { switching = true; dialog.close(); };
    $(".username").textContent = profile.name;
    const select = $("select"), search = $("input"), grid = $(".grid");
    for (const group of ["Toutes les familles", ...new Set(catalog.items.filter(i => i.group).map(i => i.group))]) select.add(new Option(group,group));
    for (const name of catalog.categories) {
      const button = document.createElement("button");
      button.innerHTML = icon(name) + name;
      button.onclick = () => { category = name; search.value = ""; select.selectedIndex = 0; grid.scrollTop = 0; renderGrid(); };
      $("nav").append(button);
    }
    function renderGrid() {
      const face = category === "Visage";
      select.hidden = !face;
      $(".libhead h2").innerHTML = icon(category) + " " + category;
      $("header h1").innerHTML = icon(face ? "hanger" : category) + " Personnalisation";
      [...$("nav").children].forEach((btn,i) => btn.setAttribute("aria-pressed",catalog.categories[i] === category));
      const items = catalog.items.filter(i => i.category === category && (!face || !select.selectedIndex || i.group === select.value)
        && normalize(i.name + " " + i.id).includes(normalize(search.value.trim())));
      $(".count").textContent = items.filter(i => !i.goal || state.unlocked.includes(i.id)).length + " / " + items.length;
      grid.replaceChildren(); grid.classList.toggle("faces",face);
      for (const item of items) {
        const outfit = {...state.outfit,...changes};
        const equipped = (outfit[item.slot] || (face && !profile.image && profile.emoji)) === item.id;
        const locked = item.goal && !state.unlocked.includes(item.id);
        const removable = equipped && ["hat","bag","glasses"].includes(item.slot);
        const button = document.createElement("button");
        button.className = "item";
        button.setAttribute("aria-pressed",equipped);
        button.setAttribute("aria-label",(removable ? "Retirer " : "") + item.name + (locked ? " · " + condition(item) : ""));
        button.disabled = !!locked;
        button.title = locked ? condition(item) : removable ? "Retirer " + item.name : item.name;
        const preview = face ? `<span class="emoji">${drawing.head(item.id,true)}</span>` : drawing(profile,state.outfit,item);
        button.innerHTML = preview + (equipped ? '<i class="tick">✓</i>' : "") + (!face || locked ? `<span class="item-name">${item.name}</span>` : "") + (locked ? `<small>🔒 ${condition(item)}</small>` : removable ? "<small>Retirer</small>" : "");
        button.onclick = () => {
          changes[item.slot] = removable ? null : item.id;
          if ((state.outfit[item.slot] || null) === changes[item.slot]) delete changes[item.slot];
          update();
          $(".status").textContent = Object.keys(changes).length ? "Aperçu · Équiper pour enregistrer" : "";
          grid.querySelectorAll("button")[items.indexOf(item)]?.focus({preventScroll:true});
        };
        grid.append(button);
      }
      if (!items.length) grid.textContent = "Aucun résultat.";
    }
    function update() {
      state = api.read();
      const total = api.total(state), points = total * catalog.pointsPerGame, level = 1 + Math.floor(total / catalog.gamesPerLevel);
      const preview = {...state.outfit,...changes};
      $(".equip").disabled = !Object.keys(changes).length;
      $(".model").innerHTML = drawing(profile,preview);
      $(".portrait").innerHTML = drawing(profile,preview);
      $(".score b").textContent = points;
      $("dl").innerHTML = [["Fidélité",points+" pts"],["Parties terminées",total],["Niveau",level],["Récompenses",state.unlocked.length]].map(([name,n]) => `<div><dt>${name}</dt><dd>${n}</dd></div>`).join("");
      const remaining = catalog.rewards.filter(i => !state.unlocked.includes(i.id)).sort((a,b) => (a.goal-api.progress(a,state)) - (b.goal-api.progress(b,state)));
      const next = remaining[0], count = next ? api.progress(next,state) : 0;
      $(".next strong").textContent = next ? next.name : "Collection complète !";
      $(".next i").style.width = (next ? Math.min(100, 100 * count / next.goal) : 100) + "%";
      $(".remaining").textContent = next ? count + " / " + condition(next) + " · Encore " + (next.goal-count) + " !" : "";
      renderGrid();
    }
    search.oninput = select.onchange = renderGrid;
    update(); window.addEventListener("malo-avatar-change",update);
  }

  function notify(id) {
    const item = catalog.byId.get(id);
    if (!item) { api.notices(); return; }
    const dialog = modal("malo-unlock","Nouvel objet débloqué",`<section class="reward">
      <div class="confetti" aria-hidden="true"></div><small>🌟 Nouvel objet débloqué !</small>
      <div class="prize">${drawing(api.profile(),api.read().outfit,item)}</div><h2>${item.name}</h2>
      <button class="equip">Équiper maintenant</button><button class="later">Plus tard</button><p role="status"></p></section>`,api.notices);
    for (let i=0;i<24;i++) {
      const piece = document.createElement("i");
      piece.style.cssText = `left:${i*4.2}%;--delay:${(i%7)*-.21}s;--color:${["#ffdf63","#51edff","#ff6dc7","#9770ff"][i%4]}`;
      dialog.querySelector(".confetti").append(piece);
    }
    dialog.querySelector(".later").onclick = () => dialog.close();
    dialog.querySelector(".equip").onclick = async () => {
      try { if (await api.equip(id)) dialog.close(); }
      catch { dialog.querySelector("p").textContent = "Sauvegarde impossible sur cet appareil."; }
    };
  }
  function account(chooseProfile, customize) {
    if (document.querySelector("malo-profile-menu")) return;
    let next;
    const dialog = modal("malo-profile-menu","Mon profil",`<section class="profile-options">
      <div class="portrait">${drawing(api.profile(),api.read().outfit,null,true)}</div><h2></h2>
      <button class="equip" data-profiles>Changer de profil</button><button class="return" data-dress>Personnaliser mon avatar</button>
      <button class="later">Retour au jeu</button></section>`, () => next?.());
    dialog.querySelector("h2").textContent = api.profile().name;
    dialog.querySelector("[data-profiles]").onclick = () => { next = chooseProfile; dialog.close(); };
    dialog.querySelector("[data-dress]").onclick = () => { next = customize; dialog.close(); };
    dialog.querySelector(".later").onclick = () => dialog.close();
  }
  window.MaloAvatarMenu = { open, notify, account };
})();
