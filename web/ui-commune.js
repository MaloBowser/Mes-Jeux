(() => {
  "use strict";

  const PROFILES_KEY = "malo.profiles.v1";
  const ACTIVE_KEY = "malo.activeProfile";
  const LEGACY_KEY = "malo.legacyMigrated";
  const SESSION_KEY = "malo.profileChosenSession";
  const INTRO_KEY = "malo.introSeen.v6";
  const PROFILE_DATA_PREFIX = "malo.profileData.";
  const LEGACY_CLAIM_KEY = "malo.legacySavesClaimed";
  const HOME_URL = document.currentScript ? new URL("../index.html", document.currentScript.src).href : "../index.html";
  const EMOJIS = ["😀", "😎", "🤩", "🥳", "🦊", "🐼", "🐸", "🦁", "🐯", "🐙", "🦄", "🐲", "👾", "🤖", "🧙", "🦸", "🥷", "👨‍🍳"];
  const rawStorage = {
    get: Storage.prototype.getItem,
    set: Storage.prototype.setItem,
    remove: Storage.prototype.removeItem,
    clear: Storage.prototype.clear,
    key: Storage.prototype.key
  };
  const rawGet = (key) => rawStorage.get.call(localStorage, key);
  const rawSet = (key, value) => rawStorage.set.call(localStorage, key, value);
  const rawRemove = (key) => rawStorage.remove.call(localStorage, key);
  const getProfiles = () => {
    try { return JSON.parse(rawGet(PROFILES_KEY) || "[]"); }
    catch { return []; }
  };
  const saveProfiles = (profiles) => rawSet(PROFILES_KEY, JSON.stringify(profiles));
  const activeId = () => rawGet(ACTIVE_KEY) || "";
  const activeProfile = () => getProfiles().find((profile) => profile.id === activeId()) || null;
  const PAGE_PROFILE_ID = activeId();
  const profilePrefix = () => PAGE_PROFILE_ID ? `${PROFILE_DATA_PREFIX}${PAGE_PROFILE_ID}.` : "";
  const isHomePage = () => /(?:^|\/)index\.html$/i.test(location.pathname) || location.pathname.endsWith("/");
  const isSharedKey = (key) => {
    const value = String(key);
    return [PROFILES_KEY, ACTIVE_KEY, LEGACY_KEY, SESSION_KEY, LEGACY_CLAIM_KEY, "malo.nomUtilisateur"].includes(value)
      || value.startsWith(PROFILE_DATA_PREFIX);
  };

  function installProfileStorage() {
    Storage.prototype.getItem = function (key) {
      if (this !== localStorage || isSharedKey(key) || !profilePrefix()) return rawStorage.get.call(this, key);
      return rawStorage.get.call(this, profilePrefix() + key);
    };
    Storage.prototype.setItem = function (key, value) {
      const target = this === localStorage && !isSharedKey(key) && profilePrefix() ? profilePrefix() + key : key;
      return rawStorage.set.call(this, target, value);
    };
    Storage.prototype.removeItem = function (key) {
      const target = this === localStorage && !isSharedKey(key) && profilePrefix() ? profilePrefix() + key : key;
      return rawStorage.remove.call(this, target);
    };
    Storage.prototype.clear = function () {
      if (this !== localStorage || !profilePrefix()) return rawStorage.clear.call(this);
      const prefix = profilePrefix();
      const keys = [];
      for (let index = 0; index < this.length; index++) {
        const key = rawStorage.key.call(this, index);
        if (key?.startsWith(prefix)) keys.push(key);
      }
      keys.forEach((key) => rawStorage.remove.call(this, key));
    };
  }

  function migrateLegacySaves(profileId) {
    if (rawGet(LEGACY_KEY)) return;
    const keys = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = rawStorage.key.call(localStorage, index);
      if (key && !isSharedKey(key)) keys.push(key);
    }
    keys.forEach((key) => rawSet(`${PROFILE_DATA_PREFIX}${profileId}.${key}`, rawGet(key)));
    rawSet(LEGACY_KEY, profileId);
  }

  installProfileStorage();

  function claimExistingUnscopedSaves() {
    const profileId = activeId();
    if (!profileId || rawGet(LEGACY_CLAIM_KEY)) return;
    const keys = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = rawStorage.key.call(localStorage, index);
      if (key && !isSharedKey(key)) keys.push(key);
    }
    keys.forEach((key) => {
      const target = `${PROFILE_DATA_PREFIX}${profileId}.${key}`;
      if (rawGet(target) === null) rawSet(target, rawGet(key));
    });
    rawSet(LEGACY_CLAIM_KEY, profileId);
  }

  claimExistingUnscopedSaves();

  const getName = () => activeProfile()?.name || "Joueur";
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
  const avatarHtml = (profile) => profile?.image
    ? `<img src="${escapeHtml(profile.image)}" alt="">`
    : `<span class="malo-avatar-emoji">${escapeHtml(profile?.emoji || "👤")}</span>`;

  function showToast(message) {
    let toast = document.querySelector(".malo-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "malo-toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2800);
  }

  function prefillPlayerName() {
    document.querySelectorAll(".malo-profile-field").forEach((field) => field.classList.remove("malo-profile-field"));
    const nameFields = Array.from(document.querySelectorAll("input[type='text'], input:not([type])")).filter((field) => {
      if (/\/histoire_folle\.html$/i.test(location.pathname) && field.id === "prenom") return false;
      const identifier = `${field.id} ${field.name}`.trim().toLowerCase();
      const hint = `${field.placeholder} ${field.getAttribute("aria-label") || ""}`.trim().toLowerCase();
      return /(?:^|\s)(?:name|nom|joueur|player)\d*(?:\s|$)/.test(identifier)
        || /(?:prénom|nom) du joueur\s+\d+/i.test(hint)
        || /^(?:👤\s*)?(?:ton\s+)?(?:prénom|nom)(?:\s+\d+)?$/i.test(hint);
    });
    const firstPlayer = nameFields[0];
    if (firstPlayer && !firstPlayer.value.trim()) {
      firstPlayer.value = getName();
      firstPlayer.dispatchEvent(new Event("input", { bubbles: true }));
    }
    document.querySelectorAll("input[id*='pseudo' i], input[name*='pseudo' i]").forEach((field) => {
      if (!field.value.trim()) {
        field.value = getName();
        field.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  }

  function renderAccount() {
    document.querySelector(".malo-account")?.remove();
    const profile = activeProfile();
    if (!profile) return;
    const account = document.createElement("button");
    account.type = "button";
    account.className = "malo-account";
    account.title = `Profil de ${profile.name}`;
    account.setAttribute("aria-label", `Changer de profil. Profil actuel : ${profile.name}`);
    account.innerHTML = avatarHtml(profile);
    account.addEventListener("click", () => showProfileChooser(true));
    document.body.appendChild(account);
  }

  function showWelcome(profile, done) {
    document.querySelector(".malo-overlay")?.remove();
    const welcome = document.createElement("div");
    welcome.className = "malo-welcome";
    welcome.innerHTML = `<div class="malo-welcome-content"><div class="malo-welcome-avatar">${avatarHtml(profile)}</div><p>Bienvenue</p><h2>${escapeHtml(profile.name)}</h2></div>`;
    document.body.appendChild(welcome);
    requestAnimationFrame(() => welcome.classList.add("is-visible"));
    setTimeout(() => {
      welcome.classList.add("is-leaving");
      setTimeout(() => { welcome.remove(); done(); }, 420);
    }, 1450);
  }

  function selectProfile(profileId) {
    const changed = activeId() !== profileId;
    rawSet(ACTIVE_KEY, profileId);
    sessionStorage.setItem(SESSION_KEY, "1");
    const profile = activeProfile();
    showWelcome(profile, () => {
      if (changed) location.href = HOME_URL;
      else {
        renderAccount();
        prefillPlayerName();
      }
    });
  }

  function showProfileChooser(canClose = false) {
    document.querySelector(".malo-overlay")?.remove();
    const profiles = getProfiles();
    const overlay = document.createElement("div");
    overlay.className = "malo-overlay malo-profile-selector";
    overlay.innerHTML = `<section class="malo-dialog malo-dialog-wide" role="dialog" aria-modal="true" aria-labelledby="profileTitle">
      <div class="malo-profile-brand">🎮 LES JEUX DE MALO</div>
      <div class="malo-dialog-head"><div><h2 id="profileTitle">Qui joue aujourd’hui ?</h2><p>Choisis ton profil pour retrouver ton nom et tes sauvegardes personnelles.</p></div>${canClose && activeProfile() ? '<button type="button" data-close aria-label="Fermer">✕</button>' : ''}</div>
      <div class="malo-profile-grid"></div>
      <div class="malo-actions"><button class="malo-primary" type="button" data-add>＋ Ajouter un profil</button></div>
    </section>`;
    const grid = overlay.querySelector(".malo-profile-grid");
    profiles.forEach((profile) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `malo-profile-card${profile.id === activeId() ? " is-active" : ""}`;
      card.innerHTML = `<span class="malo-profile-avatar">${avatarHtml(profile)}</span><span class="malo-profile-name">${escapeHtml(profile.name)}</span>`;
      card.addEventListener("click", () => selectProfile(profile.id));
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "malo-profile-edit";
      edit.setAttribute("aria-label", `Modifier ${profile.name}`);
      edit.textContent = "✎";
      edit.addEventListener("click", (event) => { event.stopPropagation(); showProfileEditor(profile); });
      const wrap = document.createElement("div");
      wrap.style.position = "relative";
      wrap.append(card, edit);
      grid.appendChild(wrap);
    });
    if (!profiles.length) grid.innerHTML = "<p>Aucun profil pour le moment. Crée le premier !</p>";
    overlay.querySelector("[data-add]").addEventListener("click", () => showProfileEditor());
    overlay.querySelector("[data-close]")?.addEventListener("click", () => overlay.remove());
    document.body.appendChild(overlay);
  }

  function showProfileEditor(existing = null) {
    document.querySelector(".malo-overlay")?.remove();
    let chosenEmoji = existing?.emoji || EMOJIS[0];
    let chosenImage = existing?.image || "";
    const overlay = document.createElement("div");
    overlay.className = "malo-overlay";
    overlay.innerHTML = `<form class="malo-dialog" role="dialog" aria-modal="true">
      <h2>${existing ? "Modifier le profil" : "Nouveau profil"}</h2>
      <div class="malo-profile-avatar malo-avatar-preview"></div>
      <label>Nom du profil<input name="username" maxlength="24" autocomplete="nickname" placeholder="Ton nom" required value="${escapeHtml(existing?.name || rawGet("malo.nomUtilisateur") || "")}"></label>
      <label>Choisis un emoji</label><div class="malo-emoji-grid"></div>
      <label class="malo-file-label">Ou choisis une image<input name="avatarFile" type="file" accept="image/png,image/jpeg,image/webp">📷 Choisir une image</label>
      <div class="malo-actions">${existing ? '<button class="malo-danger" type="button" data-delete>Supprimer</button>' : ''}<button type="button" data-back>Retour</button><button class="malo-primary" type="submit">Enregistrer</button></div>
    </form>`;
    const preview = overlay.querySelector(".malo-avatar-preview");
    const renderPreview = () => { preview.innerHTML = chosenImage ? `<img src="${escapeHtml(chosenImage)}" alt="Aperçu">` : `<span>${chosenEmoji}</span>`; };
    const emojiGrid = overlay.querySelector(".malo-emoji-grid");
    EMOJIS.forEach((emoji) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `malo-emoji-choice${!chosenImage && emoji === chosenEmoji ? " is-selected" : ""}`;
      button.textContent = emoji;
      button.addEventListener("click", () => {
        chosenEmoji = emoji; chosenImage = "";
        emojiGrid.querySelectorAll("button").forEach((item) => item.classList.toggle("is-selected", item === button));
        renderPreview();
      });
      emojiGrid.appendChild(button);
    });
    overlay.querySelector("[name='avatarFile']").addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 500000) { event.target.value = ""; return showToast("Choisis une image de moins de 500 Ko."); }
      const reader = new FileReader();
      reader.onload = () => { chosenImage = reader.result; emojiGrid.querySelectorAll("button").forEach((item) => item.classList.remove("is-selected")); renderPreview(); };
      reader.readAsDataURL(file);
    });
    overlay.querySelector("[data-back]").addEventListener("click", () => showProfileChooser(Boolean(activeProfile())));
    overlay.querySelector("[data-delete]")?.addEventListener("click", () => {
      if (!confirm(`Supprimer le profil ${existing.name} et ses sauvegardes ?`)) return;
      const profiles = getProfiles().filter((profile) => profile.id !== existing.id);
      saveProfiles(profiles);
      const prefix = `${PROFILE_DATA_PREFIX}${existing.id}.`;
      const keys = [];
      for (let index = 0; index < localStorage.length; index++) {
        const key = rawStorage.key.call(localStorage, index);
        if (key?.startsWith(prefix)) keys.push(key);
      }
      keys.forEach(rawRemove);
      if (activeId() === existing.id) rawRemove(ACTIVE_KEY);
      showProfileChooser(false);
    });
    overlay.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      const name = new FormData(event.currentTarget).get("username").trim().replace(/\s+/g, " ");
      if (!name) return;
      const profiles = getProfiles();
      const profile = { id: existing?.id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`, name, emoji: chosenEmoji, image: chosenImage };
      const index = profiles.findIndex((item) => item.id === profile.id);
      if (index >= 0) profiles[index] = profile; else profiles.push(profile);
      saveProfiles(profiles);
      if (!existing) migrateLegacySaves(profile.id);
      selectProfile(profile.id);
    });
    document.body.appendChild(overlay);
    renderPreview();
    overlay.querySelector("[name='username']").focus();
  }

  function showReportDialog() {
    const overlay = document.createElement("div");
    overlay.className = "malo-overlay";
    overlay.innerHTML = `<section class="malo-dialog"><h2>Signaler un problème</h2><p>Le formulaire anonyme est prêt, mais il doit encore être relié à une destination privée pour que Malo reçoive les messages sans demander de compte aux visiteurs.</p><div class="malo-actions"><button class="malo-primary" type="button" data-close>Compris</button></div></section>`;
    overlay.querySelector("[data-close]").addEventListener("click", () => overlay.remove());
    document.body.appendChild(overlay);
  }

  function playIntroSound() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    const context = new Audio();
    const hit = (time, startFrequency, endFrequency, volume) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(startFrequency, time);
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, time + .42);
      gain.gain.setValueAtTime(.001, time);
      gain.gain.exponentialRampToValueAtTime(volume, time + .018);
      gain.gain.exponentialRampToValueAtTime(.001, time + .5);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(time);
      oscillator.stop(time + .52);
    };
    const now = context.currentTime;
    hit(now, 118, 46, .34);
    hit(now + .34, 210, 72, .25);
    setTimeout(() => context.close(), 1200);
  }

  function setGameFavicon() {
    if (isHomePage()) return;
    const label = `${document.querySelector("h1")?.textContent || ""} ${document.title}`;
    const visibleEmoji = label.match(/\p{Extended_Pictographic}/u)?.[0];
    const choices = [
      [/menteur|bluff|agent/i, "🕵️"], [/mémoire|memoire/i, "🧠"], [/code secret|mastermind/i, "🔐"],
      [/pendu/i, "🎮"], [/taboo|tabou/i, "🚫"], [/cuisine|cuisto|muffin/i, "👨‍🍳"],
      [/ville/i, "🏙️"], [/détective|detective|cluedo/i, "🔎"], [/temps|chrono/i, "⏱️"],
      [/histoire/i, "📖"], [/cactus/i, "🌵"], [/laboratoire|potion/i, "🧪"]
    ];
    const emoji = visibleEmoji || choices.find(([pattern]) => pattern.test(label))?.[1] || "🎮";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".88em" font-size="86">${emoji}</text></svg>`;
    let icon = document.querySelector("link[rel~='icon']");
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  function showIntro(done) {
    const intro = document.createElement("div");
    intro.className = "malo-intro";
    const fibers = Array.from({ length: 48 }, (_, index) => {
      const hue = [188, 202, 226, 265, 320, 350, 12, 38][index % 8];
      const width = 1 + (index * 7) % 5;
      const delay = (index % 6) * -0.035;
      const opacity = .48 + (index % 5) * .1;
      return `<i style="--i:${index};--h:${hue};--w:${width}px;--d:${delay}s;--o:${opacity}"></i>`;
    }).join("");
    intro.innerHTML = `<div class="malo-intro-tunnel" aria-hidden="true">${fibers}</div>
      <div class="malo-intro-mark" aria-label="M">
        <svg viewBox="0 0 320 360" role="img" aria-hidden="true">
          <defs>
            <linearGradient id="maloRibbon" x1="0" x2="1"><stop stop-color="#075d91"/><stop offset=".28" stop-color="#00dff5"/><stop offset=".52" stop-color="#e4ffff"/><stop offset=".72" stop-color="#1684d7"/><stop offset="1" stop-color="#6734c7"/></linearGradient>
            <linearGradient id="maloFiberRibbon" x1="0" x2="1"><stop stop-color="#00efff"/><stop offset=".2" stop-color="#224eff"/><stop offset=".43" stop-color="#a52cff"/><stop offset=".66" stop-color="#ff286f"/><stop offset=".84" stop-color="#ffc247"/><stop offset="1" stop-color="#00efff"/></linearGradient>
          </defs>
          <path class="malo-ribbon-solid" d="M38 326V34L160 250L282 34V326"/>
          <path class="malo-ribbon-fibers" d="M38 326V34L160 250L282 34V326"/>
        </svg>
      </div>`;
    document.body.appendChild(intro);
    setTimeout(() => {
      playIntroSound();
      sessionStorage.setItem(INTRO_KEY, "1");
      intro.classList.add("is-playing");
    }, 100);
    setTimeout(() => { intro.remove(); done(); }, 4900);
  }

  function enableEnterValidation() {
    document.addEventListener("keydown", (event) => {
      const field = event.target;
      if (event.key !== "Enter" || event.shiftKey || event.isComposing || !(field instanceof HTMLInputElement)) return;
      if (["button", "submit", "reset", "checkbox", "radio", "file", "range", "color"].includes(field.type)) return;
      const form = field.closest("form");
      if (form) {
        event.preventDefault();
        form.requestSubmit();
        return;
      }
      const scope = field.closest("section, main, .panel, .panneau, .conteneur, .container") || document;
      const preferred = /valider|vérifier|verifier|répondre|repondre|proposer|confirmer|deviner|jouer|essayer|envoyer|suivant|ok/i;
      const buttons = Array.from(scope.querySelectorAll("button")).filter((button) => !button.disabled && button.offsetParent !== null);
      const button = buttons.find((candidate) => preferred.test(candidate.textContent)) || buttons[0];
      if (button) {
        event.preventDefault();
        button.click();
      }
    });
  }

  function init() {
    const isHome = isHomePage();
    setGameFavicon();
    if (!isHome && (!activeProfile() || !sessionStorage.getItem(SESSION_KEY))) {
      location.replace(HOME_URL);
      return;
    }
    if (isHome) {
      const report = document.createElement("button");
      report.type = "button";
      report.className = "malo-report-button";
      report.setAttribute("aria-label", "Signaler un bug ou un problème");
      report.textContent = "⚠️";
      report.addEventListener("click", showReportDialog);
      document.body.appendChild(report);
      if (activeProfile()) renderAccount();
    } else {
      const home = document.createElement("a");
      home.className = "malo-home-button";
      home.href = HOME_URL;
      home.setAttribute("aria-label", "Retourner à l’accueil");
      home.title = "Accueil";
      home.textContent = "🏠";
      document.body.appendChild(home);
    }

    if (isHome) {
      const showProfiles = () => {
        if (!getProfiles().length) showProfileEditor();
        else if (!sessionStorage.getItem(SESSION_KEY)) showProfileChooser(false);
        else if (!activeProfile()) showProfileChooser(false);
      };
      if (sessionStorage.getItem(INTRO_KEY)) showProfiles();
      else showIntro(showProfiles);
    } else prefillPlayerName();

    enableEnterValidation();
    new MutationObserver(prefillPlayerName).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
