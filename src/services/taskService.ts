import type { Task, ProductionLine } from '../types';
import { getAllAdmins, wouldCreateCycle } from '../utils/taskHelpers';
import { toast } from 'sonner';

interface SaveTaskParams {
    taskId: string | null;
    updatedProps: Partial<Task> & { location?: string };
    parentId: string | null;
    targetAdminName?: string;
    targetSectionName?: string;
    currentLine: ProductionLine | null;
    activeAdminName?: string;
    selectedSectionName?: string;
    updateTask: (taskId: string, updates: Partial<Task>) => void;
    addTask: (adminName: string, sectionName: string, task: any, parentId: string | null) => void;
    setAssignment: (taskId: string, location: string) => void;
    removeAssignment: (taskId: string) => void;
}

export const handleSaveTaskAction = ({
    taskId,
    updatedProps,
    parentId,
    targetAdminName,
    targetSectionName,
    currentLine,
    activeAdminName,
    selectedSectionName,
    updateTask,
    addTask,
    setAssignment,
    removeAssignment
}: SaveTaskParams) => {
    const { location, ...taskProps } = updatedProps;
    const newTaskId = taskId ?? crypto.randomUUID();

    if (taskId) {
        let currentAdminName = '';
        let currentSectionName = '';

        if (currentLine) {
            const allAdmins = getAllAdmins(currentLine.administrations);
            for (const admin of allAdmins) {
                for (const section of admin.sections) {
                    if (section.tasks.some(t => t.id === taskId)) {
                        currentAdminName = admin.name;
                        currentSectionName = section.name;
                        break;
                    }
                }
                if (currentAdminName) break;
            }
        }

        if (targetAdminName && targetSectionName && (currentAdminName !== targetAdminName || currentSectionName !== targetSectionName)) {
            // Copy Task Logic
            const originalTaskUpdate = {
                ...taskProps,
                name: `${taskProps.name} (تم التوجيه إلى ${targetSectionName} - ${targetAdminName})`
            };
            updateTask(taskId, originalTaskUpdate);

            const copyTaskAndChildren = (taskToCopyId: string, newParentId: string | null = null, isRoot: boolean = true) => {
                let originalTask: Task | null = null;
                if (currentLine) {
                    const allTasks = getAllAdmins(currentLine.administrations).flatMap(a => a.sections.flatMap(s => s.tasks));
                    originalTask = allTasks.find(t => t.id === taskToCopyId) || null;
                }

                if (!originalTask) return;

                const newId = `copy-${originalTask.id}-${crypto.randomUUID()}`;
                const namePrefix = isRoot ? `[من ${currentAdminName}] ` : '';
                const taskName = isRoot ? (taskProps.name || originalTask.name) : originalTask.name;

                const clonedTask: Task = {
                    ...originalTask,
                    id: newId,
                    name: `${namePrefix}${taskName}`,
                    parentId: newParentId,
                    dependencies: [], 
                };

                if (isRoot) {
                    if (taskProps.duration !== undefined) clonedTask.duration = taskProps.duration;
                    if (taskProps.personnel !== undefined) clonedTask.personnel = taskProps.personnel;
                    if (taskProps.itemCode !== undefined) clonedTask.itemCode = taskProps.itemCode;
                    if (taskProps.notes !== undefined) clonedTask.notes = taskProps.notes;
                    if (taskProps.startDay !== undefined) clonedTask.startDay = taskProps.startDay;
                    if (taskProps.progress !== undefined) clonedTask.progress = taskProps.progress;
                }

                addTask(targetAdminName, targetSectionName, clonedTask, newParentId);

                if (isRoot && location && location !== 'inherit') {
                    setAssignment(newId, location);
                }

                if (currentLine) {
                    const allTasks = getAllAdmins(currentLine.administrations).flatMap(a => a.sections.flatMap(s => s.tasks));
                    const children = allTasks.filter(t => t.parentId === originalTask!.id);
                    for (const child of children) {
                        copyTaskAndChildren(child.id, newId, false);
                    }
                }
            };

            copyTaskAndChildren(taskId, null, true);

        } else {
            // Regular Update in place
            updateTask(taskId, taskProps);
            if (location === 'inherit') {
                removeAssignment(taskId);
            } else if (location) {
                setAssignment(taskId, location);
            }
        }
    } else {
        const adminName = targetAdminName || activeAdminName;
        const sectionName = targetSectionName || selectedSectionName;

        if (adminName && sectionName) {
            const newTaskPayload = {
                id: newTaskId,
                name: taskProps.name || 'مهمة جديدة',
                duration: taskProps.duration ?? 1,
                personnel: taskProps.personnel || [],
                itemCode: taskProps.itemCode,
                notes: taskProps.notes,
                dependencies: taskProps.dependencies || [],
                startDay: 0,
                progress: 0
            };
            addTask(adminName, sectionName, newTaskPayload, parentId);

            if (location === 'inherit') {
                removeAssignment(newTaskId);
            } else if (location) {
                setAssignment(newTaskId, location);
            }
        }
    }
};

interface DependencyParams {
    fromTaskId: string;
    toTaskId: string;
    type: 'FS'|'SS'|'FF';
    currentLine: ProductionLine | null;
    updateTask: (taskId: string, updates: Partial<Task>) => void;
}

export const handleAddDependencyAction = ({
    fromTaskId,
    toTaskId,
    type = 'FS',
    currentLine,
    updateTask
}: DependencyParams) => {
    if (!currentLine) return;
    let toTask: Task | undefined;
    
    const allAdmins = getAllAdmins(currentLine.administrations);
    for (const admin of allAdmins) {
        for (const section of admin.sections) {
            const found = section.tasks.find(t => t.id === toTaskId);
            if (found) {
                toTask = found;
                break;
            }
        }
        if (toTask) break;
    }

    if (toTask) {
        // Collect all tasks into a map for cycle detection
        const allTasksMap: Record<string, any> = {};
        const allAdminsMap = getAllAdmins(currentLine.administrations);
        allAdminsMap.forEach(admin => {
            admin.sections.forEach(section => {
                section.tasks.forEach(t => {
                    allTasksMap[t.id] = t;
                });
            });
        });

        if (wouldCreateCycle(fromTaskId, toTaskId, allTasksMap)) {
            toast.error("لا يمكن إضافة التبعية، مسار دائري (Circular Dependency) مكتشف!");
            return; // Prevent creating a circular dependency
        }

        const deps = toTask.dependencies || [];
        const exists = deps.some(d => (typeof d === 'string' ? d : d.taskId) === fromTaskId);
        if (!exists) {
            const newDeps = [...deps, { taskId: fromTaskId, type }] as import('../types').Dependency[];
            updateTask(toTaskId, { dependencies: newDeps });
        }
    }
};
