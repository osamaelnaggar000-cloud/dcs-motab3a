import React from 'react';
import type { Task, Administration } from '../../types';

interface TaskWithPath extends Task {
    path: string;
}

interface TaskDependencyManagerProps {
    isNewTask: boolean;
    dependencies: import('../../types').Dependency[];
    tasksById: Map<string, TaskWithPath>;
    dependencyViewMode: 'sameSection' | 'browse' | 'search';
    setDependencyViewMode: (mode: 'sameSection' | 'browse' | 'search') => void;
    depSearch: string;
    setDepSearch: (value: string) => void;
    browseAdminName: string;
    setBrowseAdminName: (value: string) => void;
    browseSectionName: string;
    setBrowseSectionName: (value: string) => void;
    sameSectionTasks: Task[];
    browseAdmins: Administration[];
    browseSections: { name: string; tasks: Task[] }[];
    browseResultTasks: Task[];
    searchResultTasks: TaskWithPath[];
    canAddDependency: (targetTaskId: string | undefined, prerequisiteId: string) => boolean;
    onAddDependency: (id: string, type: 'FS'|'SS'|'FF') => void;
    onRemoveDependency: (id: string) => void;
    taskId: string | undefined;
}

const TaskDependencyManager: React.FC<TaskDependencyManagerProps> = ({
    isNewTask,
    dependencies,
    tasksById,
    dependencyViewMode,
    setDependencyViewMode,
    depSearch,
    setDepSearch,
    browseAdminName,
    setBrowseAdminName,
    browseSectionName,
    setBrowseSectionName,
    sameSectionTasks,
    browseAdmins,
    browseSections,
    browseResultTasks,
    searchResultTasks,
    canAddDependency,
    onAddDependency,
    onRemoveDependency,
    taskId,
}) => {
    if (isNewTask) return null;

    const [selectedDepType, setSelectedDepType] = React.useState<'FS'|'SS'|'FF'>('FS');

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700">المهام السابقة (الاعتماديات)</label>
            <div className="w-full p-1.5 border border-slate-200 bg-slate-50 rounded-md flex flex-wrap gap-2 items-center min-h-[42px]">
                {dependencies.length > 0 ? (
                    dependencies.map(dep => {
                        const depTask = tasksById.get(dep.taskId);
                        const typeLabel = dep.type === 'FS' ? 'انتهاء لبدء' : dep.type === 'SS' ? 'بدء لبدء' : 'انتهاء لانتهاء';
                        return (
                            <span key={dep.taskId} className="bg-indigo-100 text-indigo-800 text-sm font-medium px-2.5 py-1 rounded-full flex items-center gap-2">
                                {depTask?.name || 'مهمة محذوفة'} <span className="text-xs bg-white/50 px-1 rounded">{typeLabel} ({dep.type})</span>
                                <button
                                    type="button"
                                    onClick={() => onRemoveDependency(dep.taskId)}
                                    className="text-indigo-600 hover:text-indigo-800 font-bold focus:outline-none"
                                    aria-label={`إزالة ${depTask?.name}`}
                                >
                                    &times;
                                </button>
                            </span>
                        )
                    })
                ) : (
                    <p className="text-sm text-slate-500 px-2">لا توجد مهام سابقة. يمكنك إضافتها من الأسفل.</p>
                )}
            </div>

            <div className="border border-slate-300 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-zinc-600">إضافة مهمة سابقة:</h4>
                    <select 
                        value={selectedDepType} 
                        onChange={e => setSelectedDepType(e.target.value as 'FS'|'SS'|'FF')}
                        className="text-sm p-1 border border-slate-300 rounded"
                    >
                        <option value="FS">انتهاء لبدء (FS)</option>
                        <option value="SS">بدء لبدء (SS)</option>
                        <option value="FF">انتهاء لانتهاء (FF)</option>
                    </select>
                </div>
                <div className="flex items-center justify-around bg-slate-100 p-1 rounded-lg mb-3">
                    <button onClick={() => setDependencyViewMode('sameSection')} className={`flex-1 text-center py-2 px-3 rounded-md transition-colors text-sm font-semibold ${dependencyViewMode === 'sameSection' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-200'}`}>من نفس القسم</button>
                    <button onClick={() => setDependencyViewMode('browse')} className={`flex-1 text-center py-2 px-3 rounded-md transition-colors text-sm font-semibold ${dependencyViewMode === 'browse' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-200'}`}>من قسم آخر</button>
                    <button onClick={() => setDependencyViewMode('search')} className={`flex-1 text-center py-2 px-3 rounded-md transition-colors text-sm font-semibold ${dependencyViewMode === 'search' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-200'}`}>بحث شامل</button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 p-1">
                    {dependencyViewMode === 'sameSection' && (
                        <ul className="space-y-1">
                            {sameSectionTasks.map(t => (
                                <li key={t.id}><button onClick={() => onAddDependency(t.id, selectedDepType)} disabled={!canAddDependency(taskId, t.id)} className="w-full text-right p-2 rounded hover:bg-indigo-50 text-sm font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed">{t.name}</button></li>
                            ))}
                        </ul>
                    )}
                    {dependencyViewMode === 'browse' && (
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <select value={browseAdminName} onChange={e => { setBrowseAdminName(e.target.value); setBrowseSectionName(''); }} className="p-2 border border-slate-300 rounded-md bg-white text-sm w-full"><option value="">اختر إدارة...</option>{browseAdmins.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}</select>
                                <select value={browseSectionName} onChange={e => setBrowseSectionName(e.target.value)} disabled={!browseAdminName} className="p-2 border border-slate-300 rounded-md bg-white text-sm w-full disabled:bg-slate-100"><option value="">اختر القسم...</option>{browseSections.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}</select>
                            </div>
                            {browseSectionName && (
                                <ul className="space-y-1 border-t pt-2 mt-2">
                                    {browseResultTasks.map(t => (
                                        <li key={t.id}><button onClick={() => onAddDependency(t.id, selectedDepType)} disabled={!canAddDependency(taskId, t.id)} className="w-full text-right p-2 rounded hover:bg-indigo-50 text-sm font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed">{t.name}</button></li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                    {dependencyViewMode === 'search' && (
                        <div>
                            <input type="text" value={depSearch} onChange={e => setDepSearch(e.target.value)} placeholder="ابحث بالاسم أو الكود..." className="w-full p-2 border border-slate-300 rounded-md mb-2" />
                            <ul className="space-y-1">
                                {searchResultTasks.map(t => (
                                    <li key={t.id}><button onClick={() => onAddDependency(t.id, selectedDepType)} disabled={!canAddDependency(taskId, t.id)} className="w-full text-right p-2 rounded hover:bg-indigo-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"><p className="font-medium text-sm">{t.name}</p><p className="text-xs text-slate-500">{t.path}</p></button></li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskDependencyManager;
