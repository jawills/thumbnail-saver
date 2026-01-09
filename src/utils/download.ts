// Download a single thumbnail image
export async function downloadThumbnail(thumbnailUrl: string, filename: string): Promise<void> {
  try {
    const response = await fetch(thumbnailUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading thumbnail:', error);
    throw error;
  }
}

// Download multiple thumbnails with delay to avoid browser blocking
export async function downloadThumbnails(
  thumbnails: Array<{ url: string; title: string; id: string }>,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  for (let i = 0; i < thumbnails.length; i++) {
    const thumb = thumbnails[i];
    // Sanitize filename
    const sanitizedTitle = thumb.title
      .replace(/[^a-z0-9]/gi, '_')
      .substring(0, 50);
    const filename = `${sanitizedTitle}_${thumb.id}.jpg`;
    
    try {
      await downloadThumbnail(thumb.url, filename);
      if (onProgress) {
        onProgress(i + 1, thumbnails.length);
      }
      // Small delay between downloads to avoid browser blocking
      if (i < thumbnails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error(`Error downloading ${thumb.title}:`, error);
    }
  }
}
