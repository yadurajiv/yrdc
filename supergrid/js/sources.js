/* SuperGrid — sources.js: URL detection → source descriptor
 *
 * detect(url) returns:
 *   { type:'youtube', videoId, listId?, channelId?, url }
 *   { type:'video',   url }            direct media file / stream URL
 *   { type:'iframe',  url }            anything else — best-effort embed
 *
 * Backlog (see TODO.md): twitch, kick, hls (.m3u8 via hls.js), dash.
 */
window.SG = window.SG || {};

SG.sources = {
  VIDEO_EXT: /\.(mp4|webm|ogg|ogv|mov|m4v|mp3|m4a|wav|aac|flac|mkv)(\?|#|$)/i,
  HLS_EXT: /\.(m3u8)(\?|#|$)/i,

  detect(rawUrl) {
    let url = (rawUrl || '').trim();
    if (!url) return null;
    if (!/^[a-z]+:/i.test(url)) url = 'https://' + url;

    let u;
    try { u = new URL(url); } catch (e) { return null; }
    const host = u.hostname.replace(/^www\./, '').toLowerCase();

    // ── YouTube ──
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be'
        || host === 'youtube-nocookie.com') {
      const r = { type: 'youtube', url };
      if (host === 'youtu.be') {
        r.videoId = u.pathname.slice(1).split('/')[0];
      } else if (u.pathname === '/watch') {
        r.videoId = u.searchParams.get('v');
      } else {
        const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{6,})/);
        if (m) r.videoId = m[2];
        const c = u.pathname.match(/^\/channel\/(UC[\w-]+)/);
        if (c) r.channelId = c[1]; // → embed/live_stream?channel=
      }
      const list = u.searchParams.get('list');
      if (list) r.listId = list;
      if (r.videoId || r.listId || r.channelId) return r;
      // yt page we can't map (e.g. @handle/live) → fall through to iframe
      return { type: 'iframe', url };
    }

    // ── Twitch ──
    if (host === 'twitch.tv' || host === 'm.twitch.tv') {
      const vm = u.pathname.match(/^\/videos\/(\d+)/);
      if (vm) return { type: 'twitch', videoId: vm[1], url };
      const cm = u.pathname.match(/^\/\w+\/clip\/([\w-]+)/);
      if (cm) return { type: 'twitch', clipId: cm[1], url };
      const ch = u.pathname.match(/^\/(\w+)\/?$/);
      if (ch && !['videos', 'directory', 'downloads', 'p'].includes(ch[1]))
        return { type: 'twitch', channel: ch[1], url };
      return { type: 'iframe', url };
    }
    if (host === 'clips.twitch.tv') {
      const slug = u.pathname.replace(/^\//, '') || u.searchParams.get('clip');
      if (slug) return { type: 'twitch', clipId: slug, url };
    }
    if (host === 'player.twitch.tv') {
      const ch = u.searchParams.get('channel'), vid = u.searchParams.get('video');
      if (ch) return { type: 'twitch', channel: ch, url };
      if (vid) return { type: 'twitch', videoId: vid.replace(/^v/, ''), url };
    }

    // ── Kick ──
    if (host === 'kick.com' || host === 'player.kick.com') {
      const ch = u.pathname.match(/^\/(\w+)/);
      if (ch) return { type: 'kick', channel: ch[1], url };
    }

    // ── Vimeo ──
    if (host === 'vimeo.com') {
      const m = u.pathname.match(/^\/(\d+)/);
      if (m) return { type: 'vimeo', videoId: m[1], url };
    }
    if (host === 'player.vimeo.com') {
      const m = u.pathname.match(/^\/video\/(\d+)/);
      if (m) return { type: 'vimeo', videoId: m[1], url };
    }

    // ── HLS / DASH: hls.js / dash.js loaded on demand ──
    if (this.HLS_EXT.test(u.pathname)) return { type: 'video', url, hls: true };
    if (/\.mpd(\?|#|$)/i.test(u.pathname)) return { type: 'video', url, dash: true };

    // ── Direct media files / streams ──
    if (this.VIDEO_EXT.test(u.pathname)) return { type: 'video', url };
    if (u.protocol === 'blob:') return { type: 'video', url };

    // ── Everything else: generic iframe embed (may be blocked by the site) ──
    return { type: 'iframe', url };
  },

  looksLikeUrl(text) {
    const t = (text || '').trim();
    return /^https?:\/\/\S+$/i.test(t)
        || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(t)
        || /^blob:/.test(t);
  },

  label(type) {
    return {
      youtube: 'YouTube', video: 'Video', iframe: 'Embed', local: 'Local',
      twitch: 'Twitch', kick: 'Kick', vimeo: 'Vimeo',
    }[type] || type;
  },
};
