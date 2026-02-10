'use client';

import { useState } from 'react';
import { Search, Filter, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PROJECT_CATEGORY_LABELS, type ProjectCategory } from '@/types';

interface ProjectSearchProps {
  onSearch: (query: string) => void;
  onCategoryChange: (category: ProjectCategory | 'all') => void;
  selectedCategory: ProjectCategory | 'all';
  showWatchlistOnly?: boolean;
  onWatchlistToggle?: (show: boolean) => void;
}

export const ProjectSearch = ({
  onSearch,
  onCategoryChange,
  selectedCategory,
  showWatchlistOnly = false,
  onWatchlistToggle,
}: ProjectSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <form onSubmit={handleSearch} className="flex flex-1 gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="flex items-center gap-2">
        {onWatchlistToggle && (
          <Button
            variant={showWatchlistOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => onWatchlistToggle(!showWatchlistOnly)}
            className={showWatchlistOnly ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : ''}
          >
            <Star className={`mr-1 h-3.5 w-3.5 ${showWatchlistOnly ? 'fill-current' : ''}`} />
            Watchlist
          </Button>
        )}
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select
          value={selectedCategory}
          onValueChange={(value) => onCategoryChange(value as ProjectCategory | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(PROJECT_CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
