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
      presets: SG.presets ? SG.presets.list : [],
      tiles: SG.grid.tiles
        .filter(t => !t.local) // blob URLs don't survive reload
        .map(t => ({ url: t.url, name: t.name, loop: !!t.loop, volume: t.volume == null ? 1 : t.volume })),
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
  // Build a share URL from any snapshot-shaped object { layout, tiles, focusIdx, bigId|bigIdx }.
  encodeShare(snap) {
    const payload = {
      l: snap.layout,
      t: (snap.tiles || []).map(t => [t.url, t.name, t.loop ? 1 : 0]),
      f: typeof snap.focusIdx === 'number' ? snap.focusIdx : -1,
      b: typeof snap.bigIdx === 'number' ? snap.bigIdx : (typeof snap.bigId === 'number' ? snap.bigId : -1),
    };
    const hash = '#s=' + SG.util.b64enc(JSON.stringify(payload));
    const base = location.origin.startsWith('http')
      ? location.origin + location.pathname
      : location.href.split('#')[0];
    return base + hash;
  },

  shareLink() {
    return { url: this.encodeShare(this._snapshot()), skippedLocal: SG.grid.tiles.some(t => t.local) };
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

/* ── Saved grids (named presets) ─────────────────────────────────────
 * Each preset stores a whole grid — layout, its tiles, and which tile had
 * audio focus / was expanded — so you can flip between different setups. */
SG.presets = {
  list: [],   // {id, name, layout, tiles:[{url,name,loop}], focusIdx, bigIdx, ts}

  load(saved) { this.list = Array.isArray(saved) ? saved : []; },

  // Capture the current grid under a name (returns the new preset).
  save(name) {
    const snap = SG.state._snapshot();
    const p = {
      id: SG.util.uid(),
      name: (name || '').trim() || ('Grid ' + (this.list.length + 1)),
      layout: snap.layout,
      tiles: snap.tiles,          // already excludes local/blob tiles
      focusIdx: snap.focusIdx,
      bigIdx: snap.bigId,
      ts: Date.now(),
    };
    this.list.unshift(p);
    SG.state.save();
    return p;
  },

  update(id, patch) {
    const p = this.list.find(x => x.id === id);
    if (p) { Object.assign(p, patch); SG.state.save(); }
    return p;
  },

  remove(id) {
    this.list = this.list.filter(p => p.id !== id);
    SG.state.save();
  },

  apply(id) {
    const p = this.list.find(x => x.id === id);
    if (p) SG.grid.applyGrid(p);
    return p;
  },

  // Overwrite an existing preset with the current grid (keeps its name).
  overwrite(id) {
    const p = this.list.find(x => x.id === id);
    if (!p) return null;
    const snap = SG.state._snapshot();
    Object.assign(p, { layout: snap.layout, tiles: snap.tiles, focusIdx: snap.focusIdx, bigIdx: snap.bigId, ts: Date.now() });
    SG.state.save();
    return p;
  },

  shareLink(id) {
    const p = this.list.find(x => x.id === id);
    return p ? SG.state.encodeShare(p) : null;
  },
};
