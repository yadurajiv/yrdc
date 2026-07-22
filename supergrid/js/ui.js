/* SuperGrid — ui.js: quick switcher, channel manager, overlays, chrome */
window.SG = window.SG || {};

SG.ui = {
  switcherTarget: null,   // tile id, or null = add new tile
  _sel: 0,
  _results: [],

  // ── Overlay helpers ────────────────────────────────────────────
  show(id) { document.getElementById(id).classList.remove('hidden'); },
  hide(id) { document.getElementById(id).classList.add('hidden'); },
  anyOverlayOpen() {
    return ['switcher', 'chanman', 'help'].some(id =>
      !document.getElementById(id).classList.contains('hidden'));
  },
  closeAllOverlays() {
    ['switcher', 'chanman', 'help'].forEach(id => this.hide(id));
  },

  // ── Quick switcher ─────────────────────────────────────────────
  activeTag: null,

  openSwitcher({ targetTileId = null } = {}) {
    this.switcherTarget = targetTileId;
    this.activeTag = null;
    const tgt = document.getElementById('switcher-target');
    if (targetTileId) {
      const t = SG.grid.tiles.find(x => x.id === targetTileId);
      const idx = SG.grid.tiles.indexOf(t) + 1;
      tgt.textContent = `→ replacing tile ${idx}: ${t ? t.name : ''}`;
    } else {
      tgt.textContent = '→ adds a new tile';
    }
    this.show('switcher');
    const input = document.getElementById('switcher-input');
    input.value = '';
    this.renderSwitcherResults('');
    setTimeout(() => input.focus(), 30);
  },

  renderTagChips(query) {
    const box = document.getElementById('switcher-tags');
    box.innerHTML = '';
    const tags = SG.channels.allTags();
    if (!tags.length) return;
    for (const tag of tags) {
      const chip = SG.util.el('button', { class: 'chip' + (this.activeTag === tag ? ' on' : ''), text: '#' + tag });
      chip.addEventListener('click', () => {
        this.activeTag = this.activeTag === tag ? null : tag;
        this.renderSwitcherResults(document.getElementById('switcher-input').value);
        document.getElementById('switcher-input').focus();
      });
      box.appendChild(chip);
    }
  },

  renderSwitcherResults(query) {
    const ul = document.getElementById('switcher-results');
    ul.innerHTML = '';
    this._results = [];
    this.renderTagChips(query);
    const { el } = SG.util;

    const addRow = (r, extras = []) => {
      const i = this._results.length;
      this._results.push(r);
      const li = el('li', {}, [
        el('span', { class: 'r-type', text: r.kind === 'url' ? 'open url' : (r.kind === 'hist' ? '↻ recent' : SG.sources.label(r.type)) }),
        el('span', { class: 'r-name', text: r.name, title: r.url }),
        ...extras,
      ]);
      if (i === this._sel) li.classList.add('sel');
      li.addEventListener('click', (e) => this.pickResult(i, e.shiftKey));
      ul.appendChild(li);
    };
    const rowBtn = (label, title, fn) => {
      const b = el('button', { class: 'tbtn', title, text: label });
      b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      return b;
    };

    this._sel = 0;

    // 1. pasted / typed URL
    if (SG.sources.looksLikeUrl(query)) {
      const url = query.trim();
      const src = SG.sources.detect(url);
      addRow({ kind: 'url', name: url, url, type: src ? src.type : 'iframe' });
    }

    // 2. channels (respects text query + active tag chip / #tag terms)
    const chans = SG.channels.search(query, this.activeTag);
    const chanUrls = new Set();
    for (const ch of chans) {
      chanUrls.add(ch.url);
      const src = SG.sources.detect(ch.url);
      addRow({ kind: 'chan', name: ch.name, url: ch.url, type: src ? src.type : 'iframe' });
    }

    // 3. history (deduped against channels), with save/remove actions
    if (!this.activeTag) {
      for (const h of SG.history.search(query).slice(0, 15)) {
        if (chanUrls.has(h.url)) continue;
        const src = SG.sources.detect(h.url);
        addRow(
          { kind: 'hist', name: h.name, url: h.url, type: src ? src.type : 'iframe' },
          [
            rowBtn('★', 'Save to channels', () => {
              SG.channels.add(h.name, h.url);
              SG.util.toast('Saved to channels');
              this.renderSwitcherResults(document.getElementById('switcher-input').value);
            }),
            rowBtn('✕', 'Remove from history', () => {
              SG.history.remove(h.url);
              this.renderSwitcherResults(document.getElementById('switcher-input').value);
            }),
          ]
        );
      }
    }
  },

  moveSel(delta) {
    const items = SG.util.$$('#switcher-results li');
    if (!items.length) return;
    items[this._sel] && items[this._sel].classList.remove('sel');
    this._sel = (this._sel + delta + items.length) % items.length;
    items[this._sel].classList.add('sel');
    items[this._sel].scrollIntoView({ block: 'nearest' });
  },

  pickResult(i, forceNew = false) {
    const r = this._results[i];
    if (!r) return;
    this.hide('switcher');
    const target = forceNew ? null : this.switcherTarget;
    if (target) {
      SG.grid.swapTile(target, r.url, r.name);
    } else {
      const t = SG.grid.addTile({ url: r.url, name: r.name });
      if (t && SG.grid.tiles.length === 1) SG.grid.focusAudio(t.id);
    }
  },

  // ── Local files ────────────────────────────────────────────────
  openLocalFiles(files) {
    for (const f of files) {
      const url = URL.createObjectURL(f);
      const target = this.switcherTarget;
      if (target && files.length === 1) {
        SG.grid.swapTile(target, url, f.name);
        const t = SG.grid.tiles.find(x => x.id === target);
        if (t) t.local = true;
      } else {
        const t = SG.grid.addTile({ url, name: f.name, local: true, loop: true });
        if (t) { t.local = true; t.adapter.setLoop(true); }
      }
    }
    this.switcherTarget = null;
    this.hide('switcher');
  },

  // ── Channel manager ────────────────────────────────────────────
  openChanman() {
    this.renderChanList();
    this.show('chanman');
  },

  renderChanList() {
    const ul = document.getElementById('chan-list');
    ul.innerHTML = '';
    const { el } = SG.util;
    for (const ch of SG.channels.list) {
      const tagStr = (ch.tags || []).length ? '  ·  #' + ch.tags.join(' #') : '';
      const info = el('div', { class: 'c-info', title: 'Click to open in a new tile' }, [
        el('div', { class: 'c-name', text: ch.name }),
        el('div', { class: 'c-url', text: ch.url + tagStr }),
      ]);
      info.addEventListener('click', () => {
        SG.grid.addTile({ url: ch.url, name: ch.name });
        this.hide('chanman');
      });
      const edit = el('button', { class: 'tbtn', title: 'Edit', text: '✎' });
      edit.addEventListener('click', () => {
        const name = prompt('Name:', ch.name);
        if (name === null) return;
        const url = prompt('URL:', ch.url);
        if (url === null) return;
        const tags = prompt('Tags (comma separated):', (ch.tags || []).join(', '));
        if (tags === null) return;
        SG.channels.update(ch.id, {
          name: name || url, url,
          tags: tags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean),
        });
        this.renderChanList();
      });
      const del = el('button', { class: 'tbtn', title: 'Delete', text: '🗑' });
      del.addEventListener('click', () => {
        SG.channels.remove(ch.id);
        this.renderChanList();
      });
      ul.appendChild(el('li', {}, [info, edit, del]));
    }
    if (!SG.channels.list.length) {
      ul.appendChild(el('li', { text: 'No channels yet — add one above or import JSON.' }));
    }
  },

  // ── Chrome (UI) visibility ─────────────────────────────────────
  toggleChrome(force) {
    const hidden = force !== undefined ? force : !document.body.classList.contains('chrome-hidden');
    document.body.classList.toggle('chrome-hidden', hidden);
    SG.state.chromeHidden = hidden;
    SG.state.save();
    if (hidden && !document.getElementById('chrome-restore')) {
      const b = SG.util.el('button', { id: 'chrome-restore', text: '▾ show UI', title: 'Show UI (h)' });
      b.addEventListener('click', () => this.toggleChrome(false));
      document.body.appendChild(b);
    }
  },

  // ── Share ──────────────────────────────────────────────────────
  share() {
    if (!SG.grid.tiles.length) return SG.util.toast('Nothing to share yet');
    const { url, skippedLocal } = SG.state.shareLink();
    SG.util.copyText(url).then(() => {
      SG.util.toast(skippedLocal
        ? 'Link copied (local files can’t be shared and were skipped)'
        : 'Share link copied to clipboard');
    });
    if (location.protocol === 'file:') {
      SG.util.toast('Note: file:// links only work on this machine', 3500);
    }
  },
};
