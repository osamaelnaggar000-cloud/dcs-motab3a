import React, { useRef, useState, useEffect, useMemo } from 'react';
import PrintableView from './PrintableView';
import type { Task, Section, ProductionLine, ToplevelAdmin, AdministrationGroup, Administration, PersonnelData, LocationAssignmentData, Holiday, AbsenceData, OrganizationalNode } from '../types';
// FIX: Corrected import path for 'getAllAdmins' and 'isAdministrationGroup' to use the central utility file.
import { getAllAdmins, isAdministrationGroup } from '../utils/taskHelpers';
import { calculateAchievedProgress as calculateProgress } from '../utils/reportHelpers';
import { usePagination } from '../hooks/usePagination';
import PaginationControls from './PaginationControls';

interface ReportPreviewViewProps {
    reportData: {
        type: string;
        data: any;
        title: string;
        filter: string;
        dateRange: { start: string; end: string };
        personnelData: PersonnelData;
        personnelMap: Record<string, string>;
        includePersonnel: boolean;
        locationAssignments: LocationAssignmentData;
        includeAdminBreakdown?: boolean;
        calculatedData: any | null;
        projectStartDate: Date;
        totalProjectDays: number;
        holidays: Holiday[];
        absenceData: AbsenceData;
        locationsList: string[];
        hierarchyNodes?: OrganizationalNode[];
    };
    isPrinting?: boolean;
}

// Removed duplicate calculateProgress function

import { SummaryReport } from './report-preview/SummaryReport';



// --- START: Gantt Report Component ---
const applyDateFilterToTasks = (tasks: Task[], dateRange: { start: string; end: string }, projectStartDate: Date): Task[] => {
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

const applyStatusFilterToTasks = (tasks: Task[], filter: string): Task[] => {
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

const filterSection = (section: Section, filter: string, dateRange: { start: string; end: string }, projectStartDate: Date): Section | null => {
    const dateFilteredTasks = applyDateFilterToTasks(section.tasks, dateRange, projectStartDate);
    const statusFilteredTasks = applyStatusFilterToTasks(dateFilteredTasks, filter);
    if (statusFilteredTasks.length === 0) return null;
    return { ...section, tasks: statusFilteredTasks };
};

const filterAdmin = (admin: Administration, filter: string, dateRange: { start: string; end: string }, projectStartDate: Date): Administration | null => {
    const filteredSections = admin.sections.map(s => filterSection(s, filter, dateRange, projectStartDate)).filter((s): s is Section => s !== null);
    if (filteredSections.length === 0) return null;
    return { ...admin, sections: filteredSections };
};

const filterAdminOrGroup = (adminOrGroup: ToplevelAdmin, filter: string, dateRange: { start: string; end: string }, projectStartDate: Date): ToplevelAdmin | null => {
    if (isAdministrationGroup(adminOrGroup)) {
        const filteredAdmins = adminOrGroup.administrations.map(a => filterAdmin(a, filter, dateRange, projectStartDate)).filter((a): a is Administration => a !== null);
        if (filteredAdmins.length === 0) return null;
        return { ...adminOrGroup, administrations: filteredAdmins };
    } else {
        return filterAdmin(adminOrGroup, filter, dateRange, projectStartDate);
    }
};

const filterLine = (line: ProductionLine, filter: string, dateRange: { start: string; end: string }, projectStartDate: Date): ProductionLine | null => {
    const filteredAdmins = line.administrations.map(a => filterAdminOrGroup(a, filter, dateRange, projectStartDate)).filter((a): a is ToplevelAdmin => a !== null);
    if (filteredAdmins.length === 0) return null;
    return { ...line, administrations: filteredAdmins };
};

interface ReportBlock {
    id: string;
    type: 'section' | 'location';
    section: Section;
    line?: ProductionLine;
    adminGroup?: AdministrationGroup;
    admin?: Administration;
    allLineTasks?: Task[];
    locationName?: string;
    lineName?: string;
    lineProgress?: number;
    groupProgress?: number;
    adminProgress?: number;
    locationProgress?: number;
}

const GanttReport: React.FC<{ reportData: ReportPreviewViewProps['reportData'], isPrinting?: boolean }> = ({ reportData, isPrinting }) => {
    
    const reportBlocks = useMemo(() => {
        const blocks: ReportBlock[] = [];
        const { type, data, filter, dateRange, locationAssignments, projectStartDate } = reportData;
        
        const addAdminSections = (admin: Administration, line: ProductionLine, group?: AdministrationGroup) => {
            const filteredAdmin = filterAdmin(admin, filter, dateRange, projectStartDate);
            if (!filteredAdmin) return;
            
            const adminProgress = calculateProgress(filteredAdmin.sections.flatMap(s => s.tasks));
            const allLineTasks = getAllAdmins(line.administrations).flatMap(a => a.sections.flatMap(s => s.tasks));
            const lineProgress = calculateProgress(allLineTasks);
            
            let groupProgress = 0;
            if (group) {
                const allGroupTasks = group.administrations.flatMap(a => a.sections.flatMap(s => s.tasks));
                groupProgress = calculateProgress(allGroupTasks);
            }

            filteredAdmin.sections.forEach(section => {
                blocks.push({
                    id: `${line.name}-${admin.name}-${section.name}`,
                    type: 'section',
                    section: section,
                    line: line,
                    adminGroup: group,
                    admin: filteredAdmin,
                    allLineTasks,
                    lineProgress,
                    groupProgress,
                    adminProgress
                });
            });
        };

        const addLineSections = (line: ProductionLine) => {
            const filteredLine = filterLine(line, filter, dateRange, projectStartDate);
            if (!filteredLine) return;
            
            filteredLine.administrations.forEach(adminOrGroup => {
                if (isAdministrationGroup(adminOrGroup)) {
                    adminOrGroup.administrations.forEach(admin => addAdminSections(admin, filteredLine, adminOrGroup));
                } else {
                    addAdminSections(adminOrGroup, filteredLine);
                }
            });
        };

        switch (type) {
            case 'project':
                if (data.productionLines) data.productionLines.forEach(addLineSections);
                break;
            case 'line':
                addLineSections(data as ProductionLine);
                break;
            case 'sector':
                if (isAdministrationGroup(data.sector)) {
                    (data.sector as AdministrationGroup).administrations.forEach(admin => addAdminSections(admin, data.line, data.sector));
                }
                break;
            case 'admin':
                addAdminSections(data.admin as Administration, data.line);
                break;
            case 'section':
                const filteredSection = filterSection(data.section, filter, dateRange, projectStartDate);
                if (filteredSection) {
                    const allSectionLineTasks = getAllAdmins(data.line.administrations).flatMap(a => a.sections.flatMap(s => s.tasks));
                    blocks.push({
                        id: `${data.line.name}-section-${filteredSection.name}`,
                        type: 'section',
                        section: filteredSection,
                        line: data.line,
                        allLineTasks: allSectionLineTasks,
                        lineProgress: calculateProgress(allSectionLineTasks)
                    });
                }
                break;
            case 'location': {
                const { productionLines } = data;
                const getLocationFor = (lineName: string, adminName: string, sectionName: string, taskId: string): string | null => {
                    const taskKey = taskId;
                    const sectionKey = `${lineName}/${adminName}/${sectionName}`;
                    const adminKey = `${lineName}/${adminName}`;
                    return locationAssignments[taskKey] ?? locationAssignments[sectionKey] ?? locationAssignments[adminKey] ?? null;
                };

                reportData.locationsList.forEach(location => {
                    productionLines.forEach((line: ProductionLine) => {
                        const tasksForLocationInLine: Task[] = [];
                        getAllAdmins(line.administrations).forEach(admin => {
                            admin.sections.forEach(section => {
                                section.tasks.forEach(task => {
                                    const taskLocation = getLocationFor(line.name, admin.name, section.name, task.id);
                                    if (taskLocation === location) {
                                        tasksForLocationInLine.push({
                                            ...task,
                                            name: `[${admin.name} / ${section.name}] ${task.name}`
                                        });
                                    }
                                });
                            });
                        });
                        if (tasksForLocationInLine.length > 0) {
                            const filteredLocationSection = filterSection({ id: `loc-${location}-${line.name}`, name: 'قائمة المهام', tasks: tasksForLocationInLine }, filter, dateRange, projectStartDate);
                            if (filteredLocationSection) {
                                const locationProgress = calculateProgress(filteredLocationSection.tasks);
                                const allTasksInLine = getAllAdmins(line.administrations).flatMap(a => a.sections.flatMap(s => s.tasks));
                                
                                blocks.push({
                                    id: `${location}-${line.name}`,
                                    type: 'location',
                                    section: filteredLocationSection,
                                    locationName: location,
                                    lineName: line.name,
                                    allLineTasks: allTasksInLine,
                                    locationProgress
                                });
                            }
                        }
                    });
                });
                break;
            }
        }
        
        return blocks;
    }, [reportData]);

    const pagination = usePagination(reportBlocks, { initialItemsPerPage: 2 });
    const blocksToRender = isPrinting ? reportBlocks : pagination.paginatedItems;

    if (reportBlocks.length === 0) {
        return <p className="text-center text-slate-500 text-lg p-10">لا توجد مهام تطابق معايير التصفية المحددة.</p>;
    }

    return (
        <div className="full-project-body relative">
            {blocksToRender.map((block, index) => {
                const prevBlock = index > 0 ? blocksToRender[index - 1] : null;
                const isFirstOfLine = block.line && (!prevBlock || prevBlock.line?.name !== block.line.name);
                const isFirstOfGroup = block.adminGroup && (!prevBlock || prevBlock.adminGroup?.groupName !== block.adminGroup.groupName);
                const isFirstOfAdmin = block.admin && (!prevBlock || prevBlock.admin?.name !== block.admin.name);
                const isFirstOfLocation = block.type === 'location' && (!prevBlock || prevBlock.locationName !== block.locationName || prevBlock.lineName !== block.lineName);

                // Add page breaks for printing appropriately
                const needsPageBreak = index > 0 && isPrinting && (isFirstOfLine || isFirstOfLocation);

                return (
                    <div key={block.id} className={`${needsPageBreak ? 'page-break-before' : ''} mb-8`}>
                        {/* Location Header */}
                        {isFirstOfLocation && block.type === 'location' && (
                            <div className="flex justify-between items-center bg-indigo-700 p-3 rounded-md mb-6 print:hidden">
                                <h2 className="text-3xl font-bold text-white">{`${block.locationName} (${block.lineName})`}</h2>
                                <div className="flex items-center gap-3" dir="rtl">
                                    <span className="text-md font-semibold text-indigo-100">التقدم الإجمالي للمكان:</span>
                                    <div className="w-56 bg-indigo-900 rounded-full h-5 shadow-inner">
                                        <div className="bg-white h-5 rounded-full" style={{ width: `${block.locationProgress || 0}%` }}></div>
                                    </div>
                                    <span className="font-bold text-white text-xl w-14 text-left">{block.locationProgress || 0}%</span>
                                </div>
                            </div>
                        )}

                        {/* Line Header */}
                        {isFirstOfLine && block.type === 'section' && (
                            <div className="flex justify-between items-center bg-emerald-700 p-3 rounded-md mb-6 print:hidden">
                                <h2 className="text-3xl font-bold text-white">{block.line?.name}</h2>
                                <div className="flex items-center gap-3" dir="rtl">
                                    <span className="text-md font-semibold text-emerald-100">التقدم الإجمالي للخط:</span>
                                    <div className="w-56 bg-emerald-900 rounded-full h-5 shadow-inner">
                                        <div className="bg-white h-5 rounded-full" style={{ width: `${block.lineProgress || 0}%` }}></div>
                                    </div>
                                    <span className="font-bold text-white text-xl w-14 text-left">{block.lineProgress || 0}%</span>
                                </div>
                            </div>
                        )}

                        {/* Group Header */}
                        {isFirstOfGroup && block.type === 'section' && (
                            <div className="flex justify-between items-center p-2 border-b-2 border-emerald-200 mb-4 print:hidden">
                                <h3 className="text-2xl font-semibold text-emerald-800">{block.adminGroup?.groupName}</h3>
                                <div className="flex items-center gap-2" dir="rtl">
                                    <span className="text-sm font-semibold text-slate-600">التقدم:</span>
                                    <div className="w-48 bg-slate-200 rounded-full h-4 shadow-inner">
                                        <div className="bg-emerald-600 h-4 rounded-full" style={{ width: `${block.groupProgress || 0}%` }}></div>
                                    </div>
                                    <span className="font-bold text-emerald-700 text-lg w-12 text-left">{block.groupProgress || 0}%</span>
                                </div>
                            </div>
                        )}

                        {/* Admin Header */}
                        {isFirstOfAdmin && block.type === 'section' && (
                            <div className="flex justify-between items-center bg-slate-100 p-2 rounded-md mb-3 border-b-2 border-slate-300 print:hidden">
                                <h4 className="text-xl font-bold text-slate-800">{block.admin?.name}</h4>
                                <div className="flex items-center gap-2" dir="rtl">
                                    <span className="text-sm font-semibold text-slate-600">التقدم:</span>
                                    <div className="w-48 bg-slate-300 rounded-full h-4 shadow-inner">
                                        <div className="bg-sky-600 h-4 rounded-full" style={{ width: `${block.adminProgress || 0}%` }}></div>
                                    </div>
                                    <span className="font-bold text-sky-700 text-lg w-12 text-left">{block.adminProgress || 0}%</span>
                                </div>
                            </div>
                        )}

                        {/* Actual Printable Section View */}
                        <div className="printable-section-block mb-6 page-break-inside-avoid">
                            <PrintableView
                                section={block.type === 'location' ? { ...block.section, name: `${block.locationName} (${block.lineName})` } : block.section}
                                allLineTasks={block.allLineTasks!}
                                isSubcomponent={true}
                                lineName={block.line?.name || block.lineName || ""}
                                adminName={block.admin?.name || ""}
                                personnelData={reportData.personnelData}
                                personnelMap={reportData.personnelMap}
                                includePersonnel={reportData.includePersonnel}
                                progress={calculateProgress(block.section.tasks)}
                                projectStartDate={reportData.projectStartDate}
                                totalProjectDays={reportData.totalProjectDays}
                                hierarchyNodes={reportData.hierarchyNodes}
                            />
                        </div>
                    </div>
                );
            })}

            {/* Pagination Controls */}
            {!isPrinting && (
                <div className="print:hidden sticky bottom-0 bg-white/95 backdrop-blur-sm p-4 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] rounded-t-xl z-10 mt-8">
                    <PaginationControls
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        totalItems={pagination.totalItems}
                        itemsPerPage={pagination.itemsPerPage}
                        startIndex={pagination.startIndex}
                        endIndex={pagination.endIndex}
                        onGoToPage={pagination.goToPage}
                        onNextPage={pagination.nextPage}
                        onPrevPage={pagination.prevPage}
                        onItemsPerPageChange={pagination.setItemsPerPage}
                        hasNextPage={pagination.hasNextPage}
                        hasPrevPage={pagination.hasPrevPage}
                        itemsPerPageOptions={[1, 2, 5, 10, 20]}
                    />
                </div>
            )}
        </div>
    );
};
// --- END: Gantt Report Component ---

// --- START: Time Period Report Component ---
const TimePeriodReportEntity: React.FC<{ entity: any; projectStartDate: Date }> = ({ entity, projectStartDate }) => {
    const reportRef = useRef<HTMLDivElement | null>(null);
    const [isSinglePage, setIsSinglePage] = useState(false);

    useEffect(() => {
        if (reportRef.current) {
            // A4 page is ~29.7cm high. At 96 DPI, that's ~1122px.
            // Using a threshold to account for margins and headers.
            const A4_PAGE_CONTENT_HEIGHT_PX = 1000;
            if (reportRef.current.scrollHeight < A4_PAGE_CONTENT_HEIGHT_PX) {
                setIsSinglePage(true);
            } else {
                setIsSinglePage(false);
            }
        }
    }, [entity]);

    return (
        <div ref={reportRef} className="page-break-before first:page-break-before-auto page-break-inside-avoid mb-8">
            <div className="page-break-inside-avoid">
                <div className="bg-slate-100 p-3 rounded-t-lg border-b-2 border-slate-400">
                    <h3 className="text-xl font-bold text-slate-800 mb-3">{entity.title}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-center">
                        <div className="bg-white p-2 rounded-md shadow-sm"><p className="text-xs font-semibold text-slate-500">المدة الزمنية</p><p className="text-lg font-bold text-slate-800">{entity.metrics.duration} يوم</p></div>
                        <div className="bg-white p-2 rounded-md shadow-sm"><p className="text-xs font-semibold text-slate-500">المقرر بالفترة</p><p className="text-lg font-bold text-blue-600">{entity.metrics.planned}%</p></div>
                        <div className="bg-white p-2 rounded-md shadow-sm"><p className="text-xs font-semibold text-slate-500">المستهدف التراكمي</p><p className="text-lg font-bold text-sky-600">{entity.metrics.target}%</p></div>
                        <div className="bg-white p-2 rounded-md shadow-sm"><p className="text-xs font-semibold text-slate-500">المنجز الفعلي</p><p className="text-lg font-bold text-green-600">{entity.metrics.actual}%</p></div>
                        <div className="bg-white p-2 rounded-md shadow-sm"><p className="text-xs font-semibold text-slate-500">إنجاز الفترة</p><p className="text-lg font-bold text-emerald-600">{entity.metrics.progressInPeriod}%</p></div>
                    </div>
                </div>
                {entity.tasks.length > 0 && (
                    <h4 className="font-bold my-3 px-2 text-slate-600">المهام في الفترة المحددة ({entity.tasks.length}):</h4>
                )}
            </div>

            {entity.tasks.length > 0 && (
                <table className="w-full border-collapse">
                    <thead style={{ display: 'table-header-group' }}>
                        <tr style={{ display: isSinglePage ? 'none' : 'table-row' }}>
                            <th colSpan={5} className="text-right p-2 pt-4">
                                <div className="border-b-2 border-slate-500 pb-2">
                                    <h3 className="text-lg font-bold text-slate-800">
                                        {entity.title} <span className="text-sm font-normal text-gray-500 italic ml-2">(تابع)</span>
                                    </h3>
                                </div>
                            </th>
                        </tr>
                        <tr className="bg-slate-100 border-b-2 border-slate-300">
                            <th className="p-2 font-semibold text-slate-700 text-right w-2/5">المهمة</th>
                            <th className="p-2 font-semibold text-slate-700 text-center">تاريخ البدء</th>
                            <th className="p-2 font-semibold text-slate-700 text-center">تاريخ الانتهاء</th>
                            <th className="p-2 font-semibold text-slate-700 text-center">المدة (يوم)</th>
                            <th className="p-2 font-semibold text-slate-700 text-center">الإنجاز (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entity.tasks.map((task: Task) => {
                            const startDate = new Date(projectStartDate); startDate.setUTCDate(startDate.getUTCDate() + task.startDay);
                            const endDate = new Date(startDate); endDate.setUTCDate(endDate.getUTCDate() + (task.duration > 0 ? task.duration - 1 : 0));
                            return (
                                <tr key={task.id} className="border-b border-slate-100 text-sm page-break-inside-avoid">
                                    <td className="p-2 text-right font-medium text-zinc-700">{task.name}</td>
                                    <td className="p-2 text-center text-zinc-600">{startDate.toLocaleDateString('ar-EG-u-nu-latn')}</td>
                                    <td className="p-2 text-center text-zinc-600">{endDate.toLocaleDateString('ar-EG-u-nu-latn')}</td>
                                    <td className="p-2 text-center font-mono text-zinc-700">{task.duration}</td>
                                    <td className="p-2 text-center font-mono font-bold text-emerald-700">{task.progress}%</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
};
// --- END: Time Period Report Component ---


// --- Main View Component (Router) ---
const ReportPreviewView: React.FC<ReportPreviewViewProps> = ({ reportData, isPrinting }) => {
    const commonHeader = (
        <header id="print-header-full" className="mb-8 pb-2 border-b-2 border-black page-break-after-avoid">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-black">{reportData.title}</h1>
                    <p className="text-lg text-gray-700">برنامج الصيانة والمتابعة لموسم 2025-2026 - شركة الدلتا للسكر</p>
                    {reportData.dateRange.start && reportData.dateRange.end && (
                        <p className="text-md text-gray-600 mt-1">
                            الفترة الزمنية: من {new Date(`${reportData.dateRange.start}T00:00:00Z`).toLocaleDateString('ar-EG-u-nu-latn')} إلى {new Date(`${reportData.dateRange.end}T00:00:00Z`).toLocaleDateString('ar-EG-u-nu-latn')}
                        </p>
                    )}
                </div>
                <svg width="60" height="60" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <g>
                        <path d="M50 6 a 44 44 0 0 1 0 88 a 44 44 0 0 1 0 -88 M50 16 a 34 34 0 0 0 0 68 a 34 34 0 0 0 0 -68" fill="#047857" />
                        <path d="M50 2 L50 14 M93.3 25 L85.98 29.32 M98 50 L86 50 M93.3 75 L85.98 70.68 M50 98 L50 86 M6.7 75 L14.02 70.68 M2 50 L14 50 M6.7 25 L14.02 29.32" stroke="#047857" strokeWidth="8" strokeLinecap="round" />
                        <path d="M50 82 C 42 72, 42 62, 50 55 C 58 62, 58 72, 50 82 Z M50 82 Q 48 87 47 92 M50 82 Q 52 87 53 92" fill="#9f1239" />
                        <path d="M50 56 C 40 46, 35 46, 40 31 Q 50 46 50 56 Z M50 56 C 60 46, 65 46, 60 31 Q 50 46 50 56 Z M50 56 C 45 41, 55 41, 50 26 Q 50 46 50 56 Z" fill="#10b981" />
                    </g>
                </svg>
            </div>
        </header>
    );

    const renderContent = () => {
        const { projectStartDate } = reportData;
        switch (reportData.type) {
            case 'summary':
                return <SummaryReport summaryData={reportData.calculatedData} />;
            case 'time_period':
                if (!reportData.calculatedData || reportData.calculatedData.length === 0) {
                    return <p className="text-center text-slate-500 text-lg p-10">لا توجد مهام أو بيانات للعرض في الفترة الزمنية المحددة.</p>;
                }
                return reportData.calculatedData.map((entity: any, index: number) => (
                    <TimePeriodReportEntity key={entity.title + index} entity={entity} projectStartDate={projectStartDate} />
                ));
            default: // Gantt reports
                return <GanttReport reportData={reportData} isPrinting={isPrinting} />;
        }
    };

    return (
        <div id="printable-area" className="p-6 bg-white h-full flex flex-col">
            {commonHeader}
            {renderContent()}
        </div>
    );
};

export default ReportPreviewView;
