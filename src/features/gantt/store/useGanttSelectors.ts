import { useGanttStore } from './useGanttStore';
import { useMemo } from 'react';
import type { ProductionLine, Task } from '../../../types';

/**
 * Memoized selector that rebuilds the legacy nested ProductionLine tree
 * from the normalized store. This prevents O(N) recalculation on every render
 * inside Dashboard.tsx.
 */
export const useProductionLinesTree = (): ProductionLine[] => {
  const lines = useGanttStore(state => state.lines);
  const groups = useGanttStore(state => state.groups);
  const administrations = useGanttStore(state => state.administrations);
  const sections = useGanttStore(state => state.sections);
  const tasks = useGanttStore(state => state.tasks);

  // We use useMemo to only rebuild the tree when the normalized state changes.
  return useMemo(() => {
    return Object.values(lines).map((line) => {
      return {
        id: line.id,
        name: line.name,
        administrations: line.administrationIds.map((adminOrGroupId) => {
          if (groups[adminOrGroupId]) {
            const group = groups[adminOrGroupId];
            return {
              id: group.id,
              groupName: group.groupName,
              administrations: group.administrationIds.map((adminId) => {
                const admin = administrations[adminId];
                if (!admin) return null;
                return {
                  id: admin.id,
                  name: admin.name,
                  sections: admin.sectionIds.map((sectionId) => {
                    const section = sections[sectionId];
                    if (!section) return null;
                    return {
                      id: section.id,
                      name: section.name,
                      tasks: section.taskIds.map(taskId => {
                        const taskProps = tasks[taskId];
                        if (!taskProps) return null;
                        const { sectionId, ...rest } = taskProps;
                        return rest as Task;
                      }).filter(Boolean) as Task[]
                    };
                  }).filter(Boolean)
                };
              }).filter(Boolean)
            };
          } else {
            const admin = administrations[adminOrGroupId];
            if (!admin) return null;
            return {
              id: admin.id,
              name: admin.name,
              sections: admin.sectionIds.map((sectionId) => {
                const section = sections[sectionId];
                if (!section) return null;
                return {
                  id: section.id,
                  name: section.name,
                  tasks: section.taskIds.map(taskId => {
                    const taskProps = tasks[taskId];
                    if (!taskProps) return null;
                    const { sectionId, ...rest } = taskProps;
                    return rest as Task;
                  }).filter(Boolean) as Task[]
                };
              }).filter(Boolean)
            };
          }
        }).filter(Boolean) as any[]
      };
    });
  }, [lines, groups, administrations, sections, tasks]);
};

export const useStoreForHooks = () => {
  const lines = useGanttStore(state => state.lines);
  const groups = useGanttStore(state => state.groups);
  const administrations = useGanttStore(state => state.administrations);
  const sections = useGanttStore(state => state.sections);
  const tasks = useGanttStore(state => state.tasks);

  return useMemo(() => ({ lines, administrations, sections, tasks, groups }), [lines, administrations, sections, tasks, groups]);
};
