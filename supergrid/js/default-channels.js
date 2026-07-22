/* SuperGrid — default-channels.js
 *
 * ★ EDIT THIS FILE to change the channels SuperGrid ships with. ★
 *
 * Each entry: { name: 'Display name', url: '...', tags: ['news', ...] }
 *   - url can be anything SuperGrid understands: YouTube watch/live/playlist links,
 *     YouTube channel live (youtube.com/channel/UC.../live), Twitch channels,
 *     Kick, Vimeo, direct media (.mp4/.webm/.m3u8/.mpd/...), or any embeddable page.
 *   - tags are free-form; the switcher and channel manager use them for filtering
 *     (type #news in the switcher, or click a tag chip).
 *
 * These are only the factory defaults: they seed the list on first run and on
 * "Reset to defaults". Your live list is edited in-app and kept in localStorage.
 */
window.SG = window.SG || {};

/* NOTE on YouTube "live" links:
 *   These use the direct  watch?v=<id>  form because YouTube's channel-live embed
 *   (embed/live_stream?channel=…) no longer renders reliably. The trade-off: a
 *   watch?v= id points at ONE stream, so if a 24/7 channel restarts its stream the
 *   id changes and the tile goes blank. To refresh an id, open
 *   youtube.com/channel/<UC…>/live in a browser and copy the v= it redirects to.
 *   IDs below were resolved from each channel's current live stream (July 2026). */
SG.DEFAULT_CHANNELS = [
  // ── Music ──
  { name: 'Lofi Girl (24/7)',        url: 'https://www.youtube.com/watch?v=VAlMDl00mYY',                     tags: ['music'] },

  // ── Live / nature cameras ──
  { name: 'Explore Bears (live)',    url: 'https://www.youtube.com/watch?v=My_ZYCLOMzk',                     tags: ['live', 'nature'] },
  { name: 'Explore Oceans (live)',   url: 'https://www.youtube.com/watch?v=jxnehowX-9Y',                     tags: ['live', 'nature'] },
  { name: 'Explore Africa (live)',   url: 'https://www.youtube.com/watch?v=-7GOA9KIWcs',                     tags: ['live', 'nature'] },
  { name: 'EarthCam (live)',         url: 'https://www.youtube.com/watch?v=Tao0lgPrHK4',                     tags: ['live', 'cams'] },
  { name: 'FogCam (SF State)',       url: 'https://www.fogcam.org/',                                          tags: ['live', 'cams'] },
  { name: 'Clock (Clock Tab)',       url: 'https://www.clocktab.com/',                                          tags: ['apps', 'time'] },

  // ── News ──
  { name: 'Sky News (live)',         url: 'https://www.youtube.com/watch?v=POgWSvZNJAo',                     tags: ['news'] },
  { name: 'Al Jazeera English',      url: 'https://www.youtube.com/watch?v=gCNeDWCI0vo',                     tags: ['news'] },
  { name: 'ABC News (AU) live',      url: 'https://www.youtube.com/watch?v=vOTiJkg1voo',                     tags: ['news'] },

  // ── Space ──
  { name: 'NASA ISS (live)',         url: 'https://www.youtube.com/watch?v=awQzjn72bI0',                     tags: ['space', 'news'] },

  // ── Games / streaming platforms (Twitch needs the app served over http(s)) ──
  { name: 'TwitchPlaysPokemon (Twitch)', url: 'https://www.twitch.tv/twitchplayspokemon',                    tags: ['games'] },

  // ── Demo / test sources ──
  { name: 'HLS test stream (m3u8)',  url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',               tags: ['demo'] },
];
