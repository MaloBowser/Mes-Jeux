(() => {
  "use strict";
  const catalogue = window.MaloAvatarCatalogue;
  const baseURL = new URL(".", document.currentScript.src);
  const standalone = document.currentScript.hasAttribute("data-standalone");
  const gameId = location.pathname.includes("/malo-kart-phase1/") ? "malo-kart" : decodeURIComponent(location.pathname.split("/").pop()).replace(/\.html$/i, "");
  const activeId = () => localStorage.getItem("malo.activeProfile");
  let profileId;
  try { profileId = activeId(); } catch { return; }
  const key = id => "malo.profileData." + id + ".avatar.v1";
  const current = () => profileId && profileId === activeId() && profile();
  const profile = () => JSON.parse(localStorage.getItem("malo.profiles.v1") || "[]").find(p => p.id === profileId);
  const fresh = () => ({ version: 1, games: {}, outfit: { ...catalogue.base }, unlocked: [], pending: [] });
  function read(id = profileId) {
    const raw = localStorage.getItem(key(id));
    if (!raw) return fresh();
    const state = JSON.parse(raw);
    if (state.version !== 1) throw new Error("Version de garde-robe inconnue");
    return state;
  }
  function face(id) {
    try { return read(id).outfit.face || ""; } catch { return ""; }
  }
  const total = state => Object.values(state.games).reduce((sum, count) => sum + count, 0);
  const progress = (item, state) => item.game ? state.games[item.game] || 0 : total(state);
  const changed = () => window.dispatchEvent(new Event("malo-avatar-change"));
  function report(error) {
    console.error("Garde-robe", error);
    window.dispatchEvent(new CustomEvent("malo-avatar-error", { detail: "La garde-robe n’a pas pu être sauvegardée sur cet appareil." }));
  }

  // Toutes les écritures d’un profil passent par le même verrou entre onglets.
  async function transaction(action, id = profileId) {
    if (!navigator.locks) throw new Error("Le stockage partagé nécessite un contexte sécurisé.");
    return navigator.locks.request(key(id), () => {
      if (!JSON.parse(localStorage.getItem("malo.profiles.v1") || "[]").some(p => p.id === id)) return;
      const state = read(id);
      const result = action(state);
      if (result === undefined) return;
      localStorage.setItem(key(id), JSON.stringify(state));
      changed();
      return result;
    });
  }
  let round;
  function claim() {
    if (!round || round.claimed || !current()) return;
    round.claimed = true;
    const token = round.token;
    transaction(state => {
      if (!current()) return;
      state.round = token;
      return true;
    }).catch(report);
  }
  const gameInput = event => event?.isTrusted && ["click","pointerdown","keydown","submit","touchstart"].includes(event.type)
    && !event.composedPath().some(el => el.matches?.("malo-wardrobe, malo-unlock, malo-profile-menu, .malo-account, .malo-overlay, .malo-home-button"));
  let inputEvent;
  function start() {
    round = { token: crypto.randomUUID?.() || Math.random().toString(36), claimed: false };
    if (inputEvent?.eventPhase) claim();
  }
  for (const type of ["pointerdown","keydown","click","submit"]) window.addEventListener(type, event => {
    if (gameInput(event)) { inputEvent = event; claim(); }
  }, true);

  async function finish() {
    const completed = round;
    round = null;
    if (!completed?.claimed || !current()) return;
    try {
      const result = await transaction(state => {
        if (!current() || state.round !== completed.token) return;
        delete state.round;
        state.games[gameId] = (state.games[gameId] || 0) + 1;
        const rewards = catalogue.rewards.filter(item => !state.unlocked.includes(item.id) && progress(item, state) >= item.goal);
        for (const { id } of rewards) { state.unlocked.push(id); state.pending.push(id); }
        return { profileId, gameId, completed: true, rewards: rewards.map(item => item.id) };
      });
      if (result?.rewards.length) notices();
      return result;
    } catch (error) { report(error); }
  }
  function equipChanges(changes) {
    return transaction(state => {
      if (!current()) return;
      for (const [slot, id] of Object.entries(changes)) {
        const item = catalogue.byId.get(id);
        if (id === null && ["hat","glasses","bag"].includes(slot)) delete state.outfit[slot];
        else if (item?.slot === slot && (!item.goal || state.unlocked.includes(id))) state.outfit[slot] = id;
        else return;
      }
      return true;
    });
  }
  const equip = id => equipChanges({ [catalogue.byId.get(id).slot]: id });
  const scripts = new Map();
  function load(name) {
    if (!scripts.has(name)) {
      scripts.set(name, new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = new URL(name, baseURL);
        script.onload = resolve;
        script.onerror = () => reject(new Error("Chargement impossible : " + name));
        document.head.append(script);
      }).catch(error => { scripts.delete(name); throw error; }));
    }
    return scripts.get(name);
  }
  async function portrait(element, player) {
    try {
      await load("avatar-dessin.js");
      element.innerHTML = MaloAvatarDessin(player, read(player.id).outfit, null, true);
    } catch (error) { report(error); }
  }
  async function ui() {
    await load("avatar-dessin.js");
    await load("avatar-menu.js");
    return window.MaloAvatarMenu;
  }
  let checking = false;
  async function notices() {
    if (checking || document.hidden || !current() || document.querySelector("malo-unlock")) return;
    checking = true;
    try {
      if (!read().pending.length) return;
      const menu = await ui();
      const id = await transaction(state => current() && !document.hidden ? state.pending.shift() : undefined);
      if (id && current()) menu.notify(id);
    } catch (error) { report(error); }
    finally { checking = false; }
  }
  async function open(chooseProfile) {
    if (!current()) return;
    try { (await ui()).open(chooseProfile); } catch (error) { report(error); }
  }
  window.MaloAvatar = { start, finish, read, face, profile, total, progress, equip, equipChanges, open, notices, baseURL, portrait,
    resetFace: id => transaction(state => { if (state.outfit.face) { delete state.outfit.face; return true; } }, id)
  };
  window.addEventListener("storage", event => {
    if (event.key === "malo.activeProfile" && activeId() !== profileId) { location.reload(); return; }
    if (event.key === key(profileId)) changed();
    if (event.key === "malo.profiles.v1" && profileId && !profile()) location.reload();
  });
  window.addEventListener("pageshow", () => {
    if (activeId() !== profileId) location.reload();
    else notices();
  });
  document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector('meta[name="viewport"]')) return;
    const viewport = document.createElement("meta");
    viewport.name = "viewport";
    viewport.content = "width=device-width, initial-scale=1";
    document.head.append(viewport);
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) notices(); });
  if (standalone) document.addEventListener("DOMContentLoaded", () => {
    if (!current()) return;
    const account = document.createElement("button");
    account.className = "malo-account";
    account.setAttribute("aria-label","Mon profil · " + profile().name);
    account.setAttribute("aria-haspopup","dialog");
    account.title = "Changer de profil ou personnaliser mon avatar";
    account.style.cssText = "position:fixed;top:8px;right:8px;z-index:1000;width:52px;height:52px;padding:3px;display:grid;place-items:center;border:2px solid #62e5ff;border-radius:50%;background:radial-gradient(ellipse at bottom,#315992,#10162f 75%);overflow:hidden;cursor:pointer";
    const render = () => portrait(account, profile());
    render(); window.addEventListener("malo-avatar-change", render);
    const chooseProfile = () => { sessionStorage.removeItem("malo.profileChosenSession"); location.href = new URL("../index.html", baseURL); };
    account.onclick = async () => {
      try { (await ui()).account(chooseProfile, () => open(chooseProfile)); } catch (error) { report(error); }
    };
    const kartHeader = gameId === "malo-kart" && document.querySelector("header");
    if (kartHeader) {
      account.style.position = "static";
      kartHeader.querySelector("a").after(account);
    } else document.body.append(account);
  });
})();
