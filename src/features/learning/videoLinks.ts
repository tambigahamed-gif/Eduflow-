export type VideoProvider = 'youtube' | 'vimeo';

export type ParsedVideoLink = {
  provider: VideoProvider;
  videoId: string;
  embedUrl: string;
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com']);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);

/** Parse only HTTPS YouTube/Vimeo watch URLs and construct a fixed safe embed URL. */
export function parseVideoLink(input: string): ParsedVideoLink | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.has(host)) {
    let videoId: string;
    if (host === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] ?? '';
    } else if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v') ?? '';
    } else {
      const match = url.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})\/?$/);
      videoId = match?.[1] ?? '';
    }
    if (!YOUTUBE_ID.test(videoId)) return null;
    return {
      provider: 'youtube',
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&controls=1&rel=0`,
    };
  }

  if (VIMEO_HOSTS.has(host)) {
    const match = url.pathname.match(/^\/(?:video\/)?(\d{6,12})\/?$/);
    const videoId = match?.[1] ?? '';
    if (!VIMEO_ID.test(videoId)) return null;
    return {
      provider: 'vimeo',
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
    };
  }

  return null;
}
