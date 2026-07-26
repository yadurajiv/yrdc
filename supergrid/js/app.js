/* SuperGrid — app.js: boot, wiring, keyboard shortcuts */
(function () {
  const $ = SG.util.$;

  function boot() {
    const saved = SG.state.loadSaved();
    SG.channels.load(saved && saved.channels);
    SG.grid.setMasterVolume(saved && typeof saved.volume === 'number' ? saved.volume : 1);
    SG.history.load(saved && saved.history);
    SG.presets.load(saved && saved.presets);

    // Shared link takes precedence over saved grid
    const shared = SG.state.parseShareHash();
    const src = shared || saved;

    if (src) {
      SG.grid.layout = ['auto', '2x2', '3x3', 'cols', 'focus'].includes(src.layout) ? src.layout : 'auto';
      SG.state.layout = SG.grid.layout;
      (src.tiles || []).forEach(t => SG.grid.addTile({ url: t.url, name: t.name, loop: t.loop, volume: t.volume }));
      const fi = shared ? shared.focusIdx : (saved ? saved.focusIdx : -1);
      if (fi >= 0 && SG.grid.tiles[fi]) SG.grid.focusAudio(SG.grid.tiles[fi].id);
      const bi = shared ? shared.bigId : (saved ? saved.bigId : -1);
      if (bi >= 0 && SG.grid.tiles[bi]) SG.grid.bigId = SG.grid.tiles[bi].id;
      if (saved && saved.chromeHidden && !shared) SG.ui.toggleChrome(true);
    }
    if (shared) {
      history.replaceState(null, '', location.pathname + location.search); // don't re-apply on reload
      SG.util.toast('Loaded shared grid');
      SG.state.save();
    }
    $('#volume-control').value = String(SG.grid.masterVolume);
    const av = document.querySelector('.about-ver');
    if (av && window.SG_VERSION) av.textContent = 'v' + window.SG_VERSION;
    SG.grid.render();
  }

  // ── Topbar ──
  $('#btn-add').addEventListener('click', () => SG.ui.openSwitcher());
  $('#hint-add').addEventListener('click', () => SG.ui.openSwitcher());
  $('#btn-switcher').addEventListener('click', () => {
    SG.ui.openSwitcher({ targetTileId: SG.grid.audioFocusId || (SG.grid.tiles[0] && SG.grid.tiles[0].id) || null });
  });
  $('#btn-layout').addEventListener('click', () => SG.grid.cycleLayout());
  $('#btn-muteall').addEventListener('click', () => SG.grid.toggleMuteAll());
  const volumeControl = $('#volume-control');
  const volumeIcon = $('#volume-icon');
  let lastMaster = SG.grid.masterVolume > 0 ? SG.grid.masterVolume : 1;
  const updateVolIcon = () => { volumeIcon.textContent = SG.grid.masterVolume > 0 ? '🔊' : '🔇'; };
  // Drag = set volume. Mute/unmute lives ONLY on the icon — a click handler on the
  // slider itself also fires at the end of every drag, which would snap it to 0.
  volumeControl.addEventListener('input', (e) => {
    SG.grid.setMasterVolume(e.target.value);
    if (SG.grid.masterVolume > 0) lastMaster = SG.grid.masterVolume;
    updateVolIcon();
  });
  volumeIcon.addEventListener('click', () => {
    const next = SG.grid.masterVolume > 0 ? 0 : (lastMaster || 1);
    SG.grid.setMasterVolume(next);
    volumeControl.value = String(next);
    updateVolIcon();
  });
  updateVolIcon();
  $('#btn-channels').addEventListener('click', () => SG.ui.openChanman());
  $('#btn-grids').addEventListener('click', () => SG.ui.openGrids());
  $('#grid-save-btn').addEventListener('click', () => SG.ui.saveCurrentGrid());
  $('#grid-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') SG.ui.saveCurrentGrid(); });
  $('#btn-share').addEventListener('click', () => SG.ui.share());
  $('#btn-chrome').addEventListener('click', () => SG.ui.toggleChrome());
  $('#btn-help').addEventListener('click', () => SG.ui.show('help'));
  $('#btn-about').addEventListener('click', () => SG.ui.show('about'));
  SG.util.$$('.close-modal').forEach(b =>
    b.addEventListener('click', () => SG.ui.hide(b.dataset.close)));

  // click outside modal closes overlay
  SG.util.$$('.overlay').forEach(ov =>
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) ov.classList.add('hidden'); }));

  // ── Quick switcher ──
  const swInput = $('#switcher-input');
  swInput.addEventListener('input', () => SG.ui.renderSwitcherResults(swInput.value));
  swInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); SG.ui.moveSel(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); SG.ui.moveSel(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); SG.ui.pickResult(SG.ui._sel, e.shiftKey); }
    else if (e.key === 'Escape') SG.ui.hide('switcher');
  });
  $('#switcher-localfile').addEventListener('click', () => $('#localfile-input').click());
  $('#localfile-input').addEventListener('change', (e) => {
    if (e.target.files.length) SG.ui.openLocalFiles(e.target.files);
    e.target.value = '';
  });

  // ── Channel manager ──
  $('#chan-add-btn').addEventListener('click', () => {
    const name = $('#chan-name').value.trim();
    const url = $('#chan-url').value.trim();
    if (!url) return SG.util.toast('URL required');
    SG.channels.add(name, url);
    $('#chan-name').value = ''; $('#chan-url').value = '';
    SG.ui.renderChanList();
  });
  $('#chan-url').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#chan-add-btn').click(); });
  $('#chan-export').addEventListener('click', () => {
    SG.util.download('supergrid-channels.json', SG.channels.exportJSON());
  });
  $('#chan-import').addEventListener('click', () => $('#chan-import-file').click());
  $('#chan-import-file').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const n = SG.channels.importJSON(await f.text());
      SG.util.toast(`Imported ${n} channel(s)`);
      SG.ui.renderChanList();
    } catch (err) { SG.util.toast('Import failed: ' + err.message); }
    e.target.value = '';
  });
  $('#chan-reset').addEventListener('click', () => {
    if (confirm('Replace your channel list with the bundled defaults?')) {
      SG.channels.reset();
      SG.ui.renderChanList();
    }
  });

  // ── Keyboard ──
  document.addEventListener('keydown', (e) => {
    const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);

    if (e.key === 'Escape') {
      if (SG.ui.anyOverlayOpen()) return SG.ui.closeAllOverlays();
      if (SG.grid.layout === 'focus') { SG.grid.bigId = null; SG.grid.setLayout(SG.grid.prevLayout); }
      return;
    }
    if (inField) return;

    const digit = /^[1-9]$/.test(e.key) ? +e.key
      : (e.shiftKey && /^Digit[1-9]$/.test(e.code)) ? +e.code.slice(5) : null;
    if (digit) {
      const t = SG.grid.tiles[digit - 1];
      if (t) e.shiftKey ? SG.grid.expand(t.id) : SG.grid.focusAudio(t.id);
      return;
    }

    switch (e.key.toLowerCase()) {
      case 's': case '/': e.preventDefault();
        SG.ui.openSwitcher({ targetTileId: SG.grid.audioFocusId }); break;
      case 'a': SG.ui.openSwitcher(); break;
      case 'm': SG.grid.toggleMuteAll(); break;
      case 'g': SG.grid.cycleLayout(); break;
      case 'f': {
        const id = SG.grid.audioFocusId || (SG.grid.tiles[0] && SG.grid.tiles[0].id);
        if (id) SG.grid.expand(id);
        break;
      }
      case 'h': SG.ui.toggleChrome(); break;
      case 'e': SG.ui.openChanman(); break;
      case 'p': SG.ui.openGrids(); break;
      case 'x': if (SG.grid.audioFocusId) SG.grid.removeTile(SG.grid.audioFocusId); break;
      case '?': SG.ui.show('help'); break;
    }
  });

  // persist on unload
  window.addEventListener('beforeunload', () => SG.state._saveNow());

  boot();
})();
