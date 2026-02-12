"use client";
import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render: (row: T) => React.ReactNode;
  getValue?: (row: T) => number | string;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKey?: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTableWrapper<T>({ data, columns, searchable = false, searchPlaceholder = 'Search...', searchKey, onRowClick, emptyMessage = 'No data available' }: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');

  const toggleSort = (key: string) => {
    if (sortKey === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filteredData = useMemo(() => {
    let d = [...data];
    if (searchable && search && searchKey) {
      const q = search.toLowerCase();
      d = d.filter(row => searchKey(row).toLowerCase().includes(q));
    }
    if (sortKey) {
      const col = columns.find(c => c.key === sortKey);
      if (col?.getValue) {
        d.sort((a, b) => {
          const va = col.getValue!(a);
          const vb = col.getValue!(b);
          if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
          return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
        });
      }
    }
    return d;
  }, [data, search, searchKey, searchable, sortKey, sortDir, columns]);

  return (
    <div>
      {searchable && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 bg-muted/50" />
        </div>
      )}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {columns.map(col => (
                <TableHead key={col.key} className={cn("text-[11px] font-semibold uppercase tracking-wider text-muted-foreground h-9", col.align === 'right' && 'text-right', col.align === 'center' && 'text-center', col.className)}>
                  {col.sortable ? (
                    <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent text-[11px] font-semibold uppercase tracking-wider" onClick={() => toggleSort(col.key)}>
                      {col.label}
                      {sortKey === col.key ? (sortDir === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />}
                    </Button>
                  ) : col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">{emptyMessage}</TableCell></TableRow>
            ) : filteredData.map((row, i) => (
              <TableRow key={i} className={cn(onRowClick && "cursor-pointer hover:bg-muted/50")} onClick={() => onRowClick?.(row)}>
                {columns.map(col => (
                  <TableCell key={col.key} className={cn("py-2.5 text-sm", col.align === 'right' && 'text-right', col.align === 'center' && 'text-center', col.className)}>
                    {col.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
