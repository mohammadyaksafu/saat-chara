/* Saat Chara — anonymous visit and play counters.
   Uses the free Abacus counter API (https://jasoncameron.dev/abacus/). Only counts are
   stored: no cookies, names, IPs or other personal data are sent from this page. */
(function () {
  "use strict";

  const API = "https://abacus.jasoncameron.dev";
  const NS = "saatchara-mohammadyaksafu";
  const VISITOR_KEY = "saatchara.visitor";

  // Count only on the real site, never while developing locally or from a file.
  const live = /^https?:$/.test(location.protocol) &&
    !/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname);

  const day = (d) => d.toISOString().slice(0, 10);

  function hit(key) {
    if (!live) return Promise.resolve(null);
    return fetch(`${API}/hit/${NS}/${key}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j ? j.value : null))
      .catch(() => null);
  }

  // Reads a counter; a key that was never hit reads as 0. Returns null on network failure.
  function get(key) {
    return fetch(`${API}/get/${NS}/${key}`, { cache: "no-store" })
      .then((r) => (r.status === 404 ? { value: 0 } : r.ok ? r.json() : null))
      .then((j) => (j ? j.value : null))
      .catch(() => null);
  }

  function trackVisit() {
    hit("visits");
    hit("day-" + day(new Date()));
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    hit(coarse ? "device-mobile" : "device-desktop");
    let firstTime = false;
    try {
      if (!localStorage.getItem(VISITOR_KEY)) {
        localStorage.setItem(VISITOR_KEY, "1");
        firstTime = true;
      }
    } catch (e) { /* private mode: treat as returning */ }
    if (firstTime) hit("visitors");
  }

  let errorSent = false;
  function trackErrors() {
    window.addEventListener("error", () => {
      if (errorSent) return;
      errorSent = true;
      hit("errors");
    });
  }

  window.SaatCounter = { API, NS, live, day, hit, get, trackVisit, trackErrors };
})();
