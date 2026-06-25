import type { Task, Section, ProductionLine, ToplevelAdmin, Administration, Holiday, AbsenceData, LocationAssignmentData } from '../types';
import { getAllAdmins, isAdministrationGroup } from './taskHelpers';
import { getHolidaySet, daysBetween } from './dateHelpers';

// Helper to trigger a file download in the browser
export const downloadFile = (content: string, fileName: string, contentType: string) => {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // BOM for UTF-8 to ensure correct characters in Excel
    const blob = new Blob([bom, content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};


// --- START: Calculation Helpers for Summary & Time Period Reports ---
export const calculateAchievedProgress = (tasks: Task[]): number => {
    if (!tasks || tasks.length === 0) return 0;
    const childIds = new Set(tasks.map(task => task.parentId).filter(Boolean));
    const leafTasks = tasks.filter(task => !childIds.has(task.id));
    if (leafTasks.length === 0) return tasks.length > 0 && tasks.every(t => Number(t.progress || 0) === 100) ? 100 : 0;

    const totalWeightedProgress = leafTasks.reduce((acc, task) => acc + (Number(task.progress || 0) * Number(task.duration || 1)), 0);
    const totalDuration = leafTasks.reduce((acc, task) => acc + Number(task.duration || 1), 0);

    if (totalDuration === 0) return leafTasks.every(t => Number(t.progress || 0) === 100) ? 100 : 0;
    return Math.round(totalWeightedProgress / totalDuration);
};

export const countWorkingDays = (startDay: number, endDay: number, nonWorkingDays: Set<number>): number => {
    let count = 0;
    for (let i = startDay; i < endDay; i++) {
        if (!nonWorkingDays.has(i)) {
            count++;
        }
    }
    return count;
};

export const calculateTargetProgress = (
    tasks: Task[],
    todayOffset: number,
    generalNonWorkingDays: Set<number>,
    absencesByPersonnel: Map<string, Set<number>>
): number => {
    if (!tasks || tasks.length === 0) return 0;
    const childIds = new Set(tasks.map(task => task.parentId).filter(Boolean));
    const leafTasks = tasks.filter(task => !childIds.has(task.id));
    if (leafTasks.length === 0) return 0;

    let totalWeightedTarget = 0;
    leafTasks.forEach(task => {
        // Create a set of non-working days specific to this task
        const taskNonWorkingDays = new Set(generalNonWorkingDays);
        task.personnel.forEach(personId => {
            if (absencesByPersonnel.has(personId)) {
                absencesByPersonnel.get(personId)!.forEach(day => taskNonWorkingDays.add(day));
            }
        });

        const totalWorkDaysInTask = countWorkingDays(task.startDay, task.startDay + task.duration, taskNonWorkingDays);

        let targetProgress = 0;
        if (totalWorkDaysInTask > 0) {
            const elapsedWorkDays = countWorkingDays(task.startDay, Math.min(task.startDay + task.duration, todayOffset + 1), taskNonWorkingDays);
            targetProgress = (elapsedWorkDays / totalWorkDaysInTask) * 100;
        } else {
            // If total work days is 0, target is 100 if today is after the task should have ended, otherwise 0.
            if (todayOffset >= task.startDay + task.duration) {
                targetProgress = 100;
            } else {
                targetProgress = 0;
            }
        }

        const weight = Number(task.duration || 1);
        totalWeightedTarget += targetProgress * weight;
    });

    const totalDuration = leafTasks.reduce((acc, task) => acc + Number(task.duration || 1), 0);
    if (totalDuration === 0) return 0; // Should not happen with || 1
    return Math.round(totalWeightedTarget / totalDuration);
};


export const generateSummaryData = (productionLines: ProductionLine[], locationAssignments: LocationAssignmentData, dateRange: { start: string; end: string }, projectStartDate: Date, totalProjectDays: number, subtype: string, selections: string[], includeAdminBreakdown: boolean, holidays: Holiday[], absenceData: AbsenceData, locationsList: string[]) => {
    const todayOffset = daysBetween(projectStartDate, new Date());
    const getFilteredTasks = (tasks: Task[]) => applyDateFilterToTasks(tasks, dateRange, projectStartDate);

    const generalNonWorkingDays = getHolidaySet(projectStartDate, holidays, totalProjectDays);
    const absencesByPersonnel = new Map<string, Set<number>>();
    if (absenceData) {
        for (const personnelId in absenceData) {
            const records = absenceData[personnelId];
            const absenceSet = new Set<number>();
            records.forEach(record => {
                const start = new Date(record.startDate + 'T00:00:00Z');
                const end = new Date(record.endDate + 'T00:00:00Z');
                let current = new Date(start);
                while (current <= end) {
                    const dayOffset = daysBetween(projectStartDate, current);
                    absenceSet.add(dayOffset);
                    current.setUTCDate(current.getUTCDate() + 1);
                }
            });
            absencesByPersonnel.set(personnelId, absenceSet);
        }
    }

    let locationSummary: Array<{ lineName: string, locations: Array<{ name: string; achieved: number; target: number; admins?: Array<{ name: string; achieved: number; target: number }> | null }> }> = [];
    let hierarchicalSummary: any[] = [];

    if (subtype === 'all' || subtype === 'location') {
        const summaryByLine = productionLines.map(line => {
            const tasksByLocationAndAdmin: Record<string, Record<string, Task[]>> = {};

            getAllAdmins(line.administrations).forEach(admin => {
                admin.sections.forEach(section => {
                    section.tasks.forEach(task => {
                        const taskLocation = locationAssignments[task.id] ?? locationAssignments[`${line.name}/${admin.name}/${section.name}`] ?? locationAssignments[`${line.name}/${admin.name}`] ?? null;
                        if (taskLocation) {
                            if (!tasksByLocationAndAdmin[taskLocation]) {
                                tasksByLocationAndAdmin[taskLocation] = {};
                            }
                            if (!tasksByLocationAndAdmin[taskLocation][admin.name]) {
                                tasksByLocationAndAdmin[taskLocation][admin.name] = [];
                            }
                            tasksByLocationAndAdmin[taskLocation][admin.name].push(task);
                        }
                    });
                });
            });

            let locationsToProcess = (subtype === 'location' && selections.length > 0) ? selections : Object.keys(tasksByLocationAndAdmin);

            const locationsData = locationsToProcess
                .filter(location => tasksByLocationAndAdmin[location]) // Only process locations that exist for this line
                .map(location => {
                    const allTasksForLocation = Object.values(tasksByLocationAndAdmin[location]).flat();
                    const filteredTasks = getFilteredTasks(allTasksForLocation);

                    let adminBreakdown = null;
                    if (includeAdminBreakdown) {
                        adminBreakdown = Object.entries(tasksByLocationAndAdmin[location])
                            .map(([adminName, adminTasks]) => {
                                const filteredAdminTasks = getFilteredTasks(adminTasks);
                                if (filteredAdminTasks.length === 0) return null;
                                return {
                                    name: adminName,
                                    achieved: calculateAchievedProgress(filteredAdminTasks),
                                    target: calculateTargetProgress(filteredAdminTasks, todayOffset, generalNonWorkingDays, absencesByPersonnel),
                                };
                            })
                            .filter((item): item is NonNullable<typeof item> => item !== null)
                            .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
                    }

                    return {
                        name: location,
                        achieved: calculateAchievedProgress(filteredTasks),
                        target: calculateTargetProgress(filteredTasks, todayOffset, generalNonWorkingDays, absencesByPersonnel),
                        admins: adminBreakdown,
                    };
                })
                .sort((a, b) => locationsList.indexOf(a.name) - locationsList.indexOf(b.name));

            return {
                lineName: line.name,
                locations: locationsData,
            };
        }).filter(lineSummary => lineSummary.locations.length > 0);
        locationSummary = summaryByLine;
    }

    if (subtype === 'all' || subtype === 'admin') {
        hierarchicalSummary = productionLines.map((line: ProductionLine) => {
            let adminsToSummarize = getAllAdmins(line.administrations);

            if (subtype === 'admin' && selections) {
                adminsToSummarize = adminsToSummarize.filter(admin =>
                    selections.includes(`${line.name} / ${admin.name}`)
                );
            }

            if (adminsToSummarize.length === 0) return null;

            const allLineTasks = adminsToSummarize.flatMap(admin => admin.sections.flatMap(section => section.tasks));
            const filteredLineTasks = getFilteredTasks(allLineTasks);

            const adminData = adminsToSummarize.map(admin => {
                const adminTasks = admin.sections.flatMap(s => s.tasks);
                const filteredAdminTasks = getFilteredTasks(adminTasks);

                const sectionData = admin.sections.map(section => {
                    const filteredSectionTasks = getFilteredTasks(section.tasks);
                    return {
                        name: section.name,
                        achieved: calculateAchievedProgress(filteredSectionTasks),
                        target: calculateTargetProgress(filteredSectionTasks, todayOffset, generalNonWorkingDays, absencesByPersonnel),
                    };
                });

                return {
                    name: admin.name,
                    achieved: calculateAchievedProgress(filteredAdminTasks),
                    target: calculateTargetProgress(filteredAdminTasks, todayOffset, generalNonWorkingDays, absencesByPersonnel),
                    sections: sectionData,
                };
            });

            return {
                lineName: line.name,
                achieved: calculateAchievedProgress(filteredLineTasks),
                target: calculateTargetProgress(filteredLineTasks, todayOffset, generalNonWorkingDays, absencesByPersonnel),
                admins: adminData,
            };
        }).filter((line): line is NonNullable<typeof line> => line !== null);
    }

    return { locationSummary, hierarchicalSummary };
};
// --- END: Calculation Helpers ---


// Filtering helpers
export const applyDateFilterToTasks = (tasks: Task[], dateRange: { start: string; end: string }, projectStartDate: Date): Task[] => {
    if (!dateRange.start && !dateRange.end) {
        return tasks;
    }

    const filterStartDate = dateRange.start ? new Date(`${dateRange.start}T00:00:00Z`).getTime() : null;
    const filterEndDate = dateRange.end ? new Date(`${dateRange.end}T23:59:59Z`).getTime() : null;

    return tasks.filter(task => {
        const taskStartDate = new Date(projectStartDate);
        taskStartDate.setUTCDate(taskStartDate.getUTCDate() + task.startDay);

        const taskEndDate = new Date(taskStartDate);
        taskEndDate.setUTCDate(taskEndDate.getUTCDate() + (task.duration > 0 ? task.duration - 1 : 0));

        const taskStartTime = taskStartDate.getTime();
        const taskEndTime = taskEndDate.getTime();

        const startsAfterFilterEnd = filterEndDate !== null && taskStartTime > filterEndDate;
        const endsBeforeFilterStart = filterStartDate !== null && taskEndTime < filterStartDate;

        return !(startsAfterFilterEnd || endsBeforeFilterStart);
    });
};

export const applyStatusFilterToTasks = (tasks: Task[], filter: string): Task[] => {
    switch (filter) {
        case 'completed':
            return tasks.filter(task => task.progress === 100);
        case 'incomplete':
            return tasks.filter(task => task.progress < 100);
        case 'all':
        default:
            return tasks;
    }
};

export const filterSection = (section: Section, filter: string, dateRange: { start: string; end: string }, projectStartDate: Date): Section | null => {
    const dateFilteredTasks = applyDateFilterToTasks(section.tasks, dateRange, projectStartDate);
    const statusFilteredTasks = applyStatusFilterToTasks(dateFilteredTasks, filter);
    if (statusFilteredTasks.length === 0) return null;
    return { ...section, tasks: statusFilteredTasks };
};

export const filterAdmin = (admin: Administration, filter: string, dateRange: { start: string; end: string }, projectStartDate: Date): Administration | null => {
    const filteredSections = admin.sections.map(s => filterSection(s, filter, dateRange, projectStartDate)).filter((s): s is Section => s !== null);
    if (filteredSections.length === 0) return null;
    return { ...admin, sections: filteredSections };
};

export const filterAdminOrGroup = (adminOrGroup: ToplevelAdmin, filter: string, dateRange: { start: string; end: string }, projectStartDate: Date): ToplevelAdmin | null => {
    if (isAdministrationGroup(adminOrGroup)) {
        const filteredAdmins = adminOrGroup.administrations.map(a => filterAdmin(a, filter, dateRange, projectStartDate)).filter((a): a is Administration => a !== null);
        if (filteredAdmins.length === 0) return null;
        return { ...adminOrGroup, administrations: filteredAdmins };
    } else {
        return filterAdmin(adminOrGroup, filter, dateRange, projectStartDate);
    }
};

export const filterLine = (line: ProductionLine, filter: string, dateRange: { start: string; end: string }, projectStartDate: Date): ProductionLine | null => {
    const filteredAdmins = line.administrations.map(a => filterAdminOrGroup(a, filter, dateRange, projectStartDate)).filter((a): a is ToplevelAdmin => a !== null);
    if (filteredAdmins.length === 0) return null;
    return { ...line, administrations: filteredAdmins };
};
