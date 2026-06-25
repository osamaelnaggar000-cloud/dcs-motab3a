import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import type { Task, LocationAssignmentData, ProductionLine, Administration, SparePart } from '../types';
import { getAllAdmins } from '../utils/taskHelpers';
import { toast } from 'sonner';
import TaskGeneralFields from './task-detail/TaskGeneralFields';
import TaskPersonnelPicker from './task-detail/TaskPersonnelPicker';
import TaskDependencyManager from './task-detail/TaskDependencyManager';
import TaskSparePartsList from './task-detail/TaskSparePartsList';
import TaskProgressSlider from './task-detail/TaskProgressSlider';

interface TaskDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null; // Null when adding a new task
    parentId: string | null; // The ID of the parent task, if creating a sub-task
    onSave: (taskId: string | null, updatedProps: Partial<Task> & { location?: string }, parentId: string | null, targetAdminName?: string, targetSectionName?: string) => void;
    onDelete: (taskId: string) => void;
    currentLine: ProductionLine;
    personnelMap: Record<string, string>; // id -> name
    locationAssignments: LocationAssignmentData;
    currentAdminName: string;
    currentSectionName: string;
    projectStartDate: Date;
    locationsList: string[];
    canEdit?: boolean;
    canDelete?: boolean;
}

// Define Service Administrations that can receive routed tasks
const SERVICE_ADMIN_NAMES = [
    "الورشة الميكانيكية",
    "ورشة أعمال الصاج",
    "الهندسة المدنية"
];

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ isOpen, onClose, task, parentId, onSave, onDelete, currentLine, personnelMap, locationAssignments, currentAdminName, currentSectionName, projectStartDate, locationsList, canEdit = true, canDelete = true }) => {
    const isNewTask = task === null;

    const allTasksInLine = useMemo(() => {
        return getAllAdmins(currentLine.administrations).flatMap(admin =>
            admin.sections.map(section => ({
                adminName: admin.name,
                sectionName: section.name,
                tasks: section.tasks
            }))
        ).flatMap(({ adminName, sectionName, tasks }) =>
            tasks.map(t => ({ ...t, path: `${adminName} > ${sectionName}` }))
        );
    }, [currentLine]);

    const isParentTask = useMemo(() => {
        if (isNewTask || !task) return false;
        return allTasksInLine.some(t => t.parentId === task.id);
    }, [task, isNewTask, allTasksInLine]);

    const [name, setName] = useState('');
    const [duration, setDuration] = useState(1);
    const [startDate, setStartDate] = useState('');
    const [itemCode, setItemCode] = useState('');
    const [progress, setProgress] = useState(0);
    const [notes, setNotes] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('inherit');
    const [dependencies, setDependencies] = useState<import('../types').Dependency[]>([]);

    // Spare Parts State
    const [spareParts, setSpareParts] = useState<SparePart[]>([]);
    const [newPartName, setNewPartName] = useState('');
    const [newPartQty, setNewPartQty] = useState('');

    // New state for routing tasks
    const [targetAdminName, setTargetAdminName] = useState(currentAdminName);
    const [targetSectionName, setTargetSectionName] = useState(currentSectionName);

    const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<string[]>([]);
    const [personnelSearch, setPersonnelSearch] = useState('');
    const [isPersonnelDropdownOpen, setIsPersonnelDropdownOpen] = useState(false);

    // Dependency states
    const [dependencyViewMode, setDependencyViewMode] = useState<'sameSection' | 'browse' | 'search'>('sameSection');
    const [depSearch, setDepSearch] = useState('');
    const [browseAdminName, setBrowseAdminName] = useState('');
    const [browseSectionName, setBrowseSectionName] = useState('');


    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    const inheritedLocation = useMemo(() => {
        if (!locationAssignments) return 'غير محدد';
        const sectionKey = `${currentLine.name}/${targetAdminName}/${targetSectionName}`;
        const adminKey = `${currentLine.name}/${targetAdminName}`;
        return locationAssignments[sectionKey] ?? locationAssignments[adminKey] ?? 'غير مسند';
    }, [locationAssignments, currentLine.name, targetAdminName, targetSectionName]);

    // Filter admins to only show current admin OR service admins
    const availableAdmins = useMemo(() => {
        const all = getAllAdmins(currentLine.administrations);
        return all.filter(admin =>
            admin.name === currentAdminName || SERVICE_ADMIN_NAMES.includes(admin.name)
        );
    }, [currentLine, currentAdminName]);

    const availableSections = useMemo(() => {
        const admin = availableAdmins.find(a => a.name === targetAdminName);
        return admin ? admin.sections : [];
    }, [targetAdminName, availableAdmins]);

    useEffect(() => {
        if (isOpen) {
            if (isNewTask) {
                setName('');
                setDuration(1);
                setItemCode('');
                setProgress(0);
                setNotes('');
                setStartDate('');
                setSelectedPersonnelIds([]);
                setSelectedLocation('inherit');
                setDependencies([]);
                setSpareParts([]);
                // Initialize target admin/section with current context
                setTargetAdminName(currentAdminName);
                setTargetSectionName(currentSectionName);
            } else {
                setName(task.name);
                setDuration(task.duration);
                setItemCode(task.itemCode || '');
                setProgress(task.progress);
                setNotes(task.notes || '');
                setSelectedPersonnelIds(task.personnel || []);
                setSelectedLocation(locationAssignments[task.id] || 'inherit');
                setDependencies(task.dependencies || []);
                setSpareParts(task.spareParts || []);
                // Existing tasks stay in their container initially
                setTargetAdminName(currentAdminName);
                setTargetSectionName(currentSectionName);

                // Robust date calculation using local time to avoid timezone shifts
                if (projectStartDate) {
                    const startDayOffset = Number(task.startDay) || 0;
                    const projectDate = new Date(projectStartDate);
                    const taskDate = new Date(projectDate);
                    taskDate.setDate(taskDate.getDate() + startDayOffset);
                    
                    const year = taskDate.getFullYear();
                    const month = String(taskDate.getMonth() + 1).padStart(2, '0');
                    const day = String(taskDate.getDate()).padStart(2, '0');
                    setStartDate(`${year}-${month}-${day}`);
                } else {
                    setStartDate('');
                }
            }
            setPersonnelSearch('');
            setIsPersonnelDropdownOpen(false);
            setDepSearch('');
            setIsConfirmingDelete(false);
            setDependencyViewMode('sameSection');
            setBrowseAdminName('');
            setBrowseSectionName('');
            setNewPartName('');
            setNewPartQty('');
        }
    }, [task, isOpen, isNewTask, locationAssignments, projectStartDate, currentAdminName, currentSectionName]);

    // Update section when admin changes
    const handleAdminChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newAdmin = e.target.value;
        setTargetAdminName(newAdmin);
        const adminObj = availableAdmins.find(a => a.name === newAdmin);
        if (adminObj && adminObj.sections.length > 0) {
            setTargetSectionName(adminObj.sections[0].name);
        } else {
            setTargetSectionName('');
        }
    };

    const handleSave = () => {
        if (isNewTask && !name) {
            toast.error('الرجاء إدخال اسم.');
            return;
        }

        const updatedProps: Partial<Task> & { location?: string } = {
            name,
            personnel: selectedPersonnelIds,
            itemCode,
            notes,
            location: selectedLocation,
            dependencies,
            spareParts,
        };

        // For auto-scheduled tasks, start date is not directly editable if there are dependencies
        const hasDeps = dependencies && dependencies.length > 0;
        if (!isParentTask && !hasDeps) {
            updatedProps.progress = Number(progress);
            updatedProps.duration = Number(duration) || 1;

            if (startDate && projectStartDate) {
                // Calculate diff based on UTC timestamps to ensure day accuracy without timezone shifts
                const [year, month, day] = startDate.split('-').map(Number);
                const projectDate = new Date(projectStartDate);

                // Normalize to UTC midnight
                const s = Date.UTC(year, month - 1, day);
                const p = Date.UTC(projectDate.getFullYear(), projectDate.getMonth(), projectDate.getDate());

                if (!isNaN(s) && !isNaN(p)) {
                    const dayDiff = Math.round((s - p) / (1000 * 60 * 60 * 24));
                    updatedProps.startDay = dayDiff;
                }
            }
        } else if (!isParentTask) {
            // Duration and progress are still editable for dependent tasks
            updatedProps.progress = Number(progress);
            updatedProps.duration = Number(duration) || 1;
        }

        onSave(isNewTask ? null : task.id, updatedProps, parentId, targetAdminName, targetSectionName);
        onClose();
    };

    const handleDeleteClick = () => {
        if (isNewTask || !task) return;
        setIsConfirmingDelete(true);
    };

    const confirmDelete = () => {
        if (isNewTask || !task) return;
        onDelete(task.id);
        setIsConfirmingDelete(false);
        onClose();
    };

    const cancelDelete = () => {
        setIsConfirmingDelete(false);
    };

    const handleRemovePersonnel = (idToRemove: string) => {
        setSelectedPersonnelIds(ids => ids.filter(id => id !== idToRemove));
    };

    const handleAddPersonnel = (idToAdd: string) => {
        if (!selectedPersonnelIds.includes(idToAdd)) {
            setSelectedPersonnelIds(ids => [...ids, idToAdd]);
        }
        setPersonnelSearch('');
        setIsPersonnelDropdownOpen(false);
    };

    // --- Spare Parts Logic ---
    const handleAddPart = () => {
        if (!newPartName.trim()) return;
        const newPart: SparePart = {
            id: `part-${Date.now()}`,
            name: newPartName.trim(),
            quantity: newPartQty.trim()
        };
        setSpareParts(prev => [...prev, newPart]);
        setNewPartName('');
        setNewPartQty('');
    };

    const handleRemovePart = (partId: string) => {
        setSpareParts(prev => prev.filter(p => p.id !== partId));
    };
    // --- End Spare Parts Logic ---

    // --- Dependency Logic ---
    const tasksById = useMemo(() => new Map(allTasksInLine.map(t => [t.id, t])), [allTasksInLine]);

    const canAddDependency = (targetTaskId: string | undefined, prerequisiteId: string): boolean => {
        if (!targetTaskId) return false;
        const visited = new Set<string>();
        const queue: string[] = [prerequisiteId];
        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (currentId === targetTaskId) return false; // Cycle detected
            if (visited.has(currentId)) continue;
            visited.add(currentId);
            const currentTask = tasksById.get(currentId);
            if (currentTask?.dependencies) {
                queue.push(...currentTask.dependencies.map(d => typeof d === 'string' ? d : (d as import('../types').Dependency).taskId));
            }
        }
        return true;
    };

    const handleAddDependency = (idToAdd: string, type: 'FS'|'SS'|'FF' = 'FS') => {
        const currentTaskId = task?.id;
        if (currentTaskId && !canAddDependency(currentTaskId, idToAdd)) {
            toast.error("لا يمكن إضافة هذه المهمة لأنها ستؤدي إلى اعتمادية دائرية.");
            return;
        }
        if (!dependencies.some(d => d.taskId === idToAdd)) {
            setDependencies(deps => [...deps, { taskId: idToAdd, type }]);
        }
    };

    const handleRemoveDependency = (idToRemove: string) => {
        setDependencies(deps => deps.filter(d => d.taskId !== idToRemove));
    };

    const sameSectionTasks = useMemo(() => {
        const section = getAllAdmins(currentLine.administrations)
            .find(a => a.name === currentAdminName)
            ?.sections.find(s => s.name === currentSectionName);

        if (!section) return [];

        return section.tasks.filter(t =>
            t.id !== task?.id &&
            !dependencies.some(d => (typeof d === 'string' ? d : (d as import('../types').Dependency).taskId) === t.id)
        );
    }, [currentLine, currentAdminName, currentSectionName, task, dependencies]);

    const browseAdmins = useMemo(() => getAllAdmins(currentLine.administrations), [currentLine]);
    const browseSections = useMemo(() => {
        if (!browseAdminName) return [];
        return browseAdmins.find(a => a.name === browseAdminName)?.sections || [];
    }, [browseAdminName, browseAdmins]);

    const browseResultTasks = useMemo(() => {
        if (!browseSectionName) return [];
        const section = browseSections.find(s => s.name === browseSectionName);
        if (!section) return [];
        return section.tasks.filter(t =>
            t.id !== task?.id &&
            !dependencies.some(d => (typeof d === 'string' ? d : (d as import('../types').Dependency).taskId) === t.id)
        );
    }, [browseSectionName, browseSections, task, dependencies]);

    const searchResultTasks = useMemo(() => {
        if (!depSearch.trim()) return [];
        return allTasksInLine.filter(t =>
            t.id !== task?.id &&
            !dependencies.some(d => (typeof d === 'string' ? d : (d as import('../types').Dependency).taskId) === t.id) &&
            (t.name.toLowerCase().includes(depSearch.toLowerCase()) ||
                (t.itemCode && t.itemCode.toLowerCase().includes(depSearch.toLowerCase())))
        );
    }, [allTasksInLine, dependencies, depSearch, task]);
    // --- End Dependency Logic ---

    if (!isOpen) return null;
    const hasDeps = dependencies.length > 0;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent showCloseButton={false} className="w-[95vw] md:w-[85vw] max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl" dir="rtl">
                    <DialogTitle className="sr-only">تفاصيل المهمة</DialogTitle>
                    <DialogDescription className="sr-only">تعديل ومتابعة تفاصيل المهمة المحددة</DialogDescription>
                    <header className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-center flex-shrink-0 bg-slate-50/50">
                        <h2 className="text-xl font-bold text-zinc-800">
                            {isNewTask ? (parentId ? 'إضافة مهمة فرعية' : 'إضافة مهمة جديدة') : 'متابعة وتعديل المهمة'}
                        </h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </header>
                    <main className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">

                        <TaskGeneralFields
                            name={name}
                            setName={setName}
                            duration={duration}
                            setDuration={setDuration}
                            startDate={startDate}
                            setStartDate={setStartDate}
                            itemCode={itemCode}
                            setItemCode={setItemCode}
                            notes={notes}
                            setNotes={setNotes}
                            selectedLocation={selectedLocation}
                            setSelectedLocation={setSelectedLocation}
                            targetAdminName={targetAdminName}
                            targetSectionName={targetSectionName}
                            setTargetSectionName={setTargetSectionName}
                            handleAdminChange={handleAdminChange}
                            availableAdmins={availableAdmins}
                            availableSections={availableSections}
                            inheritedLocation={inheritedLocation}
                            locationsList={locationsList}
                            isParentTask={isParentTask}
                            hasDeps={hasDeps}
                            parentId={parentId}
                        />

                        <TaskPersonnelPicker
                            selectedPersonnelIds={selectedPersonnelIds}
                            personnelMap={personnelMap}
                            personnelSearch={personnelSearch}
                            setPersonnelSearch={setPersonnelSearch}
                            isPersonnelDropdownOpen={isPersonnelDropdownOpen}
                            setIsPersonnelDropdownOpen={setIsPersonnelDropdownOpen}
                            onAddPersonnel={handleAddPersonnel}
                            onRemovePersonnel={handleRemovePersonnel}
                            itemCode={itemCode}
                            setItemCode={setItemCode}
                        />

                        <TaskSparePartsList
                            spareParts={spareParts}
                            newPartName={newPartName}
                            setNewPartName={setNewPartName}
                            newPartQty={newPartQty}
                            setNewPartQty={setNewPartQty}
                            onAddPart={handleAddPart}
                            onRemovePart={handleRemovePart}
                        />

                        <TaskDependencyManager
                            isNewTask={isNewTask}
                            dependencies={dependencies}
                            tasksById={tasksById}
                            dependencyViewMode={dependencyViewMode}
                            setDependencyViewMode={setDependencyViewMode}
                            depSearch={depSearch}
                            setDepSearch={setDepSearch}
                            browseAdminName={browseAdminName}
                            setBrowseAdminName={setBrowseAdminName}
                            browseSectionName={browseSectionName}
                            setBrowseSectionName={setBrowseSectionName}
                            sameSectionTasks={sameSectionTasks}
                            browseAdmins={browseAdmins}
                            browseSections={browseSections}
                            browseResultTasks={browseResultTasks}
                            searchResultTasks={searchResultTasks}
                            canAddDependency={canAddDependency}
                            onAddDependency={handleAddDependency}
                            onRemoveDependency={handleRemoveDependency}
                            taskId={task?.id}
                        />

                        <TaskProgressSlider
                            progress={progress}
                            setProgress={setProgress}
                            isParentTask={isParentTask}
                        />
                    </main>
                    <footer className="p-4 sm:p-6 bg-slate-50/50 border-t border-slate-200 flex justify-between items-center flex-shrink-0">
                        <div>
                            {!isNewTask && canDelete && (
                                <button
                                    onClick={handleDeleteClick}
                                    className="bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2 px-4 rounded-lg transition-colors border border-red-200 flex items-center gap-2"
                                    aria-label="حذف المهمة"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                    <span>حذف المهمة</span>
                                </button>
                            )}
                            {!isNewTask && !canEdit && (
                                <span className="text-xs text-slate-400 italic">وضع العرض فقط — ليس لديك صلاحية التعديل</span>
                            )}
                        </div>
                        <div className="flex justify-end gap-3">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onClose}
                                className="bg-white hover:bg-slate-100 text-zinc-700 font-bold py-2 px-4 rounded-lg transition-colors border border-slate-300"
                            >
                                {canEdit ? 'إلغاء' : 'إغلاق'}
                            </motion.button>
                            {canEdit && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleSave}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                    حفظ
                                </motion.button>
                            )}
                        </div>
                    </footer>
                </DialogContent>
            </Dialog>
            {isConfirmingDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-[80] flex justify-center items-center p-4 no-print">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-lg shadow-xl w-full max-w-md"
                    >
                        <header className="p-4 border-b border-slate-200 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-red-700">تأكيد الحذف</h2>
                            <button onClick={cancelDelete} className="text-slate-400 hover:text-slate-600">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </header>
                        <main className="p-6">
                            <p className="text-slate-600">هل أنت متأكد من رغبتك في حذف هذه المهمة؟</p>
                            <p className="text-sm text-red-600 mt-2">سيتم حذف جميع المهام الفرعية المرتبطة بها أيضاً. لا يمكن التراجع عن هذا الإجراء.</p>
                        </main>
                        <footer className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 rounded-b-lg">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={cancelDelete}
                                className="bg-white hover:bg-slate-100 text-zinc-700 font-bold py-2 px-4 rounded-lg transition-colors border border-slate-300"
                            >
                                إلغاء
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={confirmDelete}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                نعم، قم بالحذف
                            </motion.button>
                        </footer>
                    </motion.div>
                </div>
            )}
        </>
    );
};

export default TaskDetailModal;