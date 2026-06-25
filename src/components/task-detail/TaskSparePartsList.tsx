import React from 'react';
import type { SparePart } from '../../types';

interface TaskSparePartsListProps {
    spareParts: SparePart[];
    newPartName: string;
    setNewPartName: (value: string) => void;
    newPartQty: string;
    setNewPartQty: (value: string) => void;
    onAddPart: () => void;
    onRemovePart: (partId: string) => void;
}

const TaskSparePartsList: React.FC<TaskSparePartsListProps> = ({
    spareParts,
    newPartName,
    setNewPartName,
    newPartQty,
    setNewPartQty,
    onAddPart,
    onRemovePart,
}) => {
    return (
        <div className="space-y-2 p-3 border border-slate-200 rounded-md bg-slate-50">
            <h4 className="font-semibold text-sm text-zinc-700">قطع الغيار المطلوبة</h4>
            <div className="flex gap-2 items-end">
                <div className="flex-grow space-y-1">
                    <label htmlFor="part-name" className="block text-xs font-medium text-slate-600">اسم القطعة</label>
                    <input
                        type="text"
                        id="part-name"
                        value={newPartName}
                        onChange={e => setNewPartName(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-md text-sm"
                        placeholder="مثال: رولمان بلي"
                    />
                </div>
                <div className="w-24 space-y-1">
                    <label htmlFor="part-qty" className="block text-xs font-medium text-slate-600">الكمية</label>
                    <input
                        type="text"
                        id="part-qty"
                        value={newPartQty}
                        onChange={e => setNewPartQty(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-md text-sm"
                        placeholder="مثال: 2"
                    />
                </div>
                <button
                    type="button"
                    onClick={onAddPart}
                    className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700"
                >
                    إضافة
                </button>
            </div>

            {spareParts.length > 0 && (
                <ul className="mt-2 border rounded-md bg-white divide-y divide-slate-100">
                    {spareParts.map(part => (
                        <li key={part.id} className="flex justify-between items-center p-2 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-zinc-800">{part.name}</span>
                                {part.quantity && <span className="text-slate-500 text-xs bg-slate-100 px-2 py-0.5 rounded-full">الكمية: {part.quantity}</span>}
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemovePart(part.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default TaskSparePartsList;
