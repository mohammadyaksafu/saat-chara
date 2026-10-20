/* Saat Chara — visitor stats page. Reads the anonymous counters and draws them. */
(function () {
  "use strict";

  const C = window.SaatCounter;
  const DAYS = 14;

  const STR = {
    en: {
      title: "Visitor stats", refresh: "Refresh", play: "Play the game",
      visits: "Total visits", visitsSub: "every time the game is opened",
      visitors: "Unique visitors", visitorsSub: "different browsers",
      today: "Visits today", matches: "Matches played", matchesSub: "quick matches and tournament",
      dailyTitle: "Visits per day", dailyDesc: "Last 14 days (UTC)", table: "Show as table",
      date: "Date", visitsCol: "Visits", tutorials: "Tutorials finished", champions: "Upazila champions",
      perVisitor: "Visits per visitor", devices: "Devices", mobile: "Phones & tablets", desktop: "Computers",
      note: "Counts are anonymous: no cookies, names or IP addresses are stored by this game. Numbers come from the free <a href=\"https://jasoncameron.dev/abacus/\" rel=\"noopener\">Abacus</a> counter and update in real time.",
      loading: "Loading…", updated: "Updated {time}", failed: "Couldn't reach the counter. Check your connection and try Refresh.",
      visitWord: "visits",
    },
    bn: {
      title: "দর্শক পরিসংখ্যান", refresh: "আবার দেখো", play: "খেলায় ফিরে যাও",
      visits: "মোট ভিজিট", visitsSub: "যতবার খেলাটা খোলা হয়েছে",
      visitors: "আলাদা দর্শক", visitorsSub: "আলাদা ব্রাউজার",
      today: "আজকের ভিজিট", matches: "খেলা ম্যাচ", matchesSub: "দ্রুত খেলা ও টুর্নামেন্ট",
      dailyTitle: "দিনভিত্তিক ভিজিট", dailyDesc: "গত ১৪ দিন (UTC)", table: "টেবিল হিসেবে দেখো",
      date: "তারিখ", visitsCol: "ভিজিট", tutorials: "অনুশীলন শেষ করেছে", champions: "উপজেলা চ্যাম্পিয়ন",
      perVisitor: "দর্শকপ্রতি ভিজিট", devices: "ডিভাইস", mobile: "ফোন ও ট্যাবলেট", desktop: "কম্পিউটার",
      note: "গণনা সম্পূর্ণ বেনামি: এই খেলা কোনো কুকি, নাম বা আইপি ঠিকানা রাখে না। সংখ্যাগুলো আসে বিনামূল্যের <a href=\"https://jasoncameron.dev/abacus/\" rel=\"noopener\">Abacus</a> কাউন্টার থেকে।",
      loading: "লোড হচ্ছে…", updated: "হালনাগাদ {time}", failed: "কাউন্টারে পৌঁছানো যায়নি। সংযোগ দেখে আবার চেষ্টা করো।",
      visitWord: "ভিজিট",
    },
  };

  let lang = "en";
  try {
    const s = JSON.parse(localStorage.getItem("saatchara.v1")) || {};
    if (s.lang === "bn") lang = "bn";
  } catch (e) { /* default */ }
  const tr = (k) => STR[lang][k] || STR.en[k];
  const BN = "০১২৩৪৫৬৭৮৯";
  const fmt = (n) => {
    const s = Number(n).toLocaleString("en-US");
    return lang === "bn" ? s.replace(/[0-9]/g, (d) => BN[d]) : s;
  };
  const $ = (s) => document.querySelector(s);

  document.documentElement.lang = lang;
  document.querySelectorAll("[data-s]").forEach((el) => { el.textContent = tr(el.dataset.s); });
  document.querySelectorAll("[data-s-html]").forEach((el) => { el.innerHTML = tr(el.dataset.sHtml); });

  function setValue(id, v) {
    const el = $(id);
    el.classList.remove("skeleton");
    el.textContent = v == null ? "–" : v;
  }

  function lastDays() {
    const out = [];
    const now = new Date();
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      out.push(d);
    }
    return out;
  }

  // Read keys a few at a time to stay well inside the API's rate limit.
  async function getMany(keys) {
    const out = [];
    for (let i = 0; i < keys.length; i += 6) {
      const chunk = await Promise.all(keys.slice(i, i + 6).map((k) => C.get(k)));
      out.push(...chunk);
    }
    return out;
  }

  function drawChart(days, values) {
    const svg = $("#chart-svg");
    const box = svg.getBoundingClientRect();
    const Wd = Math.max(280, box.width), Hd = box.height || 240;
    const padL = 34, padR = 6, padT = 10, padB = 26;
    const max = Math.max(4, ...values.map((v) => v || 0));
    const step = niceStep(max / 4);
    const top = Math.ceil(max / step) * step;
    const plotW = Wd - padL - padR, plotH = Hd - padT - padB;
    const slot = plotW / days.length;
    const barW = Math.max(6, Math.min(36, slot - 2));
    const y = (v) => padT + plotH - (v / top) * plotH;
    const ns = "http://www.w3.org/2000/svg";

    svg.setAttribute("viewBox", `0 0 ${Wd} ${Hd}`);
    svg.querySelectorAll("g").forEach((g) => g.remove());
    const g = document.createElementNS(ns, "g");

    for (let v = 0; v <= top; v += step) {
      const ln = document.createElementNS(ns, "line");
      ln.setAttribute("x1", padL); ln.setAttribute("x2", Wd - padR);
      ln.setAttribute("y1", y(v)); ln.setAttribute("y2", y(v));
      ln.setAttribute("class", "gridline");
      g.appendChild(ln);
      const tx = document.createElementNS(ns, "text");
      tx.setAttribute("x", padL - 6); tx.setAttribute("y", y(v) + 4);
      tx.setAttribute("text-anchor", "end");
      tx.setAttribute("class", "axis-label");
      tx.textContent = fmt(v);
      g.appendChild(tx);
    }

    const tip = $("#tooltip");
    days.forEach((d, i) => {
      const v = values[i] || 0;
      const cx = padL + slot * i + slot / 2;
      const h = Math.max(0, (v / top) * plotH);
      const x = cx - barW / 2;
      const yTop = padT + plotH - h;
      const r = Math.min(4, h, barW / 2);

      // Invisible hit target taller than the bar so small values are easy to hover.
      const hit = document.createElementNS(ns, "rect");
      hit.setAttribute("x", padL + slot * i); hit.setAttribute("y", padT);
      hit.setAttribute("width", slot); hit.setAttribute("height", plotH);
      hit.setAttribute("class", "hit");
      g.appendChild(hit);

      const bar = document.createElementNS(ns, "path");
      // Rounded data end at the top, square at the baseline.
      bar.setAttribute("d", h <= 0 ? "" :
        `M${x},${padT + plotH} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${padT + plotH} Z`);
      bar.setAttribute("class", "bar" + (i === days.length - 1 ? " today" : ""));
      g.appendChild(bar);

      const label = d.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
      if (i % 2 === (days.length - 1) % 2) {
        const tx = document.createElementNS(ns, "text");
        tx.setAttribute("x", cx); tx.setAttribute("y", Hd - 6);
        tx.setAttribute("text-anchor", "middle");
        tx.setAttribute("class", "axis-label");
        tx.textContent = label;
        g.appendChild(tx);
      }

      const show = () => {
        bar.classList.add("active");
        tip.innerHTML = `${label} · <span>${fmt(v)}</span> ${tr("visitWord")}`;
        tip.style.left = `${(cx / Wd) * 100}%`;
        tip.style.top = `${(Math.min(yTop, padT + plotH - 4) / Hd) * 100}%`;
        tip.classList.add("on");
      };
      const hide = () => { bar.classList.remove("active"); tip.classList.remove("on"); };
      hit.addEventListener("pointerenter", show);
      hit.addEventListener("pointerleave", hide);
      hit.addEventListener("click", show);
    });
    svg.appendChild(g);
  }

  function niceStep(raw) {
    const p = Math.pow(10, Math.floor(Math.log10(Math.max(1, raw))));
    const n = raw / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  }

  let lastDaily = null;

  async function load() {
    $("#status").textContent = tr("loading");
    const days = lastDays();
    const keys = ["visits", "visitors", "matches", "tutorials", "champions", "device-mobile", "device-desktop"];
    const main = await getMany(keys);
    const daily = await getMany(days.map((d) => "day-" + C.day(d)));
    const [visits, visitors, matches, tutorials, champions, mobile, desktop] = main;

    if (main.every((v) => v == null)) {
      $("#status").textContent = tr("failed");
      return;
    }
    setValue("#v-visits", visits == null ? null : fmt(visits));
    setValue("#v-visitors", visitors == null ? null : fmt(visitors));
    setValue("#v-matches", matches == null ? null : fmt(matches));
    setValue("#v-tutorials", tutorials == null ? null : fmt(tutorials));
    setValue("#v-champions", champions == null ? null : fmt(champions));
    setValue("#v-today", daily[daily.length - 1] == null ? null : fmt(daily[daily.length - 1]));
    setValue("#v-ratio", visitors ? (visits / visitors).toFixed(1) : "–");
    $("#v-today-date").textContent = days[days.length - 1].toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "long", timeZone: "UTC" });

    const m = mobile || 0, d = desktop || 0, total = m + d;
    $("#v-mobile").textContent = `${fmt(m)}${total ? ` (${Math.round((m / total) * 100)}%)` : ""}`;
    $("#v-desktop").textContent = `${fmt(d)}${total ? ` (${Math.round((d / total) * 100)}%)` : ""}`;
    $("#split .m").style.width = total ? `${(m / total) * 100}%` : "0";
    $("#split .d").style.width = total ? `${(d / total) * 100}%` : "0";

    lastDaily = { days, values: daily };
    drawChart(days, daily);
    $("#table-body").innerHTML = days.slice().reverse().map((dd, i) => {
      const v = daily[days.length - 1 - i];
      return `<tr><td>${dd.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}</td><td class="num">${v == null ? "–" : fmt(v)}</td></tr>`;
    }).join("");

    const time = new Date().toLocaleTimeString(lang === "bn" ? "bn-BD" : "en-GB", { hour: "2-digit", minute: "2-digit" });
    $("#status").textContent = tr("updated").replace("{time}", time);
  }

  $("#refresh").addEventListener("click", load);
  window.addEventListener("resize", () => { if (lastDaily) drawChart(lastDaily.days, lastDaily.values); });
  load();
})();
