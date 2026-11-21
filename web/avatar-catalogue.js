(() => {
  "use strict";
  const groups = {
    Sourires: "😀:Sourire 😃:Joyeux 😄:Radieux 😁:Grand-sourire 😆:Fou-rire 😅:Soulagement 😂:Larmes-de-joie 🤣:Mort-de-rire 🙂:Content 🙃:À-l’envers 🫠:Fondu 😉:Clin-d’œil 😊:Timide 😇:Ange 🥰:Tendresse 😍:Amoureux 🤩:Étoiles 😘:Bisou 😗:Baiser ☺️:Heureux 😚:Bisou-timide 😙:Bisou-souriant 🥲:Ému",
    Expressions: "😋:Gourmand 😛:Langue 😜:Taquin 🤪:Zinzin 😝:Farceur 🤑:Fortune 🤗:Câlin 🤭:Rire-discret 🫢:Surpris 🫣:Coucou 🤫:Silence 🤔:Pensif 🫡:Salut 🤐:Bouche-cousue 🤨:Sceptique 😐:Neutre 😑:Impassible 😶:Muet 🫥:Invisible 😏:Malicieux 😒:Blasé 🙄:Yeux-au-ciel 😬:Grimace 🤥:Menteur 😌:Paisible 😔:Songeur 😪:Somnolent 🤤:Bave 😴:Endormi",
    Émotions: "😷:Masqué 🤒:Fièvre 🤕:Bandage 🤢:Nausée 🤮:Malade 🤧:Rhume 🥵:Chaud 🥶:Froid 🥴:Étourdi 😵:Vertige 🤯:Épaté 😕:Confus 🫤:Hésitant 😟:Inquiet 🙁:Triste 😮:Étonné 😯:Stupéfait 😲:Bouche-bée 😳:Rougissant 🥺:Suppliant 🥹:Attendri 😦:Déçu 😧:Angoissé 😨:Effrayé 😰:Stressé 😥:Soulagé 😢:Larme 😭:Chagrin 😱:Terreur 😖:Contrarié 😣:Persévérant 😞:Déception 😓:Embarrassé 😩:Fatigué 😫:Épuisé 🥱:Bâillement 😤:Furieux 😡:Colère 😠:Fâché",
    Personnages: "😎:Lunettes-de-soleil 🤓:Intello 🧐:Monocle 🤠:Cowboy 🥳:Fête 🥸:Déguisé 😈:Diablotin 👿:Démon 👻:Fantôme 💀:Squelette 👽:Alien 🤖:Robot 🎃:Citrouille 🤡:Clown 🧙:Magicien 🦸:Super-héros 🥷:Ninja 👨‍🍳:Cuisinier 👾:Pixel 👹:Ogre 👺:Gobelin",
    Animaux: "😺:Chat 😸:Chat-joyeux 😹:Chat-hilare 😻:Chat-amoureux 😼:Chat-malin 😽:Chat-bisou 🙀:Chat-surpris 😿:Chat-triste 😾:Chat-fâché 🦊:Renard 🐼:Panda 🐸:Grenouille 🦁:Lion 🐯:Tigre 🐙:Poulpe 🦄:Licorne 🐲:Dragon 🐶:Chien 🐵:Singe 🐨:Koala 🐻:Ours 🐰:Lapin 🐮:Vache 🐷:Cochon"
  };
  const items = Object.entries(groups).flatMap(([group, entries]) => entries.split(" ").map(pair => {
    const [id, name] = pair.split(":");
    return { id, name: name.replaceAll("-", " "), category: "Visage", slot: "face", group };
  }));
  const categories = ["Visage", "Hauts", "Pantalons", "Shorts", "Chaussures", "Chapeaux", "Accessoires"];
  const slots = { Visage: "face", Hauts: "top", Pantalons: "bottom", Shorts: "bottom", Chaussures: "shoes", Chapeaux: "hat" };
  for (const [category, shape, label, colors] of [
    ["Hauts", "tee", "Tee-shirt", [["Cobalt","#476fff"],["Ivoire","#eee9e4"],["Onyx","#414456"]]],
    ["Pantalons","jeans","Jean",[["Indigo","#425884"],["Graphite","#495064"],["Sable","#b28c61"]]],
    ["Shorts","short","Short",[["Lagune","#308ba1"],["Prune","#9e5ca0"],["Marine","#364a70"]]],
    ["Chaussures","sneakers","Baskets",[["Glacier","#d0e8fa"],["Carmin","#cf4861"],["Azur","#387deb"]]]
  ]) {
    colors.forEach(([name,color], i) => items.push({ id: shape + i, name: label + " " + name, category, slot: slots[category], shape, color }));
  }

  // Un objectif par objet. Sans game, toutes les parties terminées comptent.
  for (const [id, name, category, shape, color, goal, game, slot] of [
    ["gamer","Tee-shirt Gamer","Hauts","gamer","#3460e9",5],
    ["cap","Casquette Volt","Chapeaux","cap","#32bec9",10],
    ["hoodie","Sweat Cobalt","Hauts","hoodie","#257bdc",15],
    ["cherry","Sweat Cerise","Hauts","hoodie","#de4852",18],
    ["pulsar","Sweat Pulsar","Hauts","hoodie","#8851cc",22],
    ["solar","Sweat Solaire","Hauts","hoodie","#e1a42f",25],
    ["storm","Sweat Orage","Hauts","storm","#226dbe",35],
    ["flame","Sweat Flamme","Hauts","flame","#37364b",45],
    ["🪩","Boule disco","Visage",null,null,20],
    ["visor","Lunettes Laser","Accessoires","visor","#ee68ac",30,null,"glasses"],
    ["bag","Sac Satellite","Accessoires","bag","#15bab8",40,null,"bag"],
    ["jacket","Veste épique Aurore","Hauts","jacket","#be478b",50],
    ["bucket","Bob Orbite","Chapeaux","bucket","#7969e6",65],
    ["short-volt","Short Éclair","Shorts","sport","#ce932e",75],
    ["crown","Couronne légendaire","Chapeaux","crown","#ffcb49",100],
    ["racing","Blouson Grand Prix","Hauts","racing","#e65354",15,"malo-kart"]
  ]) items.push({ id, name, category, slot: slot || slots[category], shape, color, goal, game, group: category === "Visage" ? "Spéciaux" : undefined });

  window.MaloAvatarCatalogue = {
    items, categories, byId: new Map(items.map(item => [item.id, item])),
    rewards: items.filter(item => item.goal),
    base: { top: "tee0", bottom: "jeans0", shoes: "sneakers0" },
    pointsPerGame: 10, gamesPerLevel: 10
  };
})();
