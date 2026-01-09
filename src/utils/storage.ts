import type { SavedThumbnail, Project } from '../types/storage';

const THUMBNAILS_KEY = 'youtube_thumbnails';
const PROJECTS_KEY = 'youtube_projects';
const SETTINGS_KEY = 'youtube_settings';

const DEFAULT_SETTINGS = {
  darkMode: false,
  thumbnailSize: 5,
  thumbnailsPerRow: 3,
  showTags: true,
  showProjects: true,
};

export async function saveThumbnail(data: Omit<SavedThumbnail, 'savedAt'>): Promise<void> {
  const thumbnails = await getAllThumbnails();
  
  // Check if already exists
  const existingIndex = thumbnails.findIndex(t => t.id === data.id);
  
  const thumbnail: SavedThumbnail = {
    ...data,
    projects: data.projects || [],
    savedAt: existingIndex >= 0 ? thumbnails[existingIndex].savedAt : Date.now(),
  };
  
  if (existingIndex >= 0) {
    thumbnails[existingIndex] = thumbnail;
  } else {
    thumbnails.push(thumbnail);
  }
  
  await chrome.storage.local.set({ [THUMBNAILS_KEY]: thumbnails });
}

export async function getAllThumbnails(): Promise<SavedThumbnail[]> {
  const result = await chrome.storage.local.get(THUMBNAILS_KEY);
  return (result[THUMBNAILS_KEY] as SavedThumbnail[]) || [];
}

export async function updateThumbnail(
  id: string,
  updates: Partial<Omit<SavedThumbnail, 'id' | 'savedAt'>>
): Promise<void> {
  const thumbnails = await getAllThumbnails();
  const index = thumbnails.findIndex(t => t.id === id);
  
  if (index >= 0) {
    thumbnails[index] = { ...thumbnails[index], ...updates };
    await chrome.storage.local.set({ [THUMBNAILS_KEY]: thumbnails });
  }
}

export async function deleteThumbnail(id: string): Promise<void> {
  const thumbnails = await getAllThumbnails();
  const filtered = thumbnails.filter(t => t.id !== id);
  await chrome.storage.local.set({ [THUMBNAILS_KEY]: filtered });
}

export async function deleteThumbnails(ids: string[]): Promise<void> {
  const thumbnails = await getAllThumbnails();
  const filtered = thumbnails.filter(t => !ids.includes(t.id));
  await chrome.storage.local.set({ [THUMBNAILS_KEY]: filtered });
}

// Delete a tag from all thumbnails
export async function deleteTag(tag: string): Promise<void> {
  const thumbnails = await getAllThumbnails();
  thumbnails.forEach(thumb => {
    if (thumb.tags.includes(tag)) {
      thumb.tags = thumb.tags.filter(t => t !== tag);
    }
  });
  await chrome.storage.local.set({ [THUMBNAILS_KEY]: thumbnails });
}

// Projects
export async function getAllProjects(): Promise<Project[]> {
  const result = await chrome.storage.local.get(PROJECTS_KEY);
  return (result[PROJECTS_KEY] as Project[]) || [];
}

export async function createProject(name: string, color?: string): Promise<Project> {
  const projects = await getAllProjects();
  const project: Project = {
    id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    color,
    createdAt: Date.now(),
  };
  projects.push(project);
  await chrome.storage.local.set({ [PROJECTS_KEY]: projects });
  return project;
}

export async function updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<void> {
  const projects = await getAllProjects();
  const index = projects.findIndex(p => p.id === id);
  
  if (index >= 0) {
    projects[index] = { ...projects[index], ...updates };
    await chrome.storage.local.set({ [PROJECTS_KEY]: projects });
  }
}

export async function deleteProject(id: string): Promise<void> {
  const projects = await getAllProjects();
  const filtered = projects.filter(p => p.id !== id);
  await chrome.storage.local.set({ [PROJECTS_KEY]: filtered });
  
  // Remove project from all thumbnails
  const thumbnails = await getAllThumbnails();
  thumbnails.forEach(thumb => {
    if (thumb.projects.includes(id)) {
      thumb.projects = thumb.projects.filter(p => p !== id);
    }
  });
  await chrome.storage.local.set({ [THUMBNAILS_KEY]: thumbnails });
}

// Settings
export async function getSettings(): Promise<typeof DEFAULT_SETTINGS> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] || {}) };
}

export async function updateSettings(updates: Partial<typeof DEFAULT_SETTINGS>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.local.set({ [SETTINGS_KEY]: { ...current, ...updates } });
}
