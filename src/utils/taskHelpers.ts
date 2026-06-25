import type { Task, ToplevelAdmin, Administration, AdministrationGroup } from '../types';

export const isAdministrationGroup = (item: ToplevelAdmin): item is AdministrationGroup => {
  return 'groupName' in item;
};

export const getAllAdmins = (items: ToplevelAdmin[]): Administration[] => {
    const all: Administration[] = [];
    items.forEach(item => {
      if (isAdministrationGroup(item)) {
        all.push(...item.administrations);
      } else {
        all.push(item);
      }
    });
    return all;
};

// FIX: Corrected TaskInput type to properly handle string and null durations.
// The original type intersected with Task['duration'] which is 'number', incorrectly
// narrowing the type of taskData.duration to 'number' only. By omitting 'duration'
// from the base type, we allow the new definition `number | string | null` to be used.
// ADDED: `count` property to handle special naming cases from `apparatus.line2.ts`.
type TaskInput = Omit<Task, 'id' | 'startDay' | 'personnel' | 'progress' | 'duration'> & {
    id?: string;
    duration: number | string | null;
    personnel?: string[];
    count?: number | string;
};

/**
 * Creates an array of tasks with sequential start days.
 * Any task sequence that would extend beyond the project cutoff date (Dec 31, 2025)
 * is split, with the overflowing tasks moved to start from day 0 in a parallel track.
 * This process is repeated iteratively to ensure no parallel track exceeds the cutoff.
 * @param tasksData The raw task data.
 * @param defaultPersonnel The default personnel array to assign to tasks.
 * @param idPrefix A prefix to use for generating task IDs if they don't exist.
 * @returns An array of fully formed Task objects.
 */
export const createSequentialTasks = (
  tasksData: TaskInput[], 
  defaultPersonnel: string[],
  idPrefix: string,
  cutoffDay: number = 138
): Task[] => {
  const CUTOFF_DAY = cutoffDay;

  // 1. Create all task objects from raw data
  const allTasks: Task[] = tasksData.map((taskData, index) => {
    let duration = typeof taskData.duration === 'string' 
      ? parseFloat(taskData.duration.replace(',', '.')) 
      : taskData.duration;
      
    if (duration === null || !duration || isNaN(duration) || duration <= 0) {
        duration = 1; // Default duration for tasks with no specified time
    }

    const taskName = taskData.count ? `${taskData.name} (عدد ${taskData.count})` : taskData.name;

    const task: Task = {
      id: taskData.id || `${idPrefix}-${index + 1}`,
      name: taskName,
      duration: duration,
      startDay: 0, // Placeholder, will be calculated below
      personnel: taskData.personnel || defaultPersonnel,
      itemCode: taskData.itemCode,
      progress: 0,
      notes: taskData.notes,
    };
    return task;
  });

  // 2. Schedule tasks into parallel tracks to respect the CUTOFF_DAY
  const finalTasks: Task[] = [];
  let tasksToProcess = [...allTasks];

  while (tasksToProcess.length > 0) {
    let currentSequence: Task[] = [];
    let currentDuration = 0;
    let nextBatchToProcess: Task[] = [];
    
    for (const task of tasksToProcess) {
      // If the current sequence is empty, add the first task regardless of its duration.
      // This prevents an infinite loop for tasks longer than CUTOFF_DAY.
      // Otherwise, only add tasks that fit within the remaining time.
      if (currentSequence.length === 0 || (currentDuration + task.duration <= CUTOFF_DAY)) {
        currentSequence.push(task);
        currentDuration += task.duration;
      } else {
        nextBatchToProcess.push(task);
      }
    }
    
    // Reschedule the created sequence to start from day 0
    let startDay = 0;
    currentSequence.forEach(task => {
        finalTasks.push({ ...task, startDay });
        startDay += task.duration;
    });
    
    // The remaining tasks will be processed in the next iteration, forming a new parallel track.
    tasksToProcess = nextBatchToProcess;
  }

  return finalTasks;
};

/**
 * Checks if adding a dependency from `fromTaskId` to `toTaskId` would create a circular dependency.
 * `toTaskId` depends on `fromTaskId` (fromTaskId -> toTaskId).
 * A cycle exists if `fromTaskId` already depends on `toTaskId` (directly or indirectly).
 */
export const wouldCreateCycle = (fromTaskId: string, toTaskId: string, tasksMap: Record<string, { dependencies?: any[] }>): boolean => {
    if (fromTaskId === toTaskId) return true;

    const visited = new Set<string>();
    const stack = [fromTaskId]; // Start at the task that we are asserting comes FIRST

    while (stack.length > 0) {
        const currentId = stack.pop()!;
        
        // If the task that should come FIRST actually depends on the task that should come AFTER, it's a cycle.
        if (currentId === toTaskId) return true;
        
        if (!visited.has(currentId)) {
            visited.add(currentId);
            const currentTask = tasksMap[currentId];
            if (currentTask && currentTask.dependencies) {
                for (const dep of currentTask.dependencies) {
                    const nextId = typeof dep === 'string' ? dep : dep.taskId;
                    if (!visited.has(nextId)) {
                        stack.push(nextId);
                    }
                }
            }
        }
    }

    return false;
};
