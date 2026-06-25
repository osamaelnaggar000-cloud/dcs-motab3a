import type { Task, Section, ProductionLine, Administration, AdministrationGroup, LocationAssignmentData } from '../../types';
import { getAllAdmins, isAdministrationGroup } from '../../utils/taskHelpers';
import {
    downloadFile,
    filterSection,
    filterAdmin,
    filterAdminOrGroup,
    filterLine,
} from '../../utils/reportHelpers';


interface ReportData {
    type: string;
    data: any;
    title: string;
    filter: string;
    dateRange: { start: string; end: string };
    personnelMap: Record<string, string>;
    includePersonnel: boolean;
    locationAssignments: LocationAssignmentData;
    projectStartDate: Date;
    locationsList: string[];
}

type GetFilteredDataForExportFn = () => any;

// --- CSV Export ---

export const handleExportCsvLogic = (
    reportData: ReportData,
    calculatedReportData: any,
) => {
    const { type, data, filter, dateRange, personnelMap, includePersonnel, locationAssignments, projectStartDate } = reportData;
    const csvRows: any[] = [];

    if (type === 'summary') {
        if (!calculatedReportData) {
            alert('لا يمكن تصدير الملخص حالياً.');
            return;
        }
        const { locationSummary, hierarchicalSummary } = calculatedReportData as any;
        const headers = ['الكيان', 'النوع', 'التقدم المحقق (نسبة الإنجاز) (%)', 'التقدم المستهدف (%)'];

        if (locationSummary.length > 0 && (reportData.data.subtype === 'all' || reportData.data.subtype === 'location')) {
            locationSummary.forEach((line: any) => {
                line.locations.forEach((loc: any) => {
                    csvRows.push({ 'الكيان': loc.name, 'النوع': `مكان (${line.lineName})`, 'التقدم المحقق (نسبة الإنجاز) (%)': loc.achieved, 'التقدم المستهدف (%)': loc.target });
                });
            });
        }

        if (hierarchicalSummary.length > 0 && (reportData.data.subtype === 'all' || reportData.data.subtype === 'admin')) {
            hierarchicalSummary.forEach((line: any) => {
                csvRows.push({ 'الكيان': line.lineName, 'النوع': 'خط إنتاج', 'التقدم المحقق (نسبة الإنجاز) (%)': line.achieved, 'التقدم المستهدف (%)': line.target });
                line.admins.forEach((admin: any) => {
                    csvRows.push({ 'الكيان': admin.name, 'النوع': `إدارة (${line.lineName})`, 'التقدم المحقق (نسبة الإنجاز) (%)': admin.achieved, 'التقدم المستهدف (%)': admin.target });
                    admin.sections.forEach((section: any) => {
                        csvRows.push({ 'الكيان': section.name, 'النوع': `قسم (${admin.name})`, 'التقدم المحقق (نسبة الإنجاز) (%)': section.achieved, 'التقدم المستهدف (%)': section.target });
                    });
                });
            });
        }

        const csvContent = [
            headers.join(','),
            ...csvRows.map(row => headers.map(header => JSON.stringify(row[header], (key, value) => value === null ? '' : value)).join(','))
        ].join('\n');

        downloadFile(csvContent, `تقرير_${reportData.title.replace(/[\s/:]/g, '_')}.csv`, 'text/csv;charset=utf-8;');

    } else {
        const headers = ['خط الإنتاج', 'القطاع/الإدارة', 'القسم', 'المكان', 'معرف المهمة', 'اسم المهمة', 'المدة (أيام)', 'تاريخ البدء', 'تاريخ الانتهاء', 'نسبة الإنجاز (%)', 'المسؤولون', 'كود البند', 'ملاحظات'];

        const getLocationFor = (lineName: string, adminName: string, sectionName: string, taskId: string): string => {
            const taskKey = taskId;
            const sectionKey = `${lineName}/${adminName}/${sectionName}`;
            const adminKey = `${lineName}/${adminName}`;
            return locationAssignments[taskKey] ?? locationAssignments[sectionKey] ?? locationAssignments[adminKey] ?? '';
        };

        const processTask = (task: Task, lineName: string, adminName: string, sectionName: string) => {
            const startDate = new Date(projectStartDate);
            startDate.setDate(startDate.getDate() + task.startDay);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + task.duration - 1);

            return { 'خط الإنتاج': lineName, 'القطاع/الإدارة': adminName, 'القسم': sectionName, 'المكان': getLocationFor(lineName, adminName, sectionName, task.id), 'معرف المهمة': task.id, 'اسم المهمة': task.name, 'المدة (أيام)': task.duration, 'تاريخ البدء': startDate.toLocaleDateString('en-CA'), 'تاريخ الانتهاء': endDate.toLocaleDateString('en-CA'), 'نسبة الإنجاز (%)': task.progress, 'المسؤولون': includePersonnel ? task.personnel.map(id => personnelMap[id] || id).join('; ') : '', 'كود البند': task.itemCode || '', 'ملاحظات': task.notes || '' };
        };

        const processAdmin = (admin: Administration, lineName: string) => {
            admin.sections.forEach(section => {
                section.tasks.forEach(task => csvRows.push(processTask(task, lineName, admin.name, section.name)));
            });
        };

        const processLine = (line: ProductionLine) => {
            line.administrations.forEach(adminOrGroup => {
                if (isAdministrationGroup(adminOrGroup)) {
                    adminOrGroup.administrations.forEach(admin => processAdmin(admin, line.name));
                } else {
                    processAdmin(adminOrGroup, line.name);
                }
            });
        };

        switch (type) {
            case 'section':
                const fSection = filterSection(data.section, filter, dateRange, projectStartDate);
                if (fSection) fSection.tasks.forEach(task => csvRows.push(processTask(task, data.line.name, '', fSection.name)));
                break;
            case 'admin':
                const fAdmin = filterAdmin(data.admin, filter, dateRange, projectStartDate);
                if (fAdmin) processAdmin(fAdmin, data.line.name);
                break;
            case 'sector':
                const fSector = filterAdminOrGroup(data.sector, filter, dateRange, projectStartDate);
                if (fSector && isAdministrationGroup(fSector)) fSector.administrations.forEach(admin => processAdmin(admin, data.line.name));
                break;
            case 'line':
                const fLine = filterLine(data, filter, dateRange, projectStartDate);
                if (fLine) processLine(fLine);
                break;
            case 'project': {
                const { productionLines } = data;
                const fLines = productionLines.map((line: ProductionLine) => filterLine(line, filter, dateRange, projectStartDate)).filter((l: ProductionLine | null): l is ProductionLine => l !== null);
                fLines.forEach((line: ProductionLine) => processLine(line));
                break;
            }
            case 'location': {
                const { productionLines } = data;
                reportData.locationsList.forEach(location => {
                    productionLines.forEach((line: ProductionLine) => {
                        getAllAdmins(line.administrations).forEach(admin => {
                            admin.sections.forEach(section => {
                                const sectionWithFilteredTasks = filterSection(section, filter, dateRange, projectStartDate);
                                if (sectionWithFilteredTasks) {
                                    sectionWithFilteredTasks.tasks.forEach(task => {
                                        const taskLocation = getLocationFor(line.name, admin.name, section.name, task.id);
                                        if (taskLocation === location) csvRows.push(processTask(task, line.name, admin.name, section.name));
                                    });
                                }
                            });
                        });
                    });
                });
                break;
            }
        }

        const csvContent = [headers.join(','), ...csvRows.map(row => headers.map(header => JSON.stringify(row[header], (key, value) => value === null ? '' : value)).join(','))].join('\n');
        downloadFile(csvContent, `تقرير_${reportData.title.replace(/[\s/:]/g, '_')}.csv`, 'text/csv;charset=utf-8;');
    }
};


// --- Text Report Generation ---

export interface TextReportOptions {
    includeDatesInTextReport: boolean;
    includeLocationAndCodeInTextReport: boolean;
    includeNotesInTextReport: boolean;
    includeSparePartsInTextReport: boolean;
}

export const generateTextReportLogic = (
    reportData: ReportData,
    filteredData: any,
    options: TextReportOptions,
): string => {
    let output = `${reportData.title}\n========================================\n\n`;
    if (!filteredData) return "لا توجد بيانات للعرض.";

    const { personnelMap, projectStartDate, locationAssignments, includePersonnel } = reportData;
    const { includeDatesInTextReport, includeLocationAndCodeInTextReport, includeNotesInTextReport, includeSparePartsInTextReport } = options;
    const getLocationFor = (lineName: string, adminName: string, sectionName: string, taskId: string) => locationAssignments[taskId] ?? locationAssignments[`${lineName}/${adminName}/${sectionName}`] ?? locationAssignments[`${lineName}/${adminName}`] ?? 'غير مسند';

    const processTask = (task: Task, indent: string, context: { lineName: string, adminName: string, sectionName: string }) => {
        const { lineName, adminName, sectionName } = context;
        output += `${indent}- ${task.name} (${task.progress}%)\n`;
        if (includeDatesInTextReport) {
            const startDate = new Date(projectStartDate); startDate.setDate(startDate.getDate() + task.startDay);
            const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + task.duration - 1);
            output += `${indent}  - المدة: ${task.duration} يوم (من ${startDate.toLocaleDateString('ar-EG-u-nu-latn')} إلى ${endDate.toLocaleDateString('ar-EG-u-nu-latn')})\n`;
        }
        if (includeLocationAndCodeInTextReport) {
            output += `${indent}  - المكان: ${getLocationFor(lineName, adminName, sectionName, task.id)}\n`;
            if (task.itemCode) output += `${indent}  - كود: ${task.itemCode}\n`;
        }
        if (includePersonnel && task.personnel.length > 0) {
            output += `${indent}  - المسؤولون: ${task.personnel.map(id => personnelMap[id] || id).join('، ')}\n`;
        }
        if (includeSparePartsInTextReport && task.spareParts && task.spareParts.length > 0) {
            const partsList = task.spareParts.map(p => `${p.name} (الكمية: ${p.quantity || '-'})`).join('، ');
            output += `${indent}  - قطع الغيار: ${partsList}\n`;
        }
        if (includeNotesInTextReport && task.notes) {
            output += `${indent}  - ملاحظات: ${task.notes.replace(/\n/g, `\n${indent}    `)}\n`;
        }
    };

    const processSection = (section: Section, indent: string, context: { lineName: string, adminName: string }) => {
        output += `${indent}القسم: ${section.name}\n`;
        section.tasks.forEach(task => processTask(task, indent + '  ', { ...context, sectionName: section.name }));
    };

    const processAdmin = (admin: Administration, indent: string, context: { lineName: string }) => {
        output += `${indent}إدارة: ${admin.name}\n`;
        admin.sections.forEach(section => processSection(section, indent + '  ', { ...context, adminName: admin.name }));
    };

    const processAdminGroup = (group: AdministrationGroup, indent: string, context: { lineName: string }) => {
        output += `${indent}قطاع: ${group.groupName}\n`;
        group.administrations.forEach(admin => processAdmin(admin, indent + '  ', context));
    };

    const processLine = (line: ProductionLine, indent: string) => {
        output += `${indent}خط إنتاج: ${line.name}\n`;
        output += `${indent}-------------------\n`;
        line.administrations.forEach(adminOrGroup => {
            if (isAdministrationGroup(adminOrGroup)) {
                processAdminGroup(adminOrGroup, indent + '  ', { lineName: line.name });
            } else {
                processAdmin(adminOrGroup, indent + '  ', { lineName: line.name });
            }
            output += '\n';
        });
    };

    switch (reportData.type) {
        case 'project': (filteredData as ProductionLine[]).forEach(line => processLine(line, '')); break;
        case 'line': processLine(filteredData as ProductionLine, ''); break;
        case 'sector': processAdminGroup(filteredData as AdministrationGroup, '', { lineName: reportData.data.line.name }); break;
        case 'admin': processAdmin(filteredData as Administration, '', { lineName: reportData.data.line.name }); break;
        case 'section': {
            const { line, section } = reportData.data;
            let adminName = '';
            getAllAdmins(line.administrations).forEach((admin: Administration) => {
                if (admin.sections.some((s: Section) => s.name === section.name)) adminName = admin.name;
            });
            processSection(filteredData as Section, '', { lineName: line.name, adminName });
            break;
        }
        case 'location': {
            (filteredData as any[]).forEach(({ location, lineName, section }) => {
                output += `مكان: ${location} (${lineName})\n`;
                output += `-------------------\n`;
                section.tasks.forEach((task: Task) => {
                    output += `  - ${task.name} (${task.progress}%)\n`;
                    // Simplified output for location report
                });
                output += '\n';
            });
            break;
        }
    }
    return output;
};


// --- JSON Export ---

export const handleExportJsonLogic = (
    reportTitle: string,
    getFilteredDataForExport: GetFilteredDataForExportFn,
) => {
    const dataToExport = getFilteredDataForExport();
    const jsonContent = JSON.stringify(dataToExport, null, 2);
    downloadFile(jsonContent, `بيانات_${reportTitle.replace(/[\s/:]/g, '_')}.json`, 'application/json;charset=utf-8;');
};
