import React, { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ReportPreviewView from './ReportPreviewView';
import type { Task, Section, ProductionLine, ToplevelAdmin, AdministrationGroup, Administration, PersonnelData, LocationAssignmentData, Holiday, AbsenceData } from '../types';
import { getAllAdmins, isAdministrationGroup } from '../utils/taskHelpers';
import { getHolidaySet, daysBetween } from '../utils/dateHelpers';
import {
    downloadFile,
    calculateAchievedProgress,
    calculateTargetProgress,
    generateSummaryData,
    applyDateFilterToTasks,
    filterSection,
    filterAdmin,
    filterAdminOrGroup,
    filterLine,
} from '../utils/reportHelpers';
import {
    handleExportCsvLogic,
    generateTextReportLogic,
    handleExportJsonLogic,
} from './report-preview/ReportExportHandlers';


interface ReportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
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
        projectStartDate: Date;
        holidays: Holiday[];
        absenceData: AbsenceData;
        locationsList: string[];
    };
    projectStartDate: Date;
    totalProjectDays: number;
}


const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({ isOpen, onClose, reportData, projectStartDate, totalProjectDays }) => {
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [isCsvLoading, setIsCsvLoading] = useState(false);
    const [isJsonLoading, setIsJsonLoading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isTextLoading, setIsTextLoading] = useState(false);
    const [includeDatesInTextReport, setIncludeDatesInTextReport] = useState(true);
    const [includeLocationAndCodeInTextReport, setIncludeLocationAndCodeInTextReport] = useState(true);
    const [includeNotesInTextReport, setIncludeNotesInTextReport] = useState(true);
    const [includeSparePartsInTextReport, setIncludeSparePartsInTextReport] = useState(true);

    const calculatedReportData = useMemo(() => {
        if (!isOpen) return null;

        const { projectStartDate, holidays, absenceData } = reportData;

        if (reportData.type === 'summary') {
            const { productionLines, locationAssignments, subtype, selections } = reportData.data;
            return generateSummaryData(productionLines, locationAssignments, reportData.dateRange, projectStartDate, totalProjectDays, subtype, selections, reportData.includeAdminBreakdown || false, holidays, absenceData, reportData.locationsList);
        }

        if (reportData.type === 'time_period') {
            const { type, scope } = reportData.data;
            const { dateRange } = reportData;
            const { start, end } = dateRange;
            if (!start || !end) return [];

            const reportStartDate = new Date(`${start}T00:00:00Z`);
            const reportEndDate = new Date(`${end}T23:59:59Z`);
            const startDayOffset = daysBetween(projectStartDate, reportStartDate);
            const endDayOffset = daysBetween(projectStartDate, reportEndDate);
            const durationInDays = daysBetween(reportStartDate, reportEndDate) + 1;

            const generalNonWorkingDays = getHolidaySet(projectStartDate, holidays, totalProjectDays);
            const absencesByPersonnel = new Map<string, Set<number>>();
            if (absenceData) {
                for (const personnelId in absenceData) {
                    const records = absenceData[personnelId];
                    const absenceSet = new Set<number>();
                    records.forEach(record => {
                        const s = new Date(record.startDate + 'T00:00:00Z');
                        const e = new Date(record.endDate + 'T00:00:00Z');
                        let current = new Date(s);
                        while (current <= e) {
                            const dayOffset = daysBetween(projectStartDate, current);
                            absenceSet.add(dayOffset);
                            current.setUTCDate(current.getUTCDate() + 1);
                        }
                    });
                    absencesByPersonnel.set(personnelId, absenceSet);
                }
            }

            const calculateMetricsForTasks = (allTasks: Task[], title: string) => {
                const allLeafTasks = allTasks.filter(t => !allTasks.some(p => p.parentId === t.id));
                if (allLeafTasks.length === 0) return null;

                const tasksInPeriod = allLeafTasks.filter(task => {
                    const taskStart = task.startDay;
                    const taskEnd = task.startDay + task.duration - 1;
                    return taskStart <= endDayOffset && taskEnd >= startDayOffset;
                });

                const totalProjectDuration = allLeafTasks.reduce((acc, t) => acc + t.duration, 0);

                let plannedWorkInPeriod = 0;
                allLeafTasks.forEach(task => {
                    const taskStart = task.startDay;
                    const taskEnd = task.startDay + task.duration - 1;
                    const overlapStart = Math.max(taskStart, startDayOffset);
                    const overlapEnd = Math.min(taskEnd, endDayOffset);
                    const overlapDuration = overlapEnd - overlapStart + 1;
                    if (overlapDuration > 0) {
                        plannedWorkInPeriod += overlapDuration;
                    }
                });

                const plannedPercent = totalProjectDuration > 0 ? Math.round((plannedWorkInPeriod / totalProjectDuration) * 100) : 0;
                const targetPercent = calculateTargetProgress(allLeafTasks, endDayOffset, generalNonWorkingDays, absencesByPersonnel);
                const actualPercent = calculateAchievedProgress(allLeafTasks);
                const progressInPeriod = calculateAchievedProgress(tasksInPeriod);

                return {
                    title,
                    tasks: tasksInPeriod,
                    metrics: { duration: durationInDays, planned: plannedPercent, target: targetPercent, actual: actualPercent, progressInPeriod: progressInPeriod }
                };
            };

            let results: any[] = [];
            switch (type) {
                case 'section': {
                    const result = calculateMetricsForTasks(scope.tasks, scope.name);
                    if (result) results.push(result);
                    break;
                }
                case 'admin': {
                    scope.sections.forEach((section: Section) => {
                        const result = calculateMetricsForTasks(section.tasks, `${scope.name} / ${section.name}`);
                        if (result) results.push(result);
                    });
                    break;
                }
                case 'sector': {
                    if (isAdministrationGroup(scope)) {
                        scope.administrations.forEach((admin: Administration) => {
                            admin.sections.forEach((section: Section) => {
                                const result = calculateMetricsForTasks(section.tasks, `${scope.groupName} / ${admin.name} / ${section.name}`);
                                if (result) results.push(result);
                            });
                        });
                    }
                    break;
                }
                case 'line': {
                    getAllAdmins(scope.administrations).forEach((admin: Administration) => {
                        admin.sections.forEach((section: Section) => {
                            const result = calculateMetricsForTasks(section.tasks, `${scope.name} / ${admin.name} / ${section.name}`);
                            if (result) results.push(result);
                        });
                    });
                    break;
                }
                case 'project': {
                    scope.productionLines.forEach((line: ProductionLine) => {
                        getAllAdmins(line.administrations).forEach((admin: Administration) => {
                            admin.sections.forEach((section: Section) => {
                                const result = calculateMetricsForTasks(section.tasks, `${line.name} / ${admin.name} / ${section.name}`);
                                if (result) results.push(result);
                            });
                        });
                    });
                    break;
                }
            }
            return results;
        }

        return null;
    }, [isOpen, reportData]);


    const handleDownloadPdf = async () => {
        setIsPdfLoading(true);
        setIsPrinting(true);

        // Give React time to re-render the full unpaginated view
        setTimeout(() => {
            const printContent = document.getElementById('pdf-preview-container');
            if (!printContent) {
                console.error("Preview content not found for printing.");
                alert("حدث خطأ أثناء تحضير التقرير للطباعة.");
                setIsPdfLoading(false);
                setIsPrinting(false);
                return;
            }

            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('الرجاء السماح بالنوافذ المنبثقة لهذا الموقع لطباعة التقرير.');
                setIsPdfLoading(false);
                setIsPrinting(false);
                return;
            }

        const isSummaryType = reportData.type === 'summary' || reportData.type === 'time_period';
        const pageSize = isSummaryType ? 'A4 portrait' : 'A4 landscape';

        printWindow.document.write('<!DOCTYPE html><html dir="rtl"><head></head><body></body></html>');
        printWindow.document.close();

        const titleEl = printWindow.document.createElement('title');
        titleEl.textContent = reportData.title;
        printWindow.document.head.appendChild(titleEl);

        const styleEl = printWindow.document.createElement('style');
        styleEl.textContent = `
          body { font-family: 'Cairo', sans-serif; direction: rtl; }
          @media print {
            @page { size: ${pageSize}; margin: 1cm; }
            .page-break-before { page-break-before: always; }
            .first\\:page-break-before-auto:first-child { page-break-before: auto; }
            .page-break-inside-avoid { page-break-inside: avoid; }
            .page-break-after-avoid {
              page-break-after: avoid;
              break-after: avoid;
            }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            ::-webkit-scrollbar { display: none; }
            .no-print { display: none !important; }
          }
        `;
        printWindow.document.head.appendChild(styleEl);

        // Copy all stylesheets from main document to ensure styles are applied
        document.querySelectorAll('style, link[rel="stylesheet"]').forEach(s => {
            printWindow.document.head.appendChild(s.cloneNode(true));
        });

        // Safely append cloned node to avoid XSS
        printWindow.document.body.appendChild(printContent.cloneNode(true));

        // Wait for styles and content to fully render
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
            setIsPdfLoading(false);
            setIsPrinting(false);
        }, 1000);
    }, 1000); // 1000ms delay for full DOM render
    };


    const handleExportCsv = () => {
        setIsCsvLoading(true);
        handleExportCsvLogic(reportData, calculatedReportData);
        setIsCsvLoading(false);
    };

    const getFilteredDataForExport = useCallback(() => {
        const { type, data, filter, dateRange, projectStartDate } = reportData;
        switch (type) {
            case 'section': return filterSection(data.section, filter, dateRange, projectStartDate);
            case 'admin': return filterAdmin(data.admin, filter, dateRange, projectStartDate);
            case 'sector': return filterAdminOrGroup(data.sector, filter, dateRange, projectStartDate);
            case 'line': return filterLine(data, filter, dateRange, projectStartDate);
            case 'project': return data.productionLines.map((line: ProductionLine) => filterLine(line, filter, dateRange, projectStartDate)).filter((l: ProductionLine | null): l is ProductionLine => l !== null);
            case 'location': {
                const { productionLines, locationAssignments } = data;
                const locationsData: { location: string, lineName: string, section: Section }[] = [];
                const getLocationFor = (lineName: string, adminName: string, sectionName: string, taskId: string) => locationAssignments[taskId] ?? locationAssignments[`${lineName}/${adminName}/${sectionName}`] ?? locationAssignments[`${lineName}/${adminName}`] ?? null;

                reportData.locationsList.forEach(location => {
                    productionLines.forEach((line: ProductionLine) => {
                        let tasksForLocation: Task[] = [];
                        getAllAdmins(line.administrations).forEach(admin => {
                            admin.sections.forEach(section => {
                                section.tasks.forEach(task => {
                                    if (getLocationFor(line.name, admin.name, section.name, task.id) === location) {
                                        tasksForLocation.push({ ...task, name: `[${admin.name} / ${section.name}] ${task.name}` });
                                    }
                                });
                            });
                        });
                        const filteredSection = filterSection({ id: `loc-${location}`, name: 'Tasks', tasks: tasksForLocation }, filter, dateRange, projectStartDate);
                        if (filteredSection) {
                            locationsData.push({ location, lineName: line.name, section: filteredSection });
                        }
                    });
                });
                return locationsData;
            }
            default: return null;
        }
    }, [reportData]);

    const generateTextReport = useCallback(() => {
        const filteredData = getFilteredDataForExport();
        return generateTextReportLogic(reportData, filteredData, {
            includeDatesInTextReport,
            includeLocationAndCodeInTextReport,
            includeNotesInTextReport,
            includeSparePartsInTextReport,
        });
    }, [reportData, getFilteredDataForExport, includeDatesInTextReport, includeLocationAndCodeInTextReport, includeNotesInTextReport, includeSparePartsInTextReport]);


    const handleExportJson = useCallback(() => {
        setIsJsonLoading(true);
        try {
            handleExportJsonLogic(reportData.title, getFilteredDataForExport);
        } catch (e) {
            console.error("Error generating JSON:", e);
            alert("حدث خطأ أثناء إنشاء ملف JSON.");
        } finally {
            setIsJsonLoading(false);
        }
    }, [getFilteredDataForExport, reportData.title]);

    const handleExportText = useCallback(() => {
        setIsTextLoading(true);
        try {
            const textContent = generateTextReport();
            downloadFile(textContent, `تقرير_${reportData.title.replace(/[\s/:]/g, '_')}.txt`, 'text/plain;charset=utf-8;');
        } catch (e) {
            console.error("Error generating TXT:", e);
            alert("حدث خطأ أثناء إنشاء ملف TXT.");
        } finally {
            setIsTextLoading(false);
        }
    }, [generateTextReport, reportData.title]);


    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent showCloseButton={false} className="w-[98vw] max-w-[1600px] h-[95vh] max-h-[95vh] flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl" dir="rtl">
                <DialogTitle className="sr-only">معاينة التقرير</DialogTitle>
                <DialogDescription className="sr-only">معاينة التقرير واستخراجه</DialogDescription>
                <header className="p-4 sm:p-6 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-zinc-800">{reportData.title}</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-3 border-l-2 border-slate-200 pl-3 mr-1">
                            <span className="text-xs font-semibold text-slate-500">خيارات TXT:</span>
                            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer"><input type="checkbox" checked={includeDatesInTextReport} onChange={e => setIncludeDatesInTextReport(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500" /> التواريخ</label>
                            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer"><input type="checkbox" checked={includeLocationAndCodeInTextReport} onChange={e => setIncludeLocationAndCodeInTextReport(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500" /> المكان/الكود</label>
                            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer"><input type="checkbox" checked={includeNotesInTextReport} onChange={e => setIncludeNotesInTextReport(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500" /> الملاحظات</label>
                            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer"><input type="checkbox" checked={includeSparePartsInTextReport} onChange={e => setIncludeSparePartsInTextReport(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500" /> قطع الغيار</label>
                        </div>
                        <button onClick={handleExportJson} disabled={isJsonLoading} className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors disabled:bg-sky-400">
                            {isJsonLoading ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>}
                            <span>{isJsonLoading ? '...' : 'حفظ بيانات (JSON)'}</span>
                        </button>
                        <button onClick={handleExportText} disabled={isTextLoading} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors disabled:bg-slate-400">
                            {isTextLoading ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 6.1H3" /><path d="M21 12.1H3" /><path d="M15.1 18.1H3" /></svg>}
                            <span>{isTextLoading ? '...' : 'حفظ نصي (TXT)'}</span>
                        </button>
                        <button onClick={handleExportCsv} disabled={isCsvLoading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors disabled:bg-green-400">
                            {isCsvLoading ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 13h6" /><path d="m15 10-3 3-3-3" /></svg>}
                            <span>{isCsvLoading ? 'جاري التصدير...' : 'تصدير Excel (CSV)'}</span>
                        </button>
                        <button onClick={handleDownloadPdf} disabled={isPdfLoading} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors disabled:bg-red-400">
                            {isPdfLoading ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>}
                            <span>{isPdfLoading ? 'جاري التحضير...' : 'طباعة / حفظ PDF'}</span>
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </header>
                <main id="pdf-preview-container" className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
                    <ReportPreviewView reportData={{ ...reportData, totalProjectDays, calculatedData: calculatedReportData }} isPrinting={isPrinting} />
                </main>
            </DialogContent>
        </Dialog>
    );
};

export default ReportPreviewModal;