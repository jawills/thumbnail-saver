import React from 'react';
import { ThumbnailCard } from './ThumbnailCard';
import type { SavedThumbnail, Project } from '../../types/storage';

interface ThumbnailGridProps {
  thumbnails: SavedThumbnail[];
  showTitle: boolean;
  thumbnailSize: number;
  thumbnailsPerRow: number;
  showTags: boolean;
  showProjects: boolean;
  selectedIds: Set<string>;
  onSelect: (id: string, selected: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<SavedThumbnail>) => void;
  projects: Project[];
}

export const ThumbnailGrid: React.FC<ThumbnailGridProps> = ({
  thumbnails = [],
  showTitle,
  thumbnailSize,
  thumbnailsPerRow,
  showTags,
  showProjects,
  selectedIds,
  onSelect,
  onDelete,
  onUpdate,
  projects = [],
}) => {
  if (!thumbnails || thumbnails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground text-lg mb-2">No thumbnails saved yet</p>
        <p className="text-muted-foreground text-sm">
          Right-click on a YouTube video thumbnail and select "Save Thumbnail"
        </p>
      </div>
    );
  }

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8',
  };

  // Dynamic gap based on per row - smaller gap for more items per row
  const gapClass = thumbnailsPerRow >= 6 ? 'gap-2' : thumbnailsPerRow >= 4 ? 'gap-3' : 'gap-4';
  
  return (
    <div className={`grid ${gridCols[thumbnailsPerRow as keyof typeof gridCols] || 'grid-cols-3'} ${gapClass} justify-items-center`}>
      {thumbnails.map((thumbnail) => (
        <ThumbnailCard
          key={thumbnail.id}
          thumbnail={thumbnail}
          showTitle={showTitle}
          thumbnailSize={thumbnailSize}
          thumbnailsPerRow={thumbnailsPerRow}
          isSelected={selectedIds.has(thumbnail.id)}
          showTags={showTags}
          showProjects={showProjects}
          onSelect={onSelect}
          onDelete={onDelete}
          onUpdate={onUpdate}
          projects={projects}
        />
      ))}
    </div>
  );
};
