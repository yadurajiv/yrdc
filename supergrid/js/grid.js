/* SuperGrid — grid.js: tiles, layouts, audio focus, expand */
window.SG = window.SG || {};

SG.grid = {
  tiles: [],            // {id, url, name, type, loop, local, adapter, el, muted}
  audioFocusId: null,
  bigId: null,
  layout: 'auto',
  prevLayout: 'auto',
  masterVolume: 1,
  LAYOUTS: ['auto', '2x2', '3x3', 'cols', 'focus'],
  RATES: [1, 1.25, 1.5, 2, 0.5],

  root() { return document.getElementById('grid'); },

  // ── Tile lifecycle ─────────────────────────────────────────────
  addTile({ url, name, loop = false, local = false, muted = true }) {
    const source = SG.sources.detect(url);
    if (!source) { SG.util.toast('Could not parse that URL'); return null; }

    const tile = {
      id: SG.util.uid(), url, name: name || url,
      type: source.type, loop, local, muted, rateIdx: 0,
    };
    tile.adapter = SG.players.create(source, this._mkOpts(tile, loop));
    tile.el = this._buildTileEl(tile);
    this.tiles.push(tile);
    this.root().appendChild(tile.el);
    // Tiles ALWAYS start muted: browsers only allow autoplay while muted, and audio
    // is granted explicitly by clicking a tile (a user gesture). Auto-unmuting here
    // would both break YouTube autoplay and leak sound from more than one tile.
    if (!local) SG.history.add(url, tile.name);
    this._autoName(tile);
    this._applyTileState(tile);
    this.render();
    SG.state.save();
    try { tile.adapter.play(); } catch (e) {}
    setTimeout(() => { try { tile.adapter.play(); } catch (e) {} }, 120);
    return tile;
  },

  removeTile(id) {
    const i = this.tiles.findIndex(t => t.id === id);
    if (i < 0) return;
    const t = this.tiles[i];
    t.adapter.destroy();
    t.el.remove();
    this.tiles.splice(i, 1);
    if (this.audioFocusId === id) this.audioFocusId = null;
    if (this.bigId === id) { this.bigId = null; if (this.layout === 'focus') this.setLayout(this.prevLayout); }
    this.render();
    SG.state.save();
  },

  // Rebuild a tile's player in place (same URL) — recovers a frame that has
  // frozen, errored, or dropped its stream, without touching the rest of the grid.
  reloadTile(id) {
    const t = this.tiles.find(x => x.id === id);
    if (!t || t.local) return; // blob URLs are revoked on destroy → can't reload
    const source = SG.sources.detect(t.url);
    if (!source) return;
    try { t.adapter.destroy(); } catch (e) {}
    t.adapter = SG.players.create(source, this._mkOpts(t, t.loop));
    const holder = t.el.querySelector('.tile-player');
    holder.innerHTML = '';
    holder.appendChild(t.adapter.el);
    t.paused = false;
    t.el.classList.remove('shield-off');
    this._refreshTileBar(t);
    this._applyTileState(t);
    this.render();
    try { t.adapter.play(); } catch (e) {}
    setTimeout(() => { try { t.adapter.play(); } catch (e) {} }, 120);
    SG.util.toast('Reloaded tile');
  },

  swapTile(id, url, name) {
    const t = this.tiles.find(x => x.id === id);
    if (!t) return;
    const source = SG.sources.detect(url);
    if (!source) { SG.util.toast('Could not parse that URL'); return; }
    const wasFocused = this.audioFocusId === id;
    t.adapter.destroy();
    if (t.local && t.url.startsWith('blob:')) { /* revoked by adapter */ }
    Object.assign(t, { url, name: name || url, type: source.type, local: url.startsWith('blob:'), muted: !wasFocused, rateIdx: 0, paused: false });
    t.adapter = SG.players.create(source, this._mkOpts(t, t.loop));
    if (wasFocused) t.adapter.setMuted(false);
    if (!t.local) SG.history.add(url, t.name);
    const holder = t.el.querySelector('.tile-player');
    holder.innerHTML = '';
    holder.appendChild(t.adapter.el);
    this._refreshTileBar(t);
    this._autoName(t);
    this._applyTileState(t);
    this.render();
    SG.state.save();
  },

  // Fetch a human title when a tile's name is just its URL (typical for pasted
  // links), then update the tile bar and the matching history entry in place.
  _autoName(tile) {
    if (tile.local) return;
    const looksLikeUrl = tile.name === tile.url || /^https?:\/\//i.test(tile.name);
    if (!looksLikeUrl) return;
    SG.util.fetchTitle(tile.url).then(title => {
      if (!title) return;
      tile.name = title;
      const span = tile.el && tile.el.querySelector('.tile-name');
      if (span) { span.textContent = title; span.title = tile.url; }
      SG.history.rename(tile.url, title);
      SG.state.save();
    });
  },

  clear() {
    for (const t of this.tiles.slice()) { try { t.adapter.destroy(); } catch (e) {} t.el.remove(); }
    this.tiles = [];
    this.audioFocusId = null;
    this.bigId = null;
    this.render();
    SG.state.save();
  },

  // Load a saved grid snapshot { layout, tiles:[{url,name,loop}], focusIdx, bigIdx }
  applyGrid(snap) {
    if (!snap) return;
    this.clear();
    this.layout = this.LAYOUTS.includes(snap.layout) ? snap.layout : 'auto';
    SG.state.layout = this.layout;
    (snap.tiles || []).forEach(t => this.addTile({ url: t.url, name: t.name, loop: !!t.loop }));
    const fi = typeof snap.focusIdx === 'number' ? snap.focusIdx : -1;
    if (fi >= 0 && this.tiles[fi]) this.focusAudio(this.tiles[fi].id);
    const bi = typeof snap.bigIdx === 'number' ? snap.bigIdx : -1;
    if (bi >= 0 && this.tiles[bi]) this.bigId = this.tiles[bi].id;
    this.render();
    SG.state.save();
  },

  // Options passed to every adapter — includes a play-state callback so the
  // tile's play/pause button reflects what the player is actually doing.
  _mkOpts(tile, loop) {
    return { loop: !!loop, onState: (playing) => this._setPlayIcon(tile, playing) };
  },

  _setPlayIcon(tile, playing) {
    tile.paused = !playing;
    const b = tile.el && tile.el.querySelector('.tile-bar [data-act="playpause"]');
    if (b) { b.textContent = playing ? '⏸' : '▶'; b.title = playing ? 'Pause' : 'Play'; }
  },

  _applyTileState(tile) {
    // Mute is the single source of truth for silence (a real player mute, not a
    // volume-0 hack). Master volume only scales the one tile that's actually audible.
    const audible = !tile.muted && this.masterVolume > 0;
    if (audible) {
      tile.adapter.setVolume(this.masterVolume);
      tile.adapter.setMuted(false);
    } else {
      tile.adapter.setMuted(true);
    }
    if (tile.el) {
      const icon = tile.el.querySelector('[data-act="audio"]');
      if (icon) icon.classList.toggle('on', audible && tile.id === this.audioFocusId);
    }
  },

  setMasterVolume(v) {
    this.masterVolume = Math.max(0, Math.min(1, Number(v) || 0));
    this.tiles.forEach(t => this._applyTileState(t));
    SG.state.volume = this.masterVolume;
    this.render();
    SG.state.save();
  },

  // ── Audio focus (the vidgrid-style core interaction) ───────────
  focusAudio(id) {
    if (this.audioFocusId === id) return this.muteAll(); // click again = silence
    this.audioFocusId = id;
    for (const t of this.tiles) {
      t.muted = t.id !== id;
      this._applyTileState(t);
    }
    this.render();
    SG.state.save();
  },

  muteAll() {
    this._lastFocus = this.audioFocusId;
    this.audioFocusId = null;
    for (const t of this.tiles) { t.muted = true; this._applyTileState(t); }
    this.render();
    SG.state.save();
  },

  toggleMuteAll() {
    if (this.audioFocusId) this.muteAll();
    else if (this._lastFocus && this.tiles.some(t => t.id === this._lastFocus)) this.focusAudio(this._lastFocus);
    else if (this.tiles.length) this.focusAudio(this.tiles[0].id);
  },

  // ── Expand / focus layout ──────────────────────────────────────
  expand(id) {
    if (this.layout === 'focus' && this.bigId === id) {
      this.bigId = null;
      return this.setLayout(this.prevLayout);
    }
    if (this.layout !== 'focus') this.prevLayout = this.layout;
    this.bigId = id;
    this.setLayout('focus');
  },

  setLayout(name) {
    if (name === 'focus' && !this.bigId && this.tiles.length) {
      this.bigId = (this.audioFocusId || this.tiles[0].id);
    }
    this.layout = name;
    SG.state.layout = name;
    this.render();
    SG.state.save();
  },

  cycleLayout() {
    const i = this.LAYOUTS.indexOf(this.layout);
    this.setLayout(this.LAYOUTS[(i + 1) % this.LAYOUTS.length]);
    SG.util.toast('Layout: ' + this.layout);
  },

  // ── Render ─────────────────────────────────────────────────────
  render() {
    const root = this.root();
    const n = this.tiles.length;
    document.getElementById('empty-hint').classList.toggle('hidden', n > 0);

    root.className = 'layout-' + this.layout;

    // container geometry
    if (this.layout === 'focus' && n > 1) {
      root.style.gridTemplateColumns = '3fr 1fr';
      root.style.gridTemplateRows = `repeat(${Math.max(n - 1, 1)}, 1fr)`;
    } else if (this.layout === '2x2') {
      root.style.gridTemplateColumns = 'repeat(2, 1fr)';
      root.style.gridTemplateRows = '';
    } else if (this.layout === '3x3') {
      root.style.gridTemplateColumns = 'repeat(3, 1fr)';
      root.style.gridTemplateRows = '';
    } else if (this.layout === 'cols') {
      root.style.gridTemplateColumns = `repeat(${Math.max(n, 1)}, 1fr)`;
      root.style.gridTemplateRows = '';
    } else { // auto or single-tile focus
      const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
      root.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      root.style.gridTemplateRows = '';
    }

    // per-tile
    this.tiles.forEach((t, i) => {
      const big = this.layout === 'focus' && n > 1 && t.id === this.bigId;
      t.el.classList.toggle('is-big', big);
      t.el.classList.toggle('audio-focus', t.id === this.audioFocusId);
      if (this.layout === 'focus' && n > 1) {
        t.el.style.gridArea = big ? `1 / 1 / ${Math.max(n, 2)} / 2` : '';
        if (!big) t.el.style.gridColumn = '2';
      } else {
        t.el.style.gridArea = '';
        t.el.style.gridColumn = '';
      }
      const num = t.el.querySelector('.tile-num');
      num.textContent = (i + 1) + (t.id === this.audioFocusId ? ' 🔊' : '');
      const audioBtn = t.el.querySelector('[data-act="audio"]');
      if (audioBtn) audioBtn.classList.toggle('on', t.id === this.audioFocusId);
    });
  },

  // ── Tile DOM ───────────────────────────────────────────────────
  _buildTileEl(tile) {
    const { el } = SG.util;

    const shield = el('div', { class: 'tile-shield' });
    // Single-tap = audio focus, double-tap = expand. The single-tap action is
    // deferred so the first click of a double-click doesn't toggle mute.
    let tapTimer = null;
    shield.addEventListener('click', () => {
      if (tapTimer) {
        clearTimeout(tapTimer); tapTimer = null;
        this.expand(tile.id);
      } else {
        tapTimer = setTimeout(() => { tapTimer = null; this.focusAudio(tile.id); }, 260);
      }
    });

    const player = el('div', { class: 'tile-player' }, [tile.adapter.el]);
    const bar = el('div', { class: 'tile-bar' });
    const root = el('div', { class: 'tile', 'data-id': tile.id }, [
      player, shield,
      el('div', { class: 'tile-num', text: '' }),
      bar,
    ]);
    tile.el = root;
    this._refreshTileBar(tile);
    return root;
  },

  _refreshTileBar(tile) {
    const { el } = SG.util;
    const bar = tile.el.querySelector('.tile-bar');
    bar.innerHTML = '';
    const caps = tile.adapter.caps;
    const btn = (label, title, act, onclick) => {
      const b = el('button', { class: 'tbtn', title, text: label, 'data-act': act });
      b.addEventListener('click', (e) => { e.stopPropagation(); onclick(b); });
      return b;
    };

    bar.appendChild(el('span', { class: 'tile-name', text: tile.name, title: tile.url }));

    if (caps.mute) bar.appendChild(btn('🔊', 'Audio focus', 'audio', () => this.focusAudio(tile.id)));

    if (caps.playPause) {
      const b = btn(tile.paused ? '▶' : '⏸', 'Play / pause', 'playpause', (bEl) => {
        tile.paused = !tile.paused;
        if (tile.paused) tile.adapter.pause(); else tile.adapter.play();
        bEl.textContent = tile.paused ? '▶' : '⏸';
        bEl.title = tile.paused ? 'Play' : 'Pause';
      });
      bar.appendChild(b);
    }

    if (caps.loop) {
      const b = btn('⟳', 'Loop', 'loop', (bEl) => {
        tile.loop = !tile.loop;
        tile.adapter.setLoop(tile.loop);
        bEl.classList.toggle('on', tile.loop);
        SG.state.save();
      });
      if (tile.loop) b.classList.add('on');
      bar.appendChild(b);
    }

    if (caps.rate) {
      bar.appendChild(btn('1×', 'Playback speed', 'rate', (bEl) => {
        tile.rateIdx = (tile.rateIdx + 1) % this.RATES.length;
        const r = this.RATES[tile.rateIdx];
        tile.adapter.setRate(r);
        bEl.textContent = r + '×';
      }));
    }

    if (caps.nativeControls) {
      bar.appendChild(btn('▤', 'Native player controls', 'nctrl', (bEl) => {
        const on = !bEl.classList.contains('on');
        bEl.classList.toggle('on', on);
        tile.adapter.setNativeControls(on);
        tile.el.classList.toggle('shield-off', on);
      }));
    }

    // Interact makes sense for every iframe-backed embed (YouTube, Twitch, Kick,
    // Vimeo, generic pages). Native <video> tiles use the native-controls toggle instead.
    if (tile.type !== 'video') {
      bar.appendChild(btn('🖱', 'Interact with player (disables tap-to-focus)', 'interact', (bEl) => {
        const on = !bEl.classList.contains('on');
        bEl.classList.toggle('on', on);
        tile.el.classList.toggle('shield-off', on);
      }));
    }

    if (!tile.local && !SG.channels.has(tile.url)) {
      bar.appendChild(btn('★', 'Save to channels', 'star', (bEl) => {
        SG.channels.add(tile.name, tile.url);
        SG.util.toast('Saved to channels');
        bEl.remove();
      }));
    }

    if (!tile.local) {
      bar.appendChild(btn('↻', 'Reload this tile (if it froze or errored)', 'reload', () => this.reloadTile(tile.id)));
      bar.appendChild(btn('🔗', 'Copy this tile’s link', 'copy', () => {
        SG.util.copyText(tile.url).then(() => SG.util.toast('Link copied'));
      }));
    }

    bar.appendChild(btn('⌕', 'Change channel here', 'swap', () => SG.ui.openSwitcher({ targetTileId: tile.id })));
    bar.appendChild(btn('⛶', 'Expand', 'expand', () => this.expand(tile.id)));
    bar.appendChild(btn('✕', 'Close', 'close', () => this.removeTile(tile.id)));
  },
};
