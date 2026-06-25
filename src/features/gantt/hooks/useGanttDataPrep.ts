import { useMemo } from 'react';
import type { Task, PersonnelData, OrganizationalNode, Holiday } from '../../../types';
import { getHolidaySet } from '../../../utils/dateHelpers';
import { NODE_TYPE_LABELS } from '../../../types';

export interface DisplayTask extends Task {
  depth: number;
  hasChildren: boolean;
}

import { calculateProgress } from '../../../utils/ganttCalculations';

export const useGanttDataPrep = (
  sectionTasks: Task[],
  allLineTasks: Task[],
  personnelData: PersonnelData,
  personnelMap: Record<string, string>,
  hierarchyNodes: OrganizationalNode[] | undefined,
  projectStartDate: Date,
  totalProjectDays: number,
  holidays: Holiday[]
) => {
  const holidaySet = useMemo(() => getHolidaySet(projectStartDate, holidays, totalProjectDays), [projectStartDate, holidays, totalProjectDays]);

  const { displayedTasks, allLineTasksMap, hasDependencies } = useMemo(() => {
    const taskMap = new Map<string, Task>(sectionTasks.map(t => [t.id, { ...t }]));
    const lineTaskMap = new Map<string, Task>(allLineTasks.map(t => [t.id, { ...t }]));
    const childrenMap = new Map<string, string[]>();
    let hasDeps = false;

    sectionTasks.forEach(t => {
      if (t.parentId) {
        if (!childrenMap.has(t.parentId)) childrenMap.set(t.parentId, []);
        childrenMap.get(t.parentId)!.push(t.id);
      }
      if (t.dependencies && t.dependencies.length > 0) {
        hasDeps = true;
      }
    });

    const flatList: DisplayTask[] = [];
    const topLevelTasks = sectionTasks.filter(t => !t.parentId);

    const buildFlatList = (tasks: Task[], depth: number) => {
      tasks.forEach(task => {
        const hasChildren = childrenMap.has(task.id);
        flatList.push({ ...task, depth, hasChildren });
        if (hasChildren && task.isExpanded) {
          const children = (childrenMap.get(task.id) || []).map(id => taskMap.get(id)!);
          buildFlatList(children, depth + 1);
        }
      });
    };

    buildFlatList(topLevelTasks, 0);
    return { displayedTasks: flatList, allLineTasksMap: lineTaskMap, hasDependencies: hasDeps };
  }, [sectionTasks, allLineTasks]);

  const { assignedPersonnelByCategory, assignedPersonnelIds } = useMemo(() => {
    const personnelIdSet = new Set<string>();
    sectionTasks.forEach(task => {
      task.personnel.forEach(personId => {
        personnelIdSet.add(personId);
      });
    });

    const categoryMap: Record<string, string[]> = {};
    
    personnelIdSet.forEach(id => {
      const p = personnelData.personnel[id];
      const name = personnelMap[id];
      if (name) {
        let cat = 'غير مصنف';
        if (p && p.nodeId && hierarchyNodes) {
          const node = hierarchyNodes.find(n => n.id === p.nodeId);
          if (node) cat = NODE_TYPE_LABELS[node.type] || node.name;
        }
        if (!categoryMap[cat]) categoryMap[cat] = [];
        categoryMap[cat].push(name);
      }
    });

    return { assignedPersonnelByCategory: categoryMap, assignedPersonnelIds: Array.from(personnelIdSet) };
  }, [sectionTasks, personnelMap, personnelData, hierarchyNodes]);

  const overallProgress = useMemo(() => {
    return calculateProgress(sectionTasks);
  }, [sectionTasks]);

  return {
    holidaySet,
    displayedTasks,
    allLineTasksMap,
    hasDependencies,
    assignedPersonnelByCategory,
    assignedPersonnelIds,
    overallProgress
  };
};
