import React from 'react';
import type { Administration, Section } from '../../types';

interface TaskGeneralFieldsProps {
    name: string;
    setName: (value: string) => void;
    duration: number;
    setDuration: (value: number) => void;
    startDate: string;
    setStartDate: (value: string) => void;
    itemCode: string;
    setItemCode: (value: string) => void;
    notes: string;
    setNotes: (value: string) => void;
    selectedLocation: string;
    setSelectedLocation: (value: string) => void;
    targetAdminName: string;
    targetSectionName: string;
    setTargetSectionName: (value: string) => void;
    handleAdminChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    availableAdmins: Administration[];
    availableSections: Section[];
    inheritedLocation: string;
    locationsList: string[];
    isParentTask: boolean;
    hasDeps: boolean;
    parentId: string | null;
}

const TaskGeneralFields: React.FC<TaskGeneralFieldsProps> = ({
    name,
    setName,
    duration,
    setDuration,
    startDate,
    setStartDate,
    itemCode,
    setItemCode,
    notes,
    setNotes,
    selectedLocation,
    setSelectedLocation,
    targetAdminName,
    targetSectionName,
    setTargetSectionName,
    handleAdminChange,
    availableAdmins,
    availableSections,
    inheritedLocation,
    locationsList,
    isParentTask,
    hasDeps,
    parentId,
}) => {
    return (
        <>
            <div className="space-y-1">
                <label htmlFor="task-name" className="block text-sm font-medium text-zinc-700">اسم المهمة</label>
                <input type="text" id="task-name" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
            </div>

            {/* Administration and Section Selection for moving tasks */}
            {!parentId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-indigo-50 p-3 rounded-md border border-indigo-100">
                    <div className="col-span-1 sm:col-span-2">
                        <h3 className="text-xs font-bold text-indigo-800 uppercase mb-1">توجيه المهمة (للإدارات الخدمية)</h3>
                        <p className="text-xs text-indigo-600 mb-2">
                            عند اختيار إدارة مختلفة، سيتم <strong>نسخ</strong> المهمة للقطاع/الإدارة الخدمية الجديدة مع بقاء الأصل في الإدارة الحالية للإشارة.
                        </p>
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="target-admin" className="block text-sm font-medium text-zinc-700">القطاع / الإدارة العامة الخدمية (المستهدفة)</label>
                        <select
                            id="target-admin"
                            value={targetAdminName}
                            onChange={handleAdminChange}
                            className="w-full p-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm"
                        >
                            {availableAdmins.map(admin => (
                                <option key={admin.name} value={admin.name}>{admin.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="target-section" className="block text-sm font-medium text-zinc-700">القسم / المجموعة</label>
                        <select
                            id="target-section"
                            value={targetSectionName}
                            onChange={e => setTargetSectionName(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm"
                            disabled={!targetAdminName}
                        >
                            {availableSections.map(section => (
                                <option key={section.name} value={section.name}>{section.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label htmlFor="task-duration" className={`block text-sm font-medium ${isParentTask ? 'text-slate-400' : 'text-zinc-700'}`}>المدة (أيام)</label>
                    <input type="number" id="task-duration" value={duration} onChange={e => setDuration(Number(e.target.value))} min="1" className="w-full p-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-500" disabled={isParentTask} />
                    {isParentTask && <p className="text-xs text-slate-500">يتم حساب مدة المهمة الرئيسية تلقائياً.</p>}
                </div>
                <div className="space-y-1">
                    <label htmlFor="task-start-date" className={`block text-sm font-medium ${(isParentTask || hasDeps) ? 'text-slate-400' : 'text-zinc-700'}`}>تاريخ البدء</label>
                    <input type="date" id="task-start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-500" disabled={isParentTask || hasDeps} />
                    {(isParentTask || hasDeps) && <p className="text-xs text-slate-500">يتم حساب تاريخ البدء تلقائياً بناءً على المهام الفرعية أو الاعتماديات.</p>}
                </div>
            </div>

            {/* Item Code - rendered after personnel picker in the parent's grid */}

            {/* Notes */}
            <div className="space-y-2">
                <label htmlFor="notes" className="block text-sm font-medium text-zinc-700">
                    ملاحظات المتابعة اليومية:
                </label>
                <textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="أضف ملاحظاتك هنا..."
                />
            </div>

            {/* Location */}
            <div className="space-y-1">
                <label htmlFor="task-location" className="block text-sm font-medium text-zinc-700">المكان</label>
                <select id="task-location" value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 bg-white">
                    <option value="inherit">افتراضي (يتبع القسم/الإدارة العامة: {inheritedLocation})</option>
                    <option disabled>---</option>
                    {locationsList.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
            </div>
        </>
    );
};

export default TaskGeneralFields;
