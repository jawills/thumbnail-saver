import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../lib/components/ui/popover';
import { Button } from '../../lib/components/ui/button';
import { Input } from '../../lib/components/ui/input';
import { Checkbox } from '../../lib/components/ui/checkbox';
import { X, Search, Folder } from 'lucide-react';
import type { Project } from '../../types/storage';

interface ProjectFilterBarProps {
  selectedProject: string;
  availableProjects: Project[];
  onProjectChange: (projectId: string) => void;
  onDeleteProject?: (projectId: string) => void;
}

export const ProjectFilterBar: React.FC<ProjectFilterBarProps> = ({
  selectedProject,
  availableProjects = [],
  onProjectChange,
  onDeleteProject,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filteredProjects = (availableProjects || []).filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteProject) {
      onDeleteProject(projectId);
      if (selectedProject === projectId) {
        onProjectChange('all');
      }
    }
  };

  const selectedProjectName = availableProjects.find(p => p.id === selectedProject)?.name || 'All projects';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-[160px] justify-between">
          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4" />
            <span className="truncate text-xs">{selectedProjectName}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          <div className="p-2">
            <div
              className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer"
              onClick={() => {
                onProjectChange('all');
                setOpen(false);
              }}
            >
              <Checkbox checked={selectedProject === 'all'} />
              <span className="flex-1 text-sm">All projects</span>
            </div>
            {filteredProjects.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground text-center">
                No projects found
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer group"
                  onClick={() => {
                    onProjectChange(project.id);
                    setOpen(false);
                  }}
                >
                  <Checkbox checked={selectedProject === project.id} />
                  <span className="flex-1 text-sm">{project.name}</span>
                  {onDeleteProject && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => handleDelete(project.id, e)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
