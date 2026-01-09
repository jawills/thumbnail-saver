import React, { useState } from 'react';
import { Card } from '../../lib/components/ui/card';
import { Button } from '../../lib/components/ui/button';
import { Checkbox } from '../../lib/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../lib/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../lib/components/ui/popover';
import { Input } from '../../lib/components/ui/input';
import { Label } from '../../lib/components/ui/label';
import { Trash2, ExternalLink, Tag, FolderPlus, X } from 'lucide-react';
import type { SavedThumbnail, Project } from '../../types/storage';
import { deleteThumbnail, updateThumbnail, getAllProjects } from '../../utils/storage';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../../lib/components/ui/context-menu';

interface ThumbnailCardProps {
  thumbnail: SavedThumbnail;
  showTitle: boolean;
  thumbnailSize: number;
  thumbnailsPerRow: number;
  isSelected: boolean;
  showTags?: boolean;
  showProjects?: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<SavedThumbnail>) => void;
  projects: Project[];
}

export const ThumbnailCard: React.FC<ThumbnailCardProps> = ({
  thumbnail,
  showTitle,
  thumbnailSize,
  thumbnailsPerRow,
  isSelected,
  showTags,
  showProjects,
  onSelect,
  onDelete,
  onUpdate,
  projects,
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);
  const [newTag, setNewTag] = useState('');

  // Use existing Popover dialogs for tag/project management
  const handleTagMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTagPopoverOpen(true);
  };

  const handleProjectMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectPopoverOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteThumbnail(thumbnail.id).then(() => {
      onDelete(thumbnail.id);
      setDeleteDialogOpen(false);
    });
  };

  const handleClick = (e: React.MouseEvent) => {
    // Don't open if clicking checkbox or buttons
    if ((e.target as HTMLElement).closest('button, input[type="checkbox"]')) {
      return;
    }
    chrome.tabs.create({ url: thumbnail.url });
  };

  const handleTagAdd = () => {
    if (newTag.trim() && !thumbnail.tags.includes(newTag.trim())) {
      const updatedTags = [...thumbnail.tags, newTag.trim()];
      updateThumbnail(thumbnail.id, { tags: updatedTags }).then(() => {
        onUpdate(thumbnail.id, { tags: updatedTags });
        setNewTag('');
      });
    }
  };

  const handleTagRemove = (tag: string) => {
    const updatedTags = thumbnail.tags.filter(t => t !== tag);
    updateThumbnail(thumbnail.id, { tags: updatedTags }).then(() => {
      onUpdate(thumbnail.id, { tags: updatedTags });
    });
  };

  const handleProjectToggle = (projectId: string) => {
    const isInProject = thumbnail.projects.includes(projectId);
    const updatedProjects = isInProject
      ? thumbnail.projects.filter(p => p !== projectId)
      : [...thumbnail.projects, projectId];
    updateThumbnail(thumbnail.id, { projects: updatedProjects }).then(() => {
      onUpdate(thumbnail.id, { projects: updatedProjects });
    });
  };

  // Use percentage-based sizing to avoid clipping with grid
  const sizeMultipliers = {
    1: 0.5,   // 50%
    2: 0.65,  // 65%
    3: 0.8,   // 80%
    4: 0.9,   // 90%
    5: 1.0,   // 100%
  };

  const sizeMultiplier = sizeMultipliers[thumbnailSize as keyof typeof sizeMultipliers] || 1.0;

  const showContextMenu = thumbnailsPerRow >= 4;
  
  const cardContent = (
    <Card 
      className={`group relative overflow-hidden hover:shadow-lg transition-all flex flex-col ${isSelected ? 'ring-2 ring-primary' : ''}`}
      style={{ width: `${sizeMultiplier * 100}%` }}
      onClick={showContextMenu ? undefined : handleClick}
    >
        <div className="relative aspect-video bg-muted">
          <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-background/90 backdrop-blur-sm border border-border rounded-sm shadow-lg p-0.5 flex items-center justify-center">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelect(thumbnail.id, checked === true)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <img
            src={thumbnail.thumbnailUrl}
            alt={thumbnail.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/640x360?text=Thumbnail+Not+Available';
            }}
          />
          {!showContextMenu && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                  title="Tag"
                >
                  <Tag className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent onClick={(e) => e.stopPropagation()} className="w-80">
                <div className="space-y-4">
                  <div>
                    <Label>Add Tag</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleTagAdd()}
                        placeholder="Enter tag name"
                      />
                      <Button onClick={handleTagAdd}>Add</Button>
                    </div>
                  </div>
                  {thumbnail.tags.length > 0 && (
                    <div>
                      <Label>Tags</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {thumbnail.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-xs"
                          >
                            {tag}
                            <button
                              onClick={() => handleTagRemove(tag)}
                              className="hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Popover open={projectPopoverOpen} onOpenChange={setProjectPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                  title="Add to Project"
                >
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent onClick={(e) => e.stopPropagation()} className="w-80">
                <div className="space-y-2">
                  <Label>Projects</Label>
                  {projects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No projects yet</p>
                  ) : (
                    <div className="space-y-2">
                      {projects.map((project) => (
                        <div key={project.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={thumbnail.projects.includes(project.id)}
                            onCheckedChange={() => handleProjectToggle(project.id)}
                          />
                          <Label className="flex-1">{project.name}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Button
              size="icon"
              variant="destructive"
              className="h-8 w-8"
              onClick={handleDeleteClick}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                handleClick(e);
              }}
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            </div>
          )}
        </div>
        {showTitle && thumbnailsPerRow < 6 && (
          <div className="p-3 space-y-1">
            <p className="text-sm font-medium line-clamp-2 text-foreground">
              {thumbnail.title}
            </p>
            {thumbnail.channelName && (
              <p className="text-xs text-muted-foreground">
                {thumbnail.channelName}
              </p>
            )}
          </div>
        )}
        {thumbnailsPerRow < 6 && ((showTags && thumbnail.tags.length > 0) || (showProjects && thumbnail.projects.length > 0)) && (
          <div className="px-3 pb-3 space-y-2">
            {showTags && thumbnail.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {thumbnail.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                  >
                    {tag}
                  </span>
                ))}
                {thumbnail.tags.length > 3 && (
                  <span className="text-xs px-2 py-0.5 text-muted-foreground">
                    +{thumbnail.tags.length - 3}
                  </span>
                )}
              </div>
            )}
            {showProjects && thumbnail.projects.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {thumbnail.projects.map((projectId) => {
                  const project = projects.find(p => p.id === projectId);
                  return project ? (
                    <span
                      key={projectId}
                      className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary"
                    >
                      {project.name}
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>
        )}
      </Card>
  );

  return (
    <>
      {showContextMenu ? (
        <ContextMenu>
          <ContextMenuTrigger asChild className="cursor-context-menu">
            {cardContent}
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={(e) => {
              e.stopPropagation();
              handleClick(e);
            }}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Video
            </ContextMenuItem>
            <ContextMenuItem onClick={(e) => {
              e.stopPropagation();
              onSelect(thumbnail.id, !isSelected);
            }}>
              {isSelected ? 'Deselect' : 'Select'}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={(e) => {
              e.stopPropagation();
              handleTagMenuClick(e);
            }}>
              <Tag className="mr-2 h-4 w-4" />
              Manage Tags
            </ContextMenuItem>
            <ContextMenuItem onClick={(e) => {
              e.stopPropagation();
              handleProjectMenuClick(e);
            }}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Manage Projects
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                setDeleteDialogOpen(true);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ) : (
        cardContent
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete Thumbnail</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this thumbnail? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
