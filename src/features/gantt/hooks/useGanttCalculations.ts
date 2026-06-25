import { useMemo } from 'react';
import type { Task, LocationAssignmentData } from '../../../types';
import type { NormalizedGanttState } from '../types';
import { calculateProgress, findCriticalPathIds } from '../../../utils/ganttCalculations';

export const useGanttCalculations = (
  store: Pick<NormalizedGanttState, 'lines' | 'administrations' | 'sections' | 'tasks'>,
  currentLineId: string | null,
  isLoading: boolean,
  showCriticalPath: boolean,
  locationAssignments: LocationAssignmentData,
  sidebarView: string,
  selectedLocation: string | null
) => {
  const totalProgress = useMemo(() => {
    if (isLoading || Object.keys(store.lines).length === 0) return 0;
    // O(N) calculation over all tasks
    const allTasks = Object.values(store.tasks);
    return calculateProgress(allTasks);
  }, [store.tasks, store.lines, isLoading]);

  const criticalPathTaskIds = useMemo(() => {
    if (!showCriticalPath || !currentLineId) {
      return new Set<string>();
    }
    const allTasksInLine = Object.values(store.tasks).filter(task => {
        const section = store.sections[task.sectionId];
        if (!section) return false;
        const admin = store.administrations[section.administrationId];
        return admin?.lineId === currentLineId;
    });

    try {
        return findCriticalPathIds(allTasksInLine as Task[]);
    } catch (error) {
        console.error("Critical path calculation failed:", error);
        return new Set<string>();
    }
  }, [currentLineId, showCriticalPath, store.tasks, store.sections, store.administrations]);

  const locationProgressMap = useMemo(() => {
    if (isLoading || Object.keys(store.lines).length === 0 || !locationAssignments) return {};

    const tasksByLineAndLocation: Record<string, Task[]> = {};

    const getLocationFor = (lineName: string, adminName: string, sectionName: string, taskId: string): string | null => {
      return locationAssignments[taskId] ?? locationAssignments[`${lineName}/${adminName}/${sectionName}`] ?? locationAssignments[`${lineName}/${adminName}`] ?? null;
    };

    Object.values(store.tasks).forEach(task => {
        const section = store.sections[task.sectionId];
        if (!section) return;
        const admin = store.administrations[section.administrationId];
        if (!admin) return;
        const line = store.lines[admin.lineId];
        if (!line) return;

        const location = getLocationFor(line.name, admin.name, section.name, task.id);
        if (location) {
            const key = `${line.name}/${location}`;
            if (!tasksByLineAndLocation[key]) {
                tasksByLineAndLocation[key] = [];
            }
            tasksByLineAndLocation[key].push(task as Task);
        }
    });

    const progressMap: Record<string, number> = {};
    for (const key in tasksByLineAndLocation) {
      if (tasksByLineAndLocation[key].length > 0) {
        progressMap[key] = calculateProgress(tasksByLineAndLocation[key]);
      }
    }
    return progressMap;
  }, [store.tasks, store.sections, store.administrations, store.lines, locationAssignments, isLoading]);

  const virtualSectionForLocation = useMemo(() => {
    if (sidebarView !== 'location' || !selectedLocation || !locationAssignments || !currentLineId) {
      return null;
    }
    
    const currentLine = store.lines[currentLineId];
    if (!currentLine) return null;

    const tasksByGroup: Record<string, Task[]> = {};

    const getLocationFor = (lineName: string, adminName: string, sectionName: string, taskId: string): string | null => {
      return locationAssignments[taskId] ?? locationAssignments[`${lineName}/${adminName}/${sectionName}`] ?? locationAssignments[`${lineName}/${adminName}`] ?? null;
    };

    Object.values(store.tasks).forEach(task => {
        const section = store.sections[task.sectionId];
        if (!section) return;
        const admin = store.administrations[section.administrationId];
        if (!admin || admin.lineId !== currentLineId) return;

        const taskLocation = getLocationFor(currentLine.name, admin.name, section.name, task.id);
        if (taskLocation === selectedLocation) {
            const groupName = admin.name;

            if (!tasksByGroup[groupName]) {
              tasksByGroup[groupName] = [];
            }
            const contextualTaskName = `[${section.name}] ${task.name}`;
            tasksByGroup[groupName].push({ ...task, name: contextualTaskName } as Task);
        }
    });

    const structuredTasks: Task[] = [];
    for (const [groupName, tasks] of Object.entries(tasksByGroup)) {
      const adminProgress = calculateProgress(tasks);
      const minStartDay = tasks.length > 0 ? Math.min(...tasks.map(t => t.startDay)) : 0;
      const maxEndDay = tasks.length > 0 ? Math.max(...tasks.map(t => t.startDay + t.duration)) : 0;
      const duration = Math.max(1, maxEndDay - minStartDay);
      const adminParentId = `virtual-group-${groupName.replace(/\\s+/g, '-')}`;

      const adminParentTask: Task = {
        id: adminParentId,
        name: `إدارة: ${groupName}`,
        duration: duration,
        startDay: minStartDay,
        personnel: [],
        progress: adminProgress,
        isExpanded: true,
        parentId: null
      };

      structuredTasks.push(adminParentTask);
      tasks.forEach(t => {
        structuredTasks.push({ ...t, parentId: adminParentId });
      });
    }

    return {
      id: 'virtual-location-section',
      name: `مهام في: ${selectedLocation}`,
      tasks: structuredTasks,
    };
  }, [sidebarView, selectedLocation, locationAssignments, currentLineId, store.tasks, store.sections, store.administrations, store.lines]);

  return {
    totalProgress,
    criticalPathTaskIds,
    locationProgressMap,
    virtualSectionForLocation
  };
};

