import { saveThumbnail, getAllThumbnails } from '../utils/storage';
import type { SavedThumbnail } from '../types/storage';

interface SaveThumbnailMessage {
  type: 'SAVE_THUMBNAIL';
  data: Omit<SavedThumbnail, 'savedAt'>;
}

interface CheckSavedMessage {
  type: 'CHECK_SAVED';
  videoId: string;
}

interface OpenUrlMessage {
  type: 'OPEN_URL';
  url: string;
}

interface ContextMenuClickInfo {
  menuItemId: string;
  pageUrl?: string;
  linkUrl?: string;
  srcUrl?: string;
}

type Message = SaveThumbnailMessage | CheckSavedMessage | OpenUrlMessage;

// Injected into YouTube pages to extract video metadata. Must be self-contained (no closure refs).
function extractYouTubePageData(vidId: string): { title: string; tags: string[]; channelName: string; viewCount?: string; subscriberCount?: string } {
  function looksLikeRealTitle(t: string): boolean {
    if (!t || t === 'YouTube') return false;
    if (/^\d+\s*seconds?$/i.test(t)) return false;
    if (/^\d+:\d+$/.test(t)) return false;
    if (/^Short$/i.test(t)) return false;
    if (/^\d+(\.\d+)?[KMB]?\s*views?$/i.test(t)) return false;
    return true;
  }
  let title = '';
  const videoLinks = Array.from(document.querySelectorAll('a[href*="/watch?v="]'));
  for (const link of videoLinks) {
    const href = (link as HTMLAnchorElement).href;
    if (href.includes(`v=${vidId}`)) {
      const container = link.closest('ytd-thumbnail, ytd-video-meta-block, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-video-renderer, ytd-playlist-video-renderer');
      if (container) {
        const titleEl = container.querySelector('#video-title, a#video-title, yt-formatted-string[id="video-title"], #video-title-link, a[id*="video-title"]');
        if (titleEl) {
          const raw = titleEl.textContent?.trim() || '';
          if (looksLikeRealTitle(raw)) { title = raw; break; }
        }
      }
      const ariaLabel = link.getAttribute('aria-label');
      if (ariaLabel && ariaLabel !== 'YouTube') {
        const parsed = ariaLabel.trim().replace(/\s*-\s*\d+(:\d+)*(\s*seconds?)?(\s*-\s*.*)?$/i, '').trim();
        if (looksLikeRealTitle(parsed)) { title = parsed; break; }
        if (looksLikeRealTitle(ariaLabel.trim())) title = ariaLabel.trim();
        break;
      }
    }
  }
  if (!title || !looksLikeRealTitle(title)) {
    const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.ytd-video-primary-info-renderer yt-formatted-string, h1.title yt-formatted-string');
    const raw = titleElement?.textContent?.trim() || '';
    if (looksLikeRealTitle(raw)) title = raw;
  }
  if (!title || !looksLikeRealTitle(title)) {
    const docTitle = document.title.replace(/\s*-\s*YouTube\s*$/i, '').trim();
    if (looksLikeRealTitle(docTitle)) title = docTitle;
  }
  if (!title || !looksLikeRealTitle(title)) title = 'Untitled Video';

  const tags: string[] = [];
  document.querySelectorAll('a.ytd-metadata-row-renderer[href*="/hashtag/"]').forEach(link => {
    const text = link.textContent?.trim();
    if (text) tags.push(text);
  });

  let channelName = '';
  function cleanChannelName(s: string): string {
    if (!s) return '';
    s = s.trim();
    s = s.replace(/\s*Subscribe.*$/i, '').trim();
    s = s.replace(/\s*Subscribed.*$/i, '').trim();
    s = s.replace(/\s*•\s*[\d.,]+[KMB]?\s*$/i, '').trim();
    s = s.replace(/\s*[\d.,]+[KMB]?\s*subscribers?\s*$/i, '').trim();
    return s;
  }
  function looksLikeChannelName(text: string): boolean {
    if (!text || text === 'YouTube') return false;
    if (/^Subscribe(d)?$/i.test(text)) return false;
    if (/^[\d.,]+\s*[KMB]?\s*(subscribers?|sub)?$/i.test(text)) return false;
    return true;
  }

  // When we're on a channel page (e.g. /@handle, /channel/UC..., /c/...), the current tab is the channel
  // page — watch-page selectors don't exist. Extract channel name from the channel page itself.
  const pathname = window.location.pathname || '';
  const isChannelPage = /^\/@[^/]+/.test(pathname) || /^\/channel\/[^/]+/.test(pathname) || /^\/c\/[^/]+/.test(pathname);
  if (isChannelPage) {
    const channelPageSelectors = [
      'ytd-channel-name yt-formatted-string',
      'ytd-channel-name a',
      '#channel-name yt-formatted-string',
      '#channel-name a',
      'ytd-channel-info yt-formatted-string',
      '#channel-handle',
      'ytd-c4-header yt-formatted-string',
    ];
    for (const sel of channelPageSelectors) {
      const el = document.querySelector(sel);
      const text = el?.textContent?.trim() || '';
      if (looksLikeChannelName(text)) {
        channelName = text;
        break;
      }
    }
    if (!channelName || channelName === 'YouTube') {
      const docTitle = document.title.replace(/\s*-\s*YouTube\s*$/i, '').trim();
      if (looksLikeChannelName(docTitle)) channelName = docTitle;
    }
    if (!channelName || channelName === 'YouTube') {
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.replace(/\s*-\s*YouTube\s*$/i, '').trim();
      if (looksLikeChannelName(ogTitle || '')) channelName = ogTitle || '';
    }
  }

  const ownerRenderer = document.querySelector('ytd-watch-metadata ytd-video-owner-renderer, ytd-video-owner-renderer');
  if (ownerRenderer) {
    const channelLink = ownerRenderer.querySelector('a[href*="/channel/"], a[href*="/@"], #channel-name a, ytd-channel-name a');
    if (channelLink) channelName = channelLink.textContent?.trim() || '';
    if (!channelName) {
      const channelText = ownerRenderer.querySelector('yt-formatted-string[id="channel-name"], #channel-name yt-formatted-string');
      if (channelText) channelName = channelText.textContent?.trim() || '';
    }
  }
  if (!channelName || channelName === 'YouTube') {
    try {
      document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
        try {
          const data = JSON.parse(script.textContent || '');
          if (data['@type'] === 'VideoObject' && data.uploadDate) {
            if (data.author && typeof data.author === 'object' && data.author.name) { channelName = data.author.name; return; }
            if (data.publisher && typeof data.publisher === 'object' && data.publisher.name) { channelName = data.publisher.name; return; }
          }
        } catch (_) {}
      });
    } catch (_) {}
  }
  if (!channelName || channelName === 'YouTube') {
    const metaChannel = document.querySelector('meta[property="og:video:channel_name"], meta[name="channel"]');
    if (metaChannel) channelName = metaChannel.getAttribute('content') || '';
  }
  if (!channelName || channelName === 'YouTube') {
    const watchMetadata = document.querySelector('ytd-watch-metadata');
    if (watchMetadata) {
      watchMetadata.querySelectorAll('a[href*="/channel/"], a[href*="/@"]').forEach(link => {
        const text = link.textContent?.trim();
        if (looksLikeChannelName(text)) { channelName = text; return; }
      });
    }
  }
  if (!channelName || channelName === 'YouTube') {
    for (const link of videoLinks) {
      const href = (link as HTMLAnchorElement).href;
      if (href.includes(`v=${vidId}`)) {
        const container = link.closest('ytd-thumbnail, ytd-video-meta-block, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-video-renderer, ytd-rich-item-renderer');
        if (container) {
          const channelSelectors = ['a[href*="/channel/"]', 'a[href*="/@"]', 'ytd-channel-name a', '#channel-name a', 'ytd-channel-name yt-formatted-string', '#channel-name yt-formatted-string', 'ytd-channel-name', '#channel-name'];
          for (const selector of channelSelectors) {
            const channelEl = container.querySelector(selector);
            if (channelEl) {
              channelName = channelEl.textContent?.trim() || '';
              if (channelName && channelName !== 'YouTube') break;
            }
          }
          if (channelName && channelName !== 'YouTube') break;
        }
      }
    }
  }
  channelName = cleanChannelName(channelName || '');
  if (!channelName || channelName === 'YouTube') channelName = 'Unknown Channel';

  let viewCount = '';
  const viewCountEl = document.querySelector('ytd-video-view-count-renderer, yt-view-count-renderer, span.view-count');
  if (viewCountEl) viewCount = viewCountEl.textContent?.trim() || '';
  if (!viewCount) {
    const spans = document.querySelectorAll('ytd-video-view-count-renderer span, yt-formatted-string');
    for (const span of Array.from(spans)) {
      const t = span.textContent?.trim() || '';
      if (t && /[\d.,]+\s*[KMB]?\s*views?/i.test(t)) { viewCount = t; break; }
    }
  }
  viewCount = viewCount.replace(/\s+/g, ' ').trim();
  // Prefer short form only (e.g. "789K views" or "789K") to avoid duplicate long + short
  const shortMatch = viewCount.match(/\d+(?:\.\d+)?\s*[KMB](?:\s*views?)?/i);
  if (shortMatch) {
    viewCount = shortMatch[0].trim();
    if (!/views?$/i.test(viewCount)) viewCount += ' views';
  } else if (viewCount && /[\d,]+/.test(viewCount)) {
    const numStr = viewCount.replace(/[,\s]/g, '').replace(/views?/gi, '').trim();
    const num = parseInt(numStr, 10);
    if (!isNaN(num) && num > 0) {
      if (num >= 1e9) viewCount = (num / 1e9).toFixed(1).replace(/\.0$/, '') + 'B views';
      else if (num >= 1e6) viewCount = (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M views';
      else if (num >= 1e3) viewCount = (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'K views';
      else viewCount = num + ' views';
    }
  }

  let subscriberCount = '';
  const ownerArea = document.querySelector('ytd-video-owner-renderer, ytd-watch-metadata');
  if (ownerArea) {
    const subMatch = ownerArea.textContent?.match(/[\d.,]+\s*[KMB]?\s*subscribers?/i);
    if (subMatch) subscriberCount = subMatch[0].trim();
  }

  return { title, tags, channelName, viewCount: viewCount || undefined, subscriberCount: subscriberCount || undefined };
}

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-youtube-thumbnail',
    title: 'Save Thumbnail',
    contexts: ['image', 'link', 'video'],
    documentUrlPatterns: ['*://*.youtube.com/*'],
  });
  chrome.contextMenus.create({
    id: 'save-current-video-thumbnail',
    title: "Save this video's thumbnail",
    contexts: ['page'],
    documentUrlPatterns: ['*://*.youtube.com/*'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info: ContextMenuClickInfo, tab) => {
  const isSaveCurrent = info.menuItemId === 'save-current-video-thumbnail';
  const isSaveThumbnail = info.menuItemId === 'save-youtube-thumbnail';
  if (!tab?.id || (!isSaveCurrent && !isSaveThumbnail)) return;

  let videoId: string | null = null;

  if (isSaveCurrent && tab.url) {
    try {
      videoId = new URL(tab.url).searchParams.get('v');
    } catch (_) {}
  } else if (isSaveThumbnail) {
    try {
      const url = info.linkUrl || info.pageUrl || tab.url || '';
      const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
      videoId = videoIdMatch ? videoIdMatch[1] : null;
      if (!videoId && tab.url) {
        try {
          videoId = new URL(tab.url).searchParams.get('v');
        } catch (_) {}
      }
      if (!videoId) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const urlParams = new URLSearchParams(window.location.search);
              const vParam = urlParams.get('v');
              if (vParam) return vParam;
              const links = document.querySelectorAll('a[href*="/watch?v="]');
              if (links.length > 0) {
                const match = (links[0] as HTMLAnchorElement).href.match(/[?&]v=([^&]+)/);
                if (match) return match[1];
              }
              return null;
            },
          });
          if (results?.[0]?.result) videoId = results[0].result;
        } catch (e) {
          console.error('Error extracting video ID:', e);
        }
      }
    } catch (_) {}
  }

  if (videoId) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractYouTubePageData,
        args: [videoId],
      });

      const pageData = results?.[0]?.result || { title: 'Untitled Video', tags: [], channelName: 'Unknown Channel' };
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      const fullUrl = `https://www.youtube.com/watch?v=${videoId}`;

      await saveThumbnail({
        id: videoId,
        title: pageData.title,
        thumbnailUrl,
        url: fullUrl,
        channelName: pageData.channelName,
        tags: pageData.tags,
        projects: [],
        viewCount: pageData.viewCount,
        subscriberCount: pageData.subscriberCount,
      });

      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_NOTIFICATION',
        message: 'Thumbnail saved successfully!',
      });
    } catch (e) {
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      const fullUrl = `https://www.youtube.com/watch?v=${videoId}`;
      await saveThumbnail({
        id: videoId,
        title: 'Untitled Video',
        thumbnailUrl,
        url: fullUrl,
        channelName: 'Unknown Channel',
        tags: [],
        projects: [],
        viewCount: undefined,
        subscriberCount: undefined,
      });
      try {
        chrome.tabs.sendMessage(tab.id, { type: 'SHOW_NOTIFICATION', message: 'Thumbnail saved successfully!' });
      } catch (_) {}
    }
  } else if (isSaveCurrent) {
    try {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_NOTIFICATION',
        message: "Open a video to save its thumbnail.",
      });
    } catch (_) {}
  }
});

chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse) => {
    if (message.type === 'SAVE_THUMBNAIL') {
      saveThumbnail(message.data)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('Error saving thumbnail:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep the message channel open for async response
    }
    
    if (message.type === 'CHECK_SAVED') {
      getAllThumbnails()
        .then(thumbnails => {
          const saved = thumbnails.some(t => t.id === message.videoId);
          sendResponse({ saved });
        })
        .catch((error) => {
          console.error('Error checking saved status:', error);
          sendResponse({ saved: false });
        });
      return true;
    }

    if (message.type === 'OPEN_URL' && message.url) {
      chrome.tabs.create({ url: message.url }).then(() => sendResponse({ success: true })).catch((err) => {
        console.error('Open URL error:', err);
        sendResponse({ success: false });
      });
      return true;
    }
  }
);
