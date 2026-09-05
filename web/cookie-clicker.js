(() => {
  "use strict";

  const SAVE_KEY = "malo.cookieCosmos.v1";
  const PRICE_GROWTH = 1.15;
  const MAX_OFFLINE_SECONDS = 8 * 60 * 60;
  const PRESTIGE_THRESHOLD = 1_000_000_000;
  const BUILDINGS = [
    { id: "cursor", name: "Curseur", basePrice: 15, cps: .1, icon: "☝️" },
    { id: "grandma", name: "Grand-mère", basePrice: 100, cps: 1, icon: "👵" },
    { id: "farm", name: "Ferme", basePrice: 1_100, cps: 8, icon: "🌾" },
    { id: "factory", name: "Usine", basePrice: 12_000, cps: 40, icon: "🏭" },
    { id: "bank", name: "Banque", basePrice: 130_000, cps: 150, icon: "🏦" },
    { id: "temple", name: "Temple", basePrice: 1_400_000, cps: 600, icon: "🛕" },
    { id: "lab", name: "Laboratoire", basePrice: 20_000_000, cps: 2_500, icon: "🧪" },
    { id: "portal", name: "Portail", basePrice: 330_000_000, cps: 10_000, icon: "🌀" },
    { id: "timeMachine", name: "Machine temporelle", basePrice: 5_100_000_000, cps: 50_000, icon: "⏳" }
  ];
  const UPGRADES = [
    { id: "click2", name: "Doigts bioniques", description: "Puissance de clic x2", price: 250, type: "click", value: 2 },
    { id: "cursor2", name: "Curseurs chromés", description: "Production des curseurs x2", price: 700, type: "building", building: "cursor", value: 2 },
    { id: "grandma2", name: "Recette cosmique", description: "Production des grand-mères x2", price: 3_500, type: "building", building: "grandma", value: 2 },
    { id: "global25", name: "Réacteur cyan", description: "Production globale +25 %", price: 18_000, type: "global", value: 1.25 },
    { id: "golden", name: "Radar doré", description: "Cookies dorés plus fréquents", price: 45_000, type: "golden", value: 1 }
  ];
  const ACHIEVEMENTS = [
    { id: "cookies100", name: "Première fournée", description: "Gagner 100 cookies", test: s => s.stats.lifetime >= 100 },
    { id: "cookies1k", name: "Mille miettes", description: "Gagner 1 000 cookies", test: s => s.stats.lifetime >= 1_000 },
    { id: "cookies10k", name: "Cookie star", description: "Gagner 10 000 cookies", test: s => s.stats.lifetime >= 10_000 },
    { id: "cookies1m", name: "Millionnaire du goûter", description: "Gagner 1 million de cookies", test: s => s.stats.lifetime >= 1_000_000 },
    { id: "clicks100", name: "Index infatigable", description: "Faire 100 clics", test: s => s.stats.clicks >= 100 },
    { id: "buildings10", name: "Petit empire", description: "Acheter 10 bâtiments", test: s => buildingCount(s) >= 10 },
    { id: "buildings100", name: "Cookie corporation", description: "Acheter 100 bâtiments", test: s => buildingCount(s) >= 100 }
  ];
  const $ = id => document.getElementById(id);
  const ui = { cookies: $("cookies"), cps: $("cps"), clicks: $("clicks"), record: $("record"), clickPower: $("click-power"), status: $("bonus-status"), buildings: $("buildings"), upgrades: $("upgrades-list"), achievements: $("achievements-list"), cookie: $("main-cookie"), effects: $("effects"), golden: $("golden-cookie"), prestigePoints: $("prestige-points"), prestigeBonus: $("prestige-bonus"), prestigeButton: $("prestige-button"), offline: $("offline-dialog"), offlineMessage: $("offline-message"), confirm: $("confirm-dialog") };

  const freshState = () => ({ cookies: 0, buildings: {}, upgrades: [], achievements: [], stats: { clicks: 0, lifetime: 0, best: 0 }, prestige: 0, lastSave: Date.now(), effects: { productionUntil: 0, clicksUntil: 0 } });
  let state = loadState();
  let lastTick = performance.now();
  let goldenTimer = null;
  let goldenVisibleTimer = null;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved || typeof saved !== "object") return freshState();
      const base = freshState();
      const loaded = { ...base, ...saved, stats: { ...base.stats, ...saved.stats }, effects: { ...base.effects, ...saved.effects } };
      loaded.buildings = Object.fromEntries(BUILDINGS.map(b => [b.id, Math.max(0, Number(saved.buildings?.[b.id]) || 0)]));
      loaded.upgrades = Array.isArray(saved.upgrades) ? saved.upgrades.filter(id => UPGRADES.some(u => u.id === id)) : [];
      loaded.achievements = Array.isArray(saved.achievements) ? saved.achievements.filter(id => ACHIEVEMENTS.some(a => a.id === id)) : [];
      loaded.cookies = Math.max(0, Number(loaded.cookies) || 0);
      loaded.prestige = Math.max(0, Number(loaded.prestige) || 0);
      return loaded;
    } catch { return freshState(); }
  }
  function save() { state.lastSave = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, cps: getCps() })); }
  function number(value) { return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: value < 100 ? 1 : 0, notation: value >= 1_000_000 ? "compact" : "standard" }).format(value); }
  function buildingCount(s = state) { return Object.values(s.buildings).reduce((sum, count) => sum + count, 0); }
  function hasUpgrade(id) { return state.upgrades.includes(id); }
  function buildingMultiplier(id) { return UPGRADES.filter(u => u.type === "building" && u.building === id && hasUpgrade(u.id)).reduce((m, u) => m * u.value, 1); }
  function globalMultiplier() { return UPGRADES.filter(u => u.type === "global" && hasUpgrade(u.id)).reduce((m, u) => m * u.value, 1) * (1 + state.prestige * .02); }
  function timedProductionMultiplier() { return state.effects.productionUntil > Date.now() ? 2 : 1; }
  function timedClickMultiplier() { return state.effects.clicksUntil > Date.now() ? 5 : 1; }
  function getCps() { return BUILDINGS.reduce((sum, b) => sum + (state.buildings[b.id] || 0) * b.cps * buildingMultiplier(b.id), 0) * globalMultiplier() * timedProductionMultiplier(); }
  function getClickPower() { return UPGRADES.filter(u => u.type === "click" && hasUpgrade(u.id)).reduce((p, u) => p * u.value, 1) * timedClickMultiplier(); }
  function priceFor(building) { return Math.ceil(building.basePrice * PRICE_GROWTH ** (state.buildings[building.id] || 0)); }
  function addCookies(amount) { state.cookies += amount; state.stats.lifetime += amount; state.stats.best = Math.max(state.stats.best, state.cookies); }

  function renderStats() {
    ui.cookies.textContent = number(state.cookies); ui.cps.textContent = number(getCps()); ui.clicks.textContent = number(state.stats.clicks); ui.record.textContent = number(state.stats.best);
    ui.clickPower.textContent = number(getClickPower()); ui.prestigePoints.textContent = state.prestige; ui.prestigeBonus.textContent = state.prestige * 2;
    const productionLeft = Math.max(0, Math.ceil((state.effects.productionUntil - Date.now()) / 1000));
    const clicksLeft = Math.max(0, Math.ceil((state.effects.clicksUntil - Date.now()) / 1000));
    ui.status.textContent = productionLeft ? `⚡ Production x2 : ${productionLeft} s` : clicksLeft ? `✋ Clics x5 : ${clicksLeft} s` : "Clique sur le cookie pour lancer ta fabrique !";
    const canPrestige = state.stats.lifetime >= PRESTIGE_THRESHOLD;
    ui.prestigeButton.disabled = !canPrestige;
    ui.prestigeButton.textContent = canPrestige ? `Recommencer : +${prestigeGain()} point${prestigeGain() > 1 ? "s" : ""}` : `Prestige à ${number(PRESTIGE_THRESHOLD)}`;
  }
  function render() { renderStats(); renderBuildings(); renderUpgrades(); renderAchievements(); }
  function renderBuildings() { ui.buildings.innerHTML = BUILDINGS.map(b => { const price = priceFor(b); const owned = state.buildings[b.id] || 0; return `<article class="shop-card"><div><div class="card-title">${b.icon} ${b.name}</div><div class="card-info">${number(price)} cookies · ${owned} possédé${owned > 1 ? "s" : ""}</div><div class="card-info">+${number(b.cps * buildingMultiplier(b.id))}/s chacun</div></div><button class="buy-button" data-building="${b.id}" ${state.cookies < price ? "disabled" : ""}>Acheter</button></article>`; }).join(""); }
  function renderUpgrades() { ui.upgrades.innerHTML = UPGRADES.map(u => { const bought = hasUpgrade(u.id); return `<article class="upgrade-card"><div class="card-title">${bought ? "✓" : "✦"} ${u.name}</div><div class="card-info">${u.description}</div><button class="buy-button" data-upgrade="${u.id}" ${bought || state.cookies < u.price ? "disabled" : ""}>${bought ? "Achetée" : `Acheter · ${number(u.price)}`}</button></article>`; }).join(""); }
  function renderAchievements() { ui.achievements.innerHTML = ACHIEVEMENTS.map(a => { const unlocked = state.achievements.includes(a.id); return `<article class="achievement ${unlocked ? "is-unlocked" : ""}"><div class="card-title">${unlocked ? "🏆" : "🔒"} ${a.name}</div><small class="${unlocked ? "" : "lock"}">${unlocked ? a.description : "Trophée à débloquer"}</small></article>`; }).join(""); }

  function buyBuilding(id) { const building = BUILDINGS.find(b => b.id === id); const price = building && priceFor(building); if (!building || state.cookies < price) return; state.cookies -= price; state.buildings[id] = (state.buildings[id] || 0) + 1; checkAchievements(); render(); }
  function buyUpgrade(id) { const upgrade = UPGRADES.find(u => u.id === id); if (!upgrade || hasUpgrade(id) || state.cookies < upgrade.price) return; state.cookies -= upgrade.price; state.upgrades.push(id); toast(`✦ Amélioration achetée : ${upgrade.name}`); render(); }
  function clickCookie(event) { const gain = getClickPower(); addCookies(gain); state.stats.clicks++; ui.cookie.classList.remove("is-clicked"); void ui.cookie.offsetWidth; ui.cookie.classList.add("is-clicked"); spawnClickEffects(event, gain); checkAchievements(); render(); }
  function spawnClickEffects(event, gain) { const rect = ui.effects.getBoundingClientRect(); const x = event.clientX - rect.left; const y = event.clientY - rect.top; const plus = document.createElement("span"); plus.className = "floating-number"; plus.textContent = `+${number(gain)}`; plus.style.left = `${x}px`; plus.style.top = `${y}px`; ui.effects.appendChild(plus); setTimeout(() => plus.remove(), 900); for (let i = 0; i < 7; i++) { const crumb = document.createElement("i"); crumb.className = "crumb"; crumb.style.left = `${x}px`; crumb.style.top = `${y}px`; crumb.style.setProperty("--x", `${(Math.random() - .5) * 110}px`); crumb.style.setProperty("--y", `${(Math.random() - .5) * 110}px`); ui.effects.appendChild(crumb); setTimeout(() => crumb.remove(), 600); } }
  function checkAchievements() { let changed = false; ACHIEVEMENTS.forEach(a => { if (!state.achievements.includes(a.id) && a.test(state)) { state.achievements.push(a.id); toast(`🏆 Trophée débloqué : ${a.name}`); changed = true; } }); return changed; }
  function toast(message) { const item = document.createElement("div"); item.className = "toast"; item.textContent = message; $("toast-container").appendChild(item); setTimeout(() => item.remove(), 3500); }

  function scheduleGolden() { clearTimeout(goldenTimer); const [min, max] = hasUpgrade("golden") ? [25_000, 55_000] : [45_000, 90_000]; goldenTimer = setTimeout(showGolden, min + Math.random() * (max - min)); }
  function showGolden() { ui.golden.style.left = `${12 + Math.random() * 68}%`; ui.golden.style.top = `${14 + Math.random() * 63}%`; ui.golden.hidden = false; clearTimeout(goldenVisibleTimer); goldenVisibleTimer = setTimeout(() => { ui.golden.hidden = true; scheduleGolden(); }, 8_000); }
  function collectGolden() { if (ui.golden.hidden) return; ui.golden.hidden = true; clearTimeout(goldenVisibleTimer); const roll = Math.floor(Math.random() * 3); if (roll === 0) { const gain = Math.max(getCps() * 60, 500); addCookies(gain); toast(`🌟 Pluie dorée : +${number(gain)} cookies !`); } else if (roll === 1) { state.effects.productionUntil = Date.now() + 30_000; toast("⚡ Turbo fabrique : production x2 pendant 30 s !"); } else { state.effects.clicksUntil = Date.now() + 15_000; toast("✋ Main dorée : clics x5 pendant 15 s !"); } render(); scheduleGolden(); }
  function prestigeGain() { return Math.max(1, Math.floor(Math.sqrt(state.stats.lifetime / PRESTIGE_THRESHOLD))); }
  function confirmAction(title, message, action) { $("confirm-title").textContent = title; $("confirm-message").textContent = message; ui.confirm.showModal(); const confirm = ui.confirm.querySelector("[data-confirm]"); const cancel = ui.confirm.querySelector("[data-cancel]"); const close = () => ui.confirm.close(); confirm.onclick = () => { close(); action(); }; cancel.onclick = close; }
  function resetGame() { localStorage.removeItem(SAVE_KEY); state = freshState(); clearTimeout(goldenTimer); ui.golden.hidden = true; save(); scheduleGolden(); render(); toast("La partie a été réinitialisée."); }
  function doPrestige() { const gained = prestigeGain(); const prestige = state.prestige + gained; state = freshState(); state.prestige = prestige; save(); scheduleGolden(); render(); toast(`✦ Prestige réussi : +${gained} point${gained > 1 ? "s" : ""} permanent${gained > 1 ? "s" : ""} !`); }
  function applyOfflineGains() { const elapsed = Math.min(MAX_OFFLINE_SECONDS, Math.max(0, (Date.now() - state.lastSave) / 1000)); const gain = getCps() * elapsed; if (gain >= .1) { addCookies(gain); ui.offlineMessage.textContent = `Pendant ton absence, ta fabrique a produit ${number(gain)} cookies.`; ui.offline.showModal(); } }
  function tick(now) { const elapsed = Math.min(.5, Math.max(0, (now - lastTick) / 1000)); lastTick = now; const cps = getCps(); if (cps > 0) addCookies(cps * elapsed); if (checkAchievements()) render(); else renderStats(); requestAnimationFrame(tick); }

  ui.cookie.addEventListener("click", clickCookie); ui.golden.addEventListener("click", collectGolden);
  ui.buildings.addEventListener("click", e => { const id = e.target.dataset.building; if (id) buyBuilding(id); }); ui.upgrades.addEventListener("click", e => { const id = e.target.dataset.upgrade; if (id) buyUpgrade(id); });
  document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => { document.querySelectorAll(".tab").forEach(t => t.classList.toggle("is-active", t === tab)); document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("is-active", p.id === tab.dataset.tab)); }));
  $("reset-button").addEventListener("click", () => confirmAction("Réinitialiser la partie ?", "Tous les cookies, bâtiments, trophées et points de prestige seront supprimés.", resetGame));
  ui.prestigeButton.addEventListener("click", () => { if (state.stats.lifetime >= PRESTIGE_THRESHOLD) confirmAction("Lancer le prestige ?", `Tu recommenceras à zéro et gagneras ${prestigeGain()} point(s) de prestige permanent(s).`, doPrestige); });
  document.querySelector("[data-close-dialog]").addEventListener("click", () => ui.offline.close());
  window.addEventListener("beforeunload", save); document.addEventListener("visibilitychange", () => { if (document.hidden) save(); else lastTick = performance.now(); });
  setInterval(save, 1_000); setInterval(render, 250); applyOfflineGains(); render(); scheduleGolden(); requestAnimationFrame(tick);
})();
