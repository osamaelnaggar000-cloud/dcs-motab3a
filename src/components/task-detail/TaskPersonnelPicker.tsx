import React, { useRef, useEffect, useMemo } from 'react';

interface TaskPersonnelPickerProps {
    selectedPersonnelIds: string[];
    personnelMap: Record<string, string>;
    personnelSearch: string;
    setPersonnelSearch: (value: string) => void;
    isPersonnelDropdownOpen: boolean;
    setIsPersonnelDropdownOpen: (value: boolean) => void;
    onAddPersonnel: (id: string) => void;
    onRemovePersonnel: (id: string) => void;
    itemCode: string;
    setItemCode: (value: string) => void;
}

const TaskPersonnelPicker: React.FC<TaskPersonnelPickerProps> = ({
    selectedPersonnelIds,
    personnelMap,
    personnelSearch,
    setPersonnelSearch,
    isPersonnelDropdownOpen,
    setIsPersonnelDropdownOpen,
    onAddPersonnel,
    onRemovePersonnel,
    itemCode,
    setItemCode,
}) => {
    const personnelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (personnelRef.current && !personnelRef.current.contains(event.target as Node)) {
                setIsPersonnelDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [setIsPersonnelDropdownOpen]);

    const allPersonnelList = useMemo(() => Object.entries(personnelMap), [personnelMap]);

    const filteredPersonnel = useMemo(() => {
        return allPersonnelList.filter(([id, name]) =>
            !selectedPersonnelIds.includes(id) &&
            name.toLowerCase().includes(personnelSearch.toLowerCase())
        );
    }, [allPersonnelList, selectedPersonnelIds, personnelSearch]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
                <label htmlFor="task-personnel" className="block text-sm font-medium text-zinc-700">المسؤولون</label>
                <div className="relative" ref={personnelRef}>
                    <div className="w-full p-1.5 border border-slate-300 rounded-md focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 flex flex-wrap gap-2 items-center min-h-[42px]">
                        {selectedPersonnelIds.map(id => (
                            <span key={id} className="bg-emerald-100 text-emerald-800 text-sm font-medium px-2.5 py-1 rounded-full flex items-center gap-2">
                                {personnelMap[id] || id}
                                <button
                                    type="button"
                                    onClick={() => onRemovePersonnel(id)}
                                    className="text-emerald-600 hover:text-emerald-800 font-bold focus:outline-none"
                                    aria-label={`إزالة ${personnelMap[id] || id}`}
                                >
                                    &times;
                                </button>
                            </span>
                        ))}
                        <input
                            id="task-personnel"
                            type="text"
                            value={personnelSearch}
                            onChange={e => setPersonnelSearch(e.target.value)}
                            onFocus={() => setIsPersonnelDropdownOpen(true)}
                            className="flex-grow bg-transparent outline-none p-1 text-sm"
                            placeholder={selectedPersonnelIds.length > 0 ? '' : 'ابحث لإضافة مسؤول...'}
                            autoComplete="off"
                        />
                    </div>
                    {isPersonnelDropdownOpen && (
                        <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {filteredPersonnel.length > 0 ? (
                                <ul>
                                    {filteredPersonnel.map(([id, name]) => (
                                        <li key={id}>
                                            <button
                                                type="button"
                                                onMouseDown={(e) => { e.preventDefault(); onAddPersonnel(id); }}
                                                className="w-full text-right p-2 hover:bg-emerald-50 focus:bg-emerald-100"
                                            >
                                                {name}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="p-3 text-slate-500 text-center text-sm">لا توجد نتائج مطابقة أو تم اختيار الجميع.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="space-y-1">
                <label htmlFor="task-item-code" className="block text-sm font-medium text-zinc-700">كود البند (اختياري)</label>
                <input type="text" id="task-item-code" value={itemCode} onChange={e => setItemCode(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
        </div>
    );
};

export default TaskPersonnelPicker;
