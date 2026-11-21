(() => {
  "use strict";
  const { byId, base } = MaloAvatarCatalogue;
  const artURL = new URL("assets/avatar/", document.currentScript.src);
  const faces = "🎃 🐙 🐨 🐮 🐯 🐰 🐲 🐵 🐶 🐷 🐸 🐻 🐼 👨‍🍳 👹 👺 👻 👽 👾 👿 💀 😀 😁 😂 😃 😄 😅 😆 😇 😈 😉 😊 😋 😌 😍 😎 😏 😐 😑 😒 😓 😔 😕 😖 😗 😘 😙 😚 😛 😜 😝 😞 😟 😠 😡 😢 😣 😤 😥 😦 😧 😨 😩 😪 😫 😬 😭 😮 😯 😰 😱 😲 😳 😴 😵 😶 😷 😸 😹 😺 😻 😼 😽 😾 😿 🙀 🙁 🙂 🙃 🙄 🤐 🤑 🤒 🤓 🤔 🤕 🤖 🤗 🤠 🤡 🤢 🤣 🤤 🤥 🤧 🤨 🤩 🤪 🤫 🤭 🤮 🤯 🥰 🥱 🥲 🥳 🥴 🥵 🥶 🥷 🥸 🥹 🥺 🦁 🦄 🦊 🦸 🧐 🧙 🪩 🫠 🫡 🫢 🫣 🫤 🫥 ☺".split(" ");
  let serial = 0;
  const escape = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const path = (d, fill, extra = "") => `<path d="${d}" fill="${fill}" ${extra}/>`;
  const line = (d, color, width = 2) => path(d,"none",`stroke="${color}" stroke-width="${width}"`);
  function tint(hex, target, amount) {
    const rgb = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));
    return "rgb(" + rgb.map((value,i) => Math.round(value + (target[i]-value)*amount)).join(",") + ")";
  }
  function head(face, small = false) {
    const index = faces.indexOf(face.replaceAll("\uFE0F",""));
    if (index < 0) return `<svg viewBox="0 0 100 100" aria-hidden="true"><text x="50" y="79" text-anchor="middle" font-size="84" stroke="none">${escape(face)}</text></svg>`;
    const tile = small ? 64 : 256, columns = 12;
    const file = small ? "visages-mini.webp" : "visages.webp";
    const pattern = "mavface" + ++serial;
    const frame = [index % columns * tile, Math.floor(index / columns) * tile, tile, tile].join(" ");
    return `<svg data-face="${escape(face)}" viewBox="0 0 100 100" aria-hidden="true"><defs><pattern id="${pattern}" width="1" height="1" viewBox="${frame}"><image href="${artURL + file}" width="${columns * tile}" height="${Math.ceil(faces.length / columns) * tile}"/></pattern></defs><rect width="100" height="100" stroke="none" fill="url(#${pattern})"/></svg>`;
  }
  function draw(profile, outfit, only, small = false) {
    const uid = "mav" + ++serial;
    const pieces = {};
    for (const [slot,id] of Object.entries({...base,...outfit})) pieces[slot] = byId.get(id);
    if (only) pieces[only.slot] = only;
    let defs = "";
    function fabric(slot) {
      const id = uid + slot;
      const color = pieces[slot].color;
      defs += `<radialGradient id="${id}" cx="36%" cy="23%" r="86%"><stop stop-color="${tint(color,[248,250,255],.45)}"/><stop offset=".46" stop-color="${color}"/><stop offset=".86" stop-color="${tint(color,[7,12,38],.46)}"/><stop offset="1" stop-color="${tint(color,[11,17,40],.72)}"/></radialGradient>`;
      return "url(#" + id + ")";
    }
    const skin = "#" + uid + "skin";
    defs += `<radialGradient id="${uid}skin" cx=".35" cy=".25" r=".8"><stop stop-color="#fff289"/><stop offset=".6" stop-color="#ffca32"/><stop offset="1" stop-color="#ec8822"/></radialGradient>`;
    const gold = "url(" + skin + ")";
    const art = {};
    art.skin = path("M78 220 Q87 215 96 224 L94 261 Q89 271 78 263 Z M106 223 Q119 216 125 222 L126 260 Q121 269 109 263 Z",gold);
    const bottom = pieces.bottom, short = ["short","sport"].includes(bottom.shape), denim = fabric("bottom");
    art.bottom = path(short ? "M69 187 Q100 195 129 187 L135 226 Q123 233 105 228 L100 209 L97 229 Q81 234 65 226 Z" : "M69 186 Q100 196 129 186 L131 219 L128 257 Q118 263 103 256 L100 216 L97 257 Q84 263 70 256 L68 228 Z",denim)
      + line("M74 200 Q81 202 84 196 M116 196 Q121 202 128 200 M99 196 L99 205","#d4e7fb",1.8)
      + line(short ? "M67 223 Q79 228 95 224 M106 224 Q120 228 132 223" : "M72 251 Q84 255 96 251 M105 251 Q118 255 127 251","#adc8da",2)
      + (bottom.shape === "sport" ? path("M74 197 L80 197 74 211 79 210 70 221 73 211 69 211Z","#fff477") : "");
    art.bottom += line(short ? "M70 206 l-2 16 M128 205 l2 16" : "M73 207 l1 36 M125 207 l-1 36", "#ffffff35",1.3);
    if (!short) art.bottom += path("M70 216 L83 218 84 228 77 232 68 229Z",denim) + line("M70 219 L82 221","#b4c3d3",1.1)
      + path("M118 217 L130 215 131 228 125 232 117 229Z",denim) + line("M119 221 L129 219","#b4c3d3",1.1);
    const shoe = fabric("shoes");
    const sneaker = path("M72 251 Q81 247 92 251 Q98 253 97 263 L98 271 Q97 279 85 280 L60 279 Q52 278 53 273 Q53 265 65 261 Z",shoe)
      + path("M74 252 Q82 249 91 252 L89 257 Q80 258 71 256Z","#293557")
      + path("M56 268 Q67 260 78 267 L81 274 Q64 277 54 273Z","#f3f7ff")
      + path("M54 272 Q73 277 97 269 L97 275 Q83 283 56 277 Q52 275 54 272Z","#d3deef")
      + line("M71 259 Q78 258 84 260 M67 263 Q75 262 81 264","#fff",2.7)
      + line("M85 267 l7-4","#c1e0ff",2);
    art.shoes = sneaker + `<g transform="translate(200) scale(-1 1)">${sneaker}</g>`;
    const top = pieces.top, cloth = fabric("top"), sleeves = ["hoodie","storm","flame","jacket","racing"].includes(top.shape);
    const arm = path("M59 156 Q66 155 69 162 C69 168 66 174 65 179 Q68 183 64 187 Q62 192 58 192 C47 195 42 185 47 176Z",gold)
      + line("M61 179 Q57 182 58 186","#dc8b27",1.5);
    art.hands = arm + `<g transform="translate(200 1) scale(-1 1)">${arm}</g>`;
    art.top = path(sleeves ? "M82 131 C69 131 60 136 55 147 Q52 154 51 161 Q46 165 44 173 Q45 181 62 183 L70 171 Q69 179 66 185 Q65 191 69 196 C84 203 119 203 131 195 Q135 191 132 181 L130 171 L137 183 Q149 184 156 175 Q157 169 151 162 Q148 145 139 137 Q132 132 117 131 Z" : "M82 131 Q64 132 58 142 Q55 150 48 158 Q53 165 66 170 L73 159 Q74 175 68 188 Q66 193 70 196 C88 202 114 201 131 195 Q135 191 131 183 L127 159 L134 169 Q148 166 152 157 L142 141 Q134 132 118 131 Z",cloth)
      + path("M73 165 Q84 187 102 187 Q82 185 70 180Z","rgba(14,31,62,.17)",'stroke="none"')
      + path("M130 172 Q121 183 108 188 Q124 187 132 181Z","rgba(13,28,59,.2)",'stroke="none"')
      + line("M70 192 Q100 201 130 191","rgba(238,249,255,.48)",1.5)
      + path("M80 133 Q99 148 120 132 L116 129 Q99 138 84 129Z","#182842");
    art.top += line("M62 146 Q67 139 75 138 M136 145 Q131 139 125 138","rgba(255,255,255,.45)",2)
      + line("M71 163 Q77 171 74 182 M129 163 Q124 175 126 184","rgba(9,18,52,.32)",2);
    if (sleeves) art.top += path("M46 172 Q54 178 66 178 L63 184 Q53 184 44 177Z",cloth)
      + path("M134 178 Q146 177 153 170 L156 176 Q148 184 137 185Z",cloth);
    if (["hoodie","storm","flame"].includes(top.shape)) art.top += path("M71 136 Q69 128 82 125 Q99 130 118 125 Q130 126 131 135 Q119 144 103 148 L98 145 Q81 145 71 136Z",cloth)
      + line("M78 132 Q88 140 99 142 M124 132 Q114 139 105 141","#d3efff",1.3)
      + line("M90 143 C90 149 87 154 88 159 M111 143 Q113 151 112 157","#fff",2.4)
      + path("M83 175 Q100 179 117 174 Q117 179 124 185 Q102 194 77 186 Q83 182 83 175Z",cloth)
      + line("M85 177 Q84 183 80 185 M115 177 L121 184","#c2d9f4",1);
    if (["jacket","racing"].includes(top.shape)) art.top += line("M100 141 L100 195","#c5d9f3",3) + line("M77 174 L86 179 M123 174 L114 179","#effaff",2.5);
    if (top.shape === "racing") art.top += path("M73 144 L86 139 81 190 72 189Z","#fff2df") + path("M109 148 h6 v5 h-6z m6 5 h6 v5 h-6z","#fff");
    if (top.shape === "storm") art.top += path("M105 149 L89 167 99 165 92 180 112 159 101 161Z","#a0fdff");
    if (top.shape === "flame") art.top += path("M93 180 Q83 173 93 161 Q91 169 97 166 Q104 158 100 152 Q117 164 111 178 Q105 186 98 181 Q107 178 104 170 Q100 172 97 178Z","#ff9941");
    if (top.shape === "gamer") art.top += path("M84 163 Q85 157 91 157 L109 157 Q116 156 118 164 L120 172 Q119 178 114 174 L108 169 H92 L86 175 Q79 178 81 170Z","#effbff") + line("M88 163 h7 m-3.5 -3.5 v7","#466df6",2.3) + '<circle cx="110" cy="163" r="2" fill="#ed5d93"/>';
    if (pieces.bag) art.bag = line("M122 138 L79 188","#21354a",8) + path("M77 169 Q87 166 98 177 L91 192 Q79 196 69 184Z",fabric("bag")) + line("M75 177 L89 183","#c9ffff",2);
    const face = pieces.face?.id || profile.emoji || "😀";
    if (!pieces.face && profile.image) {
      defs += `<clipPath id="${uid}photo"><circle cx="100" cy="86" r="49"/></clipPath>`;
      art.face = `<image href="${escape(profile.image)}" x="51" y="37" width="98" height="98" preserveAspectRatio="xMidYMid slice" clip-path="url(#${uid}photo)"/>`;
    } else art.face = `<svg x="38" y="21" width="124" height="124" viewBox="0 0 100 100">${head(face,small)}</svg>`;
    if (pieces.glasses) art.glasses = path("M54 76 Q77 70 94 77 Q100 81 106 77 Q126 70 146 76 L141 93 Q135 102 117 97 L106 84 Q100 81 94 85 L86 96 Q71 104 59 94 Z",fabric("glasses")) + line("M65 82 L81 79 M116 81 L132 78","#ffcfed",2);
    if (pieces.hat) {
      const paint = fabric("hat");
      const shapes = {
        cap: path("M53 57 Q53 18 89 15 Q124 10 139 44 L139 55 Q101 44 66 64 Z",paint) + path("M68 55 Q100 35 147 45 Q162 48 150 55 Q122 52 88 62Z",paint) + line("M65 48 Q69 28 87 22","#c0ffff"),
        crown: path("M54 33 L77 47 82 18 99 40 119 15 124 43 148 27 138 62 Q96 53 63 65Z",paint) + path("M96 43 l6 -6 6 6 -6 8Z","#ef557c"),
        bucket: path("M64 47 L72 21 Q96 12 125 21 L138 47 151 62 Q104 53 49 68Z",paint) + line("M63 49 Q98 38 138 48","#e8ddff",4)
      };
      art.hat = shapes[pieces.hat.shape];
    }
    const boxes = {face:"42 25 116 116",top:"40 121 120 86",bottom:short?"56 180 90 59":"56 180 90 86",shoes:"50 244 100 42",hat:"42 9 116 68",glasses:"47 59 107 55",bag:"62 133 70 68"};
    const layers = only ? [only.slot] : ["skin","bottom","shoes","hands","top","bag","face","glasses","hat"];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" aria-hidden="true" viewBox="${only ? boxes[only.slot] : pieces.hat ? "20 7 160 277" : "20 24 160 260"}"><defs>${defs}</defs><g stroke="#172141" stroke-width="1.65" stroke-linejoin="round" stroke-linecap="round">${layers.map(layer => `<g data-part="${layer}">${art[layer] || ""}</g>`).join("")}</g></svg>`;
  }
  draw.head = head;
  window.MaloAvatarDessin = draw;
})();
