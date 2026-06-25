import type { ProductionLine, Task } from '../../../types';
import type { NormalizedGanttState, NormalizedProductionLine, NormalizedAdministrationGroup, NormalizedAdministration, NormalizedSection, NormalizedTask } from '../types';

export const migrateToNormalizedState = (
  lines: ProductionLine[],
  projectStartDate: string,
  totalProjectDays: number
): NormalizedGanttState => {
  const normalizedLines: Record<string, NormalizedProductionLine> = {};
  const normalizedGroups: Record<string, NormalizedAdministrationGroup> = {};
  const normalizedAdmins: Record<string, NormalizedAdministration> = {};
  const normalizedSections: Record<string, NormalizedSection> = {};
  const normalizedTasks: Record<string, NormalizedTask> = {};

  lines.forEach((line) => {
    const lineAdminIds: string[] = [];

    line.administrations.forEach((adminOrGroup) => {
      if ('groupName' in adminOrGroup) {
        // It's a group
        const groupAdminIds: string[] = [];
        adminOrGroup.administrations.forEach((admin) => {
          const sectionIds: string[] = [];
          admin.sections.forEach((section) => {
            const taskIds: string[] = [];
            section.tasks.forEach((task) => {
              normalizedTasks[task.id] = { ...task, sectionId: section.id };
              taskIds.push(task.id);
            });

            normalizedSections[section.id] = {
              id: section.id,
              name: section.name,
              administrationId: admin.id,
              taskIds,
            };
            sectionIds.push(section.id);
          });

          normalizedAdmins[admin.id] = {
            id: admin.id,
            name: admin.name,
            lineId: line.id,
            groupId: adminOrGroup.id,
            sectionIds,
          };
          groupAdminIds.push(admin.id);
        });

        normalizedGroups[adminOrGroup.id] = {
          id: adminOrGroup.id,
          groupName: adminOrGroup.groupName,
          lineId: line.id,
          administrationIds: groupAdminIds,
        };
        lineAdminIds.push(adminOrGroup.id);
      } else {
        // It's a toplevel administration
        const sectionIds: string[] = [];
        adminOrGroup.sections.forEach((section) => {
          const taskIds: string[] = [];
          section.tasks.forEach((task) => {
            normalizedTasks[task.id] = { ...task, sectionId: section.id };
            taskIds.push(task.id);
          });

          normalizedSections[section.id] = {
            id: section.id,
            name: section.name,
            administrationId: adminOrGroup.id,
            taskIds,
          };
          sectionIds.push(section.id);
        });

        normalizedAdmins[adminOrGroup.id] = {
          id: adminOrGroup.id,
          name: adminOrGroup.name,
          lineId: line.id,
          groupId: null,
          sectionIds,
        };
        lineAdminIds.push(adminOrGroup.id);
      }
    });

    normalizedLines[line.id] = {
      id: line.id,
      name: line.name,
      administrationIds: lineAdminIds,
    };
  });

  return {
    version: 5,
    lines: normalizedLines,
    groups: normalizedGroups,
    administrations: normalizedAdmins,
    sections: normalizedSections,
    tasks: normalizedTasks,
    projectStartDate,
    totalProjectDays,
  };
};

export const migrateToLegacyState = (normalizedState: NormalizedGanttState): ProductionLine[] => {
  return Object.values(normalizedState.lines).map((line) => {
    return {
      id: line.id,
      name: line.name,
      administrations: line.administrationIds.map((adminOrGroupId) => {
        if (normalizedState.groups[adminOrGroupId]) {
          const group = normalizedState.groups[adminOrGroupId];
          return {
            id: group.id,
            groupName: group.groupName,
            administrations: group.administrationIds.map((adminId) => {
              const admin = normalizedState.administrations[adminId];
              return {
                id: admin.id,
                name: admin.name,
                sections: admin.sectionIds.map((sectionId) => {
                  const section = normalizedState.sections[sectionId];
                  return {
                    id: section.id,
                    name: section.name,
                    tasks: section.taskIds.map(taskId => {
                       const { sectionId, ...taskProps } = normalizedState.tasks[taskId];
                       return taskProps as Task;
                    })
                  };
                }),
              };
            }),
          };
        } else {
          const admin = normalizedState.administrations[adminOrGroupId];
          return {
            id: admin.id,
            name: admin.name,
            sections: admin.sectionIds.map((sectionId) => {
              const section = normalizedState.sections[sectionId];
              return {
                id: section.id,
                name: section.name,
                tasks: section.taskIds.map(taskId => {
                   const { sectionId, ...taskProps } = normalizedState.tasks[taskId];
                   return taskProps as Task;
                })
              };
            }),
          };
        }
      }),
    };
  });
};
