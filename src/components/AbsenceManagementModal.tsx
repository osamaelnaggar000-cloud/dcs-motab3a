import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Personnel, PersonnelData, AbsenceData, AbsenceRecord } from '../types';

interface AbsenceManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    personnelData: PersonnelData;
    absenceData: AbsenceData;
    onAdd: (personnelId: string, record: Omit<AbsenceRecord, 'id'>) => void;
    onUpdate: (personnelId: string, recordId: string, updatedRecord: Omit<AbsenceRecord, 'id'>) => void;
    onDelete: (personnelId: string, recordId: string) => void;
}

const AbsenceManagementModal: React.FC<AbsenceManagementModalProps> = ({ isOpen, onClose, personnelData, absenceData, onAdd, onUpdate, onDelete }) => {
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [isEditing, setIsEditing] = useState<AbsenceRecord | null>(null);

    // Form state
    const [type, setType] = useState<'leave' | 'absence'>('absence');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setSelectedPersonId(null);
            setSearchQuery('');
            setIsEditing(null);
            setReason('');
            setStartDate('');
            setEndDate('');
        }
    }, [isOpen]);
    
    useEffect(() => {
        if (isEditing) {
            setType(isEditing.type);
            setStartDate(isEditing.startDate);
            setEndDate(isEditing.endDate);
            setReason(isEditing.reason);
        } else {
            const today = new Date().toISOString().slice(0, 10);
            setType('absence');
            setStartDate(today);
            setEndDate(today);
            setReason('');
        }
    }, [isEditing]);


    const allPersonnel = useMemo(() => {
        if (!personnelData || !personnelData.personnel) return [];
        return Object.entries(personnelData.personnel).map(([id, person]: [string, Personnel]) => ({ 
            id, 
            name: person.name, 
            assignment: person.assignment, 
            role: person.jobTitle || 'موظف'
        }));
    }, [personnelData]);
    
    const filteredPersonnel = useMemo(() => {
        return allPersonnel
            .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [allPersonnel, searchQuery]);

    const selectedPerson = useMemo(() => {
        return allPersonnel.find(p => p.id === selectedPersonId) || null;
    }, [selectedPersonId, allPersonnel]);

    const handleSave = () => {
        if (!selectedPersonId || !startDate || !endDate || !reason.trim()) {
            alert('الرجاء تعبئة جميع الحقول: النوع، تاريخ البدء، تاريخ الانتهاء، والسبب.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            alert('تاريخ البدء لا يمكن أن يكون بعد تاريخ الانتهاء.');
            return;
        }

        const record = { type, startDate, endDate, reason: reason.trim() };
        if (isEditing) {
            onUpdate(selectedPersonId, isEditing.id, record);
        } else {
            onAdd(selectedPersonId, record);
        }
        setIsEditing(null);
    };

    const handleDelete = (recordId: string) => {
        if (selectedPersonId && window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
            onDelete(selectedPersonId, recordId);
        }
    };
    
    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent showCloseButton={false} className="w-[95vw] md:w-[85vw] max-w-5xl h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl" dir="rtl">
                <DialogTitle className="sr-only">سجل الحضور والغيابات</DialogTitle>
                <DialogDescription className="sr-only">إدارة غيابات الموظفين</DialogDescription>
                <header className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-center flex-shrink-0 bg-slate-50/50">
                    <h2 className="text-xl font-bold text-zinc-800">سجل الحضور والغيابات</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>
                <main className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-[1fr_2fr] bg-white">
                    {/* Personnel List */}
                    <aside className="border-r border-slate-200 flex flex-col">
                        <div className="p-3 border-b">
                            <input
                                type="text"
                                placeholder="بحث عن شخص..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-md"
                            />
                        </div>
                        <ul className="overflow-y-auto flex-1">
                            {filteredPersonnel.map(person => (
                                <li key={person.id}>
                                    <button
                                        onClick={() => setSelectedPersonId(person.id)}
                                        className={`w-full text-right p-3 border-b border-slate-100 ${selectedPersonId === person.id ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'hover:bg-slate-50'}`}
                                    >
                                        <p>{person.name}</p>
                                        <p className="text-xs text-slate-500">{person.role} - {person.assignment || 'غير مسند'}</p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </aside>
                    
                    {/* Details View */}
                    <section className="flex flex-col">
                        {selectedPerson ? (
                            <>
                                <div className="p-4 border-b bg-slate-50 flex-shrink-0">
                                    <h3 className="text-lg font-bold text-emerald-700">{selectedPerson.name}</h3>
                                    <p className="text-sm text-slate-600">{selectedPerson.role} - {selectedPerson.assignment || 'غير مسند'}</p>
                                </div>
                                <div className="p-4 space-y-4 bg-white border-b flex-shrink-0">
                                     <h4 className="font-semibold text-zinc-700">{isEditing ? 'تعديل السجل' : 'إضافة سجل جديد'}</h4>
                                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">النوع</label>
                                            <select value={type} onChange={e => setType(e.target.value as any)} className="w-full p-2 border border-slate-300 rounded-md bg-white">
                                                <option value="absence">غياب</option>
                                                <option value="leave">إجازة</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">من تاريخ</label>
                                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md"/>
                                        </div>
                                         <div className="space-y-1">
                                            <label className="text-xs font-medium">إلى تاريخ</label>
                                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md"/>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">السبب</label>
                                            <input type="text" placeholder="مثال: إجازة مرضية" value={reason} onChange={e => setReason(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md"/>
                                        </div>
                                     </div>
                                      <div className="flex justify-end gap-2 mt-2">
                                        {isEditing && <button onClick={() => setIsEditing(null)} className="bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg">إلغاء التعديل</button>}
                                        <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg">{isEditing ? 'حفظ التعديلات' : 'إضافة السجل'}</button>
                                      </div>
                                </div>
                                <div className="overflow-y-auto flex-1 p-4">
                                    <h4 className="font-semibold text-zinc-700 mb-2">السجلات الحالية</h4>
                                    <ul className="divide-y divide-slate-200 border rounded-md">
                                        {(selectedPersonId && absenceData[selectedPersonId] && absenceData[selectedPersonId].length > 0) ? (
                                            absenceData[selectedPersonId].sort((a: AbsenceRecord, b: AbsenceRecord) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map((record: AbsenceRecord) => (
                                                <li key={record.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                                                    <div>
                                                        <p className={`font-semibold ${record.type === 'leave' ? 'text-sky-700' : 'text-amber-700'}`}>
                                                            {record.type === 'leave' ? 'إجازة' : 'غياب'}: {record.reason}
                                                        </p>
                                                        <p className="text-sm text-slate-600">
                                                            من {new Date(record.startDate + 'T00:00:00Z').toLocaleDateString('ar-EG')} إلى {new Date(record.endDate + 'T00:00:00Z').toLocaleDateString('ar-EG')}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setIsEditing(record)} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                                                        <button onClick={() => handleDelete(record.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                                                    </div>
                                                </li>
                                            ))
                                        ) : (
                                            <li className="p-4 text-center text-slate-500">لا توجد سجلات غياب أو إجازات لهذا الشخص.</li>
                                        )}
                                    </ul>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full bg-slate-50">
                                <p className="text-slate-500">الرجاء اختيار شخص من القائمة لعرض سجلاته.</p>
                            </div>
                        )}
                    </section>
                </main>
            </DialogContent>
        </Dialog>
    );
};

export default AbsenceManagementModal;
