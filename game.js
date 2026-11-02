(() => {
  "use strict";

  const SAVE_KEY = "mission-game-save-v1";
  const MAX_HP = 20;
  const freshState = () => ({
    started: false, tutorialDone: false, gold: 0, hp: MAX_HP,
    apple: 0, steak: 0, key: 0, world: 1, enemyHp: 20, ended: false
  });

  let state = loadState();
  const $ = (id) => document.getElementById(id);
  const title = $("scene-title");
  const description = $("scene-text");
  const eyebrow = $("eyebrow");
  const actions = $("scene-actions");
  const log = $("log");
  const art = $("scene-art");

  function loadState() {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) return { ...freshState(), ...JSON.parse(saved) };
    } catch (error) {
      console.warn("Spielstand konnte nicht geladen werden.", error);
    }
    return freshState();
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
    catch (error) { addLog("Der Browser kann den Spielstand gerade nicht speichern."); }
  }

  function addLog(message) {
    const entry = document.createElement("p");
    entry.className = "log-entry";
    entry.textContent = message;
    log.prepend(entry);
  }

  function setScene(label, heading, text, buttons, emoji = "🧙") {
    eyebrow.textContent = label;
    title.textContent = heading;
    description.textContent = text;
    actions.replaceChildren();
    for (const item of buttons) {
      const button = document.createElement("button");
      button.className = "button " + (item.primary ? "primary" : "secondary");
      button.textContent = item.label;
      button.addEventListener("click", item.action);
      actions.append(button);
    }
    art.querySelector(".little-hero").textContent = emoji;
    renderStats();
  }

  function renderStats() {
    $("gold").textContent = state.gold.toLocaleString("de-DE");
    $("hp").textContent = state.hp + " / " + MAX_HP;
    $("apple-count").textContent = state.apple;
    $("steak-count").textContent = state.steak;
    $("key-count").textContent = state.key;
    $("use-apple").disabled = state.apple <= 0 || state.hp >= MAX_HP;
    $("use-steak").disabled = state.steak <= 0 || state.hp >= MAX_HP;
    document.querySelectorAll("[data-buy]").forEach(button => {
      const cost = { apple: 1, steak: 2, key: 1000 }[button.dataset.buy];
      button.disabled = state.gold < cost || (button.dataset.buy === "key" && state.key > 0);
    });
    save();
  }

  function startGame() {
    if (state.started) return showVillage();
    state.started = true;
    addLog("Tim: Hallo! Ich bin Tim. Ich helfe dir bei deiner ersten Mission.");
    setScene("DAS TUTORIAL", "Hallo, Abenteurer!", "Tim zeigt dir, wie das Spiel funktioniert. Vor dir taucht dein erster Gegner auf.", [
      { label: "Zum ersten Gegner →", primary: true, action: showFirstEnemy }
    ], "🧙");
  }

  function showFirstEnemy() {
    state.enemyHp = 20;
    setScene("DAS TUTORIAL · ERSTER KAMPF", "Ein Gegner erscheint!", "Der Gegner hat 20 HP. Du kannst ihn angreifen oder weglaufen. Ein Angriff kostet dich in diesem ersten Kampf 4 HP.", [
      { label: "⚔️ Angreifen", primary: true, action: tutorialAttack },
      { label: "🏃 Weglaufen", action: tutorialRun }
    ], "👾");
    addLog("Ein Gegner erscheint mit 20 HP.");
  }

  function tutorialAttack() {
    state.hp = Math.max(0, state.hp - 4);
    state.gold += 10;
    addLog("Du hast den Gegner besiegt, 4 HP verloren und 10 Gold erhalten.");
    addLog("Tim: Gut gemacht! Du hast 10 Gold bekommen.");
    state.tutorialDone = true;
    setScene("SIEG!", "Gegner besiegt!", "Du verlierst 4 HP und bekommst 10 Gold. Im Dorf kannst du Heilessen kaufen.", [
      { label: "Weiter ins Dorf →", primary: true, action: showVillage }
    ], "🏆");
  }

  function tutorialRun() {
    addLog("Du bist weggelaufen. Diesmal gibt es kein Gold – aber du bist sicher.");
    state.tutorialDone = true;
    setScene("RÜCKZUG", "Sicher im Dorf angekommen", "Weglaufen war die sichere Option. Du hast kein Gold bekommen, aber kannst dich jetzt im Shop ausrüsten.", [
      { label: "Weiter ins Dorf →", primary: true, action: showVillage }
    ], "🏃");
  }

  function showVillage() {
    setScene("DAS DORF", "Willkommen im Dorf!", "Hier kannst du Äpfel und Steak kaufen, deine HP auffüllen und danach neue Missionen starten.", [
      { label: "🗺️ Mission starten", primary: true, action: startMission },
      { label: "🏪 Zum Shop", action: () => { $("shop-panel").scrollIntoView({ behavior: "smooth", block: "center" }); addLog("Du bist im Shop. Wähle unten einen Gegenstand zum Kaufen."); } }
    ], "🏡");
  }

  function startMission() {
    if (state.hp <= 0) {
      state.hp = MAX_HP;
      addLog("Du hast dich im Dorf erholt und bist wieder bei voller HP.");
    }
    state.enemyHp = 20 + (state.world - 1) * 5;
    setScene("MISSION · WELT " + state.world, "Ein Monster blockiert den Weg!", "Monster-HP: " + state.enemyHp + ". Greife an, um Gold zu verdienen, oder ziehe dich zurück. Jeder Angriff kostet 4 HP.", [
      { label: "⚔️ Angreifen", primary: true, action: attackMonster },
      { label: "🏃 Weglaufen", action: showVillage },
      { label: "🎒 Apfel benutzen", action: () => useFood("apple", 2, startMission), disabled: state.apple < 1 }
    ], "👹");
    addLog("Neue Mission gestartet. Ein Monster mit " + state.enemyHp + " HP steht dir gegenüber.");
  }

  function attackMonster() {
    if (state.hp <= 0) {
      addLog("Du bist zu erschöpft. Kehre ins Dorf zurück, um dich zu erholen.");
      setScene("ERSCHÖPFT", "Du brauchst eine Pause!", "Kehre ins Dorf zurück. Dort kannst du Essen verwenden oder dich erholen.", [
        { label: "Zurück ins Dorf", primary: true, action: showVillage }
      ], "😵");
      return;
    }
    state.enemyHp -= 20;
    state.hp = Math.max(0, state.hp - 4);
    if (state.enemyHp <= 0) {
      const reward = 10 * state.world;
      state.gold += reward;
      addLog("Monster besiegt! Du erhältst " + reward + " Gold und verlierst 4 HP.");
      setScene("SIEG!", "Mission geschafft!", "Du erhältst " + reward + " Gold. Dein Gold kannst du im Shop ausgeben oder für einen Welten-Schlüssel sparen.", [
        { label: "Nächste Mission", primary: true, action: startMission },
        { label: "Ins Dorf", action: showVillage }
      ], "🏆");
    } else {
      addLog("Du hast das Monster getroffen. Es hat noch " + state.enemyHp + " HP. Du verlierst 4 HP.");
      setScene("MISSION · WELT " + state.world, "Der Kampf geht weiter!", "Monster-HP: " + state.enemyHp + ". Du hast noch " + state.hp + " HP.", [
        { label: "⚔️ Noch einmal angreifen", primary: true, action: attackMonster },
        { label: "🏃 Weglaufen", action: showVillage },
        { label: "🍎 Apfel benutzen", action: () => useFood("apple", 2, () => setScene("MISSION · WELT " + state.world, "Der Kampf geht weiter!", "Monster-HP: " + state.enemyHp + ". Du hast noch " + state.hp + " HP.", [
          { label: "⚔️ Angreifen", primary: true, action: attackMonster }, { label: "🏃 Weglaufen", action: showVillage }
        ], "👹"), state.apple > 0), disabled: state.apple < 1 }
      ], "👹");
    }
    renderStats();
  }

  function useFood(item, healing, after) {
    if (state[item] <= 0 || state.hp >= MAX_HP) {
      addLog(state[item] <= 0 ? "Du hast diesen Gegenstand nicht im Inventar." : "Deine HP sind bereits voll.");
      renderStats();
      return;
    }
    state[item]--;
    const before = state.hp;
    state.hp = Math.min(MAX_HP, state.hp + healing);
    addLog((item === "apple" ? "Apfel" : "Steak") + " benutzt: +" + (state.hp - before) + " HP.");
    renderStats();
    if (typeof after === "function") after();
  }

  function buyItem(item) {
    const costs = { apple: 1, steak: 2, key: 1000 };
    const labels = { apple: "Apfel", steak: "Steak", key: "Welten-Schlüssel" };
    const cost = costs[item];
    if (state.gold < cost) {
      addLog("Du hast nicht genug Gold für " + labels[item] + ".");
      return;
    }
    if (item === "key" && state.key > 0) {
      addLog("Du besitzt bereits einen Welten-Schlüssel.");
      return;
    }
    state.gold -= cost;
    if (item === "key") {
      state.key++;
      state.world++;
      addLog("Du hast einen Welten-Schlüssel gekauft! Welt " + state.world + " ist freigeschaltet.");
      setScene("NEUE WELT FREIGESCHALTET", "Eine neue Welt wartet!", "Du hast einen Schlüssel gekauft und bist bereit für stärkere Monster. Starte deine nächste Mission!", [
        { label: "Neue Mission starten →", primary: true, action: startMission },
        { label: "Im Dorf bleiben", action: showVillage }
      ], "🌌");
    } else {
      state[item]++;
      addLog("Du hast " + labels[item] + " für " + cost + " Gold gekauft.");
    }
    renderStats();
  }

  $("start-button").addEventListener("click", startGame);
  $("use-apple").addEventListener("click", () => useFood("apple", 2));
  $("use-steak").addEventListener("click", () => useFood("steak", 4));
  document.querySelectorAll("[data-buy]").forEach(button => button.addEventListener("click", () => buyItem(button.dataset.buy)));
  $("reset-button").addEventListener("click", () => $("confirm-reset").showModal());
  $("confirm-reset-button").addEventListener("click", (event) => {
    event.preventDefault();
    state = freshState();
    localStorage.removeItem(SAVE_KEY);
    log.replaceChildren();
    addLog("Neuer Spielstand erstellt. Viel Spaß bei deinem Abenteuer!");
    $("confirm-reset").close();
    setScene("DEIN ABENTEUER BEGINNT", "Bereit für deine erste Mission?", "Tim wartet schon auf dich. Starte das Spiel und entdecke deine Welt.", [
      { label: "Spiel starten →", primary: true, action: startGame }
    ], "🧙");
  });

  document.querySelectorAll("[data-buy]").forEach(button => button.addEventListener("click", () => {
    if (button.dataset.buy === "key") return;
  }));

  if (state.started) {
    setScene("DEIN ABENTEUER", "Willkommen zurück!", "Dein gespeicherter Spielstand wurde geladen. Du hast " + state.gold + " Gold und " + state.hp + " HP.", [
      { label: "Weiter ins Dorf →", primary: true, action: showVillage },
      { label: "Mission starten", action: startMission }
    ], "🧙");
    addLog("Spielstand geladen. Dein Fortschritt wurde beibehalten.");
  } else {
    setScene("DEIN ABENTEUER BEGINNT", "Bereit für deine erste Mission?", "Tim wartet schon auf dich. Starte das Spiel und entdecke deine Welt.", [
      { label: "Spiel starten →", primary: true, action: startGame }
    ], "🧙");
  }
  renderStats();
})();