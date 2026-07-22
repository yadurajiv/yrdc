/* SuperGrid — state.js: localStorage persistence + shareable URL links */
window.SG = window.SG || {};

SG.state = {
  KEY: 'supergrid.v1',
  layout: 'auto',          // 'auto' | 'focus' | '2x2' | '3x3' | 'cols'
  chromeHidden: false,

  save: null, // assigned below (debounced)

  _snapshot() {
    return {
      layout: this.layout,
      chromeHidden: this.chromeHidden,
      volume: SG.grid.masterVolume,
      channels: SG.channels.list,
      history: SG.history.list,
      tiles: SG.grid.tiles
        .filter(t => !t.local) // blob URLs don't survive reload
        .map(t => ({ url: t.url, name: t.name, loop: !!t.loop })),
      focusIdx: SG.grid.tiles.findIndex(t => t.id === SG.grid.audioFocusId),
      bigId: SG.grid.bigId ? SG.grid.tiles.findIndex(t => t.id === SG.grid.bigId) : -1,
    };
  },

  _saveNow() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this._snapshot()));
    } catch (e) { /* storage full / disabled */ }
  },

  loadSaved() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  // ── Share links: #s=<base64url json> ──
  shareLink() {
    const snap = this._snapshot();
    const payload = {
      l: snap.layout,
      t: snap.tiles.map(t => [t.url, t.name, t.loop ? 1 : 0]),
      f: snap.focusIdx,
      b: snap.bigId,
    };
    const skippedLocal = SG.grid.tiles.some(t => t.local);
    const hash = '#s=' + SG.util.b64enc(JSON.stringify(payload));
    const base = location.origin.startsWith('http')
      ? location.origin + location.pathname
      : location.href.split('#')[0];
    return { url: base + hash, skippedLocal };
  },

  parseShareHash() {
    const m = location.hash.match(/^#s=(.+)$/);
    if (!m) return null;
    try {
      const p = JSON.parse(SG.util.b64dec(m[1]));
      return {
        layout: p.l || 'auto',
        tiles: (p.t || []).map(a => ({ url: a[0], name: a[1], loop: !!a[2] })),
        focusIdx: typeof p.f === 'number' ? p.f : -1,
        bigId: typeof p.b === 'number' ? p.b : -1,
      };
    } catch (e) { return null; }
  },
};

SG.state.save = SG.util.debounce(() => SG.state._saveNow(), 300);
