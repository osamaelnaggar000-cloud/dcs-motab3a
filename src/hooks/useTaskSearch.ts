import { useState, useEffect, useMemo } from 'react';
import type { Task } from '../types';
import type { NormalizedGanttState } from '../features/gantt/types';

export interface SearchResult {
    task: Task;
    lineId: string;
    lineName: string;
    adminName: string;
    sectionName: string;
}

export function useTaskSearch(
    store: Pick<NormalizedGanttState, 'lines' | 'administrations' | 'sections' | 'tasks'>, 
    personnelMap: Record<string, string>
) {
    const [inputValue, setInputValue] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchQuery(inputValue);
        }, 300);

        return () => {
            clearTimeout(timer);
        };
    }, [inputValue]);

    const searchResults = useMemo((): SearchResult[] => {
        if (!searchQuery.trim() || !personnelMap || Object.keys(store.lines).length === 0) return [];
        const query = searchQuery.trim().toLowerCase();
        const results: SearchResult[] = [];

        Object.values(store.tasks).forEach(task => {
            const personnelMatch = task.personnel.some(pId => (personnelMap[pId] || '').toLowerCase().includes(query));
            const nameMatch = task.name.toLowerCase().includes(query);
            const codeMatch = task.itemCode?.toLowerCase().includes(query);
            
            if (nameMatch || personnelMatch || codeMatch) {
                const section = store.sections[task.sectionId];
                if (!section) return;
                const admin = store.administrations[section.administrationId];
                if (!admin) return;
                const line = store.lines[admin.lineId];
                if (!line) return;

                results.push({ 
                    task: task as Task, 
                    lineId: line.id, 
                    lineName: line.name, 
                    adminName: admin.name, 
                    sectionName: section.name 
                });
            }
        });
        
        return results;
    }, [searchQuery, store.tasks, store.sections, store.administrations, store.lines, personnelMap]);

    return {
        inputValue,
        setInputValue,
        searchResults,
        highlightedTaskId,
        setHighlightedTaskId
    };
}

