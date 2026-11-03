/**
 * Local originals directory (optional).
 *
 * Empty string = don't use local originals; the modal image and "Download original"
 * go straight to the author's source site.
 * A path = local originals are read first (fast, works offline), falling back to
 * the source site automatically if they can't be read.
 *
 * The defaults in this repo are relative paths on the original author's machine.
 * After cloning, those folders won't exist,
 * so the site silently falls back to downloading from the source site — nothing breaks.
 *
 * To use your own paths, replace the three entries below (keep the trailing /).
 */
window.LOCAL_ORIGINALS = {
  face: "../face-library/originals/",
  pose: "../pose-library/originals/",
  costume: "../costume-library/originals/"
};

/**
 * Analytics config (optional — nothing is reported unless filled in).
 * Several providers can be enabled at once:
 *
 * provider values:
 *   "ga4"         → Google Analytics 4, id looks like G-XXXXXXXXXX
 *   "baidu"       → Baidu Tongji, id is the string after hm.js?
 *   "umami"       → Umami Cloud, id is the website-id
 *   "clarity"     → Microsoft Clarity, id is the project ID (Settings → Overview)
 *   "cloudflare"  → Cloudflare Web Analytics, id is the beacon token (page views only, no custom events)
 *
 * Example (Clarity session recording + GA4 event stats together):
 *   window.ANALYTICS = {
 *     providers: [
 *       { provider: "clarity", id: "abcdefghij" },
 *       { provider: "ga4",     id: "G-XXXXXXXXXX" }
 *     ]
 *   };
 *
 * Empty / no providers = fully disabled: events are only written to the local
 * window.__trackLog and no requests are sent.
 *
 * Debugging: run window.__trackDebug = true in the console and reload to see
 * every event;
 *      window.__trackLog always keeps the latest 200.
 */
window.ANALYTICS = {
  providers: [
    { provider: "ga4", id: "G-0C99160522" },
    { provider: "clarity", id: "r1wmvdsf4a" }
    // { provider: "baidu", id: "your Baidu Tongji id" }
  ]
};

/**
 * Cloud-drive links for the full original libraries (optional).
 * Empty string = hide that entry.
 * To change the links, edit them here — no need to touch app.js.
 */
window.PAN_LINKS = {
  face:    { baidu: "https://pan.baidu.com/s/1rxqVp0qkxCQf-8Z8DXI6HA?pwd=jR2P", quark: "https://pan.quark.cn/s/469084c4f0fa" },
  pose:    { baidu: "https://pan.baidu.com/s/1rY8E88d19xabnoBGhex4zg?pwd=vsf6", quark: "https://pan.quark.cn/s/6b1004add615" },
  costume: { baidu: "https://pan.baidu.com/s/1bsGuveiCBRbucS-17tpTrg?pwd=s39e", quark: "https://pan.quark.cn/s/492b9782ab78" }
};
