/* Saat Chara (সাত চাড়া) — Seven Stones. A canvas game, no build step. */
(function () {
  "use strict";

  const Sound = window.SaatAudio;
  const sfx = Sound.sfx;
  const I18N = window.SaatI18n;
  const t = I18N.t;
  const num = I18N.num;
  const Counter = window.SaatCounter;
  const Net = window.SaatNet;

  // ---------------------------------------------------------------------------
  // World constants (logical units; the camera scales this to the screen)
  // ---------------------------------------------------------------------------
  const W = 1600;
  const H = 900;
  const BOUNDS = { l: 90, r: 1510, t: 168, b: 815 };
  const TOWER = { x: 800, y: 490 };
  const STONE_W = [46, 42, 38, 34, 30, 26, 22];
  const STONE_T = 7;
  const TOWER_H = STONE_W.length * STONE_T;
  const TOWER_HIT_R = 30;
  const CIRCLE_R = 84;
  const PLACE_R = 62;
  const PLACE_TIME = 0.3;
  const THROW_LINE_X = 330;
  const THROW_X = 296;
  const GRAV = 1400;
  const BALL_R = 7;
  const KID_R = 13;
  const HIT_R = 21;
  const HAND_Z = 34;
  const HOLD_LIMIT = 3;
  const WIND_ACC = 300;
  const HUMAN_THROW = { throwSpd: 900, lead: 1, errPx: 7 };
  const SNAPSHOT_EVERY = 0.05;
  const INPUT_EVERY = 0.033;

  const TEAMS = [
    { id: "tigers", color: "#f08a24", dark: "#a8560c", light: "#ffc27a", pattern: "stripes" },
    { id: "doel", color: "#2f6fc0", dark: "#1b437a", light: "#8fb8ec", pattern: "collar" },
    { id: "shapla", color: "#e0457b", dark: "#962149", light: "#f7a3c0", pattern: "dots" },
    { id: "kodom", color: "#e8c22a", dark: "#9b7d0b", light: "#fbe58c", pattern: "band" },
  ];
  const RIVAL = { tigers: "doel", doel: "tigers", shapla: "doel", kodom: "shapla" };
  const NAMES = [
    ["Rafi", "রাফি"], ["Mitu", "মিতু"], ["Shuvo", "শুভ"], ["Nila", "নীলা"], ["Apu", "অপু"],
    ["Tuni", "টুনি"], ["Joy", "জয়"], ["Rumi", "রুমি"], ["Babu", "বাবু"], ["Sumi", "সুমি"],
    ["Pavel", "পাভেল"], ["Moni", "মনি"], ["Rana", "রানা"], ["Lipi", "লিপি"],
  ];
  const SKINS = ["#8d5a3b", "#a86b45", "#c48a5e", "#7a4b2e", "#b97a50", "#9c6440"];
  const HAIRS = ["#1d1410", "#2b1b12", "#3a2416", "#140e0b"];
  const STONE_COLS = [
    { top: "#d7744f", side: "#9c4128" }, { top: "#cf6a46", side: "#923a23" },
    { top: "#dd8058", side: "#a3492e" }, { top: "#c9623f", side: "#8a3520" },
    { top: "#d47a55", side: "#9a442b" }, { top: "#c86b4c", side: "#8f3c26" },
    { top: "#e08b62", side: "#a85134" },
  ];

  const FIELDS = [
    { id: "village", swatch: "linear-gradient(#2f7533 0 40%, #6aa84d 40%)" },
    { id: "school", swatch: "linear-gradient(#a8452c 0 40%, #93a456 40%)" },
    { id: "river", swatch: "linear-gradient(#4f8fb5 0 40%, #6aa84d 40%)" },
    { id: "monsoon", swatch: "linear-gradient(#58646e 0 40%, #3f7f3a 40%)" },
    { id: "festival", swatch: "linear-gradient(90deg, #e0457b 0 25%, #e8c22a 25% 50%, #2f6fc0 50% 75%, #f08a24 75%)" },
  ];

  // Village tournament ladder; beating a stage unlocks a field for quick matches.
  const TOURNEY = [
    { key: "op.1", team: "shapla", diff: "easy", size: 3, target: 2, field: "village", unlock: "school" },
    { key: "op.2", team: "kodom", diff: "normal", size: 3, target: 2, field: "school", unlock: "river" },
    { key: "op.3", team: "doel", diff: "normal", size: 4, target: 3, field: "river", unlock: "monsoon" },
    { key: "op.4", team: "tigers", diff: "hard", size: 4, target: 3, field: "monsoon", unlock: null },
    { key: "op.5", team: "doel", diff: "hard", size: 5, target: 3, field: "festival", unlock: "festival" },
  ];

  const ACHIEVEMENTS = [
    { id: "student", icon: "🎓" },
    { id: "first_win", icon: "🏅" },
    { id: "saat_chara", icon: "🧱" },
    { id: "last_stone", icon: "⭐" },
    { id: "perfect", icon: "🎯" },
    { id: "safe_hands", icon: "🧤" },
    { id: "sniper", icon: "🔴" },
    { id: "kicker", icon: "⚽" },
    { id: "tough", icon: "💪" },
    { id: "champion", icon: "🏆" },
  ];

  // spd: run speed · react: delay before throwing · range: preferred throw range
  // errPx: throw scatter · lead: how well throws lead a runner · dodge: chance to sidestep
  // aimErr/power: tower throw spread · sweet/meter: the player's power meter · wind: max wind
  const DIFF = {
    easy: { spd: 0.84, react: 0.8, range: 320, errPx: 30, lead: 0.45, dodge: 0.25, throwSpd: 700, aimErr: 0.15, power: 0.16, sweet: [0.47, 0.77], meter: 1.0, wind: 0.35, aimHelp: true },
    normal: { spd: 0.95, react: 0.5, range: 400, errPx: 17, lead: 0.8, dodge: 0.45, throwSpd: 820, aimErr: 0.085, power: 0.1, sweet: [0.52, 0.72], meter: 1.25, wind: 0.75, aimHelp: false },
    hard: { spd: 1.04, react: 0.3, range: 480, errPx: 9, lead: 1.0, dodge: 0.7, throwSpd: 920, aimErr: 0.05, power: 0.06, sweet: [0.56, 0.68], meter: 1.5, wind: 1.0, aimHelp: false },
  };
  const MATE = { spd: 0.98, react: 0.45, range: 410, errPx: 16, lead: 0.85, dodge: 0.55, throwSpd: 840, aimErr: 0.075, power: 0.09 };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const r1 = (v) => Math.round(v * 10) / 10;
  const r2 = (v) => Math.round(v * 100) / 100;
  // The chalk circle is drawn squashed for perspective, so measure it the same way.
  const RING_Y = 0.72;
  const ringDist = (p) => Math.hypot(p.x - TOWER.x, (p.y - TOWER.y) / RING_Y);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.5;
  const teamOf = (i) => G.teams[i];
  const teamLabel = (i) => (G.teams[i].label ? t(G.teams[i].label) : t(`team.${G.teams[i].id}.short`));
  const kidName = (k) => k.names[I18N.lang === "bn" ? 1 : 0];
  const kidIdx = (k) => (k ? G.kids.indexOf(k) : -1);

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------------------
  // Settings and progress (persisted per browser)
  // ---------------------------------------------------------------------------
  const STORE_KEY = "saatchara.v1";
  const PREF_DEFAULTS = {
    lang: (navigator.language || "").toLowerCase().startsWith("bn") ? "bn" : "en",
    sound: true, music: true, voice: true, shake: true, camera: "auto", zoom: 1,
  };
  const PROGRESS_DEFAULTS = () => ({
    team: "tigers", difficulty: "normal", teamSize: 3, target: 3, field: "village",
    rules: { order: true, catchOut: true, holdLimit: true, time: 45 },
    online: { mode: "versus", teamSize: 3, target: 3, difficulty: "normal" },
    wins: 0, losses: 0, tutorialDone: false,
    tourney: { stage: 0, champion: false },
    unlocked: ["village"], ach: {}, totals: { hits: 0, kicks: 0 },
  });

  const settings = loadSettings();

  function loadSettings() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { saved = {}; }
    const s = Object.assign({}, PREF_DEFAULTS, PROGRESS_DEFAULTS(), saved);
    s.rules = Object.assign(PROGRESS_DEFAULTS().rules, saved.rules || {});
    s.online = Object.assign(PROGRESS_DEFAULTS().online, saved.online || {});
    s.tourney = Object.assign(PROGRESS_DEFAULTS().tourney, saved.tourney || {});
    s.totals = Object.assign(PROGRESS_DEFAULTS().totals, saved.totals || {});
    s.ach = Object.assign({}, saved.ach || {});
    if (!Array.isArray(s.unlocked) || !s.unlocked.includes("village")) s.unlocked = ["village"];
    // Players from the first version already know the game.
    if (saved.wins || saved.losses) s.tutorialDone = true;
    return s;
  }
  function saveSettings() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (e) { /* storage unavailable */ }
  }

  // ---------------------------------------------------------------------------
  // Game state
  // ---------------------------------------------------------------------------
  const G = {
    mode: "attract",          // attract | play
    ctx: "quick",             // quick | tourney | tutorial | online
    net: null,                // null | host | guest
    online: null,             // { mode: versus | coop }
    stage: 0,
    phase: "intro",           // intro | throw | rebuild | roundEnd | matchEnd
    phaseT: 0,
    time: 0,
    paused: false,
    teams: [TEAMS[0], TEAMS[1]],
    diff: "normal",
    field: "village",
    rules: PROGRESS_DEFAULTS().rules,
    ctls: [],                 // human controllers in this match
    localCtl: null,           // the controller for this device
    human: null,              // the kid this device controls (localCtl.kid)
    humanTeam: -1,
    kids: [],
    stones: [],
    ball: null,
    particles: [],
    floaters: [],
    scores: [0, 0],
    target: 3,
    attacking: 0,
    round: 0,
    throwOrder: [],
    throwIdx: 0,
    throwState: "aim",        // aim | flying | wait
    throwPos: { x: THROW_X, y: TOWER.y },
    snapThrower: -1,
    waitT: 0,
    flyT: 0,
    aiAimT: 0,
    sweet: DIFF.normal.sweet,
    meter: 1.25,
    aimHelp: false,
    wind: 0,
    perfectBy: null,
    rebuildT: 45,
    placed: 0,
    towerUp: true,
    shake: 0,
    slowmo: 0,
    lastWinner: -1,
    stats: null,
    newAch: [],
    tut: null,
    snap: null,               // guest: latest host snapshot
    snapAt: 0,
  };

  function newStats() {
    return { placed: 0, hits: 0, knocks: 0, kicks: 0, catches: 0 };
  }

  function makeCtl(id, team, local) {
    return {
      id, team, local, kid: null,
      charge: { active: false, p: 0, dir: 1 },
      aimAngle: 0, lockTarget: null, switchFlash: 0,
      stats: newStats(),
      net: null,              // host: latest movement report from the friend's device
    };
  }

  const ctlById = (id) => G.ctls.find((c) => c.id === id) || null;
  const teamHasCtl = (tm) => G.ctls.some((c) => c.team === tm);
  const localTeam = () => (G.localCtl ? G.localCtl.team : -1);

  function makeStones() {
    G.stones = STONE_W.map((w, i) => {
      const r = mulberry32(i * 977 + 13);
      const spots = [];
      for (let j = 0; j < 3; j++) spots.push({ a: r() * Math.PI * 2, d: r() * 0.7, s: 1 + r() * 1.6 });
      return { i, w, col: STONE_COLS[i], spots, x: TOWER.x, y: TOWER.y, z: 0, vx: 0, vy: 0, vz: 0, placed: true, staged: false, carriedBy: null };
    });
  }

  function makeBall() {
    G.ball = {
      x: TOWER.x, y: TOWER.y, z: 0, vx: 0, vy: 0, vz: 0,
      holder: null, live: false, thrower: null, throwTeam: -1, bounced: 0, fromThrow: false,
      ignore: null, ignoreT: 0, kickCD: 0, throwId: 0, passTo: null, spin: 0, targetKid: null,
    };
  }

  function makeKid(team, idx, names, look) {
    const l = look || { skin: pick(SKINS), hair: pick(HAIRS), hairStyle: (Math.random() * 3) | 0 };
    return {
      team, idx, names, isHuman: false, ctl: null,
      x: 0, y: 0, vx: 0, vy: 0, fx: 1, fy: 0, anim: Math.random() * 6,
      alive: true, bench: null, carrying: null, hasBall: false,
      placeT: 0, dashT: 0, dashCD: 0, holdT: 0, hitFlash: 0, cheer: 0, throwAnim: 0,
      skin: l.skin, hair: l.hair, hairStyle: l.hairStyle,
      home: { x: 0, y: 0 },
      ai: { stone: null, dodgeId: -1, willDodge: false, dodgeT: 0, dodgeDelay: 0, receiving: false, react: 0.5, wobble: Math.random() * 6.28, brave: rand(0.3, 1) },
    };
  }

  function buildKids(size) {
    const names = shuffle(NAMES.slice());
    G.kids = [];
    for (let tm = 0; tm < 2; tm++) {
      for (let i = 0; i < size; i++) G.kids.push(makeKid(tm, i, names.pop()));
    }
  }

  const teamKids = (tm) => G.kids.filter((k) => k.team === tm);
  const aliveOf = (tm) => G.kids.filter((k) => k.team === tm && k.alive);
  const isAttacker = (k) => k.team === G.attacking;

  function params(k) {
    if (G.mode !== "play") return DIFF.normal;
    if (G.online && G.online.mode === "versus") return MATE;
    return teamHasCtl(k.team) ? MATE : DIFF[G.diff] || DIFF.normal;
  }

  // Bind a controller straight to a kid (used when a match is built).
  function bindCtl(ctl, k) {
    ctl.kid = k;
    if (k) { k.ctl = ctl; k.isHuman = true; }
    syncHuman();
  }

  function syncHuman() {
    G.human = G.localCtl ? G.localCtl.kid : null;
  }

  // ---------------------------------------------------------------------------
  // Match / round flow
  // ---------------------------------------------------------------------------
  function teamFor(id, label) {
    return Object.assign({}, TEAMS.find((x) => x.id === id) || TEAMS[0], { label: label || null });
  }

  // opts: { ctx: quick|tourney|tutorial|online, stage, mode: versus|coop }
  function startMatch(opts) {
    const o = opts || {};
    G.ctx = o.ctx || "quick";
    G.stage = o.stage || 0;
    G.online = G.ctx === "online" ? { mode: o.mode || "versus" } : null;
    const mine = teamFor(settings.team);
    let size, target, diff, field, rival;
    if (G.ctx === "tourney") {
      const op = TOURNEY[G.stage];
      rival = teamFor(op.team === mine.id ? RIVAL[mine.id] : op.team, op.key);
      size = op.size; target = op.target; diff = op.diff; field = op.field;
      G.rules = { order: true, catchOut: true, holdLimit: true, time: 45 };
    } else if (G.ctx === "tutorial") {
      rival = teamFor(RIVAL[mine.id]);
      size = 3; target = 1; diff = "easy"; field = "village";
      G.rules = { order: true, catchOut: false, holdLimit: false, time: 60 };
    } else if (G.ctx === "online") {
      rival = teamFor(RIVAL[mine.id]);
      size = settings.online.teamSize; target = settings.online.target;
      diff = G.online.mode === "coop" ? settings.online.difficulty : "normal";
      field = settings.unlocked.includes(settings.field) ? settings.field : "village";
      G.rules = Object.assign({}, settings.rules);
    } else {
      rival = teamFor(RIVAL[mine.id]);
      size = settings.teamSize; target = settings.target; diff = settings.difficulty;
      field = settings.unlocked.includes(settings.field) ? settings.field : "village";
      G.rules = Object.assign({}, settings.rules);
    }
    const D = DIFF[diff];
    G.mode = "play";
    G.net = G.ctx === "online" ? "host" : null;
    G.teams = [mine, rival];
    G.diff = diff;
    G.sweet = D.sweet;
    G.meter = D.meter;
    G.aimHelp = D.aimHelp || G.ctx === "tutorial";
    G.target = target;
    G.scores = [0, 0];
    G.round = 0;
    G.newAch = [];
    G.attacking = G.ctx === "tutorial" ? 0 : Math.random() < 0.5 ? 0 : 1;
    G.tut = G.ctx === "tutorial" ? { step: 0, t: 0, switched: false, dashed: false } : null;
    G.particles.length = 0;
    G.floaters.length = 0;
    netEvents.length = 0;
    setField(field);
    buildKids(size);

    // Humans: this device leads team 0; an online friend leads team 1 (versus) or
    // plays alongside on team 0 (together vs computer).
    const host = makeCtl("h", 0, true);
    G.ctls = [host];
    G.localCtl = host;
    bindCtl(host, teamKids(0)[0]);
    if (G.ctx === "online") {
      const coop = G.online.mode === "coop";
      const guest = makeCtl("g", coop ? 0 : 1, false);
      G.ctls.push(guest);
      bindCtl(guest, coop ? teamKids(0)[1] : teamKids(1)[0]);
    }
    G.humanTeam = host.team;
    G.stats = host.stats;

    makeStones();
    makeBall();
    setupRound();
    hudReset();
    cam.snap = true;
    if (G.ctx !== "tutorial") Counter.hit(G.ctx === "online" ? "online-matches" : "matches");
  }

  function startAttract() {
    G.mode = "attract";
    G.ctx = "quick";
    G.net = null;
    G.online = null;
    const tm = shuffle(TEAMS.slice());
    G.teams = [teamFor(tm[0].id), teamFor(tm[1].id)];
    G.ctls = [];
    G.localCtl = null;
    G.human = null;
    G.humanTeam = -1;
    G.diff = "normal";
    G.rules = { order: true, catchOut: true, holdLimit: true, time: 45 };
    G.target = 99;
    G.scores = [0, 0];
    G.round = 0;
    G.stats = newStats();
    G.attacking = 0;
    G.tut = null;
    G.snap = null;
    G.particles.length = 0;
    G.floaters.length = 0;
    setField("village");
    buildKids(4);
    makeStones();
    makeBall();
    setupRound();
    cam.snap = true;
  }

  function queueSpot(i) {
    const offs = [-95, 95, -185, 185, -270];
    return { x: 205 - Math.floor(i / 2) * 18, y: TOWER.y + offs[i % offs.length] };
  }

  function defHome(i, n) {
    const spread = n <= 3 ? 0.95 : 1.25;
    const a = n === 1 ? 0 : -spread + (2 * spread * i) / (n - 1);
    return { x: TOWER.x + Math.cos(a) * 360, y: TOWER.y + Math.sin(a) * 270 };
  }

  function setupRound() {
    G.round++;
    const att = G.attacking;
    const attackers = teamKids(att);
    const defenders = teamKids(1 - att);

    G.placed = STONE_W.length;
    G.towerUp = true;
    G.rebuildT = G.rules.time;
    G.slowmo = 0;
    G.ctls.forEach((c) => { c.charge.active = false; c.lockTarget = null; });
    G.stones.forEach((s) => {
      s.placed = true; s.staged = false; s.carriedBy = null;
      s.x = TOWER.x; s.y = TOWER.y; s.z = 0; s.vx = s.vy = s.vz = 0;
    });

    // The throwing spot and wind change every round so no two throws are the same.
    const tutorial = G.ctx === "tutorial";
    G.throwPos = { x: THROW_X, y: tutorial ? TOWER.y : TOWER.y + rand(-110, 110) };
    const maxWind = tutorial ? 0 : G.mode === "attract" ? 0.5 : DIFF[G.diff].wind;
    G.wind = Math.random() < 0.15 ? 0 : (Math.random() < 0.5 ? -1 : 1) * rand(0.25, 1) * maxWind;

    G.kids.forEach((k) => {
      k.alive = true; k.bench = null; k.carrying = null; k.hasBall = false;
      k.placeT = 0; k.holdT = 0; k.vx = k.vy = 0; k.dashT = 0; k.dashCD = 0;
      k.hitFlash = 0; k.cheer = 0; k.throwAnim = 0;
      k.ai.stone = null; k.ai.receiving = false; k.ai.dodgeId = -1;
    });

    // Humans throw first.
    attackers.sort((a, b) => (a.ctl ? 0 : 1) - (b.ctl ? 0 : 1));
    attackers.forEach((k, i) => {
      k.home = queueSpot(i);
      const p = i === 0 ? G.throwPos : k.home;
      k.x = p.x; k.y = p.y; k.fx = 1; k.fy = 0;
    });
    defenders.forEach((k, i) => {
      k.home = defHome(i, defenders.length);
      k.x = k.home.x; k.y = k.home.y; k.fx = -1; k.fy = 0;
    });

    G.throwOrder = attackers.slice();
    G.throwIdx = 0;
    G.throwState = "aim";
    G.aiAimT = 0;
    G.ctls.forEach((c) => { c.aimAngle = Math.atan2(TOWER.y - G.throwPos.y, TOWER.x - G.throwPos.x); });
    giveBall(G.throwOrder[0]);
    assignThrower();

    setPhase("intro");
    if (G.mode === "play" && !tutorial) fx({ e: "round" });
  }

  function setPhase(p) {
    G.phase = p;
    G.phaseT = 0;
  }

  function giveBall(k) {
    const b = G.ball;
    G.kids.forEach((x) => { x.hasBall = false; });
    b.holder = k; k.hasBall = true; k.holdT = 0;
    b.live = false; b.fromThrow = false; b.bounced = 0; b.passTo = null; b.targetKid = null;
    b.vx = b.vy = b.vz = 0;
  }

  function currentThrower() {
    if (G.net === "guest") return G.kids[G.snapThrower] || null;
    return G.throwOrder[G.throwIdx];
  }

  // Humans on the attacking team take the throws, taking turns when two share a team.
  function assignThrower() {
    const ctls = G.ctls.filter((c) => c.team === G.attacking);
    if (!ctls.length) return;
    setControlled(ctls[G.throwIdx % ctls.length], currentThrower());
  }

  function advanceThrow() {
    if (G.ctx === "tutorial") {
      // In the tutorial the player keeps throwing until the tower falls.
      G.throwState = "aim";
      giveBall(currentThrower());
      assignThrower();
      return;
    }
    G.throwIdx++;
    while (G.throwIdx < G.throwOrder.length && !G.throwOrder[G.throwIdx].alive) G.throwIdx++;
    if (G.throwIdx >= G.throwOrder.length) {
      if (aliveOf(G.attacking).length === 0) roundEnd(1 - G.attacking, "allout");
      else roundEnd(-1, "missed");
      return;
    }
    G.throwState = "aim";
    G.aiAimT = 0;
    G.ctls.forEach((c) => { c.charge.active = false; });
    giveBall(currentThrower());
    assignThrower();
  }

  function roundEnd(winner, reason) {
    if (G.phase === "roundEnd" || G.phase === "matchEnd") return;
    setPhase("roundEnd");
    G.lastWinner = winner;
    G.ctls.forEach((c) => { c.charge.active = false; });
    if (winner >= 0) G.scores[winner]++;
    G.kids.forEach((k) => { if (k.team === winner) k.cheer = 2.2; });
    if (G.mode === "play") fx({ e: "roundEnd", w: winner, r: reason });
  }

  function nextRoundOrEnd() {
    if (G.ctx === "tutorial" && G.mode === "play") { finishTutorial(); return; }
    const w = G.scores[0] >= G.target ? 0 : G.scores[1] >= G.target ? 1 : -1;
    if (w >= 0) {
      if (G.mode === "attract") G.scores = [0, 0];
      else { matchEnd(w); return; }
    }
    G.attacking = 1 - G.attacking;
    setupRound();
  }

  function matchEnd(winner) {
    setPhase("matchEnd");
    G.kids.forEach((k) => { k.cheer = k.team === winner ? 99 : 0; });
    const won = winner === localTeam();
    let unlocked = null;
    if (won) {
      settings.wins++;
      unlock("first_win");
      if (G.diff === "hard" && !(G.online && G.online.mode === "versus")) unlock("tough");
      if (G.ctx === "tourney" && G.stage === settings.tourney.stage) {
        const op = TOURNEY[G.stage];
        if (op.unlock && !settings.unlocked.includes(op.unlock)) {
          settings.unlocked.push(op.unlock);
          unlocked = op.unlock;
        }
        settings.tourney.stage = Math.min(TOURNEY.length, settings.tourney.stage + 1);
        if (settings.tourney.stage >= TOURNEY.length && !settings.tourney.champion) {
          settings.tourney.champion = true;
          unlock("champion");
          Counter.hit("champions");
        }
      }
    } else {
      settings.losses++;
    }
    saveSettings();
    const guest = ctlById("g");
    if (G.net === "host" && guest) fx({ e: "matchEnd", w: winner, st: guest.stats, to: "g" });
    if (won) { sfx.win(); confettiBurst(W / 2, H / 2 - 100, 140); }
    clearTimeout(resultTimer);
    resultTimer = setTimeout(() => showResult(won, unlocked), 1300);
  }

  function finishTutorial() {
    setPhase("matchEnd");
    settings.tutorialDone = true;
    unlock("student");
    saveSettings();
    Counter.hit("tutorials");
    sfx.win();
    confettiBurst(W / 2, H / 2 - 100, 100);
    clearTimeout(resultTimer);
    resultTimer = setTimeout(() => showResult(true, null), 900);
  }

  // ---------------------------------------------------------------------------
  // Effects and presentation. Everything players see or hear goes through fx(),
  // so the host can replay it on the friend's device.
  // ---------------------------------------------------------------------------
  const netEvents = [];

  function fx(ev) {
    applyFx(ev);
    if (G.net === "host") netEvents.push(ev);
  }

  function applyFx(ev) {
    if (ev.to && (!G.localCtl || ev.to !== G.localCtl.id)) return;
    switch (ev.e) {
      case "sfx": if (G.mode === "play" && sfx[ev.n]) sfx[ev.n](ev.a); break;
      case "fl": G.floaters.push({ x: ev.x, y: ev.y, key: ev.k, vars: ev.v, text: ev.r, color: ev.c, life: 0, max: ev.l || 1 }); break;
      case "dust": dust(ev.x, ev.y, ev.n, ev.c); break;
      case "spark": sparkle(ev.x, ev.y, ev.n); break;
      case "conf": confettiBurst(ev.x, ev.y, ev.n); break;
      case "shake": if (settings.shake && !reduceMotion) G.shake = Math.max(G.shake, ev.v); break;
      case "round": presentRound(); break;
      case "knock": presentKnock(); break;
      case "roundEnd": presentRoundEnd(ev.w, ev.r); break;
      case "caught": presentCaught(ev.thr, ev.team); break;
      case "ach": unlock(ev.id); break;
      case "tot": addTotal(ev.k); break;
      case "matchEnd": if (G.net === "guest") guestMatchEnd(ev); break;
      default: break;
    }
  }

  const sound = (n, a) => { if (G.mode === "play") fx({ e: "sfx", n, a }); };
  const floater = (x, y, key, color, life, vars) => fx({ e: "fl", x: r1(x), y: r1(y), k: key, v: vars, c: color, l: life });
  const floaterRaw = (x, y, text, color, life) => fx({ e: "fl", x: r1(x), y: r1(y), r: text, c: color, l: life });
  const shakeScreen = (v) => fx({ e: "shake", v });
  const fxDust = (x, y, n, c) => fx({ e: "dust", x: r1(x), y: r1(y), n, c });
  const fxSpark = (x, y, n) => fx({ e: "spark", x, y, n });
  const fxConfetti = (x, y, n) => fx({ e: "conf", x, y, n });

  function presentRound() {
    if (G.mode !== "play" || G.ctx === "tutorial") return;
    const att = G.attacking;
    const youAttack = att === localTeam();
    showBanner(t("phase.round", { n: G.round }), youAttack ? t("b.roundAtt") : t("b.roundDef", { team: teamLabel(att) }), teamOf(att).dark, 1.7);
  }

  function presentKnock() {
    if (G.mode !== "play") return;
    sfx.whistle();
    if (G.ctx === "tutorial") return;
    const youAttack = G.attacking === localTeam();
    showBanner(t("b.down"), youAttack ? t("b.downAtt") : t("b.downDef"), teamOf(G.attacking).dark, 1.4);
  }

  function presentRoundEnd(winner, reason) {
    const youWon = winner === localTeam();
    const who = winner >= 0 ? (youWon ? t("yourTeam") : teamLabel(winner)) : "";
    const shade = winner >= 0 ? teamOf(winner).dark : "#5c4a3a";
    if (reason === "rebuilt") {
      showBanner("সাত চাড়া!", t("b.rebuilt", { team: who }), shade, 2.6, true);
      Sound.shout("সাত চাড়া!", "bn-BD", "Saat Chara!");
      if (youWon) unlock("saat_chara");
    } else if (reason === "allout") {
      showBanner(t("b.allout"), t("b.alloutSub", { team: who }), shade, 2.6);
    } else if (reason === "time") {
      showBanner(t("b.time"), t("b.timeSub", { team: who }), shade, 2.6);
    } else {
      showBanner(t("b.stands"), t("b.standsSub"), shade, 2.4);
    }
    if (youWon) sfx.cheer(); else sfx.groan();
    bumpScore(winner);
  }

  function presentCaught(thrIdx, team) {
    const thrower = G.kids[thrIdx];
    if (!thrower) return;
    showBanner(t("b.caught"), thrower === G.human ? t("b.youOut") : t("b.caughtSub", { name: kidName(thrower) }), teamOf(team).dark, 1.2);
  }

  // ---------------------------------------------------------------------------
  // Progress: achievements (always for this device's player)
  // ---------------------------------------------------------------------------
  function unlock(id) {
    if (G.mode !== "play" || settings.ach[id]) return;
    settings.ach[id] = Date.now();
    saveSettings();
    G.newAch.push(id);
    showToast(t("ach." + id));
  }

  function unlockFor(ctl, id) {
    if (!ctl) return;
    if (ctl.local) unlock(id);
    else fx({ e: "ach", id, to: ctl.id });
  }

  function addTotal(key) {
    settings.totals[key] = (settings.totals[key] || 0) + 1;
    if (key === "hits" && settings.totals.hits >= 10) unlock("sniper");
    if (key === "kicks" && settings.totals.kicks >= 10) unlock("kicker");
    saveSettings();
  }

  function addTotalFor(ctl, key) {
    if (!ctl) return;
    if (ctl.local) addTotal(key);
    else fx({ e: "tot", k: key, to: ctl.id });
  }

  // ---------------------------------------------------------------------------
  // Ball actions
  // ---------------------------------------------------------------------------
  function launch(k, tx, ty, speed, zTarget, live) {
    const b = G.ball;
    const dx = tx - k.x, dy = ty - k.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const tt = d / speed;
    const vz = (zTarget - HAND_Z + 0.5 * GRAV * tt * tt) / tt;
    G.kids.forEach((x) => { x.hasBall = false; });
    b.holder = null;
    b.x = k.x + (dx / d) * 12; b.y = k.y + (dy / d) * 12; b.z = HAND_Z;
    b.vx = (dx / d) * speed; b.vy = (dy / d) * speed; b.vz = clamp(vz, -200, 700);
    b.live = live; b.thrower = k; b.throwTeam = k.team; b.bounced = 0; b.fromThrow = false;
    b.ignore = k; b.ignoreT = 0.25; b.throwId++; b.passTo = null; b.targetKid = null;
    k.holdT = 0; k.throwAnim = 0.3; k.fx = dx / d; k.fy = dy / d;
    sound("throw");
  }

  function throwAtTower(k, power, angle) {
    const b = G.ball;
    const speed = 380 + 820 * power;
    G.kids.forEach((x) => { x.hasBall = false; });
    b.holder = null;
    b.x = k.x + Math.cos(angle) * 14; b.y = k.y + Math.sin(angle) * 14; b.z = HAND_Z;
    b.vx = Math.cos(angle) * speed; b.vy = Math.sin(angle) * speed; b.vz = 160 + 300 * power;
    b.live = false; b.fromThrow = true; b.thrower = k; b.throwTeam = k.team; b.bounced = 0;
    b.ignore = k; b.ignoreT = 0.3; b.throwId++; b.passTo = null; b.targetKid = null;
    k.throwAnim = 0.35; k.fx = Math.cos(angle); k.fy = Math.sin(angle);
    G.throwState = "flying";
    G.flyT = 0;
    sound("throw");
  }

  function releaseThrow(ctl, p, angle) {
    const k = ctl.kid;
    const [lo, hi] = G.sweet;
    const zoneDist = p < lo ? lo - p : p > hi ? p - hi : 0;
    const jitter = (Math.random() * 2 - 1) * Math.min(0.2, 0.022 + zoneDist * 0.45);
    G.perfectBy = zoneDist === 0 ? ctl : null;
    if (zoneDist === 0) floater(k.x, k.y - 80, "f.perfect", "#fff3b0", 0.9);
    throwAtTower(k, p, angle + jitter);
  }

  function aiThrowTower(k) {
    const P = params(k);
    const p = clamp(0.62 + gauss() * P.power, 0.05, 0.98);
    const d = dist(k, TOWER);
    const ft = d / (380 + 820 * p);
    const drift = 0.5 * WIND_ACC * G.wind * ft * ft;
    const ang = Math.atan2(TOWER.y - k.y, TOWER.x - k.x) - (drift / d) * rand(0.6, 1.1) + gauss() * P.aimErr * 0.55;
    G.perfectBy = null;
    throwAtTower(k, p, ang);
  }

  function knockDown() {
    const b = G.ball;
    G.towerUp = false;
    G.placed = 0;
    const dir = Math.atan2(b.vy, b.vx);
    G.stones.forEach((s, i) => {
      s.placed = false; s.staged = false; s.carriedBy = null;
      s.x = TOWER.x + rand(-4, 4); s.y = TOWER.y + rand(-2, 2); s.z = i * STONE_T;
      const a = dir + rand(-1.35, 1.35) + (Math.random() < 0.25 ? Math.PI : 0) * rand(0.3, 0.8);
      const sp = rand(170, 440) * (0.7 + i * 0.07);
      s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp * 0.85; s.vz = rand(160, 380);
    });
    b.vx = -b.vx * 0.25 + rand(-80, 80);
    b.vy = b.vy * 0.3 + rand(-260, 260);
    b.vz = Math.max(b.vz, 180);
    shakeScreen(14);
    G.slowmo = 0.45;
    fxDust(TOWER.x, TOWER.y, 26, "#c9a36b");
    sound("crash");
    if (G.mode === "play") {
      const k = b.thrower;
      if (k && k.ctl) {
        k.ctl.stats.knocks++;
        if (G.perfectBy === k.ctl) unlockFor(k.ctl, "perfect");
      }
      if (G.ctx === "tutorial") {
        G.tut.step = 1;
        G.rebuildT = G.rules.time;
      }
      fx({ e: "knock" });
      // A player whose kid was caught out moves to a teammate who is still in.
      G.ctls.forEach((c) => { if (!c.kid || !c.kid.alive) moveCtlToNearest(c); });
    }
    setPhase("rebuild");
  }

  function eliminate(k, how) {
    if (!k.alive) return;
    k.alive = false;
    k.hitFlash = 0.6;
    if (k.carrying) {
      const s = k.carrying;
      s.carriedBy = null; s.z = 40; s.vx = rand(-120, 120); s.vy = rand(-80, 80); s.vz = 120;
      k.carrying = null;
    }
    k.placeT = 0;
    const slot = G.kids.filter((x) => x.team === k.team && x.bench).length;
    const left = k.team === 0;
    k.bench = { x: left ? 140 + slot * 44 : W - 140 - slot * 44, y: 864 };
    floater(k.x, k.y - 70, how === "caught" ? "f.caught" : "f.out", "#ffd2c2", 1.2);
    sound("out");
    if (G.mode === "play" && k.ctl && G.phase === "rebuild") moveCtlToNearest(k.ctl);
    if (G.phase === "rebuild" && aliveOf(G.attacking).length === 0) roundEnd(1 - G.attacking, "allout");
  }

  function moveCtlToNearest(ctl) {
    const from = ctl.kid || TOWER;
    const next = aliveOf(ctl.team).filter((x) => !x.ctl).sort((a, c) => dist(a, from) - dist(c, from))[0];
    if (next) setControlled(ctl, next);
  }

  function defenderTakeBall(k) {
    giveBall(k);
    k.ai.react = params(k).react * rand(0.7, 1.3);
    G.kids.forEach((x) => { x.ai.receiving = false; });
    // Control jumps to whoever grabs the ball.
    if (G.mode === "play" && !k.ctl) {
      const ctls = G.ctls.filter((c) => c.team === k.team);
      const ctl = ctls.sort((a, c) => (a.kid ? dist(a.kid, k) : 1e9) - (c.kid ? dist(c.kid, k) : 1e9))[0];
      if (ctl) setControlled(ctl, k);
    }
    sound("catch");
  }

  // A defender who holds the ball too long has to let it go.
  function dropBall(k) {
    const b = G.ball;
    G.kids.forEach((x) => { x.hasBall = false; });
    b.holder = null;
    b.x = k.x + k.fx * 14; b.y = k.y + k.fy * 6; b.z = 10;
    b.vx = k.fx * 90; b.vy = k.fy * 60; b.vz = 60;
    b.live = false; b.fromThrow = false; b.ignore = k; b.ignoreT = 0.6;
    k.holdT = 0;
    floater(k.x, k.y - 70, "f.slow", "#ffd2c2", 1);
    sound("groan");
  }

  // --- Stacking order --------------------------------------------------------
  const orderOn = () => G.rules.order;
  const isNextStone = (s) => !orderOn() || s.i === G.placed;
  const pileNext = () => (orderOn() ? G.stones.find((s) => s.staged && s.i === G.placed) : null);

  function stageStone(k, s) {
    k.carrying = null; k.placeT = 0;
    s.carriedBy = null; s.staged = true;
    const n = G.stones.filter((x) => x.staged).length;
    const a = -Math.PI / 2 + n * 1.05 + 0.5;
    s.x = TOWER.x + Math.cos(a) * 46; s.y = TOWER.y + Math.sin(a) * 46 * RING_Y;
    s.z = 0; s.vx = s.vy = s.vz = 0;
    if (k.ctl) floater(k.x, k.y - 80, "f.order", "#fff3b0", 1);
    sound("clack");
  }

  function placeStone(k, s) {
    if (k.carrying === s) k.carrying = null;
    s.placed = true; s.staged = false; s.carriedBy = null;
    s.x = TOWER.x; s.y = TOWER.y; s.z = 0; s.vx = s.vy = s.vz = 0;
    k.placeT = 0;
    G.placed++;
    if (k.ctl) k.ctl.stats.placed++;
    sound("place", G.placed);
    fxSpark(TOWER.x, TOWER.y - G.placed * STONE_T, 10);
    floaterRaw(TOWER.x, TOWER.y - TOWER_H - 30, `${G.placed}/7`, "#fff3b0", 0.8);
    if (G.placed >= STONE_W.length) {
      if (k.ctl) unlockFor(k.ctl, "last_stone");
      G.towerUp = true;
      G.slowmo = 0.6;
      fxConfetti(TOWER.x, TOWER.y - 60, 90);
      roundEnd(G.attacking, "rebuilt");
    }
  }

  // ---------------------------------------------------------------------------
  // Update (host and single player)
  // ---------------------------------------------------------------------------
  function update(dt) {
    G.time += dt;
    G.phaseT += dt;

    if (G.phase === "intro") {
      updateKidsIdle(dt);
      if (G.phaseT > (G.mode === "play" && G.ctx !== "tutorial" ? 1.9 : 0.8)) {
        setPhase("throw");
        sound("whistle");
      }
    } else if (G.phase === "throw") {
      updateThrowPhase(dt);
    } else if (G.phase === "rebuild") {
      updateRebuild(dt);
    } else if (G.phase === "roundEnd") {
      updateKidsIdle(dt);
      if (G.phaseT > (G.mode === "play" ? 3.0 : 1.8)) nextRoundOrEnd();
    } else if (G.phase === "matchEnd") {
      updateKidsIdle(dt);
    }

    updateBall(dt);
    updateStones(dt);
    updateFx(dt);
    G.kids.forEach((k) => {
      k.dashT = Math.max(0, k.dashT - dt);
      k.dashCD = Math.max(0, k.dashCD - dt);
      k.hitFlash = Math.max(0, k.hitFlash - dt);
      k.throwAnim = Math.max(0, k.throwAnim - dt);
      if (k.cheer > 0) k.cheer = Math.max(0, k.cheer - dt);
    });
    G.shake = Math.max(0, G.shake - dt * 40);
    G.ctls.forEach((c) => { c.switchFlash = Math.max(0, c.switchFlash - dt); });
    updateLocalAim(dt);
    updateLock(G.localCtl);
    updateTutorial(dt);
  }

  function updateKidsIdle(dt) {
    G.kids.forEach((k) => {
      if (!k.alive && k.bench) { steer(k, k.bench, dt, 0.8); return; }
      steer(k, null, dt);
    });
    integrateKids(dt);
  }

  function updateThrowPhase(dt) {
    const thrower = currentThrower();
    const b = G.ball;

    // Attackers walk to their spots; the current thrower walks to the line.
    G.kids.forEach((k) => {
      if (!k.alive) { if (k.bench) steer(k, k.bench, dt, 0.8); return; }
      if (isAttacker(k)) {
        const spot = k === thrower && G.throwState === "aim" ? G.throwPos : k.home;
        steer(k, spot, dt, 0.7);
        if (dist(k, spot) < 4) { k.fx = 1; k.fy = 0; }
      } else if (k.ctl) {
        humanMove(k, dt, !k.hasBall);
        keepOutOfCircle(k);
      } else {
        defenderThrowPhaseAI(k, dt);
      }
    });
    integrateKids(dt);

    if (G.throwState === "aim") {
      if (!thrower || !thrower.alive) { advanceThrow(); return; }
      if (!thrower.ctl && dist(thrower, G.throwPos) < 8) {
        G.aiAimT += dt;
        if (G.aiAimT > 1.05) aiThrowTower(thrower);
      }
    } else if (G.throwState === "flying") {
      G.flyT += dt;
      const speed = Math.hypot(b.vx, b.vy);
      if (b.holder || (speed < 25 && b.z <= 0.5) || G.flyT > 3.5) {
        if (!b.holder) floater(b.x, b.y - 40, "f.miss", "#ffffff", 0.9);
        G.throwState = "wait";
        G.waitT = b.holder ? 1.3 : 0.7;
      }
    } else if (G.throwState === "wait") {
      G.waitT -= dt;
      if (G.waitT <= 0) advanceThrow();
    }
  }

  // The local player's power meter and aim (runs on whichever device is local).
  function updateLocalAim(dt) {
    const ctl = G.localCtl;
    if (!ctl || !isThrowing(ctl)) return;
    const k = ctl.kid;
    if (ctl.charge.active) {
      ctl.charge.p += ctl.charge.dir * dt * G.meter;
      if (ctl.charge.p >= 1) { ctl.charge.p = 1; ctl.charge.dir = -1; }
      if (ctl.charge.p <= 0) { ctl.charge.p = 0; ctl.charge.dir = 1; }
    }
    const base = Math.atan2(TOWER.y - k.y, TOWER.x - k.x);
    if (input.usingKeysAim) {
      const a = (input.keys.ArrowUp || input.keys.KeyW ? -1 : 0) + (input.keys.ArrowDown || input.keys.KeyS ? 1 : 0);
      ctl.aimAngle = clamp(ctl.aimAngle + a * dt * 0.5, base - 0.8, base + 0.8);
    } else if (input.pointer.valid) {
      ctl.aimAngle = clamp(Math.atan2(input.pointer.y - k.y, input.pointer.x - k.x), -1.2, 1.2);
    }
  }

  function defenderThrowPhaseAI(k, dt) {
    const b = G.ball;
    let target = k.home;
    if (!b.holder && b.fromThrow && b.bounced === 0) {
      const land = predictLanding(b, 30);
      const defs = aliveOf(k.team).filter((x) => !x.isHuman);
      let best = null, bd = Infinity;
      defs.forEach((d) => { const dd = dist(d, land); if (dd < bd) { bd = dd; best = d; } });
      if (best === k && bd < 260 * params(k).spd) target = land;
    }
    steer(k, target, dt, 1);
    keepOutOfCircle(k);
  }

  function predictLanding(b, zAt) {
    const disc = b.vz * b.vz + 2 * GRAV * Math.max(0, b.z - zAt);
    const tt = (b.vz + Math.sqrt(Math.max(0, disc))) / GRAV;
    return { x: clamp(b.x + b.vx * tt, BOUNDS.l, BOUNDS.r), y: clamp(b.y + b.vy * tt, BOUNDS.t, BOUNDS.b) };
  }

  function tutorialFrozen() {
    return G.ctx === "tutorial" && G.tut && G.tut.step < 4;
  }

  function updateRebuild(dt) {
    if (!(G.ctx === "tutorial" && G.tut.step < 5)) G.rebuildT -= dt;
    if (G.rebuildT < 10 && Math.ceil(G.rebuildT) !== Math.ceil(G.rebuildT + dt)) sound("tick");
    if (G.rebuildT <= 0) { G.rebuildT = 0; roundEnd(1 - G.attacking, "time"); return; }

    const frozen = tutorialFrozen();
    G.kids.forEach((k) => {
      if (!k.alive) { if (k.bench) steer(k, k.bench, dt, 0.8); return; }
      if (k.ctl) {
        humanMove(k, dt, !k.hasBall);
        if (k.hasBall) {
          k.holdT += dt;
          if (G.rules.holdLimit && k.holdT > HOLD_LIMIT) dropBall(k);
        }
      } else if (frozen) {
        steer(k, null, dt);
      } else if (isAttacker(k)) {
        attackerAI(k, dt);
      } else {
        defenderAI(k, dt);
      }
      if (!isAttacker(k)) keepOutOfCircle(k);
    });
    integrateKids(dt);

    // Pick up, stage and stack stones
    G.kids.forEach((k) => {
      if (!k.alive || !isAttacker(k)) return;
      const inRing = ringDist(k) < PLACE_R;
      if (!k.carrying) {
        for (const s of G.stones) {
          if (s.placed || s.staged || s.carriedBy || s.z > 6) continue;
          if (Math.hypot(s.x - k.x, s.y - k.y) < 24) {
            s.carriedBy = k; k.carrying = s; k.ai.stone = null;
            sound("pickup");
            break;
          }
        }
      }
      if (k.carrying && inRing) {
        k.placeT += dt;
        if (k.placeT >= PLACE_TIME) {
          if (isNextStone(k.carrying)) placeStone(k, k.carrying);
          else stageStone(k, k.carrying);
        }
      } else if (!k.carrying && inRing && pileNext()) {
        k.placeT += dt;
        if (k.placeT >= PLACE_TIME) placeStone(k, pileNext());
      } else {
        k.placeT = 0;
      }
    });
  }

  // --- Tutorial ---------------------------------------------------------------
  function updateTutorial(dt) {
    const tu = G.tut;
    if (!tu || G.mode !== "play") return;
    tu.t += dt;
    const h = G.human;
    if (tu.step === 1 && h && h.carrying && isNextStone(h.carrying)) tu.step = 2;
    else if (tu.step === 2 && G.placed >= 1) { tu.step = 3; tu.switched = false; }
    else if (tu.step === 3 && tu.switched) { tu.step = 4; tu.dashed = false; tu.t = 0; }
    else if (tu.step === 4 && (tu.dashed || tu.t > 9)) { tu.step = 5; G.rebuildT = G.rules.time; }
    if (tu.step === 2 && h && !h.carrying && G.placed === 0) tu.step = 1;
  }

  function tutorialText() {
    const tu = G.tut;
    const h = G.human;
    switch (tu.step) {
      case 0: return t("c.throw");
      case 1: return h && h.carrying && !isNextStone(h.carrying) ? t("c.wrong") : t("c.pickup");
      case 2: return t("c.place");
      case 3: return t("c.switch");
      case 4: return t("c.dodge");
      default: return t("c.finish");
    }
  }

  // --- Movement --------------------------------------------------------------
  function steer(k, target, dt, speedMul) {
    let dx = 0, dy = 0;
    if (target) {
      const tx = target.x - k.x, ty = target.y - k.y;
      const d = Math.hypot(tx, ty);
      if (d > 2) {
        const slow = Math.min(1, d / 40);
        dx = (tx / d) * slow; dy = (ty / d) * slow;
      }
    }
    applyMove(k, dx, dy, dt, speedMul || 1, 9);
  }

  function applyMove(k, dx, dy, dt, speedMul, resp) {
    const P = params(k);
    let sp = (k.isHuman ? 250 : 232 * P.spd) * speedMul;
    if (k.carrying) sp *= 0.9;
    if (k.dashT > 0) sp *= 2.3;
    const a = Math.min(1, dt * resp);
    k.vx += (dx * sp - k.vx) * a;
    k.vy += (dy * sp - k.vy) * a;
  }

  function integrateKids(dt) {
    const kids = G.kids;
    for (const k of kids) {
      k.x += k.vx * dt;
      k.y += k.vy * dt;
      const sp = Math.hypot(k.vx, k.vy);
      if (sp > 18) {
        k.fx = k.vx / sp; k.fy = k.vy / sp;
        k.anim += sp * dt * 0.055;
      }
      if (k.alive) {
        k.x = clamp(k.x, BOUNDS.l, BOUNDS.r);
        k.y = clamp(k.y, BOUNDS.t, BOUNDS.b);
      }
      if (k.carrying) {
        const s = k.carrying;
        s.x = k.x; s.y = k.y + 0.5; s.z = 58;
      }
    }
    // Soft separation so kids don't stand inside each other.
    for (let i = 0; i < kids.length; i++) {
      const a = kids[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < kids.length; j++) {
        const b = kids[j];
        if (!b.alive) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const min = KID_R * 2;
        if (d > 0.01 && d < min) {
          const push = (min - d) / 2;
          a.x -= (dx / d) * push; a.y -= (dy / d) * push;
          b.x += (dx / d) * push; b.y += (dy / d) * push;
        }
      }
    }
  }

  // Defenders may not stand in the chalk circle, except to fetch a loose ball lying in it.
  function keepOutOfCircle(k) {
    const b = G.ball;
    if (!b.holder && ringDist(b) < CIRCLE_R + 12) return;
    const d = ringDist(k);
    const R = CIRCLE_R + KID_R;
    if (d < R) {
      if (d < 0.01) { k.x = TOWER.x + R; return; }
      k.x = TOWER.x + (k.x - TOWER.x) * (R / d);
      k.y = TOWER.y + (k.y - TOWER.y) * (R / d);
    }
  }

  function dash(k) {
    if (!k || k.dashCD > 0 || !k.alive) return;
    k.dashT = 0.2;
    k.dashCD = 1.1;
    fxDust(k.x, k.y, 6, "#d9c08f");
    if (k.ctl) {
      if (G.mode === "play") fx({ e: "sfx", n: "dash", to: k.ctl.id });
      if (G.tut && G.tut.step === 4 && k.ctl.local) G.tut.dashed = true;
    }
  }

  // Can this kid move freely right now (rather than walking to a set spot)?
  function freeMove(k) {
    if (!k || !k.alive || k.hasBall) return false;
    if (G.phase === "rebuild") return true;
    return G.phase === "throw" && !isAttacker(k);
  }

  // --- Player control: switching and target lock -----------------------------
  function setControlled(ctl, k) {
    if (!ctl || !k || k === ctl.kid || k.team !== ctl.team || G.mode !== "play") return;
    const prev = ctl.kid;
    const other = k.ctl && k.ctl !== ctl ? k.ctl : null;
    if (prev) { prev.ctl = null; prev.isHuman = false; prev.ai.stone = null; prev.ai.receiving = false; }
    k.ctl = ctl; k.isHuman = true; k.ai.stone = null; k.ai.receiving = false;
    ctl.kid = k;
    ctl.charge.active = false;
    ctl.lockTarget = null;
    ctl.switchFlash = 0.45;
    if (other) {
      // Two friends on one team: the other player takes over the kid we just left.
      other.kid = null;
      if (prev && prev.alive) bindCtl(other, prev);
      else moveCtlToNearest(other);
      other.switchFlash = 0.45;
    }
    syncHuman();
  }

  function canSwitch(ctl) {
    if (G.mode !== "play" || !ctl) return false;
    if (G.paused && !G.net) return false;
    if (G.ctx === "tutorial" && G.tut && G.tut.step < 3) return false;
    const free = aliveOf(ctl.team).filter((k) => !k.ctl).length;
    if (G.phase === "rebuild") return free > 0;
    return G.phase === "throw" && G.attacking !== ctl.team && free > 0;
  }

  // Defending: jump to whoever has the ball, else the teammate closest to it.
  // Attacking: cycle through teammates who are still in.
  function switchPlayer(ctl, to) {
    if (!canSwitch(ctl)) return;
    const h = ctl.kid;
    let next = to && to.team === ctl.team && to.alive && !to.ctl ? to : null;
    if (!next) {
      const mates = aliveOf(ctl.team).filter((k) => !k.ctl);
      if (G.attacking !== ctl.team) {
        const b = G.ball;
        next = mates.find((k) => k.hasBall) || mates.sort((a, c) => dist(a, b) - dist(c, b))[0];
      } else {
        const all = teamKids(ctl.team);
        const i = all.indexOf(h);
        for (let j = 1; j <= all.length && !next; j++) {
          const c = all[(i + j) % all.length];
          if (c.alive && !c.ctl) next = c;
        }
      }
    }
    if (next) {
      setControlled(ctl, next);
      fx({ e: "sfx", n: "pickup", to: ctl.id });
      if (G.tut && G.tut.step === 3 && ctl.local) G.tut.switched = true;
    }
  }

  function updateLock(ctl) {
    if (!ctl) return;
    const h = ctl.kid;
    if (!h || !h.alive || !h.hasBall || G.phase !== "rebuild") { ctl.lockTarget = null; return; }
    if (ctl.lockTarget && !ctl.lockTarget.alive) ctl.lockTarget = null;
    if (input.lockMode === "pointer" && input.pointer.valid) {
      ctl.lockTarget = attackerNear(input.pointer.x, input.pointer.y, 130);
    } else if (!ctl.lockTarget) {
      ctl.lockTarget = rankAttackers(h)[0] || null;
    }
  }

  function attackerNear(x, y, r) {
    let best = null, bd = r;
    aliveOf(G.attacking).forEach((a) => {
      const d = Math.hypot(a.x - x, a.y - 20 - y);
      if (d < bd) { bd = d; best = a; }
    });
    return best;
  }

  function isThrowing(ctl) {
    const k = ctl && ctl.kid;
    return G.mode === "play" && G.phase === "throw" && G.throwState === "aim" &&
      !!k && currentThrower() === k && k.alive && dist(k, G.throwPos) < 8;
  }

  function canDash(ctl) {
    const k = ctl && ctl.kid;
    if (!k || !k.alive || G.mode !== "play" || (G.paused && !G.net)) return false;
    if (G.phase === "rebuild") return !k.hasBall;
    return G.phase === "throw" && !isAttacker(k);
  }

  // Everything a player can do goes through an action, so the host can apply a
  // friend's actions exactly like its own.
  function applyAction(ctl, a) {
    const k = ctl && ctl.kid;
    switch (a.a) {
      case "release":
        if (isThrowing(ctl)) releaseThrow(ctl, clamp(+a.p || 0, 0, 1), +a.ang || 0);
        break;
      case "lock": {
        const tk = G.kids[a.t];
        if (k && k.hasBall && G.phase === "rebuild" && tk && tk.alive && tk.team === G.attacking) throwAt(k, tk, HUMAN_THROW);
        break;
      }
      case "at":
        if (k && k.hasBall && G.phase === "rebuild") launch(k, +a.x, +a.y, 900, 28, true);
        break;
      case "pass": {
        const m = G.kids[a.t];
        if (k && k.hasBall && G.phase === "rebuild" && m && m.alive && m.team === k.team && m !== k) {
          launch(k, m.x, m.y, 760, 38, true);
          G.ball.passTo = m;
          m.ai.receiving = true;
        }
        break;
      }
      case "switch":
        switchPlayer(ctl, a.t != null ? G.kids[a.t] : null);
        break;
      case "dash":
        if (canDash(ctl)) dash(k);
        break;
      default: break;
    }
  }

  function doAction(a) {
    if (G.net === "guest") {
      Net.send({ t: "act", x: a });
      // Predict a dash straight away so it feels instant.
      if (a.a === "dash" && G.human && G.human.dashCD <= 0) { G.human.dashT = 0.2; G.human.dashCD = 1.1; }
    } else {
      applyAction(G.localCtl, a);
    }
  }

  // --- Human movement ---------------------------------------------------------
  function humanMove(k, dt, canMove) {
    const ctl = k.ctl;
    if (!ctl.local) { remoteMove(k, dt); return; }
    let dx = 0, dy = 0;
    if (canMove) {
      const v = input.moveVector();
      dx = v.x; dy = v.y;
      if (k.dashT > 0 && !dx && !dy) { dx = k.fx; dy = k.fy; }
    }
    applyMove(k, dx, dy, dt, 1, 14);
    if (!canMove) { k.vx *= 0.5; k.vy *= 0.5; }
    if (k.hasBall && input.pointer.valid) {
      const ax = input.pointer.x - k.x, ay = input.pointer.y - k.y;
      const d = Math.hypot(ax, ay) || 1;
      k.fx = ax / d; k.fy = ay / d;
    }
  }

  // The friend's device moves its own kid and reports where it is; the host
  // follows that report closely so the friend's movement never feels laggy.
  function remoteMove(k, dt) {
    const n = k.ctl.net;
    if (n && n.kid === kidIdx(k) && freeMove(k) && G.time - n.at < 0.5) {
      const age = Math.min(0.15, G.time - n.at);
      const tx = n.x + n.vx * age, ty = n.y + n.vy * age;
      k.vx = clamp((tx - k.x) * 12, -700, 700);
      k.vy = clamp((ty - k.y) * 12, -700, 700);
    } else {
      applyMove(k, 0, 0, dt, 1, 14);
    }
  }

  // --- AI: attackers ---------------------------------------------------------
  function attackerAI(k, dt) {
    const P = params(k);
    const b = G.ball;

    const dodge = dodgeVector(k, P, dt);
    if (dodge) {
      if (k.dashCD <= 0 && Math.random() < 0.5) dash(k);
      applyMove(k, dodge.x, dodge.y, dt, 1, 14);
      return;
    }

    let tx, ty, arrive = 30;
    const pile = pileNext();
    const someoneStacking = aliveOf(k.team).some((o) => o !== k && !o.carrying && ringDist(o) < PLACE_R);
    if (k.carrying) {
      if (ringDist(k) < PLACE_R * 0.7) { applyMove(k, 0, 0, dt, 1, 14); return; }
      tx = TOWER.x; ty = TOWER.y; arrive = 1;
    } else if (pile && !someoneStacking) {
      // Someone has to stand in the circle to stack the next stone from the pile.
      if (ringDist(k) < PLACE_R * 0.7) { applyMove(k, 0, 0, dt, 1, 14); return; }
      tx = TOWER.x; ty = TOWER.y; arrive = 1;
    } else {
      let s = k.ai.stone;
      if (!s || s.placed || s.staged || s.carriedBy || claimedByOther(s, k)) s = k.ai.stone = chooseStone(k);
      if (s) {
        tx = s.x; ty = s.y; arrive = 1;
      } else if (!b.holder && !b.live && dist(k, b) < 300) {
        tx = b.x; ty = b.y; arrive = 1; // run over and kick the ball away
      } else {
        const a = k.ai.wobble + G.time * 0.35;
        tx = TOWER.x + Math.cos(a) * 210; ty = TOWER.y + Math.sin(a) * 160;
      }
    }

    let dx = tx - k.x, dy = ty - k.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const slow = arrive > 1 ? Math.min(1, d / arrive) : 1;
    dx *= slow; dy *= slow;

    // Stay wary of a defender holding the ball.
    const h = b.holder;
    if (h && h.team !== k.team) {
      const dh = dist(k, h);
      const R = 300;
      if (dh < R) {
        const committed = k.carrying && dist(k, TOWER) < 150;
        const w = (1 - dh / R) * (committed ? 0.25 : 1.0) * (1.25 - k.ai.brave * 0.6);
        dx += ((k.x - h.x) / dh) * w;
        dy += ((k.y - h.y) / dh) * w;
        // jink side to side so the thrower can't line up an easy shot
        const j = Math.sin(G.time * 5 + k.ai.wobble) * 0.45 * w;
        dx += (-(k.y - h.y) / dh) * j;
        dy += ((k.x - h.x) / dh) * j;
      }
    }
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    applyMove(k, dx, dy, dt, 1, 9);
  }

  function claimedByOther(s, k) {
    return G.kids.some((o) => o !== k && o.alive && o.team === k.team && (o.ai.stone === s || o.carrying === s));
  }

  function chooseStone(k) {
    const h = G.ball.holder && G.ball.holder.team !== k.team ? G.ball.holder : null;
    let best = null, bestScore = Infinity;
    for (const s of G.stones) {
      if (s.placed || s.staged || s.carriedBy || claimedByOther(s, k)) continue;
      let score = Math.hypot(s.x - k.x, s.y - k.y) + 0.6 * dist(s, TOWER);
      if (orderOn()) score += s.i === G.placed ? -160 : (s.i - G.placed) * 50;
      if (h && dist(s, h) < 220) score += 220;
      if (score < bestScore) { bestScore = score; best = s; }
    }
    return best;
  }

  function dodgeVector(k, P, dt) {
    const b = G.ball;
    if (b.holder || !b.live || b.throwTeam === k.team) return null;
    if (k.ai.dodgeId !== b.throwId) {
      k.ai.dodgeId = b.throwId;
      k.ai.willDodge = Math.random() < P.dodge;
      k.ai.dodgeDelay = rand(0.04, 0.2);
      k.ai.dodgeT = 0;
    }
    k.ai.dodgeT += dt;
    if (!k.ai.willDodge || k.ai.dodgeT < k.ai.dodgeDelay) return null;
    const rx = k.x - b.x, ry = k.y - b.y;
    const vv = b.vx * b.vx + b.vy * b.vy;
    if (vv < 1) return null;
    const tt = (rx * b.vx + ry * b.vy) / vv;
    if (tt < 0 || tt > 0.6) return null;
    let cx = rx - b.vx * tt, cy = ry - b.vy * tt;
    let d = Math.hypot(cx, cy);
    if (d > 46) return null;
    if (d < 1) { cx = -b.vy; cy = b.vx; d = Math.hypot(cx, cy); }
    return { x: cx / d, y: cy / d };
  }

  // --- AI: defenders ---------------------------------------------------------
  function defenderAI(k, dt) {
    const P = params(k);
    const b = G.ball;

    if (k.hasBall) {
      k.holdT += dt;
      applyMove(k, 0, 0, dt, 1, 20);
      if (k.holdT >= k.ai.react) decideThrow(k, P);
      return;
    }

    if (k.ai.receiving && !b.holder && b.passTo === k) {
      steer(k, predictLanding(b, 36), dt, 0.8);
      return;
    }
    k.ai.receiving = false;

    if (!b.holder) {
      const chasers = aliveOf(k.team)
        .filter((x) => !x.isHuman)
        .sort((a, c) => dist(a, b) - dist(c, b))
        .slice(0, 2);
      if (chasers.includes(k)) {
        const lead = Math.min(0.5, dist(k, b) / 600);
        steer(k, { x: b.x + b.vx * lead, y: b.y + b.vy * lead }, dt, 1);
        return;
      }
    }

    // Get open near a dangerous attacker so a pass can set up a short throw.
    const targets = rankAttackers(k);
    if (targets.length) {
      const tk = targets[k.idx % targets.length];
      const side = k.idx % 2 ? 1 : -1;
      const a = Math.atan2(tk.y - TOWER.y, tk.x - TOWER.x) + side * 0.9 + Math.sin(G.time * 0.7 + k.ai.wobble) * 0.3;
      steer(k, { x: tk.x + Math.cos(a) * 190, y: tk.y + Math.sin(a) * 190 }, dt, 0.85);
    } else {
      steer(k, k.home, dt, 0.8);
    }
  }

  function rankAttackers(from) {
    return aliveOf(G.attacking)
      .map((a) => {
        let s = -dist(from, a);
        if (a.carrying) s += 140;
        if (dist(a, TOWER) < 140) s += 120;
        if (a.placeT > 0) s += 200;
        return { a, s };
      })
      .sort((p, q) => q.s - p.s)
      .map((p) => p.a);
  }

  function decideThrow(k, P) {
    const targets = rankAttackers(k);
    if (!targets.length) return;
    const tk = targets[0];
    const d = dist(k, tk);
    if (d <= P.range) { throwAt(k, tk, P); return; }

    let mate = null, md = Infinity;
    aliveOf(k.team).forEach((m) => {
      if (m === k) return;
      const dm = dist(m, tk);
      if (dm < d - 130 && dist(k, m) < 760 && dm < md) { md = dm; mate = m; }
    });
    if (mate && k.holdT < k.ai.react + 1.2) {
      launch(k, mate.x, mate.y, 740, 38, true);
      G.ball.passTo = mate;
      mate.ai.receiving = true;
    } else if (k.holdT > k.ai.react + 1.0) {
      throwAt(k, tk, P);
    }
  }

  function throwAt(k, tk, P) {
    const sp = P.throwSpd;
    let px = tk.x, py = tk.y;
    for (let i = 0; i < 2; i++) {
      const tt = Math.hypot(px - k.x, py - k.y) / sp;
      px = tk.x + tk.vx * tt * P.lead;
      py = tk.y + tk.vy * tt * P.lead;
    }
    px += gauss() * P.errPx;
    py += gauss() * P.errPx;
    launch(k, px, py, sp, 26, true);
    G.ball.targetKid = tk;
  }

  // --- Ball physics ----------------------------------------------------------
  function updateBall(dt) {
    const b = G.ball;
    if (!b) return;
    b.kickCD = Math.max(0, b.kickCD - dt);
    if (b.ignoreT > 0) { b.ignoreT -= dt; if (b.ignoreT <= 0) b.ignore = null; }

    if (b.holder) {
      const h = b.holder;
      b.x = h.x + h.fx * 12; b.y = h.y + 1; b.z = h.carrying ? 30 : 22;
      return;
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    b.vz -= GRAV * dt;
    if (b.fromThrow && b.z > 0) b.vy += G.wind * WIND_ACC * dt;
    b.spin += Math.hypot(b.vx, b.vy) * dt * 0.05;

    if (b.z <= 0) {
      b.z = 0;
      if (b.vz < -120) {
        sound("bounce", r1(-b.vz / 600));
        b.vz = -b.vz * 0.42;
        b.vx *= 0.86; b.vy *= 0.86;
        b.bounced++;
        b.live = false;
        b.fromThrow = false;
        if (b.bounced === 1) fxDust(b.x, b.y, 3, "#d9c08f");
      } else {
        b.vz = 0;
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > 0) {
          const ns = Math.max(0, sp - 650 * dt);
          b.vx *= ns / sp; b.vy *= ns / sp;
        }
        b.live = false;
        b.fromThrow = false;
      }
    }

    // Field walls
    const L = 40, R = W - 40, T = 140, B = H - 40;
    if (b.x < L) { b.x = L; b.vx = Math.abs(b.vx) * 0.55; }
    if (b.x > R) { b.x = R; b.vx = -Math.abs(b.vx) * 0.55; }
    if (b.y < T) { b.y = T; b.vy = Math.abs(b.vy) * 0.55; }
    if (b.y > B) { b.y = B; b.vy = -Math.abs(b.vy) * 0.55; }

    // Tower hit
    if (G.phase === "throw" && G.towerUp && b.throwTeam === G.attacking &&
        Math.hypot(b.x - TOWER.x, b.y - TOWER.y) < TOWER_HIT_R && b.z < TOWER_H + BALL_R) {
      knockDown();
      return;
    }

    // Ball vs kids
    if (G.phase !== "throw" && G.phase !== "rebuild") return;
    for (const k of G.kids) {
      if (!k.alive || k === b.ignore || b.holder) continue;
      const d = Math.hypot(k.x - b.x, k.y - b.y);
      if (isAttacker(k)) {
        if (b.live && b.throwTeam !== k.team && d < HIT_R && b.z < 58) {
          if (!tutorialFrozen()) hitKid(k);
        } else if (G.phase === "rebuild" && !b.live && b.z < 26 && d < KID_R + BALL_R + 3 && b.kickCD <= 0) {
          kickBall(k);
        }
      } else if (b.fromThrow && b.bounced === 0 && d < 30 && b.z < 78) {
        catchOnTheFull(k);
      } else if (G.phase === "rebuild" && d < 24 && b.z < 64) {
        defenderTakeBall(k);
      }
    }
  }

  function hitKid(k) {
    const b = G.ball;
    const by = b.thrower && b.thrower.ctl;
    if (by && G.mode === "play") { by.stats.hits++; addTotalFor(by, "hits"); }
    b.vx *= -0.3; b.vy *= -0.3; b.vz = 160;
    b.live = false;
    shakeScreen(6);
    fxDust(k.x, k.y, 8, "#ffffff");
    sound("hit");
    eliminate(k, "hit");
  }

  function kickBall(k) {
    const b = G.ball;
    const sp = Math.hypot(k.vx, k.vy);
    let dx, dy;
    if (sp > 30) { dx = k.vx / sp; dy = k.vy / sp; }
    else { const d = Math.hypot(b.x - k.x, b.y - k.y) || 1; dx = (b.x - k.x) / d; dy = (b.y - k.y) / d; }
    const power = 470 + Math.min(sp, 600) * 0.9;
    b.vx = dx * power; b.vy = dy * power; b.vz = 120;
    b.kickCD = 0.35; b.live = false; b.fromThrow = false; b.ignore = k; b.ignoreT = 0.2;
    if (k.ctl && G.mode === "play") { k.ctl.stats.kicks++; addTotalFor(k.ctl, "kicks"); }
    fxDust(b.x, b.y, 4, "#d9c08f");
    sound("kick");
  }

  function catchOnTheFull(k) {
    const b = G.ball;
    const thrower = b.thrower;
    defenderTakeBall(k);
    if (k.ctl && G.mode === "play") { k.ctl.stats.catches++; unlockFor(k.ctl, "safe_hands"); }
    if (!G.rules.catchOut) return;
    if (thrower && thrower.alive) eliminate(thrower, "caught");
    if (G.mode === "play" && G.phase === "throw" && thrower) fx({ e: "caught", thr: kidIdx(thrower), team: k.team });
  }

  // --- Stones physics --------------------------------------------------------
  function updateStones(dt) {
    for (const s of G.stones) {
      if (s.placed || s.carriedBy || s.staged) continue;
      if (s.z <= 0 && s.vx === 0 && s.vy === 0 && s.vz === 0) continue;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      s.vz -= GRAV * dt;
      if (s.z <= 0) {
        s.z = 0;
        if (s.vz < -110) {
          if (s.vz < -250) sound("clack");
          s.vz = -s.vz * 0.28;
          s.vx *= 0.65; s.vy *= 0.65;
        } else {
          s.vz = 0;
          const sp = Math.hypot(s.vx, s.vy);
          const ns = Math.max(0, sp - 900 * dt);
          if (ns === 0) { s.vx = 0; s.vy = 0; }
          else { s.vx *= ns / sp; s.vy *= ns / sp; }
        }
      }
      if (s.x < BOUNDS.l) { s.x = BOUNDS.l; s.vx = Math.abs(s.vx) * 0.4; }
      if (s.x > BOUNDS.r) { s.x = BOUNDS.r; s.vx = -Math.abs(s.vx) * 0.4; }
      if (s.y < BOUNDS.t) { s.y = BOUNDS.t; s.vy = Math.abs(s.vy) * 0.4; }
      if (s.y > BOUNDS.b) { s.y = BOUNDS.b; s.vy = -Math.abs(s.vy) * 0.4; }
    }
  }

  // ---------------------------------------------------------------------------
  // Particles (drawn locally; the host sends fx events for them)
  // ---------------------------------------------------------------------------
  function dust(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(30, 140);
      G.particles.push({ type: "dust", x, y, z: rand(0, 10), vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rand(20, 90), life: 0, max: rand(0.4, 0.8), size: rand(4, 9), color });
    }
    trimParticles();
  }

  function sparkle(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(60, 180);
      G.particles.push({ type: "spark", x, y, z: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 0, life: 0, max: rand(0.35, 0.6), size: rand(2, 4), color: "#fff3b0" });
    }
    trimParticles();
  }

  function confettiBurst(x, y, n) {
    const cols = ["#f08a24", "#e0457b", "#2f6fc0", "#e8c22a", "#ffffff", "#52b06a"];
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI, 0);
      const s = rand(200, 620);
      G.particles.push({ type: "confetti", x, y, z: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 0, life: 0, max: rand(1.4, 2.4), size: rand(5, 9), color: pick(cols), rot: rand(0, 6), vr: rand(-10, 10) });
    }
    trimParticles();
  }

  function trimParticles() {
    if (G.particles.length > 450) G.particles.splice(0, G.particles.length - 450);
  }

  function updateFx(dt) {
    for (const p of G.particles) {
      p.life += dt;
      if (p.type === "confetti") {
        p.vy += 700 * dt; p.vx *= 1 - dt * 1.5; p.rot += p.vr * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
      } else {
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        p.vx *= 1 - dt * 3; p.vy *= 1 - dt * 3; p.vz -= 120 * dt;
        if (p.z < 0) p.z = 0;
      }
    }
    G.particles = G.particles.filter((p) => p.life < p.max);
    for (const f of G.floaters) { f.life += dt; f.y -= 40 * dt; }
    G.floaters = G.floaters.filter((f) => f.life < f.max);
  }

  // ---------------------------------------------------------------------------
  // Online play: the host runs the game and sends snapshots; the friend's device
  // draws them, moves its own kid and sends back position and actions.
  // ---------------------------------------------------------------------------
  let netSendT = 0;

  function hostSnapshot() {
    const b = G.ball;
    Net.send({
      t: "s",
      ph: G.phase, sc: G.scores, at: G.attacking, rd: G.round,
      ts: G.throwState, ti: G.throwIdx, tn: G.throwOrder.length, th: kidIdx(currentThrower()),
      tp: [r1(G.throwPos.x), r1(G.throwPos.y)], wi: r2(G.wind),
      pl: G.placed, tu: G.towerUp ? 1 : 0, rt: r1(G.rebuildT), lw: G.lastWinner,
      k: G.kids.map((k) => [
        r1(k.x), r1(k.y), r1(k.vx), r1(k.vy), r2(k.fx), r2(k.fy),
        k.alive ? 1 : 0, k.carrying ? k.carrying.i : -1, k.hasBall ? 1 : 0,
        r2(k.placeT), r2(k.holdT), r2(k.dashCD), r1(k.cheer), r2(k.throwAnim), r2(k.hitFlash),
        k.ctl ? k.ctl.id : 0, k.bench ? k.bench.x : 0,
      ]),
      s: G.stones.map((s) => [r1(s.x), r1(s.y), r1(s.z), s.placed ? 1 : 0, s.staged ? 1 : 0, s.carriedBy ? kidIdx(s.carriedBy) : -1]),
      b: [r1(b.x), r1(b.y), r1(b.z), r1(b.vx), r1(b.vy), r1(b.vz), b.live ? 1 : 0, kidIdx(b.holder), kidIdx(b.targetKid), r1(b.spin)],
      ev: netEvents.splice(0, netEvents.length),
    });
  }

  function matchSetupMessage() {
    return {
      t: "start",
      teams: G.teams.map((tm) => ({ id: tm.id, label: tm.label })),
      kids: G.kids.map((k) => ({ team: k.team, idx: k.idx, names: k.names, skin: k.skin, hair: k.hair, hairStyle: k.hairStyle })),
      field: G.field, rules: G.rules, diff: G.diff, target: G.target, mode: G.online.mode,
      ctls: G.ctls.map((c) => ({ id: c.id, team: c.team, kid: kidIdx(c.kid) })),
    };
  }

  function startGuestMatch(m) {
    G.mode = "play";
    G.ctx = "online";
    G.net = "guest";
    G.online = { mode: m.mode };
    G.teams = m.teams.map((tm) => teamFor(tm.id, tm.label));
    G.rules = m.rules;
    G.diff = m.diff;
    const D = DIFF[m.diff] || DIFF.normal;
    G.sweet = D.sweet;
    G.meter = D.meter;
    G.aimHelp = D.aimHelp;
    G.target = m.target;
    G.scores = [0, 0];
    G.round = 0;
    G.newAch = [];
    G.tut = null;
    G.paused = false;
    G.phase = "intro";
    G.particles.length = 0;
    G.floaters.length = 0;
    G.snap = null;
    setField(m.field);
    G.kids = m.kids.map((d) => makeKid(d.team, d.idx, d.names, d));
    G.ctls = m.ctls.map((c) => makeCtl(c.id, c.team, c.id === "g"));
    G.localCtl = ctlById("g");
    m.ctls.forEach((c) => bindCtl(ctlById(c.id), G.kids[c.kid]));
    G.humanTeam = G.localCtl.team;
    G.stats = G.localCtl.stats;
    makeStones();
    makeBall();
    hudReset();
    cam.snap = true;
  }

  function applySnapshot(m) {
    const first = !G.snap;
    G.snap = m;
    G.snapAt = G.time;
    if (G.phase !== m.ph) G.phaseT = 0;
    G.phase = m.ph;
    G.scores = m.sc;
    G.attacking = m.at;
    G.round = m.rd;
    G.throwState = m.ts;
    G.throwIdx = m.ti;
    G.throwOrder.length = m.tn;
    G.snapThrower = m.th;
    G.throwPos = { x: m.tp[0], y: m.tp[1] };
    G.wind = m.wi;
    G.placed = m.pl;
    G.towerUp = !!m.tu;
    G.rebuildT = m.rt;
    G.lastWinner = m.lw;

    // Stones first, so kids can point at the stone they carry.
    G.stones.forEach((s, i) => {
      const a = m.s[i];
      s.sx = a[0]; s.sy = a[1]; s.sz = a[2];
      s.placed = !!a[3]; s.staged = !!a[4];
      s.carriedBy = a[5] >= 0 ? G.kids[a[5]] : null;
      if (first || s.placed || s.staged) { s.x = s.sx; s.y = s.sy; s.z = s.sz; }
    });

    const prevKid = G.human;
    G.ctls.forEach((c) => { c.kid = null; });
    G.kids.forEach((k, i) => {
      const a = m.k[i];
      if (!a) return;
      k.sx = a[0]; k.sy = a[1]; k.svx = a[2]; k.svy = a[3];
      if (k !== prevKid || !freeMove(k)) { k.fx = a[4]; k.fy = a[5]; }
      k.alive = !!a[6];
      k.carrying = a[7] >= 0 ? G.stones[a[7]] : null;
      k.hasBall = !!a[8];
      k.placeT = a[9]; k.holdT = a[10];
      if (k !== prevKid) k.dashCD = a[11];
      k.cheer = a[12]; k.throwAnim = a[13]; k.hitFlash = a[14];
      const ctl = a[15] ? ctlById(a[15]) : null;
      k.ctl = ctl; k.isHuman = !!ctl;
      if (ctl) ctl.kid = k;
      k.bench = k.alive ? null : { x: a[16], y: 864 };
      if (first) { k.x = k.sx; k.y = k.sy; }
    });
    syncHuman();
    if (G.human && G.human !== prevKid) {
      G.localCtl.switchFlash = 0.45;
      G.human.x = G.human.sx; G.human.y = G.human.sy;
    }

    const b = G.ball;
    const ba = m.b;
    b.sx = ba[0]; b.sy = ba[1]; b.sz = ba[2]; b.vx = ba[3]; b.vy = ba[4]; b.vz = ba[5];
    b.live = !!ba[6];
    b.holder = ba[7] >= 0 ? G.kids[ba[7]] : null;
    b.targetKid = ba[8] >= 0 ? G.kids[ba[8]] : null;
    b.spin = ba[9];
    if (first) { b.x = b.sx; b.y = b.sy; b.z = b.sz; }

    (m.ev || []).forEach(applyFx);
  }

  // Guest frame: smooth everything toward the latest snapshot, move our own kid locally.
  function guestUpdate(dt) {
    G.time += dt;
    G.phaseT += dt;
    updateFx(dt);
    if (!G.snap) return;
    const age = Math.min(0.15, G.time - G.snapAt);
    const a = Math.min(1, dt * 14);
    const own = G.human;
    const ownFree = freeMove(own);

    G.kids.forEach((k) => {
      if (k === own && ownFree) return;
      const tx = k.sx + k.svx * age, ty = k.sy + k.svy * age;
      if (Math.hypot(tx - k.x, ty - k.y) > 220) { k.x = tx; k.y = ty; }
      k.x += (tx - k.x) * a;
      k.y += (ty - k.y) * a;
      k.vx = k.svx; k.vy = k.svy;
    });

    if (own && ownFree) {
      const v = input.moveVector();
      let dx = v.x, dy = v.y;
      if (own.dashT > 0 && !dx && !dy) { dx = own.fx; dy = own.fy; }
      applyMove(own, dx, dy, dt, 1, 14);
      own.x = clamp(own.x + own.vx * dt, BOUNDS.l, BOUNDS.r);
      own.y = clamp(own.y + own.vy * dt, BOUNDS.t, BOUNDS.b);
      if (!isAttacker(own)) keepOutOfCircle(own);
      const sp = Math.hypot(own.vx, own.vy);
      if (sp > 18) { own.fx = own.vx / sp; own.fy = own.vy / sp; }
      // If the host disagrees a lot (we were pushed or moved), accept its position.
      if (Math.hypot(own.sx - own.x, own.sy - own.y) > 160) { own.x = own.sx; own.y = own.sy; }
    }
    if (own && own.hasBall && input.pointer.valid) {
      const ax = input.pointer.x - own.x, ay = input.pointer.y - own.y;
      const d = Math.hypot(ax, ay) || 1;
      own.fx = ax / d; own.fy = ay / d;
    }

    G.kids.forEach((k) => {
      const sp = Math.hypot(k.vx, k.vy);
      if (sp > 18) k.anim += sp * dt * 0.055;
      if (k === own) { k.dashT = Math.max(0, k.dashT - dt); k.dashCD = Math.max(0, k.dashCD - dt); }
    });

    G.stones.forEach((s) => {
      if (s.carriedBy) { s.x = s.carriedBy.x; s.y = s.carriedBy.y + 0.5; s.z = 58; return; }
      if (s.placed || s.staged) return;
      s.x += (s.sx - s.x) * a; s.y += (s.sy - s.y) * a; s.z += (s.sz - s.z) * a;
    });

    const b = G.ball;
    if (b.holder) {
      const h = b.holder;
      b.x = h.x + h.fx * 12; b.y = h.y + 1; b.z = 22;
    } else {
      const tx = b.sx + b.vx * age, ty = b.sy + b.vy * age;
      const tz = Math.max(0, b.sz + b.vz * age - 0.5 * GRAV * age * age);
      if (Math.hypot(tx - b.x, ty - b.y) > 200) { b.x = tx; b.y = ty; }
      const ba = Math.min(1, dt * 25);
      b.x += (tx - b.x) * ba; b.y += (ty - b.y) * ba; b.z += (tz - b.z) * ba;
      b.spin += Math.hypot(b.vx, b.vy) * dt * 0.05;
    }

    G.shake = Math.max(0, G.shake - dt * 40);
    G.ctls.forEach((c) => { c.switchFlash = Math.max(0, c.switchFlash - dt); });
    updateLocalAim(dt);
    updateLock(G.localCtl);

    netSendT += dt;
    if (netSendT >= INPUT_EVERY) {
      netSendT = 0;
      const msg = { t: "in", k: kidIdx(own) };
      if (own && freeMove(own)) msg.p = [r1(own.x), r1(own.y), r1(own.vx), r1(own.vy)];
      Net.send(msg);
    }
  }

  function guestMatchEnd(ev) {
    G.phase = "matchEnd";
    const won = ev.w === localTeam();
    G.stats = ev.st || G.localCtl.stats;
    if (won) {
      settings.wins++;
      unlock("first_win");
      if (G.diff === "hard" && G.online.mode === "coop") unlock("tough");
      sfx.win();
      confettiBurst(W / 2, H / 2 - 100, 140);
    } else {
      settings.losses++;
    }
    saveSettings();
    clearTimeout(resultTimer);
    resultTimer = setTimeout(() => showResult(won, null), 1300);
  }

  function hostOnData(m) {
    if (!m || G.net !== "host") return;
    const guest = ctlById("g");
    if (!guest) return;
    if (m.t === "in") {
      if (Array.isArray(m.p)) guest.net = { kid: m.k, x: +m.p[0], y: +m.p[1], vx: +m.p[2], vy: +m.p[3], at: G.time };
    } else if (m.t === "act" && m.x && typeof m.x.a === "string") {
      applyAction(guest, m.x);
    }
  }

  // ---------------------------------------------------------------------------
  // Camera
  // ---------------------------------------------------------------------------
  const canvas = $("#game");
  const ctx = canvas.getContext("2d");
  const view = { cw: 0, ch: 0, dpr: 1, base: 1 };
  const cam = { x: W / 2, y: H / 2, k: 1, follow: false, snap: true };
  const BGX = 320, BGY = 220;
  let bgCanvas = null;
  let bgScale = 0;
  let bgField = "";
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function wantFollow() {
    if (G.mode !== "play" || currentScreen !== "game") return false;
    if (settings.camera === "follow") return true;
    return settings.camera === "auto" && view.base < 0.62;
  }

  const ZOOM_MIN = 0.6, ZOOM_MAX = 2.6;

  function updateCamera(dt) {
    const base = view.base;
    let tk = base;
    const playing = G.mode === "play" && currentScreen === "game";
    if (wantFollow()) {
      const VW = G.phase === "throw" || G.phase === "intro" ? 860 : 980;
      tk = Math.max(base, Math.min(view.cw / VW, view.ch / (VW * 0.56)));
    }
    // The player's own zoom (buttons, pinch or mouse wheel) scales whatever the camera chose.
    if (playing) tk = clamp(tk * settings.zoom, base, base * 3.2);
    let tx = W / 2, ty = H / 2;
    if (tk > base * 1.02) {
      let cx = TOWER.x, cy = TOWER.y;
      if (G.phase === "throw" || G.phase === "intro") {
        cx = (G.throwPos.x + TOWER.x) / 2 + 40; cy = (G.throwPos.y + TOWER.y) / 2 - 20;
      } else if (G.human && G.human.alive && G.phase === "rebuild") {
        cx = G.human.x; cy = G.human.y - 20;
      }
      const hw = view.cw / (2 * tk), hh = view.ch / (2 * tk);
      tx = hw * 2 >= W ? W / 2 : clamp(cx, hw, W - hw);
      ty = hh * 2 >= H ? H / 2 : clamp(cy, hh, H - hh);
    }
    cam.follow = tk > base * 1.05;
    if (cam.snap) {
      cam.k = tk; cam.x = tx; cam.y = ty; cam.snap = false;
    } else {
      const a = Math.min(1, dt * 5);
      cam.k += (tk - cam.k) * a;
      cam.x += (tx - cam.x) * a;
      cam.y += (ty - cam.y) * a;
    }
  }

  function setZoom(z) {
    settings.zoom = clamp(z, ZOOM_MIN, ZOOM_MAX);
    saveSettings();
  }

  function resize() {
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.cw = window.innerWidth;
    view.ch = window.innerHeight;
    canvas.width = Math.round(view.cw * view.dpr);
    canvas.height = Math.round(view.ch * view.dpr);
    view.base = Math.min(view.cw / W, view.ch / H);
    cam.snap = true;
    ensureBackground();
  }

  function ensureBackground() {
    const fullW = W + BGX * 2, fullH = H + BGY * 2;
    const maxK = Math.max(view.base, Math.min(view.cw / 860, view.ch / (860 * 0.56)));
    const want = Math.min(maxK * view.dpr, 4096 / fullW, Math.sqrt(9e6 / (fullW * fullH)));
    if (!bgCanvas || bgField !== G.field || Math.abs(want - bgScale) / bgScale > 0.12) buildBackground(want, G.field);
  }

  function setField(id) {
    G.field = id;
    ensureBackground();
    if (G.mode === "play") Sound.startAmbience(id);
  }

  // Phones and touch screens get a clean field: fewer words, smaller overlays.
  const compactUI = () => input.isTouch || view.base < 0.62;

  const toWorld = (cx, cy) => ({ x: (cx - view.cw / 2) / cam.k + cam.x, y: (cy - view.ch / 2) / cam.k + cam.y });

  // ---------------------------------------------------------------------------
  // Background (pre-rendered once per field and resolution)
  // ---------------------------------------------------------------------------
  const FIELD_LOOK = {
    village: { grass: ["#5d9a45", "#6aa84d", "#5a9343"], dirt: "196,160,104", patch: 0.75 },
    school: { grass: ["#7f9b4b", "#8aa652", "#7a924a"], dirt: "201,168,112", patch: 0.95 },
    river: { grass: ["#5a9a4a", "#68a950", "#57924a"], dirt: "196,165,110", patch: 0.7 },
    monsoon: { grass: ["#3e7c38", "#478a40", "#3b7536"], dirt: "150,125,85", patch: 0.55 },
    festival: { grass: ["#5d9a45", "#6aa84d", "#5a9343"], dirt: "200,160,100", patch: 0.8 },
  };

  function buildBackground(s, field) {
    bgScale = s;
    bgField = field;
    const look = FIELD_LOOK[field] || FIELD_LOOK.village;
    const fullW = W + BGX * 2, fullH = H + BGY * 2;
    bgCanvas = document.createElement("canvas");
    bgCanvas.width = Math.ceil(fullW * s);
    bgCanvas.height = Math.ceil(fullH * s);
    const c = bgCanvas.getContext("2d");
    c.setTransform(s, 0, 0, s, BGX * s, BGY * s);
    const r = mulberry32(2024);

    const g = c.createLinearGradient(0, -BGY, 0, H + BGY);
    g.addColorStop(0, look.grass[0]);
    g.addColorStop(0.5, look.grass[1]);
    g.addColorStop(1, look.grass[2]);
    c.fillStyle = g;
    c.fillRect(-BGX, -BGY, fullW, fullH);

    for (let x = -BGX; x < W + BGX; x += 110) {
      if (((x + BGX) / 110) % 2 < 1) {
        c.fillStyle = "rgba(255,255,255,0.035)";
        c.fillRect(x, -BGY, 110, fullH);
      }
    }

    for (let i = 0; i < 5200; i++) {
      const x = -BGX + r() * fullW, y = -BGY + r() * fullH;
      c.strokeStyle = r() < 0.5 ? "rgba(40,80,25,0.22)" : "rgba(170,210,110,0.18)";
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 4);
      c.stroke();
    }

    const patch = (x, y, rx, ry, a) => {
      const pg = c.createRadialGradient(x, y, 0, x, y, rx);
      pg.addColorStop(0, `rgba(${look.dirt},${a})`);
      pg.addColorStop(0.7, `rgba(${look.dirt},${a * 0.5})`);
      pg.addColorStop(1, `rgba(${look.dirt},0)`);
      c.save();
      c.translate(x, y);
      c.scale(1, ry / rx);
      c.translate(-x, -y);
      c.fillStyle = pg;
      c.beginPath();
      c.arc(x, y, rx, 0, Math.PI * 2);
      c.fill();
      c.restore();
    };
    patch(TOWER.x, TOWER.y, 230, 170, look.patch);
    patch(THROW_X, TOWER.y, 120, 230, look.patch * 0.75);
    patch(560, 490, 200, 60, look.patch * 0.45);
    const extra = field === "school" ? 16 : 9;
    for (let i = 0; i < extra; i++) patch(BOUNDS.l + r() * (BOUNDS.r - BOUNDS.l), BOUNDS.t + r() * (BOUNDS.b - BOUNDS.t), 60 + r() * 70, 30 + r() * 30, 0.25);

    if (field === "monsoon") {
      for (let i = 0; i < 12; i++) {
        const x = BOUNDS.l + r() * (BOUNDS.r - BOUNDS.l), y = BOUNDS.t + r() * (BOUNDS.b - BOUNDS.t);
        if (Math.hypot(x - TOWER.x, y - TOWER.y) < 140) continue;
        c.fillStyle = "rgba(120,150,170,0.45)";
        c.beginPath();
        c.ellipse(x, y, 30 + r() * 40, 10 + r() * 12, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "rgba(220,235,245,0.25)";
        c.beginPath();
        c.ellipse(x - 8, y - 3, 12, 3, 0, 0, Math.PI * 2);
        c.fill();
      }
    }

    for (let i = 0; i < 160; i++) {
      const a = r() * Math.PI * 2, d = r() * 200;
      const x = TOWER.x + Math.cos(a) * d, y = TOWER.y + Math.sin(a) * d * 0.72;
      c.fillStyle = r() < 0.5 ? "rgba(120,90,55,0.35)" : "rgba(245,230,200,0.35)";
      c.beginPath();
      c.ellipse(x, y, 1 + r() * 2.2, 0.8 + r() * 1.4, 0, 0, Math.PI * 2);
      c.fill();
    }

    c.strokeStyle = "rgba(255,255,255,0.5)";
    c.lineWidth = 4;
    c.setLineDash([]);
    roundRect(c, BOUNDS.l - 24, BOUNDS.t - 24, BOUNDS.r - BOUNDS.l + 48, BOUNDS.b - BOUNDS.t + 48, 30);
    c.stroke();

    c.strokeStyle = "rgba(255,255,255,0.78)";
    c.lineWidth = 5;
    c.setLineDash([22, 12]);
    c.beginPath();
    c.moveTo(THROW_LINE_X, BOUNDS.t + 20);
    c.lineTo(THROW_LINE_X, BOUNDS.b - 20);
    c.stroke();

    c.setLineDash([]);
    c.lineWidth = 4;
    c.strokeStyle = "rgba(255,255,255,0.7)";
    c.beginPath();
    c.ellipse(TOWER.x, TOWER.y, CIRCLE_R, CIRCLE_R * RING_Y, 0, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = "rgba(255,255,255,0.06)";
    c.fill();

    drawTopBand(c, field, r);

    const trees = [];
    for (let y = 150; y < H + BGY; y += 120 + r() * 60) {
      trees.push({ x: 20 + r() * 30 - (r() < 0.5 ? 70 : 0), y, s: 0.7 + r() * 0.5 });
      trees.push({ x: W - 20 - r() * 30 + (r() < 0.5 ? 70 : 0), y, s: 0.7 + r() * 0.5 });
    }
    trees.sort((a, b) => a.y - b.y);
    trees.forEach((tr) => drawTree(c, tr.x, tr.y, tr.s, r, field === "monsoon"));

    drawBench(c, 120, 868, 260);
    drawBench(c, W - 380, 868, 260);

    for (let i = 0; i < 70; i++) {
      const x = -BGX + r() * fullW, y = 835 + r() * (H + BGY - 835);
      if (y > 850 && y < 885 && ((x > 100 && x < 400) || (x > W - 400 && x < W - 100))) continue;
      c.fillStyle = ["#fff7d6", "#ffd84a", "#ff8fb1", "#ffffff"][(r() * 4) | 0];
      c.beginPath();
      c.arc(x, y, 2 + r() * 2, 0, Math.PI * 2);
      c.fill();
    }

    if (field === "monsoon") {
      c.fillStyle = "rgba(40,60,80,0.2)";
      c.fillRect(-BGX, -BGY, fullW, fullH);
    } else if (field === "festival") {
      c.fillStyle = "rgba(255,150,60,0.08)";
      c.fillRect(-BGX, -BGY, fullW, fullH);
    }

    const v = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.85);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(10,25,5,0.42)");
    c.fillStyle = v;
    c.fillRect(-BGX, -BGY, fullW, fullH);
  }

  function drawTopBand(c, field, r) {
    if (field === "river") {
      const wg = c.createLinearGradient(0, -BGY, 0, 112);
      wg.addColorStop(0, "#3d7aa0");
      wg.addColorStop(1, "#5d9dc0");
      c.fillStyle = wg;
      c.fillRect(-BGX, -BGY, W + BGX * 2, BGY + 112);
      c.strokeStyle = "rgba(255,255,255,0.35)";
      c.lineWidth = 2;
      for (let i = 0; i < 40; i++) {
        const x = -BGX + r() * (W + BGX * 2), y = -40 + r() * 140;
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 12, y - 4, x + 24, y); c.stroke();
      }
      c.fillStyle = "#d9c18e";
      c.fillRect(-BGX, 104, W + BGX * 2, 22);
      drawBoat(c, 1080, 50);
      drawBoat(c, 360, 0, 0.75);
      c.strokeStyle = "#3f6a2c";
      c.lineWidth = 2;
      for (let i = 0; i < 60; i++) {
        const x = -BGX + r() * (W + BGX * 2);
        c.beginPath(); c.moveTo(x, 126); c.lineTo(x + (r() - 0.5) * 8, 104 - r() * 18); c.stroke();
      }
      return;
    }

    if (field === "school") {
      c.fillStyle = "#a8452c";
      c.fillRect(-BGX, 64, W + BGX * 2, 66);
      c.strokeStyle = "rgba(255,220,190,0.35)";
      c.lineWidth = 1;
      for (let y = 64; y < 130; y += 11) {
        c.beginPath(); c.moveTo(-BGX, y); c.lineTo(W + BGX, y); c.stroke();
        for (let x = -BGX + ((y / 11) % 2) * 15; x < W + BGX; x += 30) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 11); c.stroke(); }
      }
      c.fillStyle = "#e9dcc0";
      c.fillRect(-BGX, 58, W + BGX * 2, 8);
      c.fillStyle = "#c9583b";
      c.fillRect(420, -120, 760, 186);
      c.fillStyle = "#8f3524";
      c.fillRect(400, -132, 800, 16);
      c.fillStyle = "#f6edd8";
      for (let i = 0; i < 9; i++) {
        c.fillRect(450 + i * 80, -90, 44, 40);
        c.fillRect(450 + i * 80, -20, 44, 40);
      }
      c.fillStyle = "#2b2118";
      c.fillRect(770, 0, 60, 66);
      c.fillStyle = "#ddd";
      c.fillRect(1290, -40, 5, 170);
      c.fillStyle = "#006a4e";
      c.fillRect(1295, -40, 80, 48);
      c.fillStyle = "#f42a41";
      c.beginPath(); c.arc(1330, -16, 13, 0, Math.PI * 2); c.fill();
      [[80, 70], [1480, 80], [-60, 100], [1640, 90]].forEach(([x, y]) => drawTree(c, x, y, 1, r, false));
      return;
    }

    const trees = [];
    for (let x = -BGX; x < W + BGX; x += 70 + r() * 50) trees.push({ x, y: 40 + r() * 70, s: 0.8 + r() * 0.6 });
    trees.sort((a, b) => a.y - b.y);
    trees.forEach((tr) => drawTree(c, tr.x, tr.y, tr.s, r, field === "monsoon"));
    drawPalm(c, 120, 128, 1.0, -1);
    drawPalm(c, W - 110, 120, 1.05, 1);

    if (field === "festival") {
      const cols = ["#e0457b", "#e8c22a", "#2f6fc0", "#f08a24", "#52b06a"];
      for (let i = 0; i < 6; i++) {
        const x = 260 + i * 200, y = 118;
        c.fillStyle = "#6b4a1f";
        c.fillRect(x - 46, y - 40, 4, 44);
        c.fillRect(x + 42, y - 40, 4, 44);
        c.fillStyle = cols[i % cols.length];
        c.beginPath(); c.moveTo(x - 56, y - 38); c.lineTo(x, y - 76); c.lineTo(x + 56, y - 38); c.closePath(); c.fill();
        c.fillStyle = "#fff7e8";
        c.fillRect(x - 40, y - 18, 80, 16);
      }
      for (let row = 0; row < 2; row++) {
        const y0 = 150 + row * 2;
        c.strokeStyle = "rgba(60,40,20,0.6)";
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(-BGX, y0);
        for (let x = -BGX; x <= W + BGX; x += 160) c.quadraticCurveTo(x + 80, y0 + 26, x + 160, y0);
        c.stroke();
        for (let x = -BGX + 10; x < W + BGX; x += 26) {
          const ph = ((x + BGX) % 160) / 160;
          const yy = y0 + Math.sin(ph * Math.PI) * 13;
          c.fillStyle = cols[((x / 26) | 0) % cols.length];
          c.beginPath(); c.moveTo(x - 8, yy); c.lineTo(x + 8, yy); c.lineTo(x, yy + 15); c.closePath(); c.fill();
        }
      }
    }
  }

  function drawBoat(c, x, y, s) {
    c.save();
    c.translate(x, y);
    c.scale(s || 1, s || 1);
    c.fillStyle = "rgba(0,0,0,0.18)";
    c.beginPath(); c.ellipse(0, 14, 90, 10, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#5a3a1e";
    c.beginPath();
    c.moveTo(-95, -6); c.quadraticCurveTo(0, 30, 95, -6); c.quadraticCurveTo(0, 10, -95, -6);
    c.fill();
    c.fillStyle = "#c9a15a";
    c.beginPath(); c.moveTo(-30, -2); c.quadraticCurveTo(0, -38, 34, -2); c.closePath(); c.fill();
    c.strokeStyle = "#7a5534"; c.lineWidth = 3;
    c.beginPath(); c.moveTo(60, -4); c.lineTo(100, -60); c.stroke();
    c.restore();
  }

  function drawTree(c, x, y, s, r, wet) {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.fillStyle = "rgba(20,40,10,0.28)";
    c.beginPath();
    c.ellipse(10, 38, 62, 18, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#5b3b22";
    c.fillRect(-6, 0, 12, 40);
    const blobs = [[-30, -6, 34], [26, -4, 32], [0, -26, 38], [-16, -40, 26], [20, -36, 26], [0, 4, 30]];
    c.fillStyle = wet ? "#1d4d22" : "#245c2a";
    blobs.forEach(([bx, by, br]) => { c.beginPath(); c.arc(bx, by, br, 0, Math.PI * 2); c.fill(); });
    c.fillStyle = wet ? "#27652b" : "#2f7533";
    blobs.forEach(([bx, by, br]) => { c.beginPath(); c.arc(bx - 4, by - 5, br * 0.78, 0, Math.PI * 2); c.fill(); });
    c.fillStyle = "rgba(160,210,100,0.35)";
    blobs.forEach(([bx, by, br]) => { c.beginPath(); c.arc(bx - 8, by - 10, br * 0.38, 0, Math.PI * 2); c.fill(); });
    if (r() < 0.3) {
      c.fillStyle = "#f2c94c";
      for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(-30 + r() * 60, -40 + r() * 40, 3, 0, Math.PI * 2); c.fill(); }
    }
    c.restore();
  }

  function drawPalm(c, x, y, s, dir) {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.fillStyle = "rgba(20,40,10,0.25)";
    c.beginPath();
    c.ellipse(dir * 40, 6, 80, 16, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#7a5534";
    c.lineWidth = 12;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(dir * 10, -70, dir * 34, -130);
    c.stroke();
    c.strokeStyle = "rgba(60,35,15,0.5)";
    c.lineWidth = 2;
    for (let i = 1; i < 9; i++) {
      const q = i / 9;
      const px = dir * (10 * 2 * (1 - q) * q + 34 * q * q), py = -70 * 2 * (1 - q) * q - 130 * q * q;
      c.beginPath(); c.moveTo(px - 6, py); c.lineTo(px + 6, py + 2); c.stroke();
    }
    const top = { x: dir * 34, y: -130 };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.2;
      const len = 70 + (i % 3) * 10;
      const ex = top.x + Math.cos(a) * len, ey = top.y + Math.sin(a) * len * 0.55 + 18;
      c.strokeStyle = i % 2 ? "#2e7a33" : "#3b8f3c";
      c.lineWidth = 9;
      c.beginPath();
      c.moveTo(top.x, top.y);
      c.quadraticCurveTo((top.x + ex) / 2, Math.min(top.y, ey) - 22, ex, ey);
      c.stroke();
    }
    c.fillStyle = "#6b4a1f";
    [[-6, 6], [6, 6], [0, 12]].forEach(([dx, dy]) => { c.beginPath(); c.arc(top.x + dx, top.y + dy, 7, 0, Math.PI * 2); c.fill(); });
    c.restore();
  }

  function drawBench(c, x, y, w) {
    c.fillStyle = "rgba(20,40,10,0.28)";
    c.beginPath();
    c.ellipse(x + w / 2, y + 12, w / 2 + 10, 10, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#8a5a33";
    roundRect(c, x, y - 6, w, 16, 7);
    c.fill();
    c.fillStyle = "#a8743f";
    roundRect(c, x, y - 8, w, 8, 5);
    c.fill();
    c.fillStyle = "#c48d55";
    c.beginPath();
    c.ellipse(x + 4, y + 1, 5, 7, 0, 0, Math.PI * 2);
    c.ellipse(x + w - 4, y + 1, 5, 7, 0, 0, Math.PI * 2);
    c.fill();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  function render() {
    const { dpr, cw, ch } = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#3e7330";
    ctx.fillRect(0, 0, cw, ch);

    let sx = 0, sy = 0;
    if (G.shake > 0) { sx = rand(-1, 1) * G.shake; sy = rand(-1, 1) * G.shake; }
    const k = cam.k;
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (cw / 2 - cam.x * k + sx * k), dpr * (ch / 2 - cam.y * k + sy * k));

    if (bgCanvas) ctx.drawImage(bgCanvas, -BGX, -BGY, W + BGX * 2, H + BGY * 2);

    drawGroundGuides();

    const items = [];
    G.kids.forEach((kd) => items.push({ y: kd.y, draw: () => drawKid(kd), shadow: () => shadowAt(kd.x, kd.y, 15, 0.26) }));
    G.stones.forEach((s) => {
      if (s.placed) return;
      const y = s.carriedBy ? s.carriedBy.y + 0.5 : s.y;
      items.push({ y, draw: () => drawSlab(s.x, s.y - s.z, s.w, s.col, s), shadow: s.carriedBy ? null : () => shadowAt(s.x, s.y, s.w * 0.55, 0.22 * (1 - Math.min(0.6, s.z / 120))) });
    });
    items.push({ y: TOWER.y, draw: drawTower, shadow: () => { if (G.placed) shadowAt(TOWER.x + 6, TOWER.y + 3, 30, 0.3); } });
    const b = G.ball;
    if (b) {
      const by = b.holder ? b.holder.y + 0.6 : b.y;
      items.push({ y: by, draw: drawBall, shadow: () => shadowAt(b.x, b.y, BALL_R * (1 - Math.min(0.5, b.z / 300)), 0.3 * (1 - Math.min(0.7, b.z / 200))) });
    }
    items.forEach((it) => it.shadow && it.shadow());
    items.sort((a, c) => a.y - c.y);
    items.forEach((it) => it.draw());

    drawParticles();
    if (G.field === "monsoon") drawRain();
    drawWind();
    drawAimUI();
    drawFloaters();

    // The overview map matters while chasing stones; during throws it would cover the meter.
    if (cam.follow && G.phase === "rebuild") drawMinimap();
  }

  function shadowAt(x, y, r, a) {
    ctx.fillStyle = `rgba(20,30,10,${a})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGroundGuides() {
    const h = G.human;
    if (G.phase === "rebuild" && h && h.alive && isAttacker(h) && (h.carrying || pileNext())) {
      const p = 0.5 + Math.sin(G.time * 6) * 0.25;
      ctx.strokeStyle = `rgba(255,243,176,${p})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(TOWER.x, TOWER.y, PLACE_R, PLACE_R * RING_Y, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (G.phase === "rebuild") {
      const p = (G.time * 1.6) % 1;
      G.stones.forEach((s) => {
        if (s.placed || s.carriedBy || s.z > 2) return;
        const next = orderOn() && s.i === G.placed;
        ctx.strokeStyle = next ? `rgba(255,205,60,${1 - p * 0.6})` : `rgba(255,255,255,${0.5 * (1 - p)})`;
        ctx.lineWidth = next ? 3.5 : 2;
        const rr = s.w * 0.5 + p * 16;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, rr, rr * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
    // Teammates you can switch to.
    if (canSwitch(G.localCtl)) {
      aliveOf(localTeam()).forEach((m) => {
        if (m.ctl) return;
        ctx.strokeStyle = teamOf(m.team).light;
        ctx.globalAlpha = 0.75;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.ellipse(m.x, m.y, 17, 7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      });
    }
    if (G.mode === "play") {
      G.ctls.forEach((c) => {
        const k = c.kid;
        if (!k || !k.alive) return;
        ctx.strokeStyle = c.local ? "rgba(255,255,255,0.9)" : teamOf(k.team).light;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(k.x, k.y, 19, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
  }

  function drawSlab(x, y, w, col, s) {
    const d = w * 0.42;
    const T = STONE_T;
    ctx.fillStyle = col.side;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y - T);
    ctx.lineTo(x - w / 2, y);
    ctx.ellipse(x, y, w / 2, d / 2, 0, Math.PI, 0, true);
    ctx.lineTo(x + w / 2, y - T);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = col.top;
    ctx.beginPath();
    ctx.ellipse(x, y - T, w / 2, d / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (s) {
      ctx.fillStyle = "rgba(90,30,15,0.35)";
      s.spots.forEach((p) => {
        ctx.beginPath();
        ctx.arc(x + Math.cos(p.a) * p.d * w * 0.4, y - T + Math.sin(p.a) * p.d * d * 0.4, p.s, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.strokeStyle = "rgba(255,225,190,0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x, y - T, w / 2 - 1, d / 2 - 1, 0, Math.PI * 1.05, Math.PI * 1.75);
    ctx.stroke();
  }

  function drawTower() {
    const placed = G.stones.filter((s) => s.placed).sort((a, b) => a.i - b.i);
    if (G.phase === "rebuild" && placed.length < STONE_W.length) {
      const nw = STONE_W[Math.min(G.placed, STONE_W.length - 1)];
      ctx.strokeStyle = "rgba(255,215,90,0.75)";
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(TOWER.x, TOWER.y - placed.length * STONE_T - STONE_T, nw / 2, nw * 0.21, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    placed.forEach((s, level) => drawSlab(TOWER.x, TOWER.y - level * STONE_T, s.w, s.col, s));
  }

  function drawBall() {
    const b = G.ball;
    const cx = b.x, cy = b.y - b.z - BALL_R;
    const g = ctx.createRadialGradient(cx - 2.5, cy - 3, 1, cx, cy, BALL_R);
    g.addColorStop(0, "#ff8a6a");
    g.addColorStop(0.55, "#e2392a");
    g.addColorStop(1, "#9e1d15");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(cx, cy, BALL_R * 0.62, b.spin, b.spin + Math.PI * 0.9);
    ctx.stroke();
    if (b.live && !b.holder) {
      ctx.strokeStyle = "rgba(255,240,200,0.5)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - b.vx * 0.035, cy - b.vy * 0.035 + b.vz * 0.035);
      ctx.stroke();
    }
  }

  function drawShirtPattern(team, sy) {
    ctx.fillStyle = team.pattern === "collar" ? "#fff" : team.dark;
    if (team.pattern === "stripes") {
      ctx.globalAlpha *= 0.7;
      ctx.fillRect(-10, -34 + sy, 20, 2.5);
      ctx.fillRect(-10, -28 + sy, 20, 2.5);
      ctx.globalAlpha /= 0.7;
    } else if (team.pattern === "collar") {
      ctx.beginPath();
      ctx.moveTo(-6, -38 + sy); ctx.lineTo(0, -31 + sy); ctx.lineTo(6, -38 + sy); ctx.lineTo(3, -38 + sy); ctx.lineTo(0, -34 + sy); ctx.lineTo(-3, -38 + sy);
      ctx.closePath();
      ctx.fill();
    } else if (team.pattern === "dots") {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      [[-5, -33], [4, -31], [-2, -26], [6, -24]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y + sy, 1.6, 0, Math.PI * 2); ctx.fill(); });
    } else if (team.pattern === "band") {
      ctx.fillRect(-2.5, -38 + sy, 5, 19);
    }
  }

  function drawKid(k) {
    const team = teamOf(k.team);
    const sp = Math.hypot(k.vx, k.vy);
    const moving = sp > 25 && k.alive;
    const swing = moving ? Math.sin(k.anim) : 0;
    const bob = moving ? Math.abs(Math.cos(k.anim)) * 2 : 0;
    const jump = k.cheer > 0 ? Math.abs(Math.sin(G.time * 9 + k.idx)) * 12 : 0;
    const sitting = !k.alive && k.bench && dist(k, k.bench) < 4;

    ctx.save();
    ctx.translate(k.x, k.y - jump - bob);
    if (!k.alive) ctx.globalAlpha = 0.6;
    if (k.hitFlash > 0 && Math.floor(k.hitFlash * 20) % 2 === 0) ctx.globalAlpha = 0.3;

    ctx.lineCap = "round";
    ctx.strokeStyle = k.skin;
    ctx.lineWidth = 5;
    if (sitting) {
      ctx.beginPath();
      ctx.moveTo(-4, -14); ctx.lineTo(-5, -2);
      ctx.moveTo(4, -14); ctx.lineTo(5, -2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-4, -15); ctx.lineTo(-4 + swing * 5, -2);
      ctx.moveTo(4, -15); ctx.lineTo(4 - swing * 5, -2);
      ctx.stroke();
      ctx.fillStyle = "#3a2a20";
      ctx.beginPath();
      ctx.ellipse(-4 + swing * 5, -1, 3.4, 2.2, 0, 0, Math.PI * 2);
      ctx.ellipse(4 - swing * 5, -1, 3.4, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const sy = sitting ? 6 : 0;

    ctx.fillStyle = team.dark;
    roundRect(ctx, -9, -22 + sy, 18, 9, 3);
    ctx.fill();
    ctx.fillStyle = team.color;
    roundRect(ctx, -10.5, -38 + sy, 21, 19, 7);
    ctx.fill();
    drawShirtPattern(team, sy);

    ctx.strokeStyle = k.skin;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    if (k.carrying) {
      ctx.moveTo(-9, -34 + sy); ctx.lineTo(-11, -55);
      ctx.moveTo(9, -34 + sy); ctx.lineTo(11, -55);
    } else if (k.throwAnim > 0) {
      const q = k.throwAnim / 0.3;
      ctx.moveTo(-9, -34 + sy); ctx.lineTo(-13, -24);
      ctx.moveTo(9, -34 + sy); ctx.lineTo(9 + k.fx * 16 * (1 - q) + 4, -34 - 12 * q + k.fy * 6);
    } else if (k.hasBall) {
      ctx.moveTo(-9, -34 + sy); ctx.lineTo(-13, -23);
      ctx.moveTo(9, -34 + sy); ctx.lineTo(k.fx * 12, -26);
    } else if (k.cheer > 0) {
      ctx.moveTo(-9, -34); ctx.lineTo(-15, -52);
      ctx.moveTo(9, -34); ctx.lineTo(15, -52);
    } else {
      ctx.moveTo(-9, -34 + sy); ctx.lineTo(-12 - swing * 3, -22 + sy);
      ctx.moveTo(9, -34 + sy); ctx.lineTo(12 + swing * 3, -22 + sy);
    }
    ctx.stroke();

    const hy = -47 + sy;
    ctx.fillStyle = k.skin;
    ctx.beginPath();
    ctx.arc(0, hy, 9.5, 0, Math.PI * 2);
    ctx.fill();
    const back = k.fy < -0.55;
    ctx.fillStyle = k.hair;
    ctx.beginPath();
    if (back) {
      ctx.arc(0, hy, 9.8, 0, Math.PI * 2);
    } else {
      ctx.arc(-k.fx * 1.5, hy - 1.5, 9.8, Math.PI * 1.02, Math.PI * 1.98);
      ctx.closePath();
    }
    ctx.fill();
    if (k.hairStyle === 1 && !back) {
      ctx.beginPath();
      ctx.arc(-k.fx * 7, hy + 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (k.hairStyle === 2) {
      ctx.beginPath();
      ctx.arc(0, hy - 10, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!back) {
      ctx.fillStyle = "#1a120c";
      const ex = k.fx * 3.2, ey = hy + 1 + k.fy * 1.5;
      ctx.beginPath();
      ctx.arc(ex - 3.2, ey, 1.4, 0, Math.PI * 2);
      ctx.arc(ex + 3.2, ey, 1.4, 0, Math.PI * 2);
      ctx.fill();
      if (k.cheer > 0) {
        ctx.strokeStyle = "#1a120c";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(ex, ey + 2.5, 2.6, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Player markers: white for you, team colour plus a label for your friend.
    if (k.ctl && k.alive && G.mode === "play") {
      const local = k.ctl.local;
      const my = k.y - 72 - Math.sin(G.time * 5) * 3 - (k.carrying ? 18 : 0);
      ctx.fillStyle = local ? "#fff" : team.light;
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(k.x - 7, my - 8); ctx.lineTo(k.x + 7, my - 8); ctx.lineTo(k.x, my);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      if (!local) {
        ctx.font = "800 13px 'Baloo Da 2', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(40,25,15,0.8)";
        ctx.strokeText(t("on.friend"), k.x, my - 18);
        ctx.fillStyle = team.light;
        ctx.fillText(t("on.friend"), k.x, my - 18);
      }
    }
    if (k.placeT > 0 && k.alive) {
      ctx.strokeStyle = "#fff3b0";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(k.x, k.y - 30, 26, -Math.PI / 2, -Math.PI / 2 + (k.placeT / PLACE_TIME) * Math.PI * 2);
      ctx.stroke();
    }
    if (k === G.human && k.hasBall && G.phase === "rebuild" && G.rules.holdLimit) {
      const left = 1 - k.holdT / HOLD_LIMIT;
      ctx.strokeStyle = left < 0.34 ? "#ff6e5a" : "#ffffff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(k.x, k.y - 30, 30, -Math.PI / 2, -Math.PI / 2 + Math.max(0, left) * Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawParticles() {
    for (const p of G.particles) {
      const q = p.life / p.max;
      if (p.type === "confetti") {
        ctx.save();
        ctx.globalAlpha = 1 - Math.max(0, q - 0.7) / 0.3;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else if (p.type === "spark") {
        ctx.globalAlpha = 1 - q;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y - p.z, p.size * (1 - q * 0.5), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = (1 - q) * 0.55;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y - p.z, p.size * (0.6 + q), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawRain() {
    ctx.strokeStyle = "rgba(210,225,240,0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 170; i++) {
      const x = ((i * 97.3 + G.time * 140) % (W + 200)) - 100;
      const y = ((i * 53.7 + G.time * 950) % (H + 120)) - 60;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 5, y + 17);
    }
    ctx.stroke();
  }

  // Wind sign above the tower: arrow shows direction, bars show strength.
  function drawWind() {
    if (G.mode !== "play" || (G.phase !== "throw" && G.phase !== "intro")) return;
    const x = TOWER.x, y = TOWER.y - 132;
    const w = G.wind;
    const level = Math.abs(w) < 0.05 ? 0 : Math.abs(w) < 0.4 ? 1 : Math.abs(w) < 0.75 ? 2 : 3;
    ctx.fillStyle = "rgba(43,33,24,0.78)";
    const small = compactUI();
    if (small) {
      if (!level) return;
      roundRect(ctx, x - 4, y - 16, 56, 32, 16);
    } else {
      roundRect(ctx, x - 52, y - 16, 104, 32, 16);
    }
    ctx.fill();
    ctx.font = "800 14px 'Baloo Da 2', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff7e8";
    if (!small) ctx.fillText(level ? t("w.label") : t("w.calm"), x - 40, y + 1);
    if (level) {
      const dir = Math.sign(w);
      const ax = x + 22;
      ctx.strokeStyle = "#ffd65a";
      ctx.fillStyle = "#ffd65a";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ax, y - 9 * dir); ctx.lineTo(ax, y + 7 * dir); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax - 5, y + 4 * dir); ctx.lineTo(ax + 5, y + 4 * dir); ctx.lineTo(ax, y + 11 * dir); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < level ? "#ffd65a" : "rgba(255,255,255,0.25)";
        ctx.fillRect(x + 32 + i * 6, y + 6 - i * 4, 4, 4 + i * 4);
      }
      for (let i = 0; i < 6; i++) {
        const ph = (G.time * 0.35 * Math.abs(w) + i / 6) % 1;
        const lx = 380 + i * 150 + Math.sin(G.time * 2 + i) * 20;
        const ly = TOWER.y + (dir > 0 ? -260 + ph * 520 : 260 - ph * 520);
        ctx.fillStyle = i % 2 ? "rgba(120,170,60,0.8)" : "rgba(200,170,60,0.8)";
        ctx.beginPath();
        ctx.ellipse(lx, ly, 4, 2, G.time * 3 + i, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawFloaters() {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "800 26px 'Baloo Da 2', system-ui, sans-serif";
    for (const f of G.floaters) {
      const q = f.life / f.max;
      const text = f.key ? t(f.key, f.vars) : num(f.text || "");
      ctx.globalAlpha = q < 0.75 ? 1 : 1 - (q - 0.75) / 0.25;
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(40,25,15,0.8)";
      ctx.strokeText(text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawReticle(x, y, r, color, label) {
    const spin = G.time * 2.2;
    ctx.save();
    ctx.translate(x, y);
    for (const [col, lw] of [["rgba(30,20,10,0.45)", 6], [color, 3]]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      for (let i = 0; i < 4; i++) {
        const a = spin + (i * Math.PI) / 2;
        ctx.beginPath(); ctx.arc(0, 0, r, a, a + 0.9); ctx.stroke();
      }
    }
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (label) {
      ctx.font = "800 17px 'Baloo Da 2', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(40,25,15,0.8)";
      ctx.strokeText(label, x, y - r - 12);
      ctx.fillStyle = color;
      ctx.fillText(label, x, y - r - 12);
    }
  }

  function drawTargets() {
    const h = G.human;
    const b = G.ball;
    if (b && !b.holder && b.live && b.targetKid && b.targetKid.alive && b.targetKid.team === localTeam()) {
      const tk = b.targetKid;
      const p = 0.6 + Math.sin(G.time * 22) * 0.4;
      ctx.strokeStyle = `rgba(255,70,50,${p})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(tk.x, tk.y, 24, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (tk === h) {
        ctx.font = "800 30px 'Baloo Da 2', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff5a3c";
        ctx.fillText("!", tk.x + 22, tk.y - 62);
      }
    }
    const ctl = G.localCtl;
    if (h && ctl && ctl.switchFlash > 0 && h.alive) {
      const q = 1 - ctl.switchFlash / 0.45;
      ctx.strokeStyle = `rgba(255,255,255,${1 - q})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(h.x, h.y, 20 + q * 40, (20 + q * 40) * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawAimUI() {
    if (G.mode !== "play" || (G.paused && !G.net)) return;
    drawTargets();
    const ctl = G.localCtl;
    const h = G.human;
    if (!ctl || !h || !h.alive) return;

    if (isThrowing(ctl)) {
      const tx = TOWER.x - h.x, ty = TOWER.y - h.y;
      const along = tx * Math.cos(ctl.aimAngle) + ty * Math.sin(ctl.aimAngle);
      const off = Math.abs(-tx * Math.sin(ctl.aimAngle) + ty * Math.cos(ctl.aimAngle));
      const onTarget = G.aimHelp && along > 0 && off < TOWER_HIT_R - 4;
      drawReticle(TOWER.x, TOWER.y - 26, 42, onTarget ? "#7dff9a" : "#ffffff", compactUI() ? "" : onTarget ? t("tgt.on") : t("tgt.target"));

      const a = ctl.aimAngle;
      const len = 150;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 9]);
      ctx.lineDashOffset = -G.time * 30;
      ctx.beginPath();
      ctx.moveTo(h.x + Math.cos(a) * 24, h.y - 20 + Math.sin(a) * 24);
      ctx.lineTo(h.x + Math.cos(a) * len, h.y - 20 + Math.sin(a) * len);
      ctx.stroke();
      ctx.setLineDash([]);
      const ex = h.x + Math.cos(a) * (len + 14), ey = h.y - 20 + Math.sin(a) * (len + 14);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - Math.cos(a - 0.45) * 18, ey - Math.sin(a - 0.45) * 18);
      ctx.lineTo(ex - Math.cos(a + 0.45) * 18, ey - Math.sin(a + 0.45) * 18);
      ctx.closePath();
      ctx.fill();

      const [lo, hi] = G.sweet;
      const mx = h.x - 58, my = h.y - 128, mw = 16, mh = 104;
      ctx.fillStyle = "rgba(43,33,24,0.82)";
      roundRect(ctx, mx - 4, my - 4, mw + 8, mh + 8, 8);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(mx, my, mw, mh);
      ctx.fillStyle = "rgba(242,168,59,0.6)";
      ctx.fillRect(mx, my + mh * (1 - 0.76), mw, mh * (0.76 - 0.22));
      ctx.fillStyle = "#52c46a";
      ctx.fillRect(mx, my + mh * (1 - hi), mw, mh * (hi - lo));
      const p = ctl.charge.active ? ctl.charge.p : 0;
      const py = my + mh * (1 - p);
      ctx.fillStyle = "#fff";
      ctx.fillRect(mx - 6, py - 2.5, mw + 12, 5);
      if (ctl.charge.active) {
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(mx, py, mw, my + mh - py);
      }
    }

    if (G.phase === "rebuild" && h.hasBall && ctl.lockTarget) {
      const tk = ctl.lockTarget;
      ctx.strokeStyle = "rgba(255,110,90,0.9)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -G.time * 40;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y - 26);
      ctx.lineTo(tk.x, tk.y - 26);
      ctx.stroke();
      ctx.setLineDash([]);
      drawReticle(tk.x, tk.y - 26, 30, "#ff6e5a", compactUI() ? "" : kidName(tk).toUpperCase());
    } else if (G.phase === "rebuild" && h.hasBall && input.pointer.valid) {
      const px = input.pointer.x, py = input.pointer.y;
      const mate = aliveOf(h.team).find((m) => m !== h && Math.hypot(m.x - px, m.y - py) < 55);
      ctx.strokeStyle = mate ? "rgba(140,255,170,0.9)" : "rgba(255,255,255,0.85)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(h.x, h.y - 26);
      ctx.lineTo(px, py - 20);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(px, py - 20, 16, 0, Math.PI * 2);
      ctx.moveTo(px - 24, py - 20); ctx.lineTo(px - 8, py - 20);
      ctx.moveTo(px + 8, py - 20); ctx.lineTo(px + 24, py - 20);
      ctx.moveTo(px, py - 44); ctx.lineTo(px, py - 28);
      ctx.moveTo(px, py - 12); ctx.lineTo(px, py + 4);
      ctx.stroke();
      if (mate) {
        ctx.font = "800 18px 'Baloo Da 2', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(140,255,170,1)";
        ctx.fillText(t("tgt.pass"), px, py - 50);
      }
    }
  }

  function drawMinimap() {
    const { dpr } = view;
    const small = compactUI();
    const mw = small ? 112 : 150, mh = small ? 63 : 84, mx = small ? 8 : 12, my = small ? 52 : view.ch - mh - 14;
    const sx = mw / W, sy = mh / H;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "rgba(20,40,16,0.78)";
    roundRect(ctx, mx - 3, my - 3, mw + 6, mh + 6, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(mx + BOUNDS.l * sx, my + BOUNDS.t * sy, (BOUNDS.r - BOUNDS.l) * sx, (BOUNDS.b - BOUNDS.t) * sy);
    ctx.fillStyle = "#c4553a";
    ctx.fillRect(mx + TOWER.x * sx - 2, my + TOWER.y * sy - 2, 4, 4);
    G.stones.forEach((s) => {
      if (s.placed || s.carriedBy) return;
      ctx.fillStyle = orderOn() && s.i === G.placed ? "#ffd65a" : "#e08b62";
      ctx.fillRect(mx + s.x * sx - 1.5, my + s.y * sy - 1.5, 3, 3);
    });
    G.kids.forEach((k) => {
      if (!k.alive) return;
      ctx.fillStyle = teamOf(k.team).color;
      ctx.beginPath();
      ctx.arc(mx + k.x * sx, my + k.y * sy, k.isHuman ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();
      if (k === G.human) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke(); }
    });
    const b = G.ball;
    ctx.fillStyle = "#ff3b2a";
    ctx.beginPath(); ctx.arc(mx + b.x * sx, my + b.y * sy, 2, 0, Math.PI * 2); ctx.fill();
    const hw = view.cw / (2 * cam.k), hh = view.ch / (2 * cam.k);
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.strokeRect(mx + (cam.x - hw) * sx, my + (cam.y - hh) * sy, hw * 2 * sx, hh * 2 * sy);
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------
  const input = {
    keys: {},
    pointer: { x: 0, y: 0, valid: false },
    usingKeysAim: false,
    lockMode: "pointer",
    joy: { id: null, ox: 0, oy: 0, x: 0, y: 0 },
    aimId: null,
    isTouch: false,
    moveVector() {
      let x = 0, y = 0;
      const k = this.keys;
      if (k.KeyA || k.ArrowLeft) x -= 1;
      if (k.KeyD || k.ArrowRight) x += 1;
      if (k.KeyW || k.ArrowUp) y -= 1;
      if (k.KeyS || k.ArrowDown) y += 1;
      if (this.joy.id !== null) { x += this.joy.x; y += this.joy.y; }
      const m = Math.hypot(x, y);
      if (m > 1) { x /= m; y /= m; }
      return { x, y };
    },
  };

  const playingHere = () => G.mode === "play" && (!G.paused || !!G.net);

  function joystickAllowed() {
    const h = G.human;
    if (!h || !h.alive || !playingHere()) return false;
    if (G.phase === "rebuild") return !h.hasBall;
    return G.phase === "throw" && !isAttacker(h);
  }

  function aimDown(touch) {
    const ctl = G.localCtl;
    if (!ctl || !playingHere()) return;
    const k = ctl.kid;
    if (isThrowing(ctl) && !ctl.charge.active) {
      ctl.charge.active = true;
      ctl.charge.p = 0;
      ctl.charge.dir = 1;
    } else if (G.phase === "rebuild" && k && k.hasBall && k.alive) {
      doAction(handThrowAction(ctl, input.pointer.x, input.pointer.y, touch));
    } else if (canSwitch(ctl)) {
      // Tap or click a teammate to take control of them.
      const px = input.pointer.x, py = input.pointer.y;
      const mate = aliveOf(ctl.team).find((m) => !m.ctl && Math.hypot(m.x - px, m.y - 22 - py) < (touch ? 48 : 34));
      if (mate) doAction({ a: "switch", t: kidIdx(mate) });
    }
  }

  function aimUp() {
    const ctl = G.localCtl;
    if (!ctl) return;
    if (ctl.charge.active && isThrowing(ctl)) {
      const p = ctl.charge.p;
      ctl.charge.active = false;
      doAction({ a: "release", p: Math.round(p * 1000) / 1000, ang: Math.round(ctl.aimAngle * 1000) / 1000 });
      if (G.net === "guest") G.throwState = "flying";
    } else {
      ctl.charge.active = false;
    }
  }

  function handThrowAction(ctl, wx, wy, touch) {
    const near = attackerNear(wx, wy, touch ? 80 : 130);
    if (near) { ctl.lockTarget = near; return { a: "lock", t: kidIdx(near) }; }
    const k = ctl.kid;
    const mate = aliveOf(k.team).find((m) => m !== k && Math.hypot(m.x - wx, m.y - wy) < 55);
    if (mate) return { a: "pass", t: kidIdx(mate) };
    return { a: "at", x: r1(wx), y: r1(wy) };
  }

  function cycleTarget() {
    const ctl = G.localCtl;
    if (!ctl) return;
    if (isThrowing(ctl)) {
      if (!G.aimHelp) return;
      input.usingKeysAim = true;
      ctl.aimAngle = Math.atan2(TOWER.y - ctl.kid.y, TOWER.x - ctl.kid.x);
      ctl.switchFlash = 0.3;
      sfx.tick();
      return;
    }
    const h = ctl.kid;
    if (!h || !h.hasBall || G.phase !== "rebuild") return;
    const list = rankAttackers(h);
    if (!list.length) return;
    input.lockMode = "manual";
    const i = list.indexOf(ctl.lockTarget);
    ctl.lockTarget = list[(i + 1) % list.length];
    sfx.tick();
  }

  function throwAtLock() {
    const ctl = G.localCtl;
    if (!ctl || !ctl.kid || !ctl.kid.hasBall || !ctl.lockTarget || G.phase !== "rebuild") return false;
    doAction({ a: "lock", t: kidIdx(ctl.lockTarget) });
    return true;
  }

  function tryDash() {
    if (canDash(G.localCtl)) doAction({ a: "dash" });
  }

  function capturePointer(pid) {
    try { canvas.setPointerCapture(pid); } catch (err) { /* pointer already gone */ }
  }

  // Pinch with two fingers to zoom (unless one of them is steering with the joystick).
  const touches = new Map();
  let pinch = null;

  function pinchDistance() {
    const p = [...touches.values()];
    return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }

  canvas.addEventListener("wheel", (e) => {
    if (G.mode !== "play" || currentScreen !== "game") return;
    e.preventDefault();
    setZoom(settings.zoom * Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });

  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2 && input.joy.id === null && G.mode === "play") {
        // Second finger down: this is a pinch, not a throw.
        pinch = { d: pinchDistance(), z: settings.zoom };
        if (G.localCtl) G.localCtl.charge.active = false;
        input.aimId = null;
        e.preventDefault();
        return;
      }
    }
    Sound.unlock();
    if (e.pointerType === "touch") setTouchMode(true);
    const w = toWorld(e.clientX, e.clientY);
    if (e.pointerType === "touch" && joystickAllowed() && e.clientX < view.cw * 0.45 && input.joy.id === null) {
      input.joy.id = e.pointerId;
      input.joy.ox = e.clientX; input.joy.oy = e.clientY;
      input.joy.x = 0; input.joy.y = 0;
      const base = $("#joy-base");
      base.style.left = e.clientX + "px";
      base.style.top = e.clientY + "px";
      base.classList.add("on");
      $("#joy-knob").style.transform = "translate(0px, 0px)";
      capturePointer(e.pointerId);
      e.preventDefault();
      return;
    }
    input.pointer.x = w.x; input.pointer.y = w.y; input.pointer.valid = true;
    input.usingKeysAim = false;
    input.aimId = e.pointerId;
    capturePointer(e.pointerId);
    aimDown(e.pointerType === "touch");
    e.preventDefault();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (touches.has(e.pointerId)) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && touches.size === 2) {
        setZoom(pinch.z * (pinchDistance() / Math.max(1, pinch.d)));
        return;
      }
    }
    if (e.pointerId === input.joy.id) {
      const dx = e.clientX - input.joy.ox, dy = e.clientY - input.joy.oy;
      const max = 55;
      const m = Math.hypot(dx, dy);
      const c = m > max ? max / m : 1;
      input.joy.x = (dx * c) / max;
      input.joy.y = (dy * c) / max;
      $("#joy-knob").style.transform = `translate(${dx * c}px, ${dy * c}px)`;
      return;
    }
    if (e.pointerType === "mouse" || e.pointerId === input.aimId) {
      const w = toWorld(e.clientX, e.clientY);
      input.pointer.x = w.x; input.pointer.y = w.y; input.pointer.valid = true;
      if (e.pointerType === "mouse") { input.usingKeysAim = false; input.lockMode = "pointer"; }
    }
  });

  function pointerEnd(e) {
    touches.delete(e.pointerId);
    if (pinch) {
      if (touches.size < 2) pinch = null;
      if (e.pointerId === input.aimId) input.aimId = null;
      return;
    }
    if (e.pointerId === input.joy.id) {
      input.joy.id = null; input.joy.x = 0; input.joy.y = 0;
      $("#joy-base").classList.remove("on");
      return;
    }
    if (e.pointerId === input.aimId) {
      input.aimId = null;
      aimUp();
      if (e.pointerType === "touch") input.pointer.valid = false;
    }
  }
  canvas.addEventListener("pointerup", pointerEnd);
  canvas.addEventListener("pointercancel", pointerEnd);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // Touch action buttons change job with the situation:
  // DASH / THROW (at the locked target) and SWITCH / TARGET.
  const dashBtn = $("#btn-dash");
  const switchBtn = $("#btn-switch");
  dashBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    Sound.unlock();
    const h = G.human;
    if (h && h.hasBall && G.phase === "rebuild") throwAtLock();
    else tryDash();
  });
  switchBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    Sound.unlock();
    const h = G.human;
    if (isThrowing(G.localCtl) || (h && h.hasBall && G.phase === "rebuild")) cycleTarget();
    else doAction({ a: "switch", t: null });
  });

  const GAME_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight", "Tab", "KeyQ", "KeyE"]);

  window.addEventListener("keydown", (e) => {
    const playing = G.mode === "play" && currentScreen === "game";
    if (e.code === "Escape" && !playing && !["title", "game", "pause", "result", "join"].includes(currentScreen)) { goBack(); return; }
    if (e.code === "Escape" || e.code === "KeyP") {
      if (playing) pauseGame();
      else if (currentScreen === "pause") resumeGame();
      return;
    }
    if (e.code === "KeyM" && !e.repeat) { toggleSound(); return; }
    if (playing && (e.code === "Equal" || e.code === "NumpadAdd")) { setZoom(settings.zoom * 1.2); return; }
    if (playing && (e.code === "Minus" || e.code === "NumpadSubtract")) { setZoom(settings.zoom / 1.2); return; }
    if (!playing || !playingHere()) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    input.keys[e.code] = true;
    if (isThrowing(G.localCtl) && ["ArrowUp", "ArrowDown", "KeyW", "KeyS"].includes(e.code)) input.usingKeysAim = true;
    if (e.repeat) return;
    if (e.code === "KeyQ" || e.code === "Tab") { doAction({ a: "switch", t: null }); return; }
    if (e.code === "KeyE") { cycleTarget(); return; }
    if (e.code === "Space") {
      const h = G.human;
      if (h && h.hasBall && G.phase === "rebuild") { throwAtLock(); return; }
      if (isThrowing(G.localCtl)) {
        if (!input.pointer.valid && !input.usingKeysAim) {
          input.usingKeysAim = true;
          G.localCtl.aimAngle = Math.atan2(TOWER.y - h.y, TOWER.x - h.x);
        }
        aimDown();
      } else tryDash();
    }
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") tryDash();
  });

  window.addEventListener("keyup", (e) => {
    input.keys[e.code] = false;
    if (e.code === "Space" && G.localCtl && G.localCtl.charge.active) aimUp();
  });

  window.addEventListener("blur", () => { input.keys = {}; });

  function setTouchMode(on) {
    if (input.isTouch === on) return;
    input.isTouch = on;
    document.body.classList.toggle("touch", on);
  }

  // ---------------------------------------------------------------------------
  // UI: screens, HUD, banner, hints
  // ---------------------------------------------------------------------------
  let currentScreen = "title";
  const screenStack = [];
  const screens = ["title", "first", "setup", "online", "join", "tourney", "ach", "settings", "howto", "story", "pause", "result"];

  function showScreen(name, push) {
    if (push && currentScreen !== name) screenStack.push(currentScreen);
    if (!push) screenStack.length = 0;
    currentScreen = name;
    screens.forEach((s) => $("#screen-" + s).classList.toggle("hidden", s !== name));
    const inGame = name === "game" || name === "pause" || (name === "settings" && screenStack.includes("pause"));
    document.body.classList.toggle("in-game", name === "game");
    $("#hud").classList.toggle("hidden", !inGame);
    $("#touch").classList.toggle("hidden", name !== "game");
    $("#coach").classList.toggle("hidden", !(name === "game" && G.ctx === "tutorial" && G.mode === "play"));
    if (name !== "game") { $("#hint").classList.add("hidden"); hintText = ""; }
    if (name === "title") { updateRecord(); refreshVisitCount(); }
    const focusable = name !== "game" && $("#screen-" + name + " .btn-primary:not([disabled])");
    if (focusable && !input.isTouch) setTimeout(() => focusable.focus({ preventScroll: true }), 50);
  }

  function openScreen(name) { showScreen(name, true); }

  function goBack() {
    const prev = screenStack.pop() || "title";
    showScreen(prev, false);
    if (prev !== "title") screenStack.push("title");
  }

  let bannerTimer = null;
  let resultTimer = null;
  function showBanner(main, sub, shade, secs, bengali) {
    const el = $("#banner");
    $("#banner-main").textContent = main;
    $("#banner-main").lang = bengali ? "bn" : I18N.lang;
    $("#banner-sub").textContent = compactUI() ? "" : sub || "";
    el.style.setProperty("--banner-shade", shade || "#8f3524");
    el.classList.remove("hidden");
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.classList.add("hidden"), (secs || 1.5) * (compactUI() ? 650 : 1000));
  }

  let toastTimer = null;
  function showToast(name) {
    const el = $("#toast");
    $("#toast-name").textContent = name;
    el.classList.remove("hidden");
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add("hidden"), 2600);
    sfx.win();
  }

  let hintText = "";
  function setHint(text) {
    if (text === hintText) return;
    hintText = text;
    const el = $("#hint");
    el.textContent = text;
    el.classList.toggle("hidden", !text || currentScreen !== "game");
  }

  const hudCache = {};
  function setText(id, v) {
    if (hudCache[id] === v) return;
    hudCache[id] = v;
    document.getElementById(id).textContent = v;
  }

  function hudReset() {
    Object.keys(hudCache).forEach((k) => delete hudCache[k]);
    for (let tm = 0; tm < 2; tm++) $("#hud-dot-" + tm).style.background = G.teams[tm].color;
    const wrap = $("#hud-stones");
    wrap.innerHTML = "";
    STONE_W.forEach((w) => {
      const i = document.createElement("i");
      i.style.width = Math.round(w * 0.42) + "px";
      wrap.appendChild(i);
    });
  }

  function bumpScore(tm) {
    if (tm < 0) return;
    const el = $("#hud-score-" + tm);
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }

  function teamTag(tm) {
    if (tm === localTeam()) return ` ${t("you")}`;
    if (G.online && G.online.mode === "versus") return ` ${t("on.friendTag")}`;
    return "";
  }

  function updateHud() {
    if (G.mode !== "play") return;
    for (let tm = 0; tm < 2; tm++) {
      setText("hud-name-" + tm, teamLabel(tm) + teamTag(tm));
      setText("hud-score-" + tm, num(G.scores[tm]));
      setText("hud-role-" + tm, tm === G.attacking ? t("role.att") : t("role.def"));
    }
    const ctl = G.localCtl;
    const youAttack = G.attacking === localTeam();
    const h = G.human;
    const tm = input.isTouch ? "touch" : "mouse";
    let phase = "";
    let timer = "";
    if (G.phase === "intro") phase = t("phase.round", { n: G.round });
    else if (G.phase === "throw") {
      const th = currentThrower();
      if (youAttack) phase = th && th === h ? t("phase.yourThrow") : t("phase.theirThrow", { name: th ? kidName(th) : "" });
      else phase = t("phase.defendThrow");
      if (G.ctx !== "tutorial" && !compactUI()) timer = t("phase.throwOf", { i: Math.min(G.throwIdx + 1, G.throwOrder.length), n: G.throwOrder.length });
    } else if (G.phase === "rebuild") {
      phase = youAttack ? t("phase.rebuild") : t("phase.stop");
      if (!(G.ctx === "tutorial" && G.tut.step < 5)) {
        const s = Math.max(0, Math.ceil(G.rebuildT));
        timer = `${num(Math.floor(s / 60))}:${num(String(s % 60).padStart(2, "0"))}`;
      }
    } else if (G.phase === "roundEnd") phase = t("phase.over");
    else if (G.phase === "matchEnd") phase = t("phase.full");
    setText("hud-phase", phase);
    setText("hud-timer", timer);
    const low = G.phase === "rebuild" && G.rebuildT < 10;
    const timerEl = $("#hud-timer");
    if (timerEl.classList.contains("low") !== low) timerEl.classList.toggle("low", low);

    const stoneKey = `${G.placed}|${G.phase}`;
    if (hudCache.stones !== stoneKey) {
      hudCache.stones = stoneKey;
      $$("#hud-stones i").forEach((el, i) => {
        el.classList.toggle("on", i < G.placed);
        el.classList.toggle("next", G.phase === "rebuild" && orderOn() && i === G.placed);
      });
    }

    if (G.ctx === "tutorial" && G.tut) {
      setText("coach-step", t("c.step", { i: Math.min(G.tut.step + 1, 6), n: 6 }));
      setText("coach-text", tutorialText());
      setHint("");
    } else {
      setHint(hintFor(ctl, h, youAttack, tm));
    }

    const holding = !!(h && h.alive && h.hasBall && G.phase === "rebuild");
    const throwing = isThrowing(ctl);
    const dashable = canDash(ctl);
    dashBtn.classList.toggle("hidden", !(holding || dashable));
    dashBtn.classList.toggle("cooldown", !holding && dashable && h.dashCD > 0);
    const dashLabel = holding ? t("btn.throw") : t("btn.dash");
    if (dashBtn.textContent !== dashLabel) dashBtn.textContent = dashLabel;
    switchBtn.classList.toggle("hidden", !(holding || (throwing && G.aimHelp) || canSwitch(ctl)));
    const switchLabel = holding || throwing ? t("btn.target") : t("btn.switch");
    if (switchBtn.textContent !== switchLabel) switchBtn.textContent = switchLabel;
  }

  function hintFor(ctl, h, youAttack, tm) {
    if (!ctl) return "";
    if (G.phase === "throw") {
      if (!h || !h.alive) return t("h.out");
      if (isThrowing(ctl)) return t("h.throw." + tm) + (G.aimHelp ? t("h.lock." + tm) : "");
      if (youAttack) return t("h.nextThrower");
      return t("h.defThrow." + tm);
    }
    if (G.phase !== "rebuild") return "";
    if (!h || !h.alive) return t("h.out");
    if (youAttack) {
      if (h.carrying) return isNextStone(h.carrying) ? t("h.carry") : t("h.carryWrong");
      if (pileNext()) return t("h.pile");
      return (orderOn() ? t("h.grabGold") : t("h.grabAny")) + t("h.ctrl." + tm);
    }
    return h.hasBall ? t("h.hold." + tm) : t("h.getBall." + tm);
  }

  function updateRecord() {
    const w = settings.wins, l = settings.losses;
    $("#record").textContent = w + l > 0 ? t("record", { w, l }) : "";
  }

  function refreshVisitCount() {
    Counter.get("visits").then((v) => {
      $("#visit-count").textContent = v ? num(v.toLocaleString("en-US")) : "";
    });
  }

  function showResult(won, unlockedField) {
    const s = G.stats || newStats();
    const again = $("#btn-again");
    $("#result-unlock").classList.add("hidden");
    $("#result-wait").classList.add("hidden");
    again.classList.remove("hidden");
    if (G.ctx === "tutorial") {
      $("#result-icon").textContent = "🎓";
      $("#result-title").textContent = t("result.tutorial");
      $("#result-score").textContent = t("result.ready");
      again.textContent = t("result.quick");
      again.dataset.action = "quick";
    } else {
      $("#result-icon").textContent = won ? "🏆" : "🤝";
      $("#result-title").textContent = won ? (G.ctx === "tourney" ? t("result.matchWon") : t("result.win")) : t("result.lose");
      $("#result-score").textContent = `${teamLabel(0)} ${num(G.scores[0])} – ${num(G.scores[1])} ${teamLabel(1)}`;
      if (G.ctx === "tourney") {
        const more = won && settings.tourney.stage < TOURNEY.length;
        again.textContent = won ? (more ? t("result.next") : t("menu.tourney")) : t("result.tryAgain");
        again.dataset.action = "tourney";
        if (won && settings.tourney.champion && G.stage === TOURNEY.length - 1) {
          $("#result-score").textContent += " · " + t("tourney.champion");
        }
      } else if (G.ctx === "online") {
        again.textContent = t("result.again");
        again.dataset.action = "online";
        if (G.net === "guest") {
          again.classList.add("hidden");
          $("#result-wait").classList.remove("hidden");
        }
      } else {
        again.textContent = t("result.again");
        again.dataset.action = "quick";
      }
      if (unlockedField) {
        $("#result-unlock").textContent = t("unlock", { field: t("field." + unlockedField) });
        $("#result-unlock").classList.remove("hidden");
      }
    }
    const items = [[s.placed, t("result.placed")], [s.hits, t("result.hits")], [s.knocks, t("result.knocks")]];
    $("#result-stats").innerHTML = items.map(([v, l]) => `<div class="stat"><b>${num(v)}</b><span>${l}</span></div>`).join("");
    const ach = $("#result-ach");
    ach.innerHTML = G.newAch.map((id) => `<span>★ ${t("ach." + id)}</span>`).join("");
    ach.classList.toggle("hidden", G.newAch.length === 0);
    $("#btn-share").classList.toggle("hidden", G.ctx === "tutorial");
    G.lastWon = won;
    showScreen("result");
  }

  // --- Setup screen ----------------------------------------------------------
  function buildSetup() {
    const picker = $("#team-picker");
    picker.innerHTML = "";
    TEAMS.forEach((tm) => {
      const b = document.createElement("button");
      b.className = "team-card";
      b.setAttribute("role", "radio");
      b.style.setProperty("--team", tm.color);
      b.dataset.team = tm.id;
      b.innerHTML = `<div class="kid"></div><span data-i18n="team.${tm.id}"></span>`;
      b.addEventListener("click", () => { settings.team = tm.id; saveSettings(); syncSetup(); sfx.click(); });
      picker.appendChild(b);
    });
    const fp = $("#field-picker");
    fp.innerHTML = "";
    FIELDS.forEach((f) => {
      const b = document.createElement("button");
      b.className = "field-card";
      b.setAttribute("role", "radio");
      b.dataset.field = f.id;
      b.innerHTML = `<span class="swatch" style="background:${f.swatch}"></span><span data-i18n="field.${f.id}"></span>`;
      b.addEventListener("click", () => {
        if (!settings.unlocked.includes(f.id)) { sfx.tick(); return; }
        settings.field = f.id; saveSettings(); syncSetup(); sfx.click();
      });
      fp.appendChild(b);
    });
    $$(".seg[data-setting]").forEach((seg) => {
      seg.querySelectorAll("button").forEach((btn) => {
        btn.setAttribute("role", "radio");
        btn.addEventListener("click", () => {
          const key = seg.dataset.setting;
          const v = btn.dataset.value;
          settings[key] = key === "difficulty" ? v : Number(v);
          saveSettings();
          syncSetup();
          sfx.click();
        });
      });
    });
    $$("[data-rule]").forEach((cb) => {
      cb.addEventListener("change", () => { settings.rules[cb.dataset.rule] = cb.checked; saveSettings(); });
    });
    $$("[data-rule-seg] button").forEach((btn) => {
      btn.addEventListener("click", () => { settings.rules.time = Number(btn.dataset.value); saveSettings(); syncSetup(); sfx.click(); });
    });
    I18N.apply(picker);
    I18N.apply(fp);
    syncSetup();
  }

  function syncSetup() {
    $$(".team-card").forEach((c) => {
      const on = c.dataset.team === settings.team;
      c.classList.toggle("active", on);
      c.setAttribute("aria-checked", on ? "true" : "false");
    });
    if (!settings.unlocked.includes(settings.field)) settings.field = "village";
    $$(".field-card").forEach((c) => {
      const on = c.dataset.field === settings.field;
      const locked = !settings.unlocked.includes(c.dataset.field);
      c.classList.toggle("active", on);
      c.classList.toggle("locked", locked);
      c.title = locked ? t("field.locked") : "";
      c.setAttribute("aria-checked", on ? "true" : "false");
    });
    $$(".seg[data-setting]").forEach((seg) => {
      const key = seg.dataset.setting;
      seg.querySelectorAll("button").forEach((btn) => {
        const on = String(settings[key]) === btn.dataset.value;
        btn.classList.toggle("active", on);
        btn.setAttribute("aria-checked", on ? "true" : "false");
      });
    });
    $$("[data-rule]").forEach((cb) => { cb.checked = !!settings.rules[cb.dataset.rule]; });
    $$("[data-rule-seg] button").forEach((btn) => btn.classList.toggle("active", String(settings.rules.time) === btn.dataset.value));
  }

  // --- Tournament screen -----------------------------------------------------
  function buildLadder() {
    const ol = $("#ladder");
    const stage = settings.tourney.stage;
    ol.innerHTML = TOURNEY.map((op, i) => {
      const tm = TEAMS.find((x) => x.id === (op.team === settings.team ? RIVAL[settings.team] : op.team));
      const state = i < stage ? "beaten" : i === stage ? "next" : "locked";
      const status = state === "beaten" ? "✓ " + t("tourney.beaten") : state === "next" ? t("tourney.next") : "🔒";
      return `<li class="${state}"><span class="rung" style="background:${tm.color}">${num(i + 1)}</span>
        <div><div class="op-name">${t(op.key)}</div><div class="op-meta">${t("diff." + op.diff)} · ${num(op.size)}v${num(op.size)} · ${t("field." + op.field)}</div></div>
        <span class="status">${status}</span></li>`;
    }).join("") + (settings.tourney.champion ? `<li class="ladder-champion" style="display:block">${t("tourney.champion")}</li>` : "");
    $("#btn-tourney-play").textContent = stage >= TOURNEY.length ? t("tourney.again") : t("tourney.play");
  }

  // --- Achievements screen ---------------------------------------------------
  function buildAchievements() {
    const got = ACHIEVEMENTS.filter((a) => settings.ach[a.id]).length;
    $("#ach-count").textContent = t("ach.count", { n: got, m: ACHIEVEMENTS.length });
    $("#ach-grid").innerHTML = ACHIEVEMENTS.map((a) => {
      const on = !!settings.ach[a.id];
      return `<div class="ach ${on ? "" : "locked"}"><div class="ach-icon">${a.icon}</div><div><b>${t("ach." + a.id)}</b><span>${t("ach." + a.id + ".d")}</span></div></div>`;
    }).join("");
  }

  // --- Settings screen -------------------------------------------------------
  function buildSettingsScreen() {
    $$("[data-pref] button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.parentElement.dataset.pref;
        settings[key] = btn.dataset.value;
        saveSettings();
        if (key === "lang") applyLanguage();
        if (key === "camera") cam.snap = true;
        syncSettings();
        sfx.click();
      });
    });
    $$("[data-pref-check]").forEach((cb) => {
      cb.addEventListener("change", () => {
        settings[cb.dataset.prefCheck] = cb.checked;
        saveSettings();
        applyAudioPrefs();
        syncSoundUi();
      });
    });
    const reset = $("#btn-reset");
    reset.addEventListener("click", () => {
      if (!reset.classList.contains("confirm")) {
        reset.classList.add("confirm");
        reset.textContent = t("settings.resetConfirm");
        setTimeout(() => { reset.classList.remove("confirm"); reset.textContent = t("settings.reset"); }, 3000);
        return;
      }
      const prefs = {};
      Object.keys(PREF_DEFAULTS).forEach((k) => { prefs[k] = settings[k]; });
      Object.assign(settings, PROGRESS_DEFAULTS(), prefs);
      saveSettings();
      reset.classList.remove("confirm");
      reset.textContent = t("settings.resetDone");
      syncSetup();
    });
  }

  function syncSettings() {
    $$("[data-pref]").forEach((seg) => {
      seg.querySelectorAll("button").forEach((btn) => btn.classList.toggle("active", settings[seg.dataset.pref] === btn.dataset.value));
    });
    $$("[data-pref-check]").forEach((cb) => { cb.checked = !!settings[cb.dataset.prefCheck]; });
  }

  function applyLanguage() {
    I18N.setLang(settings.lang);
    Object.keys(hudCache).forEach((k) => delete hudCache[k]);
    hintText = "";
    updateRecord();
    if (currentScreen === "tourney") buildLadder();
    if (currentScreen === "ach") buildAchievements();
    if (joinCode) $("#join-body").textContent = t("on.joinBody", { code: joinCode });
    refreshOnlineStatus();
  }

  function applyAudioPrefs() {
    Sound.setSfx(settings.sound);
    Sound.setMusic(settings.music);
    Sound.setVoice(settings.voice);
  }

  function syncSoundUi() {
    $("#btn-sound").classList.toggle("muted", !settings.sound);
  }

  function toggleSound() {
    settings.sound = !settings.sound;
    Sound.unlock();
    applyAudioPrefs();
    saveSettings();
    syncSoundUi();
    syncSettings();
  }

  // --- Share -----------------------------------------------------------------
  function makeShareCard() {
    const c = document.createElement("canvas");
    c.width = 1200; c.height = 630;
    const g = c.getContext("2d");
    if (bgCanvas) {
      const s = bgCanvas.width / (W + BGX * 2);
      g.drawImage(bgCanvas, (BGX + 300) * s, (BGY + 180) * s, 1000 * s, 525 * s, 0, 0, 1200, 630);
    } else {
      g.fillStyle = "#3e7330"; g.fillRect(0, 0, 1200, 630);
    }
    const shade = g.createLinearGradient(0, 0, 0, 630);
    shade.addColorStop(0, "rgba(14,24,12,0.55)");
    shade.addColorStop(1, "rgba(14,24,12,0.85)");
    g.fillStyle = shade;
    g.fillRect(0, 0, 1200, 630);
    for (let i = 0; i < 7; i++) {
      const w = 120 - i * 13, y = 250 - i * 22;
      g.fillStyle = "#8f3524"; g.fillRect(600 - w / 2, y + 6, w, 14);
      g.fillStyle = "#d7744f"; g.fillRect(600 - w / 2, y, w, 14);
    }
    g.textAlign = "center";
    g.fillStyle = "#fff7e8";
    g.font = "800 110px 'Baloo Da 2', sans-serif";
    g.fillText("সাত চাড়া", 600, 380);
    g.fillStyle = "#f2a83b";
    g.font = "800 46px 'Baloo Da 2', sans-serif";
    g.fillText(G.lastWon ? t("share.card.won") : t("share.card.played"), 600, 450);
    g.fillStyle = "#fff7e8";
    g.font = "700 40px 'Baloo Da 2', sans-serif";
    g.fillText(`${teamLabel(0)} ${num(G.scores[0])} – ${num(G.scores[1])} ${teamLabel(1)}`, 600, 510);
    g.font = "600 26px 'Baloo Da 2', sans-serif";
    g.fillStyle = "rgba(255,247,232,0.8)";
    g.fillText(`${t("share.cta")} · ${location.host}${location.pathname.replace(/index\.html$/, "")}`, 600, 580);
    return c;
  }

  function shareResult() {
    const text = t(G.lastWon ? "share.won" : "share.played", { a: teamLabel(0), b: teamLabel(1), s0: G.scores[0], s1: G.scores[1] });
    const url = location.origin + location.pathname;
    makeShareCard().toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "saat-chara.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: "Saat Chara", text: text + " " + url }).catch(() => {});
      } else if (navigator.share) {
        navigator.share({ title: "Saat Chara", text, url }).catch(() => {});
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "saat-chara.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        showToast(t("share.saved"));
      }
    }, "image/png");
  }

  // ---------------------------------------------------------------------------
  // Online lobby
  // ---------------------------------------------------------------------------
  let onlineState = "idle";     // idle | creating | waiting | ready | joining | joined | lost | failed | noRoom
  let roomCode = null;
  let joinCode = null;
  let joinTimer = null;

  function setOnlineState(s) {
    onlineState = s;
    refreshOnlineStatus();
  }

  function refreshOnlineStatus() {
    const map = {
      creating: ["on.creating", "wait"], waiting: ["on.waiting", "wait"], ready: ["on.connected", "ok"],
      joining: ["on.joining", "wait"], joined: ["on.joined", "ok"], lost: ["on.lost", "err"],
      failed: ["on.failed", "err"], noRoom: ["on.noRoom", "err"],
    };
    const m = map[onlineState];
    for (const id of ["#online-status", "#join-status"]) {
      const el = $(id);
      el.textContent = m ? t(m[0]) : "";
      el.className = "online-status" + (m ? " " + m[1] : "");
    }
    const go = $("#btn-online-go");
    const hosting = Net.role === "host";
    $("#online-setup").classList.toggle("hidden", hosting);
    $("#online-room").classList.toggle("hidden", !hosting || !roomCode);
    go.textContent = hosting ? t("on.start") : t("on.create");
    go.disabled = onlineState === "creating" || (hosting && onlineState !== "ready");
    $("#btn-online-back").textContent = hosting ? t("on.leave") : t("common.back");
    const joinBtn = $("#btn-join");
    joinBtn.classList.toggle("hidden", onlineState === "joined");
    joinBtn.disabled = onlineState === "joining";
  }

  function buildOnlineScreen() {
    $$(".mode-card").forEach((c) => c.addEventListener("click", () => {
      settings.online.mode = c.dataset.mode; saveSettings(); syncOnline(); sfx.click();
    }));
    $$("[data-online] button").forEach((btn) => btn.addEventListener("click", () => {
      const key = btn.parentElement.dataset.online;
      settings.online[key] = key === "difficulty" ? btn.dataset.value : Number(btn.dataset.value);
      saveSettings(); syncOnline(); sfx.click();
    }));
    $("#btn-online-go").addEventListener("click", () => {
      sfx.click();
      if (Net.role === "host") { if (Net.connected) hostStartMatch(); return; }
      createRoom();
    });
    $("#btn-online-back").addEventListener("click", () => { sfx.click(); leaveRoom(); goBack(); });
    $("#btn-copy-link").addEventListener("click", () => {
      const link = Net.linkFor(roomCode);
      const done = () => {
        $("#btn-copy-link").textContent = t("on.copied");
        setTimeout(() => { $("#btn-copy-link").textContent = t("on.copy"); }, 1800);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(link).then(done).catch(selectLink);
      else selectLink();
    });
    $("#btn-share-link").addEventListener("click", () => {
      const url = Net.linkFor(roomCode);
      if (navigator.share) navigator.share({ title: "Saat Chara", text: t("on.shareText"), url }).catch(() => {});
      else window.open(`https://wa.me/?text=${encodeURIComponent(t("on.shareText") + " " + url)}`, "_blank", "noopener");
    });
    $("#btn-join").addEventListener("click", () => { Sound.unlock(); sfx.click(); joinRoom(); });
    $("#btn-join-cancel").addEventListener("click", () => { sfx.click(); quitToMenu(); });
    syncOnline();
  }

  function selectLink() {
    const r = document.createRange();
    r.selectNodeContents($("#room-link"));
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  }

  function syncOnline() {
    const o = settings.online;
    $$(".mode-card").forEach((c) => {
      const on = c.dataset.mode === o.mode;
      c.classList.toggle("active", on);
      c.setAttribute("aria-checked", on ? "true" : "false");
    });
    $$("[data-online]").forEach((seg) => {
      seg.querySelectorAll("button").forEach((btn) => btn.classList.toggle("active", String(o[seg.dataset.online]) === btn.dataset.value));
    });
    $("#online-diff").classList.toggle("hidden", o.mode !== "coop");
  }

  function createRoom() {
    roomCode = null;
    setOnlineState("creating");
    Net.host({
      ready(code) {
        roomCode = code;
        $("#room-code").textContent = code;
        $("#room-link").textContent = Net.linkFor(code);
        setOnlineState("waiting");
      },
      connect() { setOnlineState("ready"); sfx.whistle(); },
      data: hostOnData,
      close: onNetClosed,
      error() { setOnlineState("failed"); },
    });
  }

  function hostStartMatch() {
    Sound.unlock();
    applyAudioPrefs();
    Sound.startMusic();
    G.paused = false;
    input.keys = {};
    clearTimeout(resultTimer);
    $("#banner").classList.add("hidden");
    G.lastOpts = { ctx: "online", mode: settings.online.mode };
    startMatch(G.lastOpts);
    Net.send(matchSetupMessage());
    showScreen("game");
  }

  function joinRoom() {
    setOnlineState("joining");
    clearTimeout(joinTimer);
    joinTimer = setTimeout(() => { if (onlineState === "joining") { Net.close(); setOnlineState("failed"); } }, 20000);
    Net.join(joinCode, {
      connect() {
        clearTimeout(joinTimer);
        setOnlineState("joined");
        Net.send({ t: "hello" });
      },
      data(m) {
        if (!m) return;
        if (m.t === "start") {
          Sound.unlock();
          applyAudioPrefs();
          Sound.startMusic();
          clearTimeout(resultTimer);
          $("#banner").classList.add("hidden");
          startGuestMatch(m);
          showScreen("game");
        } else if (m.t === "s" && G.net === "guest") {
          applySnapshot(m);
        }
      },
      close: onNetClosed,
      error(type) {
        clearTimeout(joinTimer);
        setOnlineState(type === "peer-unavailable" ? "noRoom" : "failed");
      },
    });
  }

  function onNetClosed() {
    const wasGuest = Net.role === "guest" || G.net === "guest";
    const inMatch = G.mode === "play" && G.ctx === "online";
    Net.close();
    roomCode = null;
    clearTimeout(resultTimer);
    if (inMatch) {
      Sound.stopAmbience();
      startAttract();
    }
    setOnlineState("lost");
    if (wasGuest) { showScreen("join"); }
    else { showScreen("online", false); screenStack.push("title"); }
  }

  function leaveRoom() {
    clearTimeout(joinTimer);
    Net.close();
    roomCode = null;
    setOnlineState("idle");
  }

  function clearRoomFromUrl() {
    joinCode = null;
    if (Net.roomFromUrl() && history.replaceState) history.replaceState(null, "", location.pathname);
  }

  // ---------------------------------------------------------------------------
  // Flow
  // ---------------------------------------------------------------------------
  function beginMatch(opts) {
    Sound.unlock();
    applyAudioPrefs();
    Sound.startMusic();
    sfx.click();
    G.paused = false;
    input.keys = {};
    clearTimeout(resultTimer);
    $("#banner").classList.add("hidden");
    G.lastOpts = opts || { ctx: "quick" };
    startMatch(G.lastOpts);
    showScreen("game");
  }

  function startTourneyMatch() {
    if (settings.tourney.stage >= TOURNEY.length) {
      settings.tourney.stage = 0;
      saveSettings();
    }
    beginMatch({ ctx: "tourney", stage: settings.tourney.stage });
  }

  // Online matches keep running while the menu is open.
  function pauseGame() {
    if (G.mode !== "play") return;
    if (!G.net) G.paused = true;
    G.ctls.forEach((c) => { c.charge.active = false; });
    input.keys = {};
    $("#pause-online").classList.toggle("hidden", !G.net);
    $("#btn-restart").classList.toggle("hidden", G.net === "guest");
    showScreen("pause");
  }

  function resumeGame() {
    G.paused = false;
    last = performance.now();
    showScreen("game");
  }

  function quitToMenu() {
    if (G.net || Net.role) leaveRoom();
    clearRoomFromUrl();
    G.paused = false;
    clearTimeout(resultTimer);
    clearTimeout(bannerTimer);
    $("#banner").classList.add("hidden");
    Sound.stopAmbience();
    startAttract();
    showScreen("title");
  }

  $("#btn-play").addEventListener("click", () => {
    Sound.unlock(); sfx.click();
    if (!settings.tutorialDone) openScreen("first");
    else openScreen("setup");
  });
  $("#btn-online").addEventListener("click", () => {
    Sound.unlock(); sfx.click(); syncOnline(); setOnlineState("idle"); openScreen("online");
  });
  $("#btn-first-yes").addEventListener("click", () => beginMatch({ ctx: "tutorial" }));
  $("#btn-first-no").addEventListener("click", () => {
    settings.tutorialDone = true; saveSettings(); sfx.click(); showScreen("setup", false); screenStack.push("title");
  });
  $("#btn-tourney").addEventListener("click", () => { Sound.unlock(); sfx.click(); buildLadder(); openScreen("tourney"); });
  $("#btn-tourney-play").addEventListener("click", startTourneyMatch);
  $("#btn-howto").addEventListener("click", () => { Sound.unlock(); sfx.click(); openScreen("howto"); });
  $("#btn-howto-tutorial").addEventListener("click", () => beginMatch({ ctx: "tutorial" }));
  $("#btn-ach").addEventListener("click", () => { Sound.unlock(); sfx.click(); buildAchievements(); openScreen("ach"); });
  $("#btn-settings").addEventListener("click", () => { Sound.unlock(); sfx.click(); syncSettings(); openScreen("settings"); });
  $("#btn-story").addEventListener("click", () => { Sound.unlock(); sfx.click(); openScreen("story"); });
  $("#btn-replay-tutorial").addEventListener("click", () => beginMatch({ ctx: "tutorial" }));
  $("#btn-lang").addEventListener("click", () => {
    settings.lang = settings.lang === "bn" ? "en" : "bn";
    saveSettings();
    applyLanguage();
    syncSettings();
    sfx.click();
  });
  $$("[data-back]").forEach((b) => b.addEventListener("click", () => { sfx.click(); goBack(); }));
  $("#btn-start").addEventListener("click", () => beginMatch({ ctx: "quick" }));
  $("#btn-pause").addEventListener("click", () => { sfx.click(); pauseGame(); });
  $("#btn-zoom-in").addEventListener("click", () => { sfx.tick(); setZoom(settings.zoom * 1.25); });
  $("#btn-zoom-out").addEventListener("click", () => { sfx.tick(); setZoom(settings.zoom / 1.25); });
  $("#btn-sound").addEventListener("click", toggleSound);
  $("#btn-resume").addEventListener("click", () => { sfx.click(); resumeGame(); });
  $("#btn-restart").addEventListener("click", () => {
    if (G.net === "host") hostStartMatch();
    else beginMatch(G.lastOpts);
  });
  $("#btn-pause-settings").addEventListener("click", () => { sfx.click(); syncSettings(); openScreen("settings"); });
  $("#btn-quit").addEventListener("click", () => { sfx.click(); quitToMenu(); });
  $("#coach-skip").addEventListener("click", () => {
    settings.tutorialDone = true; saveSettings(); sfx.click(); quitToMenu();
  });
  $("#btn-again").addEventListener("click", () => {
    const action = $("#btn-again").dataset.action;
    if (action === "tourney") startTourneyMatch();
    else if (action === "online") { if (Net.connected) hostStartMatch(); else quitToMenu(); }
    else beginMatch({ ctx: "quick" });
  });
  $("#btn-share").addEventListener("click", () => { sfx.click(); shareResult(); });
  $("#btn-menu").addEventListener("click", () => { sfx.click(); quitToMenu(); });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (G.mode === "play" && currentScreen === "game" && !G.net) pauseGame();
      if (!G.net) Sound.suspend();
    } else {
      Sound.resume();
    }
  });

  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 200));

  // ---------------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------------
  let last = performance.now();
  const STEP = 1 / 120;

  function frame(now) {
    let dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (G.net === "guest") {
      guestUpdate(dt);
    } else if (!G.paused) {
      if (G.slowmo > 0) { G.slowmo -= dt; dt *= 0.4; }
      let rem = dt;
      while (rem > 1e-6) {
        const s = Math.min(STEP, rem);
        update(s);
        rem -= s;
      }
      if (G.net === "host" && Net.connected) {
        netSendT += dt;
        if (netSendT >= SNAPSHOT_EVERY) { netSendT = 0; hostSnapshot(); }
      }
    }
    updateCamera(dt);
    render();
    updateHud();
    requestAnimationFrame(frame);
  }

  // Boot
  I18N.setLang(settings.lang);
  if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) setTouchMode(true);
  resize();
  buildSetup();
  buildSettingsScreen();
  buildOnlineScreen();
  syncSettings();
  syncSoundUi();
  applyAudioPrefs();
  startAttract();
  joinCode = Net.roomFromUrl();
  if (joinCode) {
    $("#join-body").textContent = t("on.joinBody", { code: joinCode });
    setOnlineState("idle");
    showScreen("join");
  } else {
    showScreen("title");
  }
  Counter.trackErrors();
  Counter.trackVisit();
  setTimeout(refreshVisitCount, 1500);
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
  requestAnimationFrame(frame);
})();
