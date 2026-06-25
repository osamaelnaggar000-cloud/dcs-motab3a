import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Holiday } from '../types';

interface HolidayManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    holidays: Holiday[];
    onAdd: (record: Omit<Holiday, 'id'>) => void;
    onUpdate: (recordId: string, updatedRecord: Omit<Holiday, 'id'>) => void;
    onDelete: (recordId: string) => void;
}

const HolidayManagementModal: React.FC<HolidayManagementModalProps> = ({ isOpen, onClose, holidays, onAdd, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState<Holiday | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    useEffect(() => {
        if (!isOpen) {
            setIsEditing(null);
            setName('');
            setStartDate('');
            setEndDate('');
        }
    }, [isOpen]);
    
    useEffect(() => {
        if (isEditing) {
            setName(isEditing.name);
            setStartDate(isEditing.startDate);
            setEndDate(isEditing.endDate);
        } else {
            const today = new Date().toISOString().slice(0, 10);
            setName('');
            setStartDate(today);
            setEndDate(today);
        }
    }, [isEditing]);

    const handleSave = () => {
        if (!name.trim() || !startDate || !endDate) {
            alert('الرجاء تعبئة جميع الحقول: الاسم، تاريخ البدء، وتاريخ الانتهاء.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            alert('تاريخ البدء لا يمكن أن يكون بعد تاريخ الانتهاء.');
            return;
        }

        const record = { name: name.trim(), startDate, endDate };
        if (isEditing) {
            onUpdate(isEditing.id, record);
        } else {
            onAdd(record);
        }
        setIsEditing(null);
    };
    
    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent showCloseButton={false} className="w-[95vw] md:w-[85vw] max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl" dir="rtl">
                <DialogTitle className="sr-only">إدارة الإجازات والعطلات الرسمية</DialogTitle>
                <DialogDescription className="sr-only">إدارة العطلات</DialogDescription>
                <header className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-center flex-shrink-0 bg-slate-50/50">
                    <h2 className="text-xl font-bold text-zinc-800">إدارة الإجازات والعطلات الرسمية</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>
                <main className="p-4 sm:p-6 flex-1 overflow-y-auto bg-white">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4 mb-6">
                         <h3 className="font-semibold text-zinc-700">{isEditing ? 'تعديل الإجازة' : 'إضافة إجازة جديدة'}</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                            <div className="space-y-1 sm:col-span-1">
                                <label className="text-xs font-medium">اسم الإجازة</label>
                                <input type="text" placeholder="مثال: عطلة عيد الأضحى" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md"/>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium">من تاريخ</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md"/>
                            </div>
                             <div className="space-y-1">
                                <label className="text-xs font-medium">إلى تاريخ</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md"/>
                            </div>
                         </div>
                          <div className="flex justify-end gap-2">
                            {isEditing && <button onClick={() => setIsEditing(null)} className="bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg">إلغاء التعديل</button>}
                            <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg">{isEditing ? 'حفظ التعديلات' : 'إضافة إجازة'}</button>
                          </div>
                    </div>

                    <div className="mt-6">
                        <h3 className="font-semibold text-zinc-700 mb-2">قائمة الإجازات</h3>
                        <div className="p-3 bg-sky-50 border border-sky-200 rounded-md mb-3">
                            <p className="font-semibold text-sky-800">ملاحظة: يوم الجمعة هو يوم عطلة أسبوعية رسمي ويتم تطبيقه تلقائياً.</p>
                        </div>
                        <ul className="divide-y divide-slate-200 border rounded-md">
                            {holidays.length > 0 ? (
                                holidays.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(holiday => (
                                    <li key={holiday.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                                        <div>
                                            <p className="font-semibold text-zinc-800">{holiday.name}</p>
                                            <p className="text-sm text-slate-600">
                                                من {new Date(holiday.startDate + 'T00:00:00Z').toLocaleDateString('ar-EG')} إلى {new Date(holiday.endDate + 'T00:00:00Z').toLocaleDateString('ar-EG')}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setIsEditing(holiday)} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                                            <button onClick={() => onDelete(holiday.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <li className="p-4 text-center text-slate-500">لم يتم إضافة إجازات مخصصة بعد.</li>
                            )}
                        </ul>
                    </div>
                </main>
                <footer className="p-4 sm:p-6 bg-slate-50/50 border-t border-slate-200 flex justify-end flex-shrink-0">
                    <button onClick={onClose} className="bg-white hover:bg-slate-100 text-zinc-700 font-bold py-2 px-6 rounded-lg border border-slate-300">إغلاق</button>
                </footer>
            </DialogContent>
        </Dialog>
    );
};

export default HolidayManagementModal;
