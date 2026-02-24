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
      if (/^[^\p{L}]*[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]+[^\p{L}]*$/u.test(word) && t.length < 20) return true;
    }
    return false;
  }
  function looksLikeRealTitle(t: string): boolean {
    if (!t || t === 'YouTube') return false;
    if (looksLikeDurationOrJunk(t)) return false;
    if (/^\d+:\d+$/.test(t)) return false;
    if (/^\d+(\.\d+)?[KMB]?\s*views?$/i.test(t)) return false;
    return true;
  }
  let title = '';
  let viewCountFromCard = '';
  let subscriberCountFromCard = '';
  const videoLinks = Array.from(document.querySelectorAll('a[href*="/watch?v="]'));
  const cardContainerSelectors = 'ytd-thumbnail, ytd-video-meta-block, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-video-renderer, ytd-playlist-video-renderer, ytd-rich-item-renderer';
  for (const link of videoLinks) {
    const href = (link as HTMLAnchorElement).href;
    if (href.includes(`v=${vidId}`)) {
      const container = link.closest(cardContainerSelectors);
      if (container) {
        if (!subscriberCountFromCard) {
          const subM = container.textContent?.match(/[\d.,]+\s*[KMB]?\s*(?:subscribers?|subs?|abonnés?|Abonnenten?|suscriptores?|inscrits?|inscritos?)/i);
          if (subM) subscriberCountFromCard = subM[0].trim();
        }
        if (!viewCountFromCard && /[\d.,]+\s*[KMB]?\s*views?/i.test(container.textContent || '')) {
          const viewM = container.textContent?.match(/[\d.,]+\s*[KMB]?\s*views?/i);
          if (viewM) viewCountFromCard = viewM[0].trim();
        }
      }
      const anchorTitle = link.getAttribute('title')?.trim();
      if (anchorTitle && anchorTitle !== 'YouTube' && looksLikeRealTitle(anchorTitle)) {
        title = anchorTitle;
        break;
      }
      if (container) {
        const titleAnchor = container.querySelector('h3 a[href*="/watch?v="]');
        const titleAnchorHref = titleAnchor?.getAttribute?.('href') ?? '';
        if (titleAnchor && titleAnchorHref.includes(`v=${vidId}`)) {
          const fromH3Title = titleAnchor.getAttribute('title')?.trim();
          if (fromH3Title && fromH3Title !== 'YouTube' && looksLikeRealTitle(fromH3Title)) {
            title = fromH3Title;
            break;
          }
          const fromH3Text = titleAnchor.textContent?.trim() || '';
          if (looksLikeRealTitle(fromH3Text)) {
            title = fromH3Text;
            break;
          }
        }
        const titleEl = container.querySelector('#video-title, a#video-title, yt-formatted-string[id="video-title"], #video-title-link, a[id*="video-title"]');
        if (titleEl) {
          const raw = titleEl.textContent?.trim() || '';
          if (looksLikeRealTitle(raw)) { title = raw; break; }
        }
      }
      const ariaLabel = link.getAttribute('aria-label');
      if (ariaLabel && ariaLabel !== 'YouTube') {
        let parsed = ariaLabel.trim()
          .replace(/\s*-\s*\d+(:\d+)*(?:\s*-\s*.*)?$/i, '')
          .replace(/\s*-\s*\d+\s*(?:seconds?|secondes?|segundos?|sekunden?|minuten?|minutos?|minuti|minute[s]?|minut[ey]?|秒|分|секунд[ы]?|Stunde[n]?|uur|ore?|hour[s]?)\s*$/gi, '')
          .trim();
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
  let subscriberCount = '';
  try {
    function parseViewCountFromText(text: string): string {
      if (!text || !/[\d.,]/.test(text)) return '';
      const t = text.replace(/\s+/g, ' ').trim();
      const shortMatch = t.match(/\d+(?:\.\d+)?\s*[KMB](?:\s*[^\d\s]{2,20})?/i);
      if (shortMatch) return shortMatch[0].trim();
      const numMatch = t.match(/[\d.,]+/);
      if (numMatch) {
        const numStr = numMatch[0].replace(/[,\s]/g, '');
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > 0) {
          if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, '') + 'B views';
          if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M views';
          if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'K views';
          return num + ' views';
        }
      }
      return '';
    }
    const viewCountCandidates: string[] = [];
    if (viewCountFromCard) viewCountCandidates.push(viewCountFromCard);
    const viewCountEl = document.querySelector('ytd-video-view-count-renderer, yt-view-count-renderer, span.view-count');
    if (viewCountEl) viewCountCandidates.push(viewCountEl.textContent?.trim() || '');
    const contentMetadata = document.querySelector('yt-content-metadata-view-model, ytd-video-primary-info-renderer, [id*="content-metadata"]');
    if (contentMetadata) {
      const text = contentMetadata.textContent?.trim() || '';
      if (text) viewCountCandidates.push(text);
      const data = (contentMetadata as unknown as { viewModel?: { viewCount?: string }; __data?: { viewCount?: string }; data?: { viewCount?: string } }).viewModel
        ?? (contentMetadata as unknown as { __data?: { viewCount?: string } }).__data
        ?? (contentMetadata as unknown as { data?: { viewCount?: string } }).data;
      if (data?.viewCount) viewCountCandidates.push(String(data.viewCount));
    }
    if (!viewCountCandidates.some(t => t && /[\d.,]+\s*[KMB]?\s*views?/i.test(t))) {
      document.querySelectorAll('ytd-video-view-count-renderer span, yt-formatted-string').forEach(span => {
        const t = span.textContent?.trim() || '';
        if (t && /[\d.,]/.test(t)) viewCountCandidates.push(t);
      });
    }
    for (const raw of viewCountCandidates) {
      viewCount = parseViewCountFromText(raw);
      if (viewCount) break;
    }
    if (viewCount && !/views?$/i.test(viewCount)) viewCount += ' views';

    const ownerArea = document.querySelector('ytd-video-owner-renderer, ytd-watch-metadata, yt-content-metadata-view-model');
    if (ownerArea) {
      const ownerText = ownerArea.textContent?.trim() || '';
      const subMatch = ownerText.match(/[\d.,]+\s*[KMB]?\s*subscribers?/i);
      if (subMatch) subscriberCount = subMatch[0].trim();
      else {
        const data = (ownerArea as unknown as { viewModel?: { subscriberCount?: string }; __data?: { subscriberCount?: string } }).viewModel
          ?? (ownerArea as unknown as { __data?: { subscriberCount?: string } }).__data;
        if (data?.subscriberCount) subscriberCount = String(data.subscriberCount);
      }
    }
    if (!subscriberCount && subscriberCountFromCard) subscriberCount = subscriberCountFromCard;
  } catch (_) {}

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
