/* SuperGrid — players.js: player adapters with a unified interface
 *
 * adapter = {
 *   el,                      root DOM node
 *   caps: { mute, loop, rate, playPause, nativeControls? },
 *   setMuted(b), setLoop(b), setRate(n), play(), pause(), destroy()
 * }
 *
 * External libs (hls.js, dash.js, Twitch embed API) are lazy-loaded from CDNs
 * only when a tile actually needs them.
 */
window.SG = window.SG || {};

SG.players = {
  CDN: {
    hls: 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js',
    dash: 'https://cdn.jsdelivr.net/npm/dashjs@4/dist/dash.all.min.js',
    twitch: 'https://player.twitch.tv/js/embed/v1.js',
  },

  create(source, opts = {}) {
    switch (source.type) {
      case 'youtube': return this._youtube(source, opts);
      case 'video':   return this._video(source, opts);
      case 'twitch':  return this._twitch(source, opts);
      case 'kick':    return this._kick(source, opts);
      case 'vimeo':   return this._vimeo(source, opts);
      default:        return this._iframe(source, opts);
    }
  },

  // ── YouTube: iframe + postMessage commands (no external API script) ──
  _youtube(source, opts) {
    let src;
    const p = new URLSearchParams({
      autoplay: '1', mute: '1', enablejsapi: '1', playsinline: '1',
      rel: '0', iv_load_policy: '3',
    });
    if (location.protocol.startsWith('http')) p.set('origin', location.origin);

    if (source.videoId) {
      if (source.listId) p.set('list', source.listId);
      src = `https://www.youtube.com/embed/${source.videoId}?${p}`;
    } else if (source.listId) {
      p.set('listType', 'playlist'); p.set('list', source.listId);
      src = `https://www.youtube.com/embed/videoseries?${p}`;
    } else if (source.channelId) {
      p.set('channel', source.channelId);
      src = `https://www.youtube.com/embed/live_stream?${p}`;
    }

    const iframe = SG.util.el('iframe', {
      src,
      allow: 'autoplay; encrypted-media; picture-in-picture',
      allowfullscreen: '',
      // YouTube requires a Referer header since late 2025 (else "error 153")
      referrerpolicy: 'strict-origin-when-cross-origin',
    });

    if (location.protocol === 'file:' && !SG.players._warned153) {
      SG.players._warned153 = true;
      setTimeout(() => SG.util.toast(
        'YouTube blocks embeds opened from file:// (error 153).', 6000), 800);
    }

    let ready = false;
    const queue = [];
    let lastVolume = 1;
    let loopOn = !!opts.loop;
    const isPlaylist = !!source.listId;
    const cmd = (func, args = []) => {
      const msg = JSON.stringify({ event: 'command', func, args });
      if (ready) iframe.contentWindow.postMessage(msg, '*');
      else queue.push(msg);
    };
    const setVol = (v) => {
      const clamped = Math.max(0, Math.min(1, Number(v) || 0));
      if (clamped > 0) lastVolume = clamped;
      cmd('setVolume', [Math.round(clamped * 100)]);
    };
    // Reflect the player's real state (playing / paused / unstarted) back to the UI,
    // and auto-replay when a single video ends if loop is on.
    const onMsg = (e) => {
      if (e.source !== iframe.contentWindow) return;
      let d; try { d = JSON.parse(e.data); } catch (_) { return; }
      let st;
      if (d.event === 'onStateChange') st = d.info;
      else if (d.event === 'infoDelivery' && d.info && typeof d.info.playerState === 'number') st = d.info.playerState;
      if (typeof st !== 'number') return;
      if (st === 0 && loopOn && !isPlaylist) { cmd('seekTo', [0, true]); cmd('playVideo'); } // ended → replay
      if (!opts.onState) return;
      if (st === 1) opts.onState(true);                       // playing
      else if (st === 2 || st === 0 || st === -1 || st === 5) opts.onState(false); // paused/ended/unstarted/cued
    };
    window.addEventListener('message', onMsg);

    iframe.addEventListener('load', () => {
      try { iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: SG.util.uid() }), '*'); } catch (e) {}
      setTimeout(() => {
        ready = true;
        queue.forEach(m => { try { iframe.contentWindow.postMessage(m, '*'); } catch (e) {} });
        queue.length = 0;
      }, 700);
    });

    return {
      el: iframe,
      caps: { mute: true, loop: true, rate: true, playPause: true, playlist: isPlaylist },
      // Real mute/unMute — reliable silence. setVolume only scales the level.
      setMuted: b => { if (b) cmd('mute'); else { cmd('unMute'); cmd('setVolume', [Math.round(lastVolume * 100)]); } },
      setLoop: b => { loopOn = !!b; if (isPlaylist) cmd('setLoop', [!!b]); },
      setRate: n => cmd('setPlaybackRate', [n]),
      setVolume: v => setVol(v),
      play: () => cmd('playVideo'),
      pause: () => cmd('pauseVideo'),
      next: () => cmd('nextVideo'),
      prev: () => cmd('previousVideo'),
      destroy: () => { window.removeEventListener('message', onMsg); iframe.remove(); },
    };
  },

  // ── Native <video>: direct URLs, local files, HLS (hls.js), DASH (dash.js) ──
  _video(source, opts) {
    const video = SG.util.el('video', { playsinline: '', autoplay: '', muted: '' });
    video.muted = true;
    video.loop = !!opts.loop;
    if (opts.showNativeControls) video.controls = true;

    let hlsInst = null, dashInst = null;
    let currentVolume = 1;
    if (opts.onState) {
      video.addEventListener('play', () => opts.onState(true));
      video.addEventListener('playing', () => opts.onState(true));
      video.addEventListener('pause', () => opts.onState(false));
    }

    if (source.hls && !video.canPlayType('application/vnd.apple.mpegurl')) {
      SG.util.loadScript(this.CDN.hls).then(() => {
        if (window.Hls && window.Hls.isSupported()) {
          hlsInst = new window.Hls();
          hlsInst.loadSource(source.url);
          hlsInst.attachMedia(video);
          video.play().catch(() => {});
        } else {
          SG.util.toast('This browser cannot play HLS');
        }
      }).catch(() => SG.util.toast('Could not load hls.js (offline?)'));
    } else if (source.dash) {
      SG.util.loadScript(this.CDN.dash).then(() => {
        dashInst = window.dashjs.MediaPlayer().create();
        dashInst.initialize(video, source.url, true);
      }).catch(() => SG.util.toast('Could not load dash.js (offline?)'));
    } else {
      video.src = source.url;
      video.play().catch(() => {});
    }

    return {
      el: video,
      caps: { mute: true, loop: true, rate: true, playPause: true, nativeControls: true },
      setMuted: b => { video.muted = b; if (!b) video.volume = currentVolume; },
      setLoop: b => { video.loop = b; },
      setRate: n => { video.playbackRate = n; },
      setVolume: v => { currentVolume = Math.max(0, Math.min(1, Number(v) || 0)); if (!video.muted) video.volume = currentVolume; },
      setNativeControls: b => { video.controls = b; },
      play: () => video.play().catch(() => {}),
      pause: () => video.pause(),
      destroy: () => {
        if (hlsInst) try { hlsInst.destroy(); } catch (e) {}
        if (dashInst) try { dashInst.reset(); } catch (e) {}
        video.pause();
        if (source.url.startsWith('blob:')) URL.revokeObjectURL(source.url);
        video.removeAttribute('src'); video.load(); video.remove();
      },
    };
  },

  // ── Twitch: official embed API for mute control; iframe fallback ──
  _twitch(source, opts) {
    const parent = location.hostname;
    const wrap = SG.util.el('div', { style: 'position:absolute;inset:0' });

    // Clips: plain iframe, no runtime API
    if (source.clipId) {
      const iframe = SG.util.el('iframe', {
        src: `https://clips.twitch.tv/embed?clip=${source.clipId}&parent=${parent || 'localhost'}&autoplay=true&muted=true`,
        allow: 'autoplay; fullscreen', allowfullscreen: '',
      });
      wrap.appendChild(iframe);
      return {
        el: wrap,
        caps: { mute: false, loop: false, rate: false, playPause: false },
        setMuted: () => {}, setLoop: () => {}, setRate: () => {},
        play: () => {}, pause: () => {}, destroy: () => wrap.remove(),
      };
    }

    if (!parent || location.protocol === 'file:') {
      wrap.appendChild(SG.util.el('div', {
        class: 'tile-hint',
        text: 'Twitch embeds require the app to be served over http(s).',
      }));
      return {
        el: wrap,
        caps: { mute: false, loop: false, rate: false, playPause: false },
        setMuted: () => {}, setLoop: () => {}, setRate: () => {},
        play: () => {}, pause: () => {}, destroy: () => wrap.remove(),
      };
    }

    let player = null;
    let pendingMuted = true;
    let pendingVol = 1;
    let destroyed = false;

    SG.util.loadScript(this.CDN.twitch).then(() => {
      if (destroyed || !window.Twitch) return;
      const o = {
        width: '100%', height: '100%',
        autoplay: true, muted: true,
        parent: [parent],
      };
      if (source.channel) o.channel = source.channel;
      else if (source.videoId) o.video = source.videoId;
      player = new window.Twitch.Player(wrap, o);
      player.addEventListener(window.Twitch.Player.READY, () => {
        try { player.setMuted(pendingMuted); player.setVolume(pendingVol); } catch (e) {}
      });
      if (opts.onState) {
        try {
          player.addEventListener(window.Twitch.Player.PLAY, () => opts.onState(true));
          player.addEventListener(window.Twitch.Player.PLAYING, () => opts.onState(true));
          player.addEventListener(window.Twitch.Player.PAUSE, () => opts.onState(false));
          player.addEventListener(window.Twitch.Player.ENDED, () => opts.onState(false));
        } catch (e) {}
      }
    }).catch(() => {
      // offline / blocked: plain iframe fallback (starts muted, no runtime control)
      if (destroyed) return;
      const q = source.channel ? `channel=${source.channel}` : `video=${source.videoId}`;
      wrap.appendChild(SG.util.el('iframe', {
        src: `https://player.twitch.tv/?${q}&parent=${parent}&autoplay=true&muted=true`,
        allow: 'autoplay; fullscreen', allowfullscreen: '',
      }));
    });

    return {
      el: wrap,
      caps: { mute: true, loop: false, rate: false, playPause: true },
      setMuted: b => { pendingMuted = b; if (player) try { player.setMuted(b); if (!b) player.setVolume(pendingVol); } catch (e) {} },
      setLoop: () => {}, setRate: () => {},
      setVolume: v => { pendingVol = Math.max(0, Math.min(1, Number(v) || 0)); if (player) try { player.setVolume(pendingVol); } catch (e) {} },
      play: () => { if (player) try { player.play(); } catch (e) {} },
      pause: () => { if (player) try { player.pause(); } catch (e) {} },
      destroy: () => { destroyed = true; wrap.remove(); },
    };
  },

  // ── Kick: iframe embed (no public runtime API — use interact mode 🖱) ──
  _kick(source) {
    const iframe = SG.util.el('iframe', {
      src: `https://player.kick.com/${source.channel}?autoplay=true&muted=true`,
      allow: 'autoplay; encrypted-media; fullscreen; picture-in-picture',
      allowfullscreen: '',
    });
    return {
      el: iframe,
      caps: { mute: false, loop: false, rate: false, playPause: false },
      setMuted: () => {}, setLoop: () => {}, setRate: () => {}, setVolume: () => {},
      play: () => {}, pause: () => {},
      destroy: () => iframe.remove(),
    };
  },

  // ── Vimeo: iframe + postMessage API ──
  _vimeo(source, opts) {
    const iframe = SG.util.el('iframe', {
      src: `https://player.vimeo.com/video/${source.videoId}?autoplay=1&muted=1&loop=${opts.loop ? 1 : 0}`,
      allow: 'autoplay; fullscreen; picture-in-picture',
      allowfullscreen: '',
    });
    let vol = 1;
    const cmd = (method, value) => {
      try { iframe.contentWindow.postMessage(JSON.stringify({ method, value }), '*'); } catch (e) {}
    };
    const onMsg = (e) => {
      if (e.source !== iframe.contentWindow) return;
      let d; try { d = JSON.parse(e.data); } catch (_) { return; }
      if (d.event === 'ready') { cmd('addEventListener', 'play'); cmd('addEventListener', 'pause'); cmd('addEventListener', 'ended'); }
      else if (!opts.onState) return;
      else if (d.event === 'play') opts.onState(true);
      else if (d.event === 'pause' || d.event === 'ended') opts.onState(false);
    };
    window.addEventListener('message', onMsg);
    return {
      el: iframe,
      caps: { mute: true, loop: true, rate: false, playPause: true },
      setMuted: b => { cmd('setMuted', b); if (!b) cmd('setVolume', vol); },
      setLoop: b => cmd('setLoop', b),
      setVolume: v => { vol = Math.max(0, Math.min(1, Number(v) || 0)); cmd('setVolume', vol); },
      setRate: () => {},
      play: () => cmd('play'),
      pause: () => cmd('pause'),
      destroy: () => { window.removeEventListener('message', onMsg); iframe.remove(); },
    };
  },

  // ── Generic iframe: any page, best effort (sites can block embedding) ──
  _iframe(source) {
    const wrap = SG.util.el('div', { class: 'tile-player-wrap', style: 'position:absolute;inset:0' });
    // Hint stays hidden while a page embeds fine. It only surfaces if the iframe
    // hasn't fired `load` shortly after mount — i.e. the page is actually blocked/blank —
    // so it no longer sits permanently over pages that embed without a video.
    const hint = SG.util.el('div', {
      class: 'tile-hint hidden',
      text: 'This site blocks embedding (X-Frame-Options / CSP). Try the 🖱 interact button or open it directly.',
    });
    const iframe = SG.util.el('iframe', {
      src: source.url,
      allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
      allowfullscreen: '',
      sandbox: 'allow-scripts allow-same-origin allow-presentation allow-forms',
    });
    let loaded = false;
    iframe.addEventListener('load', () => { loaded = true; hint.classList.add('hidden'); });
    setTimeout(() => { if (!loaded) hint.classList.remove('hidden'); }, 4000);
    wrap.append(hint, iframe);

    return {
      el: wrap,
      caps: { mute: false, loop: false, rate: false, playPause: false },
      setMuted: () => {}, setLoop: () => {}, setRate: () => {}, setVolume: () => {},
      play: () => {}, pause: () => {},
      destroy: () => wrap.remove(),
    };
  },
};
