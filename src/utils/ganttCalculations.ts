import type { Task, ProductionLine, Administration } from '../types';
import { getAllAdmins } from './taskHelpers';

/**
 * Gets the first available admin and section from a production line.
 * Used to set the initial sidebar selection.
 */
export const getInitialAdminAndSection = (line: ProductionLine): { admin: Administration | null; section: import('../types').Section | null } => {
    if (!line || !line.administrations || line.administrations.length === 0) {
        return { admin: null, section: null };
    }

    const allAdmins = getAllAdmins(line.administrations);
    const admin = allAdmins[0] || null;
    const section = admin?.sections[0] || null;

    return { admin, section };
};

export const calculateProgress = (tasks: Task[]): number => {
    if (!tasks || tasks.length === 0) return 0;

    // Filter for only leaf-node tasks (tasks without children) to get an accurate progress calculation
    const childIds = new Set(tasks.map(task => task.parentId).filter(Boolean));
    const leafTasks = tasks.filter(task => !childIds.has(task.id));

    if (leafTasks.length === 0 && tasks.length > 0) { 
        const totalProgress = tasks.reduce((sum, t) => sum + (Number(t.progress) || 0), 0);
        return Math.round(totalProgress / tasks.length);
    }

    const totalWeightedProgress = leafTasks.reduce((acc, task) => {
        const weight = Number(task.duration) > 0 ? Number(task.duration) : 0;
        return acc + (Number(task.progress || 0) * weight);
    }, 0);
    
    const totalDuration = leafTasks.reduce((acc, task) => {
        const weight = Number(task.duration) > 0 ? Number(task.duration) : 0;
        return acc + weight;
    }, 0);

    if (totalDuration === 0) {
        const totalProgress = leafTasks.reduce((sum, t) => sum + (Number(t.progress) || 0), 0);
        return Math.round(totalProgress / leafTasks.length);
    }
    return Math.round(totalWeightedProgress / totalDuration);
};

/**
 * Finds the IDs of all tasks on the critical path using a forward/backward pass algorithm.
 * Critical path tasks have zero slack (float).
 */
export const findCriticalPathIds = (tasks: Task[]): Set<string> => {
    if (!tasks || tasks.length === 0) {
        return new Set();
    }

    const tasksById = new Map(tasks.map(t => [t.id, t]));
    const successors = new Map<string, {taskId: string, type: 'FS'|'SS'|'FF'}[]>();
    const predecessors = new Map<string, {taskId: string, type: 'FS'|'SS'|'FF'}[]>();
    const inDegree = new Map<string, number>();

    tasks.forEach(task => {
        successors.set(task.id, []);
        predecessors.set(task.id, []);
        inDegree.set(task.id, 0); // Initialize to 0
    });

    tasks.forEach(task => {
        (task.dependencies || []).forEach(dep => {
            // Backward compatibility
            const depObj = typeof dep === 'string' ? { taskId: dep as string, type: 'FS' as const } : dep as import('../types').Dependency;
            if (tasksById.has(depObj.taskId)) {
                successors.get(depObj.taskId)!.push({ taskId: task.id, type: depObj.type });
                predecessors.get(task.id)!.push({ taskId: depObj.taskId, type: depObj.type });
                inDegree.set(task.id, inDegree.get(task.id)! + 1); // Only increment if dependency is valid
            }
        });
    });

    const queue: string[] = tasks.filter(task => inDegree.get(task.id) === 0).map(t => t.id);
    const sortedTaskIds: string[] = [];

    while (queue.length > 0) {
        const u = queue.shift()!;
        sortedTaskIds.push(u);
        for (const v of successors.get(u) || []) {
            inDegree.set(v.taskId, inDegree.get(v.taskId)! - 1);
            if (inDegree.get(v.taskId) === 0) {
                queue.push(v.taskId);
            }
        }
    }

    if (sortedTaskIds.length !== tasks.length) {
        console.warn("A cycle may exist in task dependencies. Critical path calculation might be incorrect.");
        throw new Error("CircularDependency");
    }

    // Forward pass
    const earlyTimes = new Map<string, { es: number; ef: number }>();
    for (const taskId of sortedTaskIds) {
        const task = tasksById.get(taskId)!;
        let es = task.startDay; // Use existing start day for root tasks
        let ef = es + Number(task.duration);
        const taskPredecessors = predecessors.get(taskId) || [];
        
        if (taskPredecessors.length > 0) {
            let maxEs = es;
            let maxEf = ef;
            
            for (const dep of taskPredecessors) {
                const prereq = earlyTimes.get(dep.taskId);
                if (!prereq) continue;
                
                if (dep.type === 'FS') {
                    maxEs = Math.max(maxEs, prereq.ef);
                } else if (dep.type === 'SS') {
                    maxEs = Math.max(maxEs, prereq.es);
                } else if (dep.type === 'FF') {
                    maxEf = Math.max(maxEf, prereq.ef);
                    const impliedEs = maxEf - Number(task.duration);
                    maxEs = Math.max(maxEs, impliedEs);
                }
            }
            es = maxEs;
            ef = es + Number(task.duration);
        }
        earlyTimes.set(taskId, { es, ef });
    }

    const projectDuration = Math.max(0, ...Array.from(earlyTimes.values()).map(t => t.ef));

    // Backward pass
    const lateTimes = new Map<string, { ls: number; lf: number }>();
    for (const taskId of [...sortedTaskIds].reverse()) {
        const task = tasksById.get(taskId)!;
        let lf = projectDuration;
        let ls = lf - Number(task.duration);
        const taskSuccessors = successors.get(taskId) || [];
        
        if (taskSuccessors.length > 0) {
            let minLf = lf;
            
            for (const succ of taskSuccessors) {
                const postreq = lateTimes.get(succ.taskId);
                if (!postreq) continue;
                
                if (succ.type === 'FS') {
                    minLf = Math.min(minLf, postreq.ls);
                } else if (succ.type === 'SS') {
                    minLf = Math.min(minLf, postreq.ls + Number(task.duration));
                } else if (succ.type === 'FF') {
                    minLf = Math.min(minLf, postreq.lf);
                }
            }
            lf = minLf;
            ls = lf - Number(task.duration);
        }
        lateTimes.set(taskId, { ls, lf });
    }

    // Calculate slack
    const criticalIds = new Set<string>();
    for (const taskId of sortedTaskIds) {
        const et = earlyTimes.get(taskId)!;
        const lt = lateTimes.get(taskId)!;
        const slack = lt.ls - et.es;
        if (Math.abs(slack) < 0.01) { // Use a small epsilon for float comparison
            criticalIds.add(taskId);
        }
    }
    return criticalIds;
};
