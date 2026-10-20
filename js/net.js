/* Saat Chara — two-device play over WebRTC (PeerJS).
   The PeerJS public broker only introduces the two browsers; game data then flows
   directly between them. The library is loaded only when someone opens online play. */
(function () {
  "use strict";

  const PEERJS_URL = "https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js";
  const PREFIX = "saatchara-";
  const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

  let peer = null;
  let conn = null;
  let role = null;           // "host" | "guest" | null
  let handlers = {};
  let libPromise = null;

  function loadLib() {
    if (window.Peer) return Promise.resolve();
    if (libPromise) return libPromise;
    libPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = PEERJS_URL;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { libPromise = null; reject(new Error("load")); };
      document.head.appendChild(s);
    });
    return libPromise;
  }

  function makeCode() {
    let c = "";
    const buf = new Uint32Array(6);
    (window.crypto || window.msCrypto).getRandomValues(buf);
    for (let i = 0; i < 6; i++) c += ALPHABET[buf[i] % ALPHABET.length];
    return c;
  }

  function emit(name, arg) {
    if (handlers[name]) handlers[name](arg);
  }

  function wire(c) {
    conn = c;
    c.on("open", () => emit("connect"));
    c.on("data", (d) => emit("data", d));
    c.on("close", () => { if (conn === c) { conn = null; emit("close"); } });
    c.on("error", () => emit("close"));
  }

  // Host: create a room and wait for one friend.
  function host(h, attempt) {
    handlers = h || {};
    role = "host";
    return loadLib().then(() => {
      const code = makeCode();
      peer = new window.Peer(PREFIX + code, { debug: 0 });
      peer.on("open", () => emit("ready", code));
      peer.on("connection", (c) => {
        if (conn) { c.on("open", () => c.close()); return; } // room is full
        wire(c);
      });
      peer.on("error", (err) => {
        if (err && err.type === "unavailable-id" && (attempt || 0) < 3) {
          peer.destroy();
          host(h, (attempt || 0) + 1);
          return;
        }
        if (err && err.type === "peer-unavailable") return;
        emit("error", err && err.type);
      });
      peer.on("disconnected", () => { if (peer && !peer.destroyed) peer.reconnect(); });
    }).catch(() => emit("error", "load"));
  }

  // Guest: join the room in the link.
  function join(code, h) {
    handlers = h || {};
    role = "guest";
    return loadLib().then(() => {
      peer = new window.Peer({ debug: 0 });
      peer.on("open", () => {
        const c = peer.connect(PREFIX + code.toUpperCase(), { reliable: true, serialization: "json" });
        wire(c);
      });
      peer.on("error", (err) => emit("error", err && err.type));
    }).catch(() => emit("error", "load"));
  }

  function send(obj) {
    if (conn && conn.open) {
      try { conn.send(obj); } catch (e) { /* channel closing */ }
    }
  }

  function close() {
    handlers = {};
    try { if (conn) conn.close(); } catch (e) { /* already closed */ }
    try { if (peer) peer.destroy(); } catch (e) { /* already destroyed */ }
    conn = null;
    peer = null;
    role = null;
  }

  function roomFromUrl() {
    const m = /[?&]room=([A-Za-z0-9]{4,10})/.exec(location.search);
    return m ? m[1].toUpperCase() : null;
  }

  function linkFor(code) {
    return `${location.origin}${location.pathname.replace(/index\.html$/, "")}?room=${code}`;
  }

  window.SaatNet = {
    host, join, send, close, roomFromUrl, linkFor,
    get role() { return role; },
    get connected() { return !!(conn && conn.open); },
  };
})();
