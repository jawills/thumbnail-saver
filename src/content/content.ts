// Extract video ID from YouTube URL
function getVideoId(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// Extract video ID from a link or thumbnail element
function extractVideoIdFromElement(element: HTMLElement | null): string | null {
  if (!element) return null;
  
  // Check if element is a link
  const link = element.closest('a[href*="/watch?v="]') as HTMLAnchorElement;
  if (link) {
    const match = link.href.match(/[?&]v=([^&]+)/);
    if (match) return match[1];
  }
  
  // Check parent elements for links
  let parent = element.parentElement;
  for (let i = 0; i < 5 && parent; i++) {
    if (parent.tagName === 'A') {
      const match = (parent as HTMLAnchorElement).href.match(/[?&]v=([^&]+)/);
      if (match) return match[1];
    }
    parent = parent.parentElement;
  }
  
  return null;
}

// Extract video title
function getVideoTitle(): string {
  const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.ytd-video-primary-info-renderer yt-formatted-string, h1.title yt-formatted-string');
  let title = titleElement?.textContent?.trim() || '';
  
  // If title is empty or just "YouTube", try document title
  if (!title || title === 'YouTube') {
    title = document.title.replace(' - YouTube', '').trim();
  }
  
  // Final fallback
  if (!title || title === 'YouTube') {
    title = 'Untitled Video';
  }
  
  return title;
}

function looksLikeDurationOrJunk(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (/^\d+:\d+(:\d+)?$/.test(t)) return true;
  if (/^Short$/i.test(t)) return true;
  const durationWord = /^\d+\s+(.+)$/.exec(t);
  if (durationWord) {
    const word = durationWord[1].trim().toLowerCase();
    const durationWords = ['second', 'seconds', 'secondes', 'segundo', 'segundos', 'sekunde', 'sekunden', 'секунд', 'секунды', 'secunda', 'secondi', 'minute', 'minutes', 'minuten', 'minut', 'minuty', 'minutos', 'minuti', 'uur', 'ore', 'hour', 'hours', 'stunde', 'stunden'];
    if (durationWords.some(w => word === w || word.startsWith(w) || w.startsWith(word))) return true;
  }
  return false;
}

function looksLikeRealTitle(s: string): boolean {
  if (!s || s === 'YouTube') return false;
  if (looksLikeDurationOrJunk(s)) return false;
  if (/^\d+:\d+$/.test(s)) return false;
  if (/^\d+(\.\d+)?[KMB]?\s*views?$/i.test(s)) return false;
  return true;
}

// Extract video title from thumbnail element
function extractVideoTitleFromThumbnail(element: HTMLElement | null): string {
  if (!element) return 'Untitled Video';

  const container = element.closest('ytd-thumbnail, ytd-video-meta-block, ytd-compact-video-renderer, ytd-grid-video-renderer');
  if (!container) return 'Untitled Video';

  const watchLink = container.querySelector('a[href*="/watch?v="]') as HTMLAnchorElement | null;
  if (watchLink) {
    const anchorTitle = watchLink.getAttribute('title')?.trim();
    if (anchorTitle && anchorTitle !== 'YouTube' && looksLikeRealTitle(anchorTitle)) return anchorTitle;
    const titleAnchor = container.querySelector('h3 a[href*="/watch?v="]') as HTMLAnchorElement | null;
    if (titleAnchor) {
      const fromH3Title = titleAnchor.getAttribute('title')?.trim();
      if (fromH3Title && fromH3Title !== 'YouTube' && looksLikeRealTitle(fromH3Title)) return fromH3Title;
      const fromH3Text = titleAnchor.textContent?.trim() || '';
      if (looksLikeRealTitle(fromH3Text)) return fromH3Text;
    }
  }

  const titleElement = container.querySelector('#video-title, a#video-title, yt-formatted-string[id="video-title"]');
  if (titleElement) {
    const raw = titleElement.textContent?.trim() || '';
    if (looksLikeRealTitle(raw)) return raw;
  }

  return 'Untitled Video';
}

// Extract thumbnail URL
function getThumbnailUrl(videoId: string): string {
  // Try to get the highest quality thumbnail
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// Extract tags from YouTube page
function extractTags(): string[] {
  const tags: string[] = [];
  
  // Try to find tags in meta tags
  const metaTags = document.querySelectorAll('meta[property="og:video:tag"]');
  metaTags.forEach(tag => {
    const content = tag.getAttribute('content');
    if (content) tags.push(content);
  });
  
  // Try to find tags in structured data
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent || '');
        if (data['@type'] === 'VideoObject' && Array.isArray(data.keywords)) {
          tags.push(...data.keywords);
        }
      } catch (e) {
        // Ignore parse errors
      }
    });
  } catch (e) {
    // Ignore errors
  }
  
  // Try to find tags in the page content (YouTube sometimes shows them)
  const tagLinks = document.querySelectorAll('a.ytd-metadata-row-renderer[href*="/hashtag/"]');
  tagLinks.forEach(link => {
    const text = link.textContent?.trim();
    if (text) tags.push(text);
  });
  
  return [...new Set(tags)]; // Remove duplicates
}

// Check if thumbnail is already saved
async function isThumbnailSaved(videoId: string): Promise<boolean> {
  const response = await chrome.runtime.sendMessage({ type: 'CHECK_SAVED', videoId });
  return response?.saved || false;
}

// Show notification
function showNotification(message: string) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4caf50;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10001;
    font-family: 'YouTube Noto', Roboto, Arial, sans-serif;
    font-size: 14px;
    font-weight: 500;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SHOW_NOTIFICATION') {
    showNotification(message.message || 'Thumbnail saved!');
  }
});

// Main content script logic - button functionality removed, using context menu only
// No initialization needed
