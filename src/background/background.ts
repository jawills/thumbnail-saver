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

interface ContextMenuClickInfo {
  menuItemId: string;
  pageUrl?: string;
  linkUrl?: string;
  srcUrl?: string;
}

type Message = SaveThumbnailMessage | CheckSavedMessage;

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-youtube-thumbnail',
    title: 'Save Thumbnail',
    contexts: ['image', 'link', 'video'],
    documentUrlPatterns: ['*://*.youtube.com/*'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info: ContextMenuClickInfo, tab) => {
  if (info.menuItemId === 'save-youtube-thumbnail' && tab?.id) {
    try {
      // Extract video ID from URL
      const url = info.linkUrl || info.pageUrl || tab.url || '';
      const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
      let videoId = videoIdMatch ? videoIdMatch[1] : null;
      
      // If no video ID from URL, try to extract from page
      if (!videoId && tab.url) {
        const urlParams = new URL(tab.url).searchParams;
        videoId = urlParams.get('v');
      }
      
      if (!videoId) {
        // Try to extract from clicked element via content script
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              // Try to find video ID from current page or clicked element
              const urlParams = new URLSearchParams(window.location.search);
              const vParam = urlParams.get('v');
              if (vParam) return vParam;
              
              // Try to find video link near the clicked area
              const links = document.querySelectorAll('a[href*="/watch?v="]');
              if (links.length > 0) {
                const match = (links[0] as HTMLAnchorElement).href.match(/[?&]v=([^&]+)/);
                if (match) return match[1];
              }
              return null;
            },
          });
          
          if (results && results[0]?.result) {
            videoId = results[0].result;
          }
        } catch (e) {
          console.error('Error extracting video ID:', e);
        }
      }
      
      if (videoId) {
        // Get video data from page - try to find title from video cards first
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (vidId: string) => {
              // First, try to find title from video cards/thumbnails on the page
              let title = '';
              
              // Look for video links with this video ID
              const videoLinks = Array.from(document.querySelectorAll('a[href*="/watch?v="]'));
              for (const link of videoLinks) {
                const href = (link as HTMLAnchorElement).href;
                if (href.includes(`v=${vidId}`)) {
                  // Find title element near this link
                  const container = link.closest('ytd-thumbnail, ytd-video-meta-block, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-video-renderer, ytd-playlist-video-renderer');
                  if (container) {
                    const titleEl = container.querySelector('#video-title, a#video-title, yt-formatted-string[id="video-title"], #video-title-link, a[id*="video-title"]');
                    if (titleEl) {
                      title = titleEl.textContent?.trim() || '';
                      if (title && title !== 'YouTube') break;
                    }
                  }
                  
                  // Also try aria-label on the link
                  const ariaLabel = link.getAttribute('aria-label');
                  if (ariaLabel && ariaLabel !== 'YouTube') {
                    title = ariaLabel.trim();
                    break;
                  }
                }
              }
              
              // If still no title, try watch page title
              if (!title || title === 'YouTube') {
                const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.ytd-video-primary-info-renderer yt-formatted-string, h1.title yt-formatted-string');
                title = titleElement?.textContent?.trim() || '';
              }
              
              // Fallback to document title (but clean it)
              if (!title || title === 'YouTube' || title.includes('YouTube')) {
                const docTitle = document.title.replace(' - YouTube', '').trim();
                if (docTitle && docTitle !== 'YouTube') {
                  title = docTitle;
                }
              }
              
              // Final fallback
              if (!title || title === 'YouTube') {
                title = 'Untitled Video';
              }
              
              const tags: string[] = [];
              const tagLinks = document.querySelectorAll('a.ytd-metadata-row-renderer[href*="/hashtag/"]');
              tagLinks.forEach(link => {
                const text = link.textContent?.trim();
                if (text) tags.push(text);
              });
              
              // Extract channel name - try multiple methods
              let channelName = '';
              
              // Method 1: Try watch page owner/channel name
              const ownerRenderer = document.querySelector('ytd-watch-metadata ytd-video-owner-renderer, ytd-video-owner-renderer');
              if (ownerRenderer) {
                const channelLink = ownerRenderer.querySelector('a[href*="/channel/"], a[href*="/@"], #channel-name a, ytd-channel-name a');
                if (channelLink) {
                  channelName = channelLink.textContent?.trim() || '';
                }
                // Also try yt-formatted-string inside channel name
                if (!channelName) {
                  const channelText = ownerRenderer.querySelector('yt-formatted-string[id="channel-name"], #channel-name yt-formatted-string');
                  if (channelText) {
                    channelName = channelText.textContent?.trim() || '';
                  }
                }
              }
              
              // Method 2: Try from video cards/thumbnails on the page
              if (!channelName) {
                const videoLinks = Array.from(document.querySelectorAll('a[href*="/watch?v="]'));
                for (const link of videoLinks) {
                  const href = (link as HTMLAnchorElement).href;
                  if (href.includes(`v=${vidId}`)) {
                    const container = link.closest('ytd-thumbnail, ytd-video-meta-block, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-video-renderer, ytd-rich-item-renderer');
                    if (container) {
                      // Try various channel name selectors
                      const channelSelectors = [
                        'a[href*="/channel/"]',
                        'a[href*="/@"]',
                        'ytd-channel-name a',
                        '#channel-name a',
                        'ytd-channel-name yt-formatted-string',
                        '#channel-name yt-formatted-string',
                        'ytd-channel-name',
                        '#channel-name'
                      ];
                      
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
              
              // Method 3: Try structured data (JSON-LD)
              if (!channelName || channelName === 'YouTube') {
                try {
                  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                  for (const script of scripts) {
                    try {
                      const data = JSON.parse(script.textContent || '');
                      if (data['@type'] === 'VideoObject' && data.uploadDate) {
                        // Try to find channel in author or publisher
                        if (data.author && typeof data.author === 'object' && data.author.name) {
                          channelName = data.author.name;
                          break;
                        }
                        if (data.publisher && typeof data.publisher === 'object' && data.publisher.name) {
                          channelName = data.publisher.name;
                          break;
                        }
                      }
                    } catch (e) {
                      // Ignore parse errors
                    }
                  }
                } catch (e) {
                  // Ignore errors
                }
              }
              
              // Method 4: Try meta tags
              if (!channelName || channelName === 'YouTube') {
                const metaChannel = document.querySelector('meta[property="og:video:channel_name"], meta[name="channel"]');
                if (metaChannel) {
                  channelName = metaChannel.getAttribute('content') || '';
                }
              }
              
              // Method 5: Try from watch metadata directly
              if (!channelName || channelName === 'YouTube') {
                const watchMetadata = document.querySelector('ytd-watch-metadata');
                if (watchMetadata) {
                  const allLinks = watchMetadata.querySelectorAll('a[href*="/channel/"], a[href*="/@"]');
                  for (const link of allLinks) {
                    const text = link.textContent?.trim();
                    if (text && text !== 'YouTube' && !text.includes('Subscribe')) {
                      channelName = text;
                      break;
                    }
                  }
                }
              }
              
              // Clean up channel name
              if (channelName) {
                channelName = channelName.trim();
                // Remove common suffixes
                channelName = channelName.replace(/\s*Subscribe.*$/i, '').trim();
              }
              
              // Final fallback
              if (!channelName || channelName === 'YouTube' || channelName === '') {
                channelName = 'Unknown Channel';
              }
              
              return { title, tags, channelName };
            },
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
          });
          
          // Show notification
          chrome.tabs.sendMessage(tab.id, {
            type: 'SHOW_NOTIFICATION',
            message: 'Thumbnail saved successfully!',
          });
        } catch (e) {
          // Fallback: save with minimal data
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
          });
          
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'SHOW_NOTIFICATION',
              message: 'Thumbnail saved successfully!',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error saving thumbnail from context menu:', error);
    }
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
      return true; // Keep the message channel open for async response
    }
  }
);
