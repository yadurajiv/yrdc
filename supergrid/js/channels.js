/* SuperGrid — channels.js: user channel list (defaults live in default-channels.js) */
window.SG = window.SG || {};

SG.channels = {
  list: [],

  _fromDefaults() {
    return (SG.DEFAULT_CHANNELS || []).map(c => ({
      id: SG.util.uid(), name: c.name || c.url, url: c.url, tags: c.tags || [],
    }));
  },

  load(saved) {
    this.list = Array.isArray(saved) && saved.length
      ? saved.map(c => ({ tags: [], ...c }))
      : this._fromDefaults();
  },

  add(name, url, tags = []) {
    const ch = { id: SG.util.uid(), name: name || url, url, tags };
    this.list.push(ch);
    SG.state.save();
    return ch;
  },

  has(url) { return this.list.some(c => c.url === url); },

  update(id, patch) {
    const ch = this.list.find(c => c.id === id);
    if (ch) { Object.assign(ch, patch); SG.state.save(); }
    return ch;
  },

  remove(id) {
    this.list = this.list.filter(c => c.id !== id);
    SG.state.save();
  },

  reset() {
    this.list = this._fromDefaults();
    SG.state.save();
  },

  allTags() {
    const s = new Set();
    for (const c of this.list) (c.tags || []).forEach(t => s.add(t));
    return Array.from(s).sort();
  },

  exportJSON() {
    return JSON.stringify(this.list.map(({ name, url, tags }) => ({ name, url, tags })), null, 2);
  },

  importJSON(text, { replace = false } = {}) {
    let data;
    try { data = JSON.parse(text); } catch (e) { throw new Error('Invalid JSON'); }
    if (!Array.isArray(data)) throw new Error('Expected a JSON array of {name, url, tags}');
    const clean = data
      .filter(c => c && typeof c.url === 'string')
      .map(c => ({
        id: SG.util.uid(), name: c.name || c.url, url: c.url,
        tags: Array.isArray(c.tags) ? c.tags.map(String) : [],
      }));
    if (!clean.length) throw new Error('No valid channels found');
    this.list = replace ? clean : this.list.concat(clean);
    SG.state.save();
    return clean.length;
  },

  // search: plain text matches name/url/tags; "#tag" terms require that tag
  search(query, activeTag = null) {
    let items = this.list;
    if (activeTag) items = items.filter(c => (c.tags || []).includes(activeTag));

    const q = (query || '').trim().toLowerCase();
    if (!q) return items.slice();

    const terms = q.split(/\s+/);
    return items.filter(c => terms.every(term => {
      if (term.startsWith('#')) return (c.tags || []).some(t => t.toLowerCase() === term.slice(1));
      return c.name.toLowerCase().includes(term)
          || c.url.toLowerCase().includes(term)
          || (c.tags || []).some(t => t.toLowerCase().includes(term));
    }));
  },
};

/* ── History of opened URLs ─────────────────────────────────────── */
SG.history = {
  list: [],   // {url, name, ts} newest first
  MAX: 50,

  load(saved) {
    this.list = Array.isArray(saved) ? saved : [];
  },

  add(url, name) {
    if (!url || url.startsWith('blob:')) return;
    this.list = this.list.filter(h => h.url !== url);
    this.list.unshift({ url, name: name || url, ts: Date.now() });
    if (this.list.length > this.MAX) this.list.length = this.MAX;
    SG.state.save();
  },

  remove(url) {
    this.list = this.list.filter(h => h.url !== url);
    SG.state.save();
  },

  search(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return this.list.slice();
    if (q.startsWith('#')) return [];
    return this.list.filter(h =>
      h.name.toLowerCase().includes(q) || h.url.toLowerCase().includes(q));
  },
};
