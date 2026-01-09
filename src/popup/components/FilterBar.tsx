import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../lib/components/ui/popover';
import { Button } from '../../lib/components/ui/button';
import { Input } from '../../lib/components/ui/input';
import { Checkbox } from '../../lib/components/ui/checkbox';
import { X, Search, Filter } from 'lucide-react';

interface FilterBarProps {
  selectedTag: string;
  availableTags: string[];
  onTagChange: (tag: string) => void;
  onDeleteTag?: (tag: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedTag,
  availableTags = [],
  onTagChange,
  onDeleteTag,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filteredTags = (availableTags || []).filter(tag =>
    tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteTag) {
      onDeleteTag(tag);
      if (selectedTag === tag) {
        onTagChange('all');
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-[160px] justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="truncate text-xs">{selectedTag === 'all' ? 'All tags' : selectedTag}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tags..."
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
                onTagChange('all');
                setOpen(false);
              }}
            >
              <Checkbox checked={selectedTag === 'all'} />
              <span className="flex-1 text-sm">All tags</span>
            </div>
            {filteredTags.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground text-center">
                No tags found
              </div>
            ) : (
              filteredTags.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer group"
                  onClick={() => {
                    onTagChange(tag);
                    setOpen(false);
                  }}
                >
                  <Checkbox checked={selectedTag === tag} />
                  <span className="flex-1 text-sm">{tag}</span>
                  {onDeleteTag && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => handleDelete(tag, e)}
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
