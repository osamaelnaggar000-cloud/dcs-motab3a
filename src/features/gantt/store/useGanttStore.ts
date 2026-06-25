import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { NormalizedGanttState, NormalizedTask } from '../types';

interface GanttStoreActions {
  initializeState: (state: NormalizedGanttState) => void;
  updateProjectStartDate: (date: string) => void;
  updateTotalProjectDays: (days: number) => void;
  
  // Task Actions
  updateTask: (taskId: string, updates: Partial<NormalizedTask>) => void;
  addTask: (sectionId: string, newTask: Partial<NormalizedTask>, parentId: string | null) => void;
  deleteTask: (taskId: string) => void;
  toggleTaskExpansion: (taskId: string) => void;
  reorderTasks: (sectionId: string, taskIds: string[]) => void;
  autoLinkAllTasks: () => void;
  resetAllProgress: () => void;
  removeAllDependencies: () => void;
  unassignPersonnel: (personnelId: string) => void;
  
  // Structure Actions
  addProductionLine: (name: string) => void;
  removeProductionLine: (lineId: string) => void;
  addAdministrationGroup: (lineId: string, groupName: string) => void;
  addAdministration: (lineId: string, name: string, groupId?: string) => void;
  moveAdministration: (adminId: string, targetGroupId: string | null) => void;
  updateAdministration: (id: string, newName: string) => void;
  deleteAdministration: (id: string) => void;
  deleteSectorOnly: (groupId: string) => void;
  addSection: (adminId: string, name: string) => void;
  updateSection: (sectionId: string, name: string) => void;
  deleteSection: (sectionId: string) => void;
  
  setAdministrationProgressToDate: (adminId: string, percentage: number, targetDateString: string) => void;
}

export type GanttStoreState = NormalizedGanttState & { isInitialized: boolean } & GanttStoreActions;

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useGanttStore = create<GanttStoreState>()(
  immer((set) => ({
    version: 5,
    lines: {},
    groups: {},
    administrations: {},
    sections: {},
    tasks: {},
    projectStartDate: new Date().toISOString(),
    totalProjectDays: 138,
    isInitialized: false,

    initializeState: (state) => set((draft) => {
      draft.version = state.version;
      draft.lines = state.lines;
      draft.groups = state.groups;
      draft.administrations = state.administrations;
      draft.sections = state.sections;
      draft.tasks = state.tasks;
      draft.projectStartDate = state.projectStartDate;
      draft.totalProjectDays = state.totalProjectDays;
      draft.isInitialized = true;
    }),

    updateProjectStartDate: (date) => set((draft) => { draft.projectStartDate = date; }),
    updateTotalProjectDays: (days) => set((draft) => { draft.totalProjectDays = days; }),

    updateTask: (taskId, updates) => set((draft) => {
      if (draft.tasks[taskId]) {
        Object.assign(draft.tasks[taskId], updates);
      }
    }),

    addTask: (sectionId, newTaskData, parentId) => set((draft) => {
      const section = draft.sections[sectionId];
      if (!section) return;

      const latestEndDay = section.taskIds.reduce((maxEnd, tid) => {
        const t = draft.tasks[tid];
        const endDay = Number(t.startDay) + Number(t.duration);
        return endDay > maxEnd ? endDay : maxEnd;
      }, 0);

      const siblings = section.taskIds.filter(tid => draft.tasks[tid].parentId === parentId);
      const previousSiblingId = siblings.length > 0 ? siblings[siblings.length - 1] : null;

      const newId = newTaskData.id || generateId('task');
      
      const newTask: NormalizedTask = {
        id: newId,
        name: newTaskData.name || 'مهمة جديدة',
        duration: Number(newTaskData.duration) || 1,
        personnel: newTaskData.personnel || [],
        itemCode: newTaskData.itemCode,
        startDay: latestEndDay,
        progress: 0,
        notes: newTaskData.notes || '',
        parentId,
        isExpanded: true,
        dependencies: previousSiblingId ? [{ taskId: previousSiblingId, type: 'FS' }] : [],
        spareParts: [],
        sectionId,
      };

      draft.tasks[newId] = newTask;
      section.taskIds.push(newId);
    }),

    deleteTask: (taskId) => set((draft) => {
      const task = draft.tasks[taskId];
      if (!task) return;
      const section = draft.sections[task.sectionId];
      
      const idsToDelete = new Set<string>();
      const queue = [taskId];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (!idsToDelete.has(currentId)) {
          idsToDelete.add(currentId);
          // find children
          Object.values(draft.tasks).forEach(t => {
            if (t.parentId === currentId) queue.push(t.id);
          });
        }
      }

      idsToDelete.forEach(id => {
        const t = draft.tasks[id];
        if (t) {
            const sec = draft.sections[t.sectionId];
            if (sec) sec.taskIds = sec.taskIds.filter(tid => tid !== id);
            delete draft.tasks[id];
        }
      });

      // remove from dependencies
      Object.values(draft.tasks).forEach(t => {
        if (t.dependencies) {
          t.dependencies = t.dependencies.filter(dep => !idsToDelete.has(dep.taskId));
        }
      });
    }),

    toggleTaskExpansion: (taskId) => set((draft) => {
      if (draft.tasks[taskId]) {
        draft.tasks[taskId].isExpanded = !draft.tasks[taskId].isExpanded;
      }
    }),

    reorderTasks: (sectionId, taskIds) => set((draft) => {
      if (draft.sections[sectionId]) {
        draft.sections[sectionId].taskIds = taskIds;
      }
    }),

    autoLinkAllTasks: () => set((draft) => {
      Object.values(draft.sections).forEach(section => {
        const byParent = new Map<string | null, string[]>();
        section.taskIds.forEach(tid => {
          const t = draft.tasks[tid];
          const pid = t.parentId || null;
          if (!byParent.has(pid)) byParent.set(pid, []);
          byParent.get(pid)!.push(tid);
        });

        for (const ids of byParent.values()) {
          for (let j = 1; j < ids.length; j++) {
            const prevId = ids[j - 1];
            const currTask = draft.tasks[ids[j]];
            if (!currTask.dependencies || currTask.dependencies.length === 0) {
              currTask.dependencies = [{ taskId: prevId, type: 'FS' }];
            }
          }
        }
      });
    }),

    resetAllProgress: () => set((draft) => {
      Object.values(draft.tasks).forEach(t => { t.progress = 0; });
    }),

    removeAllDependencies: () => set((draft) => {
      Object.values(draft.tasks).forEach(t => { t.dependencies = []; });
    }),

    unassignPersonnel: (personnelId) => set((draft) => {
      Object.values(draft.tasks).forEach(t => {
        t.personnel = t.personnel.filter(p => p !== personnelId);
      });
    }),

    addProductionLine: (name) => set((draft) => {
      const id = generateId('line');
      draft.lines[id] = { id, name, administrationIds: [] };
    }),

    removeProductionLine: (lineId) => set((draft) => {
      // Very basic cleanup, ideally would cascade delete everything inside
      delete draft.lines[lineId];
    }),

    addAdministrationGroup: (lineId, groupName) => set((draft) => {
      const id = generateId('group');
      draft.groups[id] = { id, groupName, lineId, administrationIds: [] };
      draft.lines[lineId]?.administrationIds.push(id);
    }),

    addAdministration: (lineId, name, groupId) => set((draft) => {
      const id = generateId('admin');
      draft.administrations[id] = { id, name, lineId, groupId: groupId || null, sectionIds: [] };
      if (groupId) {
        draft.groups[groupId]?.administrationIds.push(id);
      } else {
        draft.lines[lineId]?.administrationIds.push(id);
      }
    }),

    moveAdministration: (adminId, targetGroupId) => set((draft) => {
      const admin = draft.administrations[adminId];
      if (!admin) return;
      
      const line = draft.lines[admin.lineId];
      if (admin.groupId) {
        const group = draft.groups[admin.groupId];
        if (group) group.administrationIds = group.administrationIds.filter(id => id !== adminId);
      } else {
        if (line) line.administrationIds = line.administrationIds.filter(id => id !== adminId);
      }

      admin.groupId = targetGroupId || null;

      if (targetGroupId) {
        draft.groups[targetGroupId]?.administrationIds.push(adminId);
      } else {
        draft.lines[admin.lineId]?.administrationIds.push(adminId);
      }
    }),

    updateAdministration: (id, newName) => set((draft) => {
      if (draft.groups[id]) draft.groups[id].groupName = newName;
      else if (draft.administrations[id]) draft.administrations[id].name = newName;
    }),

    deleteAdministration: (id) => set((draft) => {
      const isGroup = !!draft.groups[id];
      if (isGroup) {
        const group = draft.groups[id];
        if (!group) return;
        const line = draft.lines[group.lineId];
        if (line) line.administrationIds = line.administrationIds.filter(gid => gid !== id);
        delete draft.groups[id];
      } else {
        const admin = draft.administrations[id];
        if (!admin) return;
        if (admin.groupId) {
          const group = draft.groups[admin.groupId];
          if (group) group.administrationIds = group.administrationIds.filter(aid => aid !== id);
        } else {
          const line = draft.lines[admin.lineId];
          if (line) line.administrationIds = line.administrationIds.filter(aid => aid !== id);
        }
        delete draft.administrations[id];
      }
    }),

    deleteSectorOnly: (groupId) => set((draft) => {
      const group = draft.groups[groupId];
      if (!group) return;
      
      const line = draft.lines[group.lineId];
      if (line) {
        line.administrationIds = line.administrationIds.filter(id => id !== groupId);
        line.administrationIds.push(...group.administrationIds);
      }
      
      group.administrationIds.forEach(adminId => {
        if (draft.administrations[adminId]) draft.administrations[adminId].groupId = null;
      });
      delete draft.groups[groupId];
    }),

    addSection: (adminId, name) => set((draft) => {
      const id = generateId('sec');
      draft.sections[id] = { id, name, administrationId: adminId, taskIds: [] };
      draft.administrations[adminId]?.sectionIds.push(id);
    }),

    updateSection: (sectionId, name) => set((draft) => {
      if (draft.sections[sectionId]) draft.sections[sectionId].name = name;
    }),

    deleteSection: (sectionId) => set((draft) => {
      const section = draft.sections[sectionId];
      if (!section) return;
      const admin = draft.administrations[section.administrationId];
      if (admin) admin.sectionIds = admin.sectionIds.filter(id => id !== sectionId);
      delete draft.sections[sectionId];
    }),

    setAdministrationProgressToDate: (adminId, percentage, targetDateString) => set((draft) => {
      const pStart = new Date(draft.projectStartDate);
      const target = new Date(targetDateString);
      const diffTime = target.getTime() - pStart.getTime();
      const targetDayOffset = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      const admin = draft.administrations[adminId];
      if (!admin) return;

      admin.sectionIds.forEach(sectionId => {
        draft.sections[sectionId]?.taskIds.forEach(taskId => {
          const task = draft.tasks[taskId];
          if (task && task.startDay <= targetDayOffset) {
            task.progress = percentage;
          }
        });
      });
    }),

  }))
);
