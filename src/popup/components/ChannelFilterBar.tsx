import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../lib/components/ui/popover';
import { Button } from '../../lib/components/ui/button';
import { Input } from '../../lib/components/ui/input';
import { Checkbox } from '../../lib/components/ui/checkbox';
import { X, Search, User } from 'lucide-react';

interface ChannelFilterBarProps {
  selectedChannel: string;
  availableChannels: string[];
  onChannelChange: (channel: string) => void;
}

export const ChannelFilterBar: React.FC<ChannelFilterBarProps> = ({
  selectedChannel,
  availableChannels = [],
  onChannelChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filteredChannels = (availableChannels || []).filter(channel =>
    channel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedChannelName = selectedChannel === 'all' ? 'All channels' : selectedChannel;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-[160px] justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="truncate text-xs">{selectedChannelName}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search channels..."
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
                onChannelChange('all');
                setOpen(false);
              }}
            >
              <Checkbox checked={selectedChannel === 'all'} />
              <span className="flex-1 text-sm">All channels</span>
            </div>
            {filteredChannels.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground text-center">
                No channels found
              </div>
            ) : (
              filteredChannels.map((channel) => (
                <div
                  key={channel}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                  onClick={() => {
                    onChannelChange(channel);
                    setOpen(false);
                  }}
                >
                  <Checkbox checked={selectedChannel === channel} />
                  <span className="flex-1 text-sm">{channel}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
