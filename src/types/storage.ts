export interface SavedThumbnail {
  id: string;              // video ID
  title: string;
  thumbnailUrl: string;
  url: string;             // full YouTube URL
  channelName: string;     // channel name
  tags: string[];          // auto-extracted + user-defined
  projects: string[];      // project IDs this thumbnail belongs to
  savedAt: number;         // timestamp
  viewCount?: string;      // e.g. "1.2M views"
  subscriberCount?: string; // e.g. "500K subscribers"
}

export interface Project {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

export interface StorageData {
  thumbnails: SavedThumbnail[];
  projects: Project[];
  settings: {
    darkMode: boolean;
    thumbnailSize: number;  // 1-5 scale
    thumbnailsPerRow: number; // 1-6
  };
}
