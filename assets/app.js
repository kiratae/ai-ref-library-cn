(function () {
"use strict";

var $ = function (s) { return document.querySelector(s); };
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
function trackEvent(name, params) { try { if (window.track) window.track(name, params); } catch (e) { } }
var searchTimer = null;
function trackSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(function () {
    if (S.q) trackEvent("search", { lib: S.lib, q: S.q.slice(0, 40) });
  }, 800);
}

var LIB = {
  face: {
    key: "face", name: "Faces", file: "data/face.js", g: "LIB_FACE", total: 1499, unit: "images",
    site: "https://ai-portrait-gallery.pages.dev/",
    remote: function (base) { return "https://ai-portrait-gallery.pages.dev/img/full/" + base + ".png"; }
  },
  pose: {
    key: "pose", name: "Poses", file: "data/pose.js", g: "LIB_POSE", total: 288, unit: "poses",
    site: "https://ai-pose-gallery.pages.dev/",
    remote: function (base) { return "https://ai-pose-gallery.pages.dev/img/" + base + ".png"; }
  },
  costume: {
    key: "costume", name: "Outfits", file: "data/costume.js", g: "LIB_COSTUME", total: 1407, unit: "sets",
    site: "https://ai-costume-gallery.pages.dev/",
    remote: function (base) { return "https://ai-costume-gallery.pages.dev/png/" + base + ".png"; }
  }
};

var LOCAL = window.LOCAL_ORIGINALS || { face: "", pose: "", costume: "" };

var S = {
  lib: "face", q: "",
  face: { sec: -1, hair: -1 },
  pose: { series: -1, cat: "", ang: "", view: "pose" },
  costume: { cat: -1 }
};

var cache = {};
var cur = null;      // item currently open in the modal
var curLib = null;
var curAngle = "";   // current angle in the Poses library
var REF_MODE = "line";   // global: line | depth (pose reference type)
try { REF_MODE = window.localStorage.getItem("refMode") || "line"; } catch (e) { }
var localOk = true;  // whether local originals are available (for download links)

function data(lib) { return cache[lib].data; }
function imgMap(lib) { return cache[lib].img; }
function thumb(lib, base) { return imgMap(lib)[base] || ""; }

function loadLib(lib) {
  if (cache[lib]) return Promise.resolve(cache[lib]);
  return new Promise(function (resolve, reject) {
    var s = document.createElement("script");
    s.src = LIB[lib].file;
    s.onload = function () {
      var g = window[LIB[lib].g];
      if (!g) { reject(new Error("Failed to load data")); return; }
      cache[lib] = g;
      resolve(g);
    };
    s.onerror = function () { reject(new Error("Could not load " + LIB[lib].file)); };
    document.head.appendChild(s);
    $("#toolbar").innerHTML = '<div class="loading">Loading ' + LIB[lib].name + " (about 15 MB — the first load may take a few seconds)…</div>";
    $("#grid").innerHTML = "";
  });
}

/* ---------- Cards ---------- */
function faceCard(it) {
  var hair = it.h >= 0 ? data("face").hairs[it.h].name : "";
  var sec = data("face").sections[it.s].name;
  return '<article class="card" data-id="' + it.id + '">'
    + '<div class="ph r45"><img loading="lazy" decoding="async" src="' + thumb("face", it.id) + '" alt="' + it.id + '">'
    + '<div class="badge">' + it.id + "</div>" + (it.hot ? '<div class="fire" title="Top 10 most downloaded"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c3 4 5 5.5 5 9a5 5 0 0 1-10 0c0-2 .8-3.2 2-4.5"/></svg></div>' : "") + "</div>"
    + '<div class="meta"><div class="tags"><span class="cat">' + esc(sec) + "</span>" + (hair ? '<span class="tag">' + esc(hair) + "</span>" : "") + "</div>"
    + (it.se ? '<p class="en">' + esc(it.se) + "</p>" : "") + "</div></article>";
}

function poseCard(p) {
  var main = p.ang[S.pose.ang] || p.ang["Front"] || p.ang[Object.keys(p.ang)[0]];
  var strip = Object.keys(p.ang).map(function (a) {
    return '<button data-k="' + esc(p.key) + '" data-a="' + esc(a) + '"' + (a === (S.pose.ang || "Front") ? ' class="on"' : "") + ' title="' + esc(a) + '"><img loading="lazy" decoding="async" src="' + thumb("pose", p.ang[a]) + '" alt="' + esc(a) + '"></button>';
  }).join("");
  return '<article class="card" data-k="' + esc(p.key) + '">'
    + '<div class="ph r34" data-a="' + esc(S.pose.ang || "Front") + '"><img loading="lazy" decoding="async" src="' + thumb("pose", main) + '" alt="' + esc(p.en) + '"><div class="badge">' + p.id + "</div></div>"
    + '<div class="meta"><h3>' + esc(p.en) + '</h3><p class="ja">' + esc(p.ja) + "</p>"
    + '<div class="tags"><span class="tag">' + esc(data("pose").series[p.s].name) + '</span><span class="tag">' + esc(p.cat) + "</span></div></div>"
    + (S.pose.view === "one" ? "" : '<div class="strip">' + strip + "</div>")
    + "</article>";
}

function costumeCard(it) {
  var c = data("costume").cats[it.c].name;
  var shown = it.kw.slice(0, 4), rest = it.kw.length - shown.length;
  return '<article class="card" data-id="' + it.id + '">'
    + '<div class="ph r23"><img loading="lazy" decoding="async" src="' + thumb("costume", it.id) + '" alt="' + it.id + '"><div class="badge">' + it.id + "</div></div>"
    + '<div class="meta"><div class="tags"><span class="cat">' + esc(c) + "</span>"
    + shown.map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("")
    + (rest > 0 ? '<span class="more">+' + rest + "</span>" : "")
    + "</div></div></article>";
}

/* ---------- Filtering ---------- */
function faceMatch(it) {
  if (S.face.sec >= 0 && it.s !== S.face.sec) return false;
  if (S.face.hair >= 0 && it.h !== S.face.hair) return false;
  if (S.q) {
    var q = S.q.toLowerCase();
    var hay = (it.id + " " + data("face").sections[it.s].name + " " + (it.se || "") + " " + (it.sj || "") + " " + (it.h >= 0 ? data("face").hairs[it.h].name : "")).toLowerCase();
    if (hay.indexOf(q) < 0) return false;
  }
  return true;
}
function poseMatch(p) {
  if (S.pose.series >= 0 && p.s !== S.pose.series) return false;
  if (S.pose.cat && p.cat !== S.pose.cat) return false;
  if (S.q) {
    var q = S.q.toLowerCase();
    var hay = (p.en + " " + p.ja + " " + p.id + " " + p.cat + " " + data("pose").series[p.s].name).toLowerCase();
    if (hay.indexOf(q) < 0) return false;
  }
  return true;
}
function costumeMatch(it) {
  if (S.costume.cat >= 0 && it.c !== S.costume.cat) return false;
  if (S.q) {
    var q = S.q.toLowerCase();
    var hay = (it.id + " " + data("costume").cats[it.c].name + " " + it.kw.join(" ")).toLowerCase();
    if (hay.indexOf(q) < 0) return false;
  }
  return true;
}

/* ---------- Toolbar ---------- */
function tabsHTML(items, active, attr) {
  return items.map(function (x, i) {
    return '<button class="tab' + (i === active ? " on" : "") + '" data-' + attr + '="' + i + '">' + esc(x.label) + "<b>" + x.n + "</b>" + (x.suffix ? "<i>" + x.suffix + "</i>" : "") + "</button>";
  }).join("");
}

function toolbarFace() {
  var d = data("face");
  var tabs = [{ label: "All", n: d.items.length, suffix: "" }].concat(d.sections.map(function (s) { return { label: s.name, n: s.n, suffix: "" }; }));
  var all = '<button class="tab' + (S.face.sec < 0 ? " on" : "") + '" data-sec="-1">All<b>' + d.items.length + '</b></button>';
  d.sections.forEach(function (s, i) {
    all += '<button class="tab' + (S.face.sec === i ? " on" : "") + '" data-sec="' + i + '">' + esc(s.name) + "<b>" + s.n + "</b></button>";
  });
  var counts = [0, 0, 0, 0];
  d.items.forEach(function (it) { if ((S.face.sec < 0 || it.s === S.face.sec) && it.h >= 0) counts[it.h]++; });
  var hair = '<button data-hair="-1"' + (S.face.hair < 0 ? ' class="on"' : "") + ">All hair lengths</button>";
  d.hairs.forEach(function (h, i) {
    hair += '<button data-hair="' + i + '"' + (S.face.hair === i ? ' class="on"' : "") + ">" + esc(h.name) + " " + counts[i] + "</button>";
  });
  $("#toolbar").innerHTML = '<div class="tabs">' + all + "</div>"
    + '<div class="row"><input id="q" type="search" placeholder="Search: ID / style (butterfly cut, wolf cut, see-through bangs)" autocomplete="off">'
    + '<div class="seg" id="hairseg">' + hair + '</div><button class="rndbtn" id="rnd2"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3h5v5"/><path d="M21 3 13 11"/><path d="M8 21H3v-5"/><path d="M3 21l8-8"/><path d="M21 16v5h-5"/><path d="m21 21-4-4"/><path d="M3 8V3h5"/><path d="m3 3 4 4"/></svg>Random pick</button><span id="count"></span></div>';
  $("#toolbar").querySelectorAll("[data-sec]").forEach(function (b) {
    b.onclick = function () { S.face.sec = +b.dataset.sec; S.q = ""; trackEvent("filter", { lib: "face", type: "section", value: b.dataset.sec }); render(); };
  });
  $("#toolbar").querySelectorAll("[data-hair]").forEach(function (b) {
    b.onclick = function () { S.face.hair = +b.dataset.hair; trackEvent("filter", { lib: "face", type: "hair", value: b.dataset.hair }); render(); };
  });
  $("#q").value = S.q;
  $("#q").oninput = function (e) { S.q = e.target.value.trim(); render(true); trackSearch(); };
}

function toolbarPose() {
  var d = data("pose");
  var all = '<button class="tab' + (S.pose.series < 0 ? " on" : "") + '" data-series="-1">All<b>' + d.poses.length + '</b><i>poses</i></button>';
  d.series.forEach(function (s, i) {
    all += '<button class="tab' + (S.pose.series === i ? " on" : "") + '" data-series="' + i + '">' + esc(s.name) + "<b>" + s.n + "</b><i>poses / " + s.img + " images</i></button>";
  });
  var cats = [];
  d.poses.forEach(function (p) { if ((S.pose.series < 0 || p.s === S.pose.series) && cats.indexOf(p.cat) < 0) cats.push(p.cat); });
  var sel = '<select id="cat"><option value="">All categories</option>' + cats.map(function (c) {
    return '<option value="' + esc(c) + '"' + (S.pose.cat === c ? " selected" : "") + ">" + esc(c) + "</option>";
  }).join("") + "</select>";
  var angs = ["", "Front", "High", "Low", "Side", "Diagonal 45°"];
  var angHTML = angs.map(function (a) {
    return '<button data-ang="' + a + '"' + (S.pose.ang === a ? ' class="on"' : "") + ">" + (a || "All angles") + "</button>";
  }).join("");
  $("#toolbar").innerHTML = '<div class="tabs">' + all + "</div>"
    + '<div class="row"><input id="q" type="search" placeholder="Search: name / Japanese name / ID (e.g. heart, P023, standing)" autocomplete="off">'
    + sel + '<div class="seg" id="angseg">' + angHTML + "</div>"
    + '<div class="seg" id="viewseg"><button data-view="pose"' + (S.pose.view === "pose" ? ' class="on"' : '') + '>By pose</button><button data-view="one"' + (S.pose.view === "one" ? ' class="on"' : '') + '>By image</button></div>' 
    + '<button class="rndbtn" id="rnd2"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3h5v5"/><path d="M21 3 13 11"/><path d="M8 21H3v-5"/><path d="M3 21l8-8"/><path d="M21 16v5h-5"/><path d="m21 21-4-4"/><path d="M3 8V3h5"/><path d="m3 3 4 4"/></svg>Random pick</button><span id="count"></span></div>';
  $("#toolbar").querySelectorAll("[data-series]").forEach(function (b) {
    b.onclick = function () { S.pose.series = +b.dataset.series; S.pose.cat = ""; trackEvent("filter", { lib: "pose", type: "series", value: b.dataset.series }); render(); };
  });
  $("#toolbar").querySelectorAll("[data-ang]").forEach(function (b) {
    b.onclick = function () { S.pose.ang = b.dataset.ang; trackEvent("filter", { lib: "pose", type: "angle", value: b.dataset.ang || "all" }); render(); };
  });
  $("#toolbar").querySelectorAll("[data-view]").forEach(function (b) {
    b.onclick = function () { S.pose.view = b.dataset.view; trackEvent("filter", { lib: "pose", type: "view", value: b.dataset.view }); render(); };
  });
  $("#cat").onchange = function (e) { S.pose.cat = e.target.value; trackEvent("filter", { lib: "pose", type: "cat", value: e.target.value || "all" }); render(); };
  $("#q").value = S.q;
  $("#q").oninput = function (e) { S.q = e.target.value.trim(); render(true); trackSearch(); };
}

function toolbarCostume() {
  var d = data("costume");
  var all = '<button class="tab' + (S.costume.cat < 0 ? " on" : "") + '" data-cat="-1">All<b>' + d.items.length + "</b></button>";
  d.cats.forEach(function (c, i) {
    all += '<button class="tab' + (S.costume.cat === i ? " on" : "") + '" data-cat="' + i + '">' + esc(c.name) + "<b>" + c.n + "</b></button>";
  });
  $("#toolbar").innerHTML = '<div class="tabs">' + all + "</div>"
    + '<div class="row"><input id="q" type="search" placeholder="Search: ID / tags (denim, lace, skirt)" autocomplete="off"><button class="rndbtn" id="rnd2"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3h5v5"/><path d="M21 3 13 11"/><path d="M8 21H3v-5"/><path d="M3 21l8-8"/><path d="M21 16v5h-5"/><path d="m21 21-4-4"/><path d="M3 8V3h5"/><path d="m3 3 4 4"/></svg>Random pick</button><span id="count"></span></div>';
  $("#toolbar").querySelectorAll("[data-cat]").forEach(function (b) {
    b.onclick = function () { S.costume.cat = +b.dataset.cat; trackEvent("filter", { lib: "costume", type: "cat", value: b.dataset.cat }); render(); };
  });
  $("#q").value = S.q;
  $("#q").oninput = function (e) { S.q = e.target.value.trim(); render(true); trackSearch(); };
}

/* ---------- Rendering ---------- */
function render(gridOnly) {
  if (!cache[S.lib]) return;
  if (!gridOnly) {
    if (S.lib === "face") toolbarFace();
    else if (S.lib === "pose") toolbarPose();
    else toolbarCostume();
  }
  if (S.lib === "face") renderFace();
  else if (S.lib === "pose") renderPose();
  else renderCostume();
}

function optimizeFirstScreen() {
  var imgs = document.querySelectorAll("#grid .card img");
  for (var i = 0; i < imgs.length && i < 10; i++) {
    imgs[i].loading = "eager";
    imgs[i].setAttribute("fetchpriority", "high");
  }
}

function renderFace() {
  var d = data("face");
  var list = d.items.filter(faceMatch);
  $("#grid").className = "grid face";
  $("#grid").innerHTML = list.map(faceCard).join("");
  $("#count").textContent = "Matches: " + list.length + " images";
  $("#grid").querySelectorAll(".card").forEach(function (c) { c.onclick = function () { openFace(c.dataset.id); }; });
  optimizeFirstScreen();
}

function renderPose() {
  var d = data("pose");
  var list = d.poses.filter(poseMatch);
  var html = "", shown = 0;
  if (S.pose.view === "one") {
    var angs = S.pose.ang ? [S.pose.ang] : ["Front", "High", "Low", "Side", "Diagonal 45°"];
    list.forEach(function (p) {
      angs.forEach(function (a) { if (p.ang[a]) { html += poseCardOne(p, a); shown++; } });
    });
  } else {
    html = list.map(poseCard).join("");
    shown = list.length;
  }
  $("#grid").className = "grid pose";
  $("#grid").innerHTML = html;
  $("#count").textContent = "Matches: " + shown + (S.pose.view === "one" ? " images" : " poses");
  $("#grid").querySelectorAll(".card").forEach(function (c) {
    var ph = c.querySelector(".ph");
    c.onclick = function () { openPose(c.dataset.k || c.dataset.key, ph.dataset.a || S.pose.ang || "Front"); };
    c.querySelectorAll(".strip button").forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); openPose(b.dataset.k, b.dataset.a); };
    });
  });
  optimizeFirstScreen();
}

function poseCardOne(p, a) {
  return '<article class="card" data-key="' + esc(p.key) + '">'
    + '<div class="ph r34" data-a="' + esc(a) + '"><img loading="lazy" decoding="async" src="' + thumb("pose", p.ang[a]) + '" alt="' + esc(p.en) + '"><div class="badge">' + p.id + " · " + esc(a) + "</div></div>"
    + '<div class="meta"><h3>' + esc(p.en) + '</h3><p class="ja">' + esc(p.ja) + "</p>"
    + '<div class="tags"><span class="tag">' + esc(data("pose").series[p.s].name) + '</span><span class="tag">' + esc(p.cat) + "</span></div></div></article>";
}

function renderCostume() {
  var d = data("costume");
  var list = d.items.filter(costumeMatch);
  $("#grid").className = "grid";
  $("#grid").innerHTML = list.map(costumeCard).join("");
  $("#count").textContent = "Matches: " + list.length + " sets";
  $("#grid").querySelectorAll(".card").forEach(function (c) { c.onclick = function () { openCostume(c.dataset.id); }; });
  optimizeFirstScreen();
}

/* ---------- Modal ---------- */
function resolveOriginal(lib, base, name) {
  var local = (location.protocol === "file:" && LOCAL[lib]) ? (LOCAL[lib] + base + ".png") : "";
  var remote = LIB[lib].remote(base);
  var im = $("#mimg");
  localOk = false;
  // Default the download link to the source site so a missing local path never opens an error page
  setDownload(remote, name);
  im.onerror = function () {
    if (local && im.getAttribute("src") === local) {
      im.onerror = function () { im.onerror = null; im.src = thumb(lib, base); };
      im.src = remote;
    } else { im.onerror = null; im.src = thumb(lib, base); }
  };
  im.onload = function () {
    var d = im.naturalWidth + "×" + im.naturalHeight;
    var el = $("#mdim");
    if (el) el.textContent = d;
    if (local && im.getAttribute("src") === local) {
      localOk = true;
      setDownload(local, name);
    }
  };
  im.src = local || remote;
}

function showModal() { $("#modal").classList.add("on"); }
function hideModal() { $("#modal").classList.remove("on"); }

function setDownload(link, name) {
  $("#mdl").href = link;
  $("#mdl").setAttribute("download", name);
}

function showPan(lib) {
  var cfg = window.PAN_LINKS || {};
  var item = cfg[lib];
  var b = $("#mPanBaidu"), q = $("#mPanQuark");
  var has = !!(item && (item.baidu || item.quark));
  $("#mpan").hidden = !has;
  if (!has) return;
  b.href = item.baidu || "#";
  b.hidden = !item.baidu;
  q.href = item.quark || "#";
  q.hidden = !item.quark;
  b.onclick = function () { trackEvent("ref_click", { source: "pan_baidu_" + lib }); };
  q.onclick = function () { trackEvent("ref_click", { source: "pan_quark_" + lib }); };
}

function openFace(id) {
  curLib = "face"; cur = data("face").items.filter(function (x) { return x.id === id; })[0];
  if (!cur) return;
  trackEvent("item_open", { lib: "face", id: cur.id });
  var d = data("face");
  resolveOriginal("face", cur.id, cur.id + ".png");
  $("#mtitle").textContent = d.sections[cur.s].name + " · " + cur.id;
  $("#mfields").innerHTML = '<dt>ID</dt><dd>' + cur.id + "</dd><dt>Type</dt><dd>" + esc(d.sections[cur.s].name) + "</dd>"
    + "<dt>Hair length</dt><dd>" + (cur.h >= 0 ? esc(d.hairs[cur.h].name) : "—") + '</dd><dt>Size</dt><dd id="mdim">—</dd>';
  var chips = "";
  if (cur.se) chips += '<span class="chip">' + esc(cur.se) + "</span>";
  if (cur.sj) chips += '<span class="chip en">' + esc(cur.sj) + "</span>";
  $("#mextra").innerHTML = '<div class="sect">Style</div>' + (chips || '<span style="color:#9a9aa4;font-size:12px">None (front-facing close-up on a plain background)</span>');
  $("#mdepth").hidden = true;
  $("#mMode").hidden = true;
  $("#mdl").textContent = "Download original (PNG, high-res)";
  $("#mcopy").dataset.lib = "face";
  showPan("face");
  showModal();
}

function paintPoseImage(base, depthUrl) {
  var im = $("#mimg");
  if (REF_MODE === "depth") {
    im.referrerPolicy = "no-referrer";
    im.onerror = function () {
      im.onerror = null;
      resolveOriginal("pose", base, base + ".png");
    };
    im.onload = function () {
      var el = $("#mdim");
      if (el) el.textContent = im.naturalWidth + "×" + im.naturalHeight;
    };
    im.src = depthUrl;
  } else {
    im.referrerPolicy = "";
    resolveOriginal("pose", base, base + ".png");
  }
}

function syncModeUI() {
  document.querySelectorAll("#refModeSeg button, #mMode button").forEach(function (b) {
    b.classList.toggle("on", b.dataset.mode === REF_MODE);
    b.setAttribute("aria-pressed", b.dataset.mode === REF_MODE ? "true" : "false");
  });
}

function setRefMode(m) {
  if (m === REF_MODE) return;
  REF_MODE = m;
  try { window.localStorage.setItem("refMode", m); } catch (e) { }
  trackEvent("ref_mode", { mode: m });
  syncModeUI();
  if (S.lib === "combo" && cache.face) renderCombo();
  if ($("#modal").classList.contains("on") && curLib === "pose" && cur) openPose(cur.key, curAngle);
}

function openPose(key, angle) {
  curLib = "pose";
  cur = data("pose").poses.filter(function (x) { return x.key === key; })[0];
  if (!cur) return;
  trackEvent("item_open", { lib: "pose", id: cur.id, series: data("pose").series[cur.s].name });
  curAngle = cur.ang[angle] ? angle : Object.keys(cur.ang)[0];
  var d = data("pose");
  var base = cur.ang[curAngle];
  resolveOriginal("pose", base, base + ".png");
  $("#mtitle").textContent = cur.en;
  $("#mfields").innerHTML = '<dt>ID</dt><dd>' + cur.id + "</dd><dt>Group</dt><dd>" + esc(d.series[cur.s].name) + "</dd>"
    + "<dt>Category</dt><dd>" + esc(cur.cat) + '</dd><dt>Angle</dt><dd id="mangn">' + esc(curAngle) + '</dd>';
  var angs = Object.keys(cur.ang);
  $("#mextra").innerHTML = '<div class="sect">Other angles</div><div class="mang" id="mang">' + angs.map(function (a) {
    return '<button data-a="' + esc(a) + '"' + (a === curAngle ? ' class="on"' : "") + '><img loading="lazy" src="' + thumb("pose", cur.ang[a]) + '" alt="' + esc(a) + '"></button>';
  }).join("") + "</div>";
  $("#mang").querySelectorAll("button").forEach(function (b) {
    b.onclick = function () { openPose(key, b.dataset.a); };
  });
  $("#mdl").textContent = "Download original (PNG · 900×1200)";
  var depthUrl = "https://ai-pose-depth-gallery.pages.dev/img/" + base + ".png";
  $("#mdepth").href = depthUrl;
  $("#mdepth").hidden = false;
  $("#mdepth").onclick = function () { trackEvent("depth_link", { id: cur.id, angle: curAngle }); };
  $("#mMode").hidden = false;
  $("#mMode").querySelectorAll("button").forEach(function (b) {
    b.classList.toggle("on", b.dataset.mode === REF_MODE);
    b.onclick = function () { setRefMode(b.dataset.mode); };
  });
  paintPoseImage(base, depthUrl);
  $("#mcopy").dataset.lib = "pose";
  showPan("pose");
  showModal();
}

function openCostume(id) {
  curLib = "costume"; cur = data("costume").items.filter(function (x) { return x.id === id; })[0];
  if (!cur) return;
  trackEvent("item_open", { lib: "costume", id: cur.id });
  var d = data("costume");
  resolveOriginal("costume", cur.id, cur.id + ".png");
  $("#mtitle").textContent = cur.id + " · " + d.cats[cur.c].name;
  $("#mfields").innerHTML = '<dt>ID</dt><dd>' + cur.id + "</dd><dt>Category</dt><dd>" + esc(d.cats[cur.c].name) + "</dd>"
    + "<dt>Tags</dt><dd>" + cur.kw.length + '</dd><dt>Size</dt><dd id="mdim">—</dd>';
  $("#mextra").innerHTML = '<div class="sect">Tags (searchable)</div>' + cur.kw.map(function (t) { return '<span class="chip">' + esc(t) + "</span>"; }).join("");
  $("#mdepth").hidden = true;
  $("#mMode").hidden = true;
  $("#mdl").textContent = "Download original (PNG · long edge ~2048)";
  $("#mcopy").dataset.lib = "costume";
  showPan("costume");
  showModal();
}

function stepModal(delta) {
  if (!cur) return;
  var list;
  if (curLib === "face") { list = data("face").items.filter(faceMatch); }
  else if (curLib === "costume") { list = data("costume").items.filter(costumeMatch); }
  else { list = data("pose").poses.filter(poseMatch); }
  if (list.length < 2) return;
  var idx = list.findIndex(function (x) {
    return curLib === "pose" ? x.key === cur.key : x.id === cur.id;
  });
  idx = idx < 0 ? 0 : (idx + delta + list.length) % list.length;
  var n = list[idx];
  if (curLib === "face") openFace(n.id);
  else if (curLib === "costume") openCostume(n.id);
  else openPose(n.key, curAngle);
}

function stepAngle(delta) {
  if (curLib !== "pose" || !cur) return;
  var angs = Object.keys(cur.ang);
  var i = angs.indexOf(curAngle);
  curAngle = angs[(i + delta + angs.length) % angs.length];
  openPose(cur.key, curAngle);
}

$("#mimg").onclick = function () {
  if (!cur) return;
  var link = $("#mdl").getAttribute("href");
  if (link) window.open(link, "_blank");
};
$("#mprev").onclick = function () { if (curLib === "pose" && !S.pose.ang) stepAngle(-1); else stepModal(-1); };
$("#mnext").onclick = function () { if (curLib === "pose" && !S.pose.ang) stepAngle(1); else stepModal(1); };
$("#mclose").onclick = hideModal;
$("#modal").onclick = function (e) { if (e.target.id === "modal") hideModal(); };

$("#mcopy").onclick = function () {
  trackEvent("copy", { label: "modal_copy", lib: curLib || "" });
  var txt = "";
  if (curLib === "face") {
    var d = data("face");
    var desc = [d.sections[cur.s].name, cur.h >= 0 ? d.hairs[cur.h].name : "", cur.se || ""].filter(Boolean).join(", ");
    txt = "Face reference: " + cur.id + " (" + desc + "). Use the face in image 2 as the face reference for the character in image 1: keep facial features, face shape, bone structure and hairstyle the same; regenerate pose, outfit, scene and lighting as needed.";
  } else if (curLib === "pose") {
    var dp = data("pose");
    txt = "Pose reference: " + cur.id + " " + cur.en + " (" + dp.series[cur.s].name + " / " + cur.cat + ", angle: " + curAngle + "). Change the pose of the character in image 1 to the pose in image 2; keep the face, hairstyle, outfit, lighting and art style exactly the same and change only the body posture and limb positions.";
  } else {
    var dc = data("costume");
    txt = "Outfit reference: " + cur.id + " (" + dc.cats[cur.c].name + ", " + cur.kw.slice(0, 6).join(", ") + "). Change the clothes of the character in image 1 to the outfit in image 2; keep the face, hairstyle, body type, pose, background, lighting and art style exactly the same.";
  }
  var done = function () { $("#mcopy").textContent = "Copied ✓"; setTimeout(function () { $("#mcopy").textContent = "Copy prompt"; }, 1600); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(done).catch(function () { fallbackCopy(txt, done); });
  } else { fallbackCopy(txt, done); }
};
function fallbackCopy(txt, done, fail) {
  var t = document.createElement("textarea");
  t.value = txt;
  t.style.position = "fixed"; t.style.top = "-1000px"; t.style.opacity = "0";
  document.body.appendChild(t);
  t.focus(); t.select();
  var ok = false;
  try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
  t.remove();
  if (ok) { done(); return; }
  if (fail) { fail(); return; }
  if ($("#mcopy")) $("#mcopy").textContent = "Copy failed — please select manually";
}

document.addEventListener("keydown", function (e) {
  if (!$("#modal").classList.contains("on")) return;
  if (e.key === "Escape") hideModal();
  else if (e.key === "ArrowLeft") { e.preventDefault(); if (curLib === "pose") stepAngle(-1); else stepModal(-1); }
  else if (e.key === "ArrowRight") { e.preventDefault(); if (curLib === "pose") stepAngle(1); else stepModal(1); }
  else if (e.key === "ArrowUp") { e.preventDefault(); if (curLib === "pose") stepModal(-1); }
  else if (e.key === "ArrowDown") { e.preventDefault(); if (curLib === "pose") stepModal(1); }
});

/* ---------- Random combo ---------- */
var COMBO = { face: null, costume: null, pose: null, poseSeries: -1, costumeCat: -1 };
var COMBO_ANGLE = "Front";
var NL = String.fromCharCode(10);

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function loadAll() {
  return Promise.all(["face", "pose", "costume"].map(function (k) { return loadLib(k); }));
}
function poolPose() {
  var arr = data("pose").poses.filter(function (p) { return COMBO.poseSeries < 0 || p.s === COMBO.poseSeries; });
  return arr.length ? arr : data("pose").poses;
}
function poolCostume() {
  var arr = data("costume").items.filter(function (it) { return COMBO.costumeCat < 0 || it.c === COMBO.costumeCat; });
  return arr.length ? arr : data("costume").items;
}
function comboReroll(which) {
  if (which === "face") COMBO.face = pick(data("face").items);
  else if (which === "costume") COMBO.costume = pick(poolCostume());
  else COMBO.pose = pick(poolPose());
  trackEvent("combo_roll", { trigger: which, face: COMBO.face.id, costume: COMBO.costume.id, pose: COMBO.pose.id });
  renderCombo();
}
function comboAll() {
  COMBO.face = pick(data("face").items);
  COMBO.costume = pick(poolCostume());
  COMBO.pose = pick(poolPose());
  trackEvent("combo_roll", {
    trigger: "all",
    face: COMBO.face.id,
    costume: COMBO.costume.id,
    pose: COMBO.pose.id,
    pose_series: data("pose").series[COMBO.pose.s].name
  });
  renderCombo();
}

function comboParts() {
  var f = COMBO.face, c = COMBO.costume, p = COMBO.pose;
  var fd = data("face"), cd = data("costume"), pd = data("pose");
  var fDesc = [fd.sections[f.s].name, f.h >= 0 ? fd.hairs[f.h].name : "", f.se || ""].filter(Boolean).join(" · ");
  var pBase = p.ang[COMBO_ANGLE] || p.ang[Object.keys(p.ang)[0]];
  return {
    f: f, c: c, p: p,
    fDesc: fDesc,
    fDescEn: [fd.sections[f.s].name, f.h >= 0 ? fd.hairs[f.h].name + " hair" : ""].filter(Boolean).join(", ").toLowerCase(),
    cCat: cd.cats[c.c].name,
    cCatEn: cd.cats[c.c].name.toLowerCase(),
    cEn: c.kw.slice(0, 10).join(", "),
    pSer: pd.series[p.s].name,
    pBase: pBase,
    depth: REF_MODE === "depth",
    urls: {
      face: LIB.face.remote(f.id),
      costume: LIB.costume.remote(c.id),
      pose: REF_MODE === "depth" ? ("https://ai-pose-depth-gallery.pages.dev/img/" + pBase + ".png") : LIB.pose.remote(pBase)
    }
  };
}

var COMBO_MODE = "links";

function linksEn(x) {
  return [
    "TASK: generate one 3:4 portrait from three reference images.",
    "",
    "HOW TO WORK (read this first)",
    "1. The three links below ARE the three reference images. Fetch them first with whatever you have (web fetch / download / image input) so the actual pixels are in your context.",
    "2. Do not skip the fetch step, and do not just read the link text and generate from description alone.",
    "3. If a link fails: say which one is missing (face / outfit / pose), continue with the rest, and note the missing reference in your delivery.",
    "4. Only after all three images are in hand, follow REQUIREMENTS.",
    "",
    "REFERENCES",
    "1) face: " + x.f.id + " (" + x.fDescEn + ") " + x.urls.face,
    "2) outfit: " + x.c.id + " (" + x.cCatEn + ": " + x.cEn + ") " + x.urls.costume,
    "3) pose: " + x.p.id + " " + x.p.en + " (" + x.pSer + " / " + x.p.cat + ", " + COMBO_ANGLE + " view) " + x.urls.pose,
    "",
    "SHELL (run these if you have a shell)",
    "curl -L -o ref_face.png \"" + x.urls.face + "\"",
    "curl -L -o ref_outfit.png \"" + x.urls.costume + "\"",
    "curl -L -o ref_pose.png \"" + x.urls.pose + "\"",
    "",
    "REQUIREMENTS",
    "1. Use image 1 as the ONLY face reference: keep the same identity, facial features, bone structure and hairstyle.",
    "2. Replace the outfit with the full look in image 2: keep items, colours, fabrics and accessories.",
    "3. Match the body pose in image 3: correct camera angle and perspective, natural limbs, correct fingers, no interpenetration.",
    "4. Output: 3:4 vertical, full body in frame, clean background, soft studio light, photorealistic.",
    "5. No text, no watermark, no extra people.",
    "",
    "IDs: face " + x.f.id + " / outfit " + x.c.id + " / pose " + x.p.id
  ].join(NL);
}

function singleEn(x) {
  return [
    "TASK: generate one 3:4 portrait. The single attached image is a three-panel reference sheet.",
    "",
    "PANELS (left to right)",
    "1) LEFT = face: " + x.f.id + " (" + x.fDescEn + ")",
    "2) MIDDLE = outfit: " + x.c.id + " (" + x.cCatEn + ": " + x.cEn + ")",
    "3) RIGHT = pose: " + x.p.id + " " + x.p.en + " (" + x.pSer + " / " + x.p.cat + ", " + COMBO_ANGLE + " view)",
    "",
    "REQUIREMENTS",
    "1. The sheet is reference material only: do not reproduce the collage, its frames or its labels.",
    "2. Use the LEFT panel as the ONLY face reference: same identity, facial features, bone structure and hairstyle.",
    "3. Replace the outfit with the MIDDLE panel: keep items, colours, fabrics and accessories.",
    "4. Match the pose in the RIGHT panel: correct camera angle, natural limbs, correct fingers.",
    "5. Output: 3:4 vertical, full body in frame, clean background, soft studio light, photorealistic.",
    "6. No text, no watermark, no extra people.",
    "",
    "IDs: face " + x.f.id + " / outfit " + x.c.id + " / pose " + x.p.id
  ].join(NL);
}

function promptEn() {
  var x = comboParts();
  var t = COMBO_MODE === "single" ? singleEn(x) : linksEn(x);
  return x.depth ? t + NL + NL + "NOTE: the pose reference is a DEPTH map (white = near, black = far). Follow its occlusion ordering." : t;
}

function comboUrls() {
  var x = comboParts();
  return [
    "Fetch the three reference images (curl):",
    "curl -L -o ref_face.png \"" + x.urls.face + "\"",
    "curl -L -o ref_outfit.png \"" + x.urls.costume + "\"",
    "curl -L -o ref_pose.png \"" + x.urls.pose + "\"",
    "",
    "Links:",
    "face " + x.urls.face,
    "outfit " + x.urls.costume,
    "pose " + x.urls.pose
  ].join(NL);
}

function copyBtnText(btn, text, label) {
  trackEvent("copy", { label: label });
  var done = function () {
    btn.textContent = "Copied ✓";
    setTimeout(function () { btn.textContent = label; }, 1600);
  };
  var fail = function () {
    btn.textContent = "Copy failed — please select all manually";
    setTimeout(function () { btn.textContent = label; }, 2400);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done, fail); });
  } else {
    fallbackCopy(text, done, fail);
  }
}

function loadImage(url, cors) {
  return new Promise(function (resolve, reject) {
    var im = new Image();
    if (cors) im.crossOrigin = "anonymous";
    im.onload = function () { resolve(im); };
    im.onerror = function () { reject(new Error("load failed")); };
    im.src = url;
  });
}

function makeSheet() {
  return new Promise(function (resolve, reject) {
    var x = comboParts();
    var panels = [
      { url: x.urls.face, fb: thumb("face", x.f.id), label: "① Face · " + x.f.id, sub: x.fDesc },
      { url: x.urls.costume, fb: thumb("costume", x.c.id), label: "② Outfit · " + x.c.id, sub: x.cCat + " · " + x.c.kw.slice(0, 4).join(" ") },
      { url: x.urls.pose, fb: thumb("pose", x.pBase), label: "③ Pose" + (x.depth ? " · depth" : "") + " · " + x.p.id, sub: x.p.en }
    ];
    var loaded = [];
    var i = 0;
    function step() {
      if (i >= panels.length) { draw(); return; }
      var it = panels[i++];
      loadImage(it.url, true).then(function (im) {
        loaded.push({ img: im, it: it }); step();
      }).catch(function () {
        loadImage(it.fb, false).then(function (im) {
          loaded.push({ img: im, it: it }); step();
        }).catch(function () {
          loaded.push({ img: null, it: it }); step();
        });
      });
    }
    function draw() {
      var PW = 900, PH = 1200, GAP = 24, PAD = 40, LAB = 100;
      var W = PAD * 2 + PW * 3 + GAP * 2, H = PAD + PH + LAB + PAD;
      var c = document.createElement("canvas");
      c.width = W; c.height = H;
      var g = c.getContext("2d");
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H);
      loaded.forEach(function (o, k) {
        var ox = PAD + k * (PW + GAP);
        if (o.img) {
          var s = Math.min(PW / o.img.width, PH / o.img.height);
          var w = o.img.width * s, h = o.img.height * s;
          g.drawImage(o.img, ox + (PW - w) / 2, PAD + (PH - h) / 2, w, h);
        } else {
          g.fillStyle = "#f2f2f4"; g.fillRect(ox, PAD, PW, PH);
        }
        g.fillStyle = "#1b1b1f";
        g.font = "600 34px -apple-system, 'PingFang SC', sans-serif";
        g.fillText(o.it.label, ox, PAD + PH + 46);
        g.fillStyle = "#6b6b76";
        g.font = "26px -apple-system, 'PingFang SC', sans-serif";
        g.fillText(o.it.sub, ox, PAD + PH + 84);
      });
      c.toBlob(function (blob) {
        if (blob) resolve(blob); else reject(new Error("toBlob failed"));
      }, "image/png");
    }
    step();
  });
}

function saveBlob(blob, name) {
  var u = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = u; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 3000);
}

function sheetName() {
  var x = comboParts();
  return "refs_" + x.f.id + "_" + x.c.id + "_" + x.p.id + ".png";
}

function downloadSheet(btn) {
  var label = btn.textContent;
  btn.textContent = "Generating…";
  trackEvent("combo_sheet", { action: "download" });
  makeSheet().then(function (blob) {
    saveBlob(blob, sheetName());
    btn.textContent = "Downloaded ✓";
    setTimeout(function () { btn.textContent = label; }, 1600);
  }).catch(function () {
    btn.textContent = "Failed — try downloading each image instead";
    setTimeout(function () { btn.textContent = label; }, 2400);
  });
}

function copySheet(btn) {
  var label = btn.textContent;
  btn.textContent = "Generating…";
  trackEvent("combo_sheet", { action: "copy" });
  makeSheet().then(function (blob) {
    if (navigator.clipboard && window.ClipboardItem) {
      return navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).then(function () {
        btn.textContent = "Image copied ✓";
        setTimeout(function () { btn.textContent = label; }, 1600);
      });
    }
    saveBlob(blob, sheetName());
    btn.textContent = "Downloaded ✓";
    setTimeout(function () { btn.textContent = label; }, 1600);
  }).catch(function () {
    btn.textContent = "Failed";
    setTimeout(function () { btn.textContent = label; }, 2000);
  });
}

function renderCombo() {
  var fd = data("face"), cd = data("costume"), pd = data("pose");
  var poseOpts = '<option value="-1">All</option>' + pd.series.map(function (s, i) {
    return '<option value="' + i + '"' + (COMBO.poseSeries === i ? " selected" : "") + ">" + esc(s.name) + "</option>";
  }).join("");
  var costOpts = '<option value="-1">All</option>' + cd.cats.map(function (c, i) {
    return '<option value="' + i + '"' + (COMBO.costumeCat === i ? " selected" : "") + ">" + esc(c.name) + "</option>";
  }).join("");
  $("#toolbar").innerHTML = '<div class="row">'
    + '<span class="filter-label">Pose range</span><select id="poseRange">' + poseOpts + "</select>"
    + '<span class="filter-label">Outfit range</span><select id="costRange">' + costOpts + "</select>"
    + '<button class="rndbtn" id="rerollAll"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3h5v5"/><path d="M21 3 13 11"/><path d="M8 21H3v-5"/><path d="M3 21l8-8"/><path d="M21 16v5h-5"/><path d="m21 21-4-4"/><path d="M3 8V3h5"/><path d="m3 3 4 4"/></svg>Reroll all</button>'
    + '<span id="count"></span></div>';
  $("#poseRange").onchange = function (e) { COMBO.poseSeries = +e.target.value; comboReroll("pose"); };
  $("#costRange").onchange = function (e) { COMBO.costumeCat = +e.target.value; comboReroll("costume"); };
  $("#rerollAll").onclick = comboAll;
  $("#count").textContent = "Random set drawn · each slot can be rerolled on its own";

  var x = comboParts();
  function slot(lib, title, base, desc, ratio, src) {
    return '<div class="slot"><div class="slot-h"><span>' + title + '</span><button data-reroll="' + lib + '"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/></svg>Reroll</button></div>'
      + '<div class="ph ' + ratio + '" data-open="' + lib + '"><img loading="lazy" src="' + (src || thumb(lib, base)) + '" alt="">'
      + '<div class="badge">' + base + "</div></div>"
      + '<div class="slot-m"><b>' + esc(desc) + "</b></div></div>";
  }
  var html = slot("face", "① Face", x.f.id, x.fDesc, "r45")
    + slot("costume", "② Outfit", x.c.id, x.cCat + " · " + x.c.kw.slice(0, 4).join(" "), "r23")
    + slot("pose", "③ Pose" + (REF_MODE === "depth" ? " · depth" : ""), x.pBase, x.p.en + " · " + x.p.cat, "r34", REF_MODE === "depth" ? x.urls.pose : "");

  var modeSeg = '<div class="seg" id="modeSeg">'
    + '<button data-mode="links"' + (COMBO_MODE === "links" ? ' class="on"' : "") + ">Reference = links</button>"
    + '<button data-mode="single"' + (COMBO_MODE === "single" ? ' class="on"' : "") + ">Reference = one 3-panel sheet</button></div>";

  html += '<div class="prompt"><div class="prompt-h"><b>Prompt'
    + '<span class="prompt-hint">' + (COMBO_MODE === "single"
      ? "Sheet mode: download the 3-panel sheet first, then send it to the model together with the prompt"
      : "Links mode: the prompt tells the model to fetch the images first, and includes curl commands") + "</span></b>"
    + '<div class="prompt-btns">' + modeSeg
    + (COMBO_MODE === "links" ? '<button class="primary" id="copyEn">Copy prompt</button>' : '<button id="copyEn">Copy prompt</button>')
    + (COMBO_MODE === "links"
      ? '<button id="copyUrls">Copy fetch commands</button>'
      : '<button class="primary" id="sheetSave">Download sheet</button><button id="sheetCopy">Copy sheet</button>')
    + "</div></div>"
    + '<textarea id="promptText" readonly></textarea>'
    + '<div class="prompt-links"><span>Originals:</span>'
    + '<a href="' + x.urls.face + '" target="_blank" rel="noopener">Face</a>'
    + '<a href="' + x.urls.costume + '" target="_blank" rel="noopener">Outfit</a>'
    + '<a href="' + x.urls.pose + '" target="_blank" rel="noopener">Pose</a></div></div>';

  $("#grid").className = "combo";
  $("#grid").innerHTML = html;
  $("#promptText").value = promptEn();

  $("#grid").querySelectorAll("[data-reroll]").forEach(function (b) {
    b.onclick = function () { comboReroll(b.dataset.reroll); };
  });
  $("#grid").querySelectorAll("[data-open]").forEach(function (el) {
    el.onclick = function () {
      if (el.dataset.open === "face") openFace(COMBO.face.id);
      else if (el.dataset.open === "costume") openCostume(COMBO.costume.id);
      else openPose(COMBO.pose.key, Object.prototype.hasOwnProperty.call(COMBO.pose.ang, COMBO_ANGLE) ? COMBO_ANGLE : "Front");
    };
  });
  $("#grid").querySelectorAll("[data-mode]").forEach(function (b) {
    b.onclick = function () { COMBO_MODE = b.dataset.mode; trackEvent("combo_mode", { mode: b.dataset.mode }); renderCombo(); };
  });
  $("#copyEn").onclick = function () { copyBtnText(this, promptEn(), "Copy prompt"); };
  if ($("#copyUrls")) $("#copyUrls").onclick = function () { copyBtnText(this, comboUrls(), "Copy fetch commands"); };
  if ($("#sheetSave")) $("#sheetSave").onclick = function () { downloadSheet(this); };
  if ($("#sheetCopy")) $("#sheetCopy").onclick = function () { copySheet(this); };
}

/* ---------- Main switching ---------- */
function switchLib(lib, opts) {
  S.lib = lib; S.q = "";
  trackEvent("lib_view", { lib: lib });
  document.querySelectorAll(".nav button").forEach(function (b) {
    b.classList.toggle("on", b.dataset.lib === lib);
  });
  if (lib === "combo") {
    $("#toolbar").innerHTML = '<div class="loading">Loading all three libraries (about 18 MB — the first load may take a few seconds)…</div>';
    $("#grid").className = "grid";
    $("#grid").innerHTML = "";
    loadAll().then(function () {
      if (!COMBO.face) comboAll();
      else if (opts && opts.reroll) comboAll();   // clicking "Random combo" in the nav = draw a new set
      else renderCombo();
    }).catch(function (err) {
      $("#toolbar").innerHTML = '<div class="empty">' + esc(err.message) + "</div>";
    });
    return;
  }
  loadLib(lib).then(function () {
    render();
  }).catch(function (err) {
    $("#toolbar").innerHTML = '<div class="empty">' + esc(err.message) + "<br>Make sure the data/ folder sits next to index.html, and open the page directly in a browser (file:// or http).</div>";
    $("#grid").innerHTML = "";
  });
}

document.querySelectorAll(".nav button").forEach(function (b) {
  b.onclick = function () {
    switchLib(b.dataset.lib, { reroll: b.dataset.lib === "combo" });
  };
});
function randomOpen() {
  if (S.lib === "combo") { if (COMBO.face) comboAll(); return; }
  if (!cache[S.lib]) return;
  var list;
  if (S.lib === "face") list = data("face").items.filter(faceMatch);
  else if (S.lib === "pose") list = data("pose").poses.filter(poseMatch);
  else list = data("costume").items.filter(costumeMatch);
  if (!list.length) return;
  var x = list[Math.floor(Math.random() * list.length)];
  if (S.lib === "face") openFace(x.id);
  else if (S.lib === "pose") openPose(x.key, "Front");
  else openCostume(x.id);
}
document.addEventListener("click", function (e) {
  if (e.target && e.target.id === "rnd2") randomOpen();
  if (e.target && e.target.id === "mdl") {
    trackEvent("original_download", { lib: curLib || S.lib, id: cur ? (cur.id || cur.key) : "" });
  }
});

/* ---------- Hover panels (usage / tip): open on hover, click as fallback ---------- */
(function () {
  var pairs = [["tipsHover", "tipsTrigger"], ["gratHover", "gratTrigger"], ["panHover", "panTrigger"]];
  var wraps = [];
  pairs.forEach(function (pair) {
    var wrap = document.getElementById(pair[0]);
    var btn = document.getElementById(pair[1]);
    if (!wrap || !btn) return;
    wraps.push(wrap);
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = !wrap.classList.contains("open");
      wraps.forEach(function (w) { w.classList.remove("open"); });
      wrap.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
  document.addEventListener("click", function (e) {
    if (!wraps.some(function (w) { return w.contains(e.target); })) {
      wraps.forEach(function (w) { w.classList.remove("open"); });
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") wraps.forEach(function (w) { w.classList.remove("open"); });
  });
})();

/* ---------- First-visit tip prompt: opens once after 9s, closes after 8s ---------- */
(function () {
  try {
    var grat = document.getElementById("gratHover");
    var gbtn = document.getElementById("gratTrigger");
    if (!grat || !gbtn) return;
    if (window.localStorage.getItem("gratNudge")) return;
    window.localStorage.setItem("gratNudge", "1");
    setTimeout(function () {
      if (grat.matches(":hover") || grat.classList.contains("open")) return;
      grat.classList.add("open");
      gbtn.setAttribute("aria-expanded", "true");
      setTimeout(function () {
        if (!grat.matches(":hover")) {
          grat.classList.remove("open");
          gbtn.setAttribute("aria-expanded", "false");
        }
      }, 8000);
    }, 9000);
  } catch (e) { }
})();

/* ---------- Global reference type (line art / depth) ---------- */
function renderPanTop() {
  var cfg = window.PAN_LINKS || {};
  var defs = [
    { key: "face", name: "Faces", count: "1,499 images" },
    { key: "pose", name: "Poses", count: "1,439 images" },
    { key: "costume", name: "Outfits", count: "1,407 sets" }
  ];
  var html = defs.map(function (d) {
    var item = cfg[d.key] || {};
    var links = "";
    if (item.baidu) links += '<a href="' + item.baidu + '" target="_blank" rel="sponsored noopener" data-pan="' + d.key + '_baidu">Baidu Netdisk</a>';
    if (item.quark) links += '<a href="' + item.quark + '" target="_blank" rel="sponsored noopener" data-pan="' + d.key + '_quark">Quark</a>';
    if (!links) return "";
    return '<div class="pantop-row"><span class="pantop-name">' + d.name + '<em>' + d.count + '</em></span><span class="pantop-links">' + links + "</span></div>";
  }).join("");
  var box = document.getElementById("panRows");
  if (!box) return;
  box.innerHTML = html || '<p class="pantop-note">No cloud-drive links available</p>';
  box.querySelectorAll("[data-pan]").forEach(function (a) {
    a.onclick = function () { trackEvent("ref_click", { source: "pan_top_" + a.dataset.pan }); };
  });
}

renderPanTop();

document.querySelectorAll("#refModeSeg button").forEach(function (b) {
  b.onclick = function () { setRefMode(b.dataset.mode); };
});
syncModeUI();

/* ---------- Sister-site click tracking ---------- */
(function () {
  var link = document.getElementById("sisterLink");
  if (link) link.addEventListener("click", function () { trackEvent("ref_click", { source: "sister_top" }); });
})();

switchLib("combo");
})();
