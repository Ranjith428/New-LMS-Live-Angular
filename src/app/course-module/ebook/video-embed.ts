/** A video that can be played on the ebook page. */
export interface VideoSource {
  kind: 'iframe' | 'file';
  /**
   * https URL that is safe to load. For players it is built from a validated video id,
   * it is never copied from the pasted text.
   */
  src: string;
  provider: string;
}

const YOUTUBE_ID = /^[\w-]{11}$/;
const NUMERIC_ID = /^\d{5,}$/;
const DAILYMOTION_ID = /^[a-z\d]{4,20}$/i;
const LOOM_ID = /^[a-f\d]{32}$/i;
const VIMEO_HASH = /^[a-f\d]{6,}$/i;
const VIDEO_FILE = /\.(mp4|webm|ogv|m4v)$/i;

/** "90", "90s" or "1h2m3s" -> seconds */
function toSeconds(raw: string | null): number {
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Number(raw);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(raw);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
}

/**
 * Understands a pasted video link (or a pasted <iframe> embed code):
 * YouTube (watch / youtu.be / shorts / embed / live), Vimeo, Dailymotion, Loom
 * and direct .mp4 / .webm links. Returns null when the text is not a supported video.
 */
export function parseVideoUrl(input: string): VideoSource | null {
  let value = input.trim();
  if (!value) return null;

  // an embed code was pasted: use the src of its iframe
  if (value.startsWith('<')) {
    const match = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(value);
    if (!match) return null;
    value = match[1].trim();
  }
  if (value.startsWith('//')) value = `https:${value}`;

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  const parts = url.pathname.split('/').filter(Boolean);
  const query = url.searchParams;

  // YouTube
  let youtubeId: string | null | undefined;
  if (host === 'youtu.be') youtubeId = parts[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (parts[0] === 'watch') youtubeId = query.get('v');
    else if (['embed', 'shorts', 'live', 'v'].includes(parts[0])) youtubeId = parts[1];
  }
  if (youtubeId && YOUTUBE_ID.test(youtubeId)) {
    const start = toSeconds(query.get('start') ?? query.get('t'));
    return {
      kind: 'iframe',
      provider: 'YouTube',
      src: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0${start ? `&start=${start}` : ''}`,
    };
  }

  // Vimeo: /123, /channels/x/123, /groups/x/videos/123, /video/123 (+ private-link hash)
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const at = parts.findIndex((p) => NUMERIC_ID.test(p));
    if (at >= 0) {
      const hash = parts[at + 1] ?? query.get('h');
      return {
        kind: 'iframe',
        provider: 'Vimeo',
        src: `https://player.vimeo.com/video/${parts[at]}${hash && VIMEO_HASH.test(hash) ? `?h=${hash}` : ''}`,
      };
    }
  }

  // Dailymotion
  if (host === 'dailymotion.com' || host === 'dai.ly') {
    const id = (host === 'dai.ly' ? parts[0] : parts[0] === 'video' ? parts[1] : undefined)?.split('_')[0];
    if (id && DAILYMOTION_ID.test(id)) {
      return { kind: 'iframe', provider: 'Dailymotion', src: `https://www.dailymotion.com/embed/video/${id}` };
    }
  }

  // Loom
  if (host === 'loom.com' && (parts[0] === 'share' || parts[0] === 'embed') && LOOM_ID.test(parts[1] ?? '')) {
    return { kind: 'iframe', provider: 'Loom', src: `https://www.loom.com/embed/${parts[1]}` };
  }

  // direct video file
  if (url.protocol === 'https:' && VIDEO_FILE.test(url.pathname)) {
    return { kind: 'file', provider: 'Video file', src: url.href };
  }

  return null;
}