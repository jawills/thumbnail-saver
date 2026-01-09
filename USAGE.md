# How to Use Thumbnail Saver

## Saving Thumbnails

1. **Browse YouTube** (homepage, search results, playlists, etc.)
2. **Right-click on any video thumbnail** (the video image)
3. **Select "Save Thumbnail"** from the context menu
4. A notification will appear confirming the thumbnail was saved
   - Works on any YouTube page with video thumbnails
   - No need to visit the watch page!

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

### Popup shows "file could not be accessed"?
- Make sure you've built the extension: `pnpm run build`
- Reload the extension in `chrome://extensions/` (click the reload icon)
- Check that `dist/popup.html` exists after building

### Thumbnails not saving?
- Check the browser console for errors (F12 → Console tab)
- Make sure the extension has storage permissions
- Try reloading the extension
