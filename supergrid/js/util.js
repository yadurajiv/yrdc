/* SuperGrid — util.js: shared helpers */
window.SG = window.SG || {};

SG.util = {
  $: (sel, root) => (root || document).querySelector(sel),
  $$: (sel, root) => Array.from((root || document).querySelectorAll(sel)),

  el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    for (const c of [].concat(children)) if (c) e.appendChild(c);
    return e;
  },

  uid: () => Math.random().toString(36).slice(2, 9),

  debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  },

  // base64url encode/decode for share links (unicode-safe)
  b64enc(str) {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  b64dec(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return decodeURIComponent(escape(atob(str)));
  },

  toast(msg, ms = 2200) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(SG.util._toastT);
    SG.util._toastT = setTimeout(() => t.classList.add('hidden'), ms);
  },

  copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // fallback for file:// / http
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
    return Promise.resolve();
  },

  // Best-effort human title for a URL via public oEmbed endpoints (no API key,
  // CORS-enabled). Resolves to a string, or null if unavailable/unsupported.
  fetchTitle(url) {
    const src = SG.sources.detect(url);
    let endpoint = null;
    if (src && src.type === 'youtube') {
      endpoint = 'https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(url);
    } else if (src && src.type === 'vimeo') {
      endpoint = 'https://vimeo.com/api/oembed.json?url=' + encodeURIComponent(url);
    }
    if (!endpoint || typeof fetch !== 'function') return Promise.resolve(null);
    return fetch(endpoint)
      .then(r => (r.ok ? r.json() : null))
      .then(d => (d && d.title ? String(d.title) : null))
      .catch(() => null);
  },

  loadScript(src) {
    this._scripts = this._scripts || {};
    if (!this._scripts[src]) {
      this._scripts[src] = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => { delete SG.util._scripts[src]; reject(new Error('Failed to load ' + src)); };
        document.head.appendChild(s);
      });
    }
    return this._scripts[src];
  },

  download(filename, text, type = 'application/json') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  },
};
