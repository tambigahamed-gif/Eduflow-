import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { parseVideoLink, type ParsedVideoLink } from './videoLinks';

type YouTubePlayer = {
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  destroy(): void;
};
type YouTubeApi = {
  Player: new (element: HTMLIFrameElement, options: {
    events: {
      onReady: () => void;
      onStateChange: (event: { data: number }) => void;
    };
  }) => YouTubePlayer;
  PlayerState: { PLAYING: number; ENDED: number };
};
type VimeoTimeEvent = { seconds: number; duration: number; percent: number };
type VimeoPlayer = {
  on(event: 'timeupdate', callback: (event: VimeoTimeEvent) => void): void;
  on(event: 'ended', callback: () => void): void;
  setCurrentTime(seconds: number): Promise<number>;
  destroy(): Promise<void>;
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
    Vimeo?: { Player: new (element: HTMLIFrameElement) => VimeoPlayer };
  }
}

let youtubeLoad: Promise<void> | null = null;
let vimeoLoad: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing?.dataset['loaded'] === 'true') { resolve(); return; }
    const script = existing ?? document.createElement('script');
    const onLoad = () => { script.dataset['loaded'] = 'true'; resolve(); };
    const onError = () => reject(new Error('Le lecteur vidéo externe n’a pas pu être chargé.'));
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    if (!existing) {
      script.src = src;
      script.async = true;
      document.head.append(script);
    }
  });
}

function ensureYouTube(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (!youtubeLoad) {
    youtubeLoad = new Promise<void>((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve();
      };
      void loadScript('https://www.youtube.com/iframe_api').catch(reject);
    }).catch((error: unknown) => { youtubeLoad = null; throw error; });
  }
  return youtubeLoad;
}

function ensureVimeo(): Promise<void> {
  if (window.Vimeo?.Player) return Promise.resolve();
  if (!vimeoLoad) vimeoLoad = loadScript('https://player.vimeo.com/api/player.js').then(() => {
    if (!window.Vimeo?.Player) throw new Error('L’API du lecteur Vimeo est indisponible.');
  }).catch((error: unknown) => { vimeoLoad = null; throw error; });
  return vimeoLoad;
}

export function ExternalVideoPlayer({
  url,
  title,
  onProgress,
  onEnded,
  resumeAtSeconds = 0,
}: {
  url: string;
  title: string;
  onProgress: (seconds: number, duration?: number) => void;
  onEnded: () => void;
  resumeAtSeconds?: number;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const parsed = useMemo(() => parseVideoLink(url), [url]);
  const [loadFailure, setLoadFailure] = useState<{ url: string; message: string } | null>(null);
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  const resumeAtRef = useRef(resumeAtSeconds);
  useEffect(() => { onProgressRef.current = onProgress; onEndedRef.current = onEnded; }, [onProgress, onEnded]);
  useEffect(() => { resumeAtRef.current = resumeAtSeconds; }, [resumeAtSeconds]);

  useEffect(() => {
    const video: ParsedVideoLink | null = parsed;
    if (!video || !frame.current) return;
    let disposed = false;
    let youtubePlayer: YouTubePlayer | null = null;
    let vimeoPlayer: VimeoPlayer | null = null;
    let poller: number | undefined;
    let lastSavedAt = 0;
    const report = (seconds: number, duration?: number) => {
      const now = Date.now();
      if (now - lastSavedAt < 10000) return;
      lastSavedAt = now;
      onProgressRef.current(Math.max(0, Math.floor(seconds)), duration);
    };

    async function connect() {
      try {
        if (video?.provider === 'youtube') {
          await ensureYouTube();
          if (disposed || !frame.current || !window.YT) return;
          youtubePlayer = new window.YT.Player(frame.current, {
            events: {
              onReady: () => { if (resumeAtRef.current > 0) youtubePlayer?.seekTo(resumeAtRef.current, true); },
              onStateChange: (event) => {
                if (event.data === window.YT?.PlayerState.PLAYING) {
                  if (poller !== undefined) window.clearInterval(poller);
                  poller = window.setInterval(() => {
                    if (!disposed && youtubePlayer) report(youtubePlayer.getCurrentTime());
                  }, 5000);
                } else {
                  if (poller !== undefined) window.clearInterval(poller);
                  poller = undefined;
                  if (event.data === window.YT?.PlayerState.ENDED) onEndedRef.current();
                }
              },
            },
          });
        } else {
          await ensureVimeo();
          if (disposed || !frame.current || !window.Vimeo) return;
          vimeoPlayer = new window.Vimeo.Player(frame.current);
          if (resumeAtRef.current > 0) void vimeoPlayer.setCurrentTime(resumeAtRef.current).catch(() => undefined);
          vimeoPlayer.on('timeupdate', (event) => report(event.seconds, event.duration));
          vimeoPlayer.on('ended', () => onEndedRef.current());
        }
      } catch (cause) {
        if (!disposed) setLoadFailure({ url, message: cause instanceof Error ? cause.message : 'Lecteur externe indisponible.' });
      }
    }

    void connect();
    return () => {
      disposed = true;
      if (poller !== undefined) window.clearInterval(poller);
      youtubePlayer?.destroy();
      void vimeoPlayer?.destroy().catch(() => undefined);
    };
  }, [parsed, url]);

  if (!parsed) return <div className="learning-empty"><AlertCircle size={22} /><strong>Lien vidéo indisponible</strong><p>Utilisez une URL HTTPS YouTube ou Vimeo prise en charge.</p></div>;

  return <div>
    <div className="learning-video-frame">
      <iframe
        ref={frame}
        src={parsed.embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
    {loadFailure?.url === url && <p className="learning-inline-error" role="status"><AlertCircle size={15} /> {loadFailure.message} La progression vidéo peut ne pas être disponible.</p>}
    <p className="phase2-help">Vidéo fournie par {parsed.provider === 'youtube' ? 'YouTube' : 'Vimeo'}; elle n’est pas hébergée par EduFlow.</p>
  </div>;
}
