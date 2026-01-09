import { useState, useEffect } from 'react';
import { ThumbnailGrid } from './components/ThumbnailGrid';
import { FilterBar } from './components/FilterBar';
import { ProjectFilterBar } from './components/ProjectFilterBar';
import { ChannelFilterBar } from './components/ChannelFilterBar';
import { Checkbox } from '../lib/components/ui/checkbox';
import { Switch } from '../lib/components/ui/switch';
import { Label } from '../lib/components/ui/label';
import { Slider } from '../lib/components/ui/slider';
import { Button } from '../lib/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../lib/components/ui/select';
import { 
  getAllThumbnails, 
  deleteThumbnails,
  getAllProjects,
  deleteProject,
  deleteTag,
  getSettings,
  updateSettings,
  updateThumbnail,
} from '../utils/storage';
import type { SavedThumbnail, Project } from '../types/storage';
import { Moon, Sun, Trash2 } from 'lucide-react';
import { Toaster } from '../lib/components/ui/toaster';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../lib/components/ui/dialog';

function App() {
  const [thumbnails, setThumbnails] = useState<SavedThumbnail[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showTitle, setShowTitle] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'channel' | 'title'>('date');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [darkMode, setDarkMode] = useState(false);
  const [deleteTagDialogOpen, setDeleteTagDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [deleteProjectDialogOpen, setDeleteProjectDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [thumbnailSize, setThumbnailSize] = useState(5);
  const [thumbnailsPerRow, setThumbnailsPerRow] = useState(3);
  const [combinedSize, setCombinedSize] = useState(4); // Default middle value
  const [showTags, setShowTags] = useState(true);
  const [showProjects, setShowProjects] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    
    const handleStorageChange = () => {
      loadData();
    };
    
    chrome.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  useEffect(() => {
    // Apply dark mode
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [allThumbnails, allProjects, settings] = await Promise.all([
        getAllThumbnails(),
        getAllProjects(),
        getSettings(),
      ]);
      setThumbnails(allThumbnails || []);
      setProjects(allProjects || []);
      setDarkMode(settings?.darkMode || false);
      const size = settings?.thumbnailSize || 5;
      const perRow = settings?.thumbnailsPerRow || 3;
      setThumbnailSize(size);
      setThumbnailsPerRow(perRow);
      
      // Calculate combined size from current settings
      let combined = 3; // default (3 per row, 80%)
      for (let i = 1; i <= 5; i++) {
        const { perRow: p, size: s } = getSizeFromCombined(i);
        if (p === perRow && s === size) {
          combined = i;
          break;
        }
      }
      setCombinedSize(combined);
      setShowTags(settings?.showTags !== false);
      setShowProjects(settings?.showProjects !== false);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setThumbnails(prev => prev.filter(t => t.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const filtered = filteredThumbnails || [];
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(t => t?.id).filter(Boolean)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Delete ${selectedIds.size} thumbnail(s)?`)) {
      await deleteThumbnails(Array.from(selectedIds));
      setThumbnails(prev => prev.filter(t => !selectedIds.has(t.id)));
      setSelectedIds(new Set());
    }
  };

  const handleUpdate = async (id: string, updates: Partial<SavedThumbnail>) => {
    await updateThumbnail(id, updates);
    setThumbnails(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleDarkModeToggle = async (checked: boolean) => {
    setDarkMode(checked);
    await updateSettings({ darkMode: checked });
  };

  // Combined size mapping: value 1-6 maps to (perRow, size) - 6 per row minimum, removed duplicate 1 per row
  const getSizeFromCombined = (value: number): { perRow: number; size: number } => {
    const mapping: Record<number, { perRow: number; size: number }> = {
      1: { perRow: 6, size: 1 },  // 50%
      2: { perRow: 4, size: 2 },  // 65%
      3: { perRow: 3, size: 3 },  // 80%
      4: { perRow: 2, size: 3 },  // 80%
      5: { perRow: 1, size: 5 },  // 100%
      6: { perRow: 1, size: 5 },  // 100% (kept for slider range, but same as 5)
    };
    return mapping[value] || { perRow: 3, size: 3 };
  };

  const handleCombinedSizeChange = async (value: number[]) => {
    const combined = value[0];
    setCombinedSize(combined);
    const { perRow, size } = getSizeFromCombined(combined);
    setThumbnailSize(size);
    setThumbnailsPerRow(perRow);
    await updateSettings({ thumbnailSize: size, thumbnailsPerRow: perRow });
  };


  const handleShowTagsToggle = async (checked: boolean) => {
    setShowTags(checked);
    await updateSettings({ showTags: checked });
  };

  const handleShowProjectsToggle = async (checked: boolean) => {
    setShowProjects(checked);
    await updateSettings({ showProjects: checked });
  };

  const handleDeleteTag = (tag: string) => {
    setTagToDelete(tag);
    setDeleteTagDialogOpen(true);
  };

  const confirmDeleteTag = async () => {
    if (tagToDelete) {
      await deleteTag(tagToDelete);
      loadData();
      setDeleteTagDialogOpen(false);
      setTagToDelete(null);
    }
  };

  const handleDeleteProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setProjectToDelete(project);
      setDeleteProjectDialogOpen(true);
    }
  };

  const confirmDeleteProject = async () => {
    if (projectToDelete) {
      await deleteProject(projectToDelete.id);
      loadData();
      setDeleteProjectDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  // Get unique tags and channels from all thumbnails
  const availableTags = Array.from(
    new Set((thumbnails || []).flatMap(t => (t?.tags || [])))
  ).sort();

  const availableChannels = Array.from(
    new Set((thumbnails || []).map(t => t?.channelName || 'Unknown Channel'))
  ).sort();

  // Filter thumbnails by selected tag, project, and channel
  let filteredThumbnails = selectedTag === 'all'
    ? (thumbnails || [])
    : (thumbnails || []).filter(t => (t?.tags || []).includes(selectedTag));

  // Apply project filter
  if (selectedProject !== 'all') {
    filteredThumbnails = filteredThumbnails.filter(t => 
      (t?.projects || []).includes(selectedProject)
    );
  }

  // Apply channel filter
  if (selectedChannel !== 'all') {
    filteredThumbnails = filteredThumbnails.filter(t => 
      (t?.channelName || 'Unknown Channel') === selectedChannel
    );
  }

  // Sort thumbnails
  const sortedThumbnails = [...(filteredThumbnails || [])].sort((a, b) => {
    if (sortBy === 'date') {
      return (b?.savedAt || 0) - (a?.savedAt || 0);
    } else if (sortBy === 'channel') {
      const channelA = (a?.channelName || 'Unknown Channel').toLowerCase();
      const channelB = (b?.channelName || 'Unknown Channel').toLowerCase();
      if (channelA !== channelB) {
        return channelA.localeCompare(channelB);
      }
      // If same channel, sort by date
      return (b?.savedAt || 0) - (a?.savedAt || 0);
    } else if (sortBy === 'title') {
      const titleA = (a?.title || '').toLowerCase();
      const titleB = (b?.title || '').toLowerCase();
      if (titleA !== titleB) {
        return titleA.localeCompare(titleB);
      }
      // If same title, sort by date
      return (b?.savedAt || 0) - (a?.savedAt || 0);
    }
    return 0;
  });

  const openViewerPage = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <>
      <Toaster />
      <div className="w-[800px] h-[600px] flex flex-col bg-background">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Saved Thumbnails</h1>
            <button
              onClick={openViewerPage}
              className="text-sm text-primary hover:underline"
              title="Open full page viewer"
            >
              Open Full Page →
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <Switch
                checked={darkMode}
                onCheckedChange={handleDarkModeToggle}
              />
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          {/* Display Options */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-title"
                checked={showTitle}
                onCheckedChange={(checked) => setShowTitle(checked === true)}
              />
              <label htmlFor="show-title" className="text-sm font-medium cursor-pointer">
                Title
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-tags"
                checked={showTags}
                onCheckedChange={(checked) => handleShowTagsToggle(checked === true)}
              />
              <label htmlFor="show-tags" className="text-sm font-medium cursor-pointer">
                Tags
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-projects"
                checked={showProjects}
                onCheckedChange={(checked) => handleShowProjectsToggle(checked === true)}
              />
              <label htmlFor="show-projects" className="text-sm font-medium cursor-pointer">
                Projects
              </label>
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Sort by:</Label>
              <Select value={sortBy} onValueChange={(value: 'date' | 'channel' | 'title') => setSortBy(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="channel">Channel</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(availableTags || []).length > 0 && (
              <FilterBar
                selectedTag={selectedTag}
                availableTags={availableTags || []}
                onTagChange={setSelectedTag}
                onDeleteTag={handleDeleteTag}
              />
            )}
            {(projects || []).length > 0 && (
              <ProjectFilterBar
                selectedProject={selectedProject}
                availableProjects={projects || []}
                onProjectChange={setSelectedProject}
                onDeleteProject={handleDeleteProject}
              />
            )}
            {availableChannels.length > 0 && (
              <ChannelFilterBar
                selectedChannel={selectedChannel}
                availableChannels={availableChannels}
                onChannelChange={setSelectedChannel}
              />
            )}

            {(sortedThumbnails || []).length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.size === (sortedThumbnails || []).length && (sortedThumbnails || []).length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label className="text-sm">Select All</Label>
                </div>
                
                {selectedIds.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedIds.size})
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex-1">
            <Label className="text-xs mb-2 block">
              Size: {thumbnailsPerRow} per row ({thumbnailSize === 1 ? '50%' : thumbnailSize === 2 ? '65%' : thumbnailSize === 3 ? '80%' : thumbnailSize === 4 ? '90%' : '100%'})
            </Label>
            <Slider
              value={[combinedSize]}
              onValueChange={handleCombinedSizeChange}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-destructive text-lg mb-2">Error</p>
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={loadData} className="mt-4">Retry</Button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <ThumbnailGrid
              thumbnails={sortedThumbnails || []}
              showTitle={showTitle}
              thumbnailSize={thumbnailSize}
              thumbnailsPerRow={thumbnailsPerRow}
              showTags={showTags}
              showProjects={showProjects}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              projects={projects || []}
            />
          )}
        </div>
      </div>
      </div>

      {/* Delete Tag Dialog */}
      <Dialog open={deleteTagDialogOpen} onOpenChange={setDeleteTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tag</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the tag "{tagToDelete}"? This will remove it from all thumbnails.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTagDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteTag}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <Dialog open={deleteProjectDialogOpen} onOpenChange={setDeleteProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the project "{projectToDelete?.name}"? This will remove it from all thumbnails.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProjectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteProject}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default App;
