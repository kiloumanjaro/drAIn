'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchBarProps {
  onSearch: (searchTerm: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    onSearch(newSearchTerm);
  };

  return (
    <div className="relative h-8.5 flex-1">
      <Search className="absolute top-1/2 left-3 w-4 -translate-y-1/2 transform gap-2 text-[#8D8D8D]" />
      <Input
        placeholder="Search"
        value={searchTerm}
        onChange={handleSearchTermChange}
        className="h-8.5 flex-1 rounded-full border border-[#DCDCDC] bg-[#EBEBEB] pl-10 shadow-none focus-visible:border-[#DCDCDC] focus-visible:ring-0"
      />
    </div>
  );
}
