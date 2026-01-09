# How to Use Thumbnail Saver

## Saving Thumbnails

You can save thumbnails in two ways:

### Method 1: Right-Click Context Menu (Recommended)
1. **Browse YouTube** (homepage, search results, playlists, etc.)
2. **Right-click on any video thumbnail** (the video image)
3. **Select "Save Thumbnail"** from the context menu
4. A notification will appear confirming the thumbnail was saved
   - Works on any YouTube page with video thumbnails
   - No need to visit the watch page!

### Method 2: Save Button on Watch Page
1. **Visit a YouTube video page** (e.g., `https://www.youtube.com/watch?v=VIDEO_ID`)
2. **Look for the red "Save Thumbnail" button** in the top-right corner of the page
   - The button appears automatically when you're on a video page
   - It's positioned near the top-right, fixed on the page
3. **Click the "Save Thumbnail" button**
   - The button will change to "Saving..." while processing
   - Once saved, it will show "✓ Saved" in green
   - The video title, thumbnail URL, and tags are automatically extracted and saved

## Viewing Saved Thumbnails

### Option 1: Full Page Viewer (Recommended)
1. **Right-click the extension icon** in your Chrome toolbar
2. **Select "Options"** (or go to `chrome://extensions/` → find the extension → click "Extension options")
3. A full-page viewer will open showing all your saved thumbnails
4. **Use the controls:**
   - **Show Title**: Toggle checkbox to show/hide video titles on thumbnails
   - **Filter by tag**: Use the dropdown to filter thumbnails by tags
   - **Click a thumbnail**: Opens the YouTube video in a new tab
   - **Delete**: Hover over a thumbnail and click the trash icon to delete it

### Option 2: Popup (Quick View)
1. **Click the extension icon** in your Chrome toolbar
2. A popup will open showing all your saved thumbnails in a compact grid view
3. Same controls as the full page viewer, but in a smaller window

## Troubleshooting

### "Save Thumbnail" button not appearing?
- Make sure you're on a YouTube video page (URL should contain `/watch?v=`)
- Refresh the page
- Check that the extension is enabled in `chrome://extensions/`

### Popup shows "file could not be accessed"?
- Make sure you've built the extension: `pnpm run build`
- Reload the extension in `chrome://extensions/` (click the reload icon)
- Check that `dist/popup.html` exists after building

### Thumbnails not saving?
- Check the browser console for errors (F12 → Console tab)
- Make sure the extension has storage permissions
- Try reloading the extension
