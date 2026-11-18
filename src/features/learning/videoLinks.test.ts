import { describe, expect, it } from 'vitest';
import { parseVideoLink } from './videoLinks';

describe('parseVideoLink', () => {
  it('parses canonical YouTube watch links into privacy-enhanced embeds', () => {
    expect(parseVideoLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      provider: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?enablejsapi=1&controls=1&rel=0',
    });
  });

  it('accepts short YouTube links and Vimeo player links', () => {
    expect(parseVideoLink('https://youtu.be/dQw4w9WgXcQ?t=20')?.provider).toBe('youtube');
    expect(parseVideoLink('https://vimeo.com/12345678')).toMatchObject({
      provider: 'vimeo',
      videoId: '12345678',
      embedUrl: 'https://player.vimeo.com/video/12345678',
    });
  });

  it.each([
    'javascript:alert(1)',
    'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
    'https://example.com/video.mp4',
    'https://user:pass@vimeo.com/12345678',
    'https://vimeo.com/123',
    'https://youtube.com/watch?v=bad',
  ])('rejects unsupported or unsafe link %s', (url) => {
    expect(parseVideoLink(url)).toBeNull();
  });
});
