/**
 * Lightweight analytics layer (no dependencies, front-end only)
 *
 * Usage: set window.ANALYTICS in config.js. Several providers can be enabled at once:
 *
 *   window.ANALYTICS = {
 *     providers: [
 *       { provider: "ga4",     id: "G-XXXXXXXXXX" },
 *       { provider: "clarity", id: "abcdefghij" }
 *     ]
 *   };
 *
 * The legacy single-provider form is also supported:
 *   window.ANALYTICS = { provider: "baidu", id: "xxxx" };
 *
 * Supported: ga4 / baidu / umami / clarity / cloudflare
 * App events all go through window.track(name, params); whether or not a provider is configured,
 * they are also written to window.__trackLog (latest 200 entries) for local debugging.
 */
(function () {
  var cfg = window.ANALYTICS || {};
  var list = [];
  if (cfg.providers && cfg.providers.length) {
    list = cfg.providers.filter(function (x) { return x && x.provider && x.provider !== "none"; });
  } else if (cfg.provider && cfg.provider !== "none") {
    list = [{ provider: cfg.provider, id: cfg.id }];
  }

  window.__trackLog = [];
  function log(name, params) {
    var rec = { t: Date.now(), name: name, params: params || {} };
    window.__trackLog.push(rec);
    if (window.__trackLog.length > 200) window.__trackLog.shift();
    if (window.__trackDebug) console.log("[track]", name, rec.params);
  }

  var CLARITY_TAGS = ["lib", "type", "value", "label", "mode", "action", "trigger", "id"];

  function dispatch(p, name, params) {
    try {
      if (p === "ga4" && window.gtag) {
        window.gtag("event", name, params || {});
      } else if (p === "baidu" && window._hmt) {
        var pp = params || {};
        window._hmt.push(["_trackEvent", pp.lib || "app", name, JSON.stringify(pp)]);
      } else if (p === "umami" && window.umami) {
        window.umami.track(name, params || {});
      } else if (p === "clarity" && window.clarity) {
        window.clarity("event", name);
        var p2 = params || {};
        CLARITY_TAGS.forEach(function (k) {
          if (p2[k] !== undefined && p2[k] !== null && p2[k] !== "") {
            window.clarity("set", k, String(p2[k]).slice(0, 60));
          }
        });
      }
    } catch (e) { /* analytics must never break the main flow */ }
  }

  window.track = function (name, params) {
    try {
      log(name, params);
      list.forEach(function (item) { dispatch(item.provider, name, params); });
    } catch (e) { }
  };

  function addScript(src, attrs) {
    var s = document.createElement("script");
    s.async = true;
    s.src = src;
    if (attrs) Object.keys(attrs).forEach(function (k) { s.setAttribute(k, attrs[k]); });
    document.head.appendChild(s);
  }

  list.forEach(function (item) {
    var p = item.provider, id = item.id;
    if (!id) {
      console.warn("[analytics]", p, "missing id, skipped");
      return;
    }
    if (p === "ga4") {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", id, { send_page_view: true, anonymize_ip: true });
      addScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id));
    } else if (p === "baidu") {
      window._hmt = window._hmt || [];
      addScript("https://hm.baidu.com/hm.js?" + encodeURIComponent(id));
    } else if (p === "umami") {
      addScript("https://cloud.umami.is/script.js", { "data-website-id": id });
    } else if (p === "clarity") {
      (function (c, l, a, r, i) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        var t = l.createElement(r); t.async = 1;
        t.src = "https://www.clarity.ms/tag/" + i;
        var y = l.getElementsByTagName(r)[0];
        y.parentNode.insertBefore(t, y);
      })(window, document, "clarity", "script", id);
    } else if (p === "cloudflare") {
      addScript("https://static.cloudflareinsights.com/beacon.min.js", { "data-cf-beacon": JSON.stringify({ token: id }) });
    } else {
      console.warn("[analytics] unknown provider:", p);
    }
  });
})();
