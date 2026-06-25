import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Section, Administration, ProductionLine, LocationAssignmentData, Holiday, AbsenceData } from '../types';
import { getAllAdmins } from '../utils/taskHelpers';

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateReport: (type: string, data: any, title: string, filter: string, dateRange: { start: string; end: string }, includePersonnel: boolean, includeAdminBreakdown: boolean | undefined, holidays: Holiday[], absenceData: AbsenceData) => void;
  selectedSection: Section | null;
  activeAdmin: Administration | null;
  currentLine: ProductionLine;
  productionLines: ProductionLine[];
  locationAssignments: LocationAssignmentData;
  projectStartDate: Date;
  totalProjectDays: number;
  holidays: Holiday[];
  absenceData: AbsenceData;
  locationsList: string[];
}

interface MultiSelectPanelProps {
  title: string;
  options: { value: string; label: string; group?: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  gridCols?: string;
}

const MultiSelectPanel: React.FC<MultiSelectPanelProps> = ({ title, options, selected, onToggle, onSelectAll, onDeselectAll, gridCols = 'grid-cols-2 sm:grid-cols-3' }) => (
  <div className="p-3 border border-slate-300 bg-white rounded-md mt-2 animate-fade-in">
    <div className="flex justify-between items-center mb-2">
      <h5 className="font-semibold text-zinc-600">{title}</h5>
      <div className="flex gap-2">
        <button onClick={onSelectAll} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-1 px-2 rounded-md transition-colors">اختيار الكل</button>
        <button onClick={onDeselectAll} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-1 px-2 rounded-md transition-colors">إلغاء الكل</button>
      </div>
    </div>
    <div className={`max-h-48 overflow-y-auto ${gridCols} gap-2 p-1`}>
      {options.map(option => (
        <label key={option.value} className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={selected.includes(option.value)}
            onChange={() => onToggle(option.value)}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
          <span className="text-zinc-700">{option.label}</span>
        </label>
      ))}
    </div>
  </div>
);


const ExportOptionsModal: React.FC<ExportOptionsModalProps> = ({
  isOpen,
  onClose,
  onGenerateReport,
  selectedSection,
  activeAdmin,
  currentLine,
  productionLines,
  locationAssignments,
  projectStartDate,
  totalProjectDays,
  holidays,
  absenceData,
  locationsList,
}) => {
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [includePersonnel, setIncludePersonnel] = useState(true);

  const [summarySubtype, setSummarySubtype] = useState('location'); // 'all', 'location', 'admin'
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedAdmins, setSelectedAdmins] = useState<string[]>([]);
  const [includeAdminBreakdown, setIncludeAdminBreakdown] = useState(true);

  const allAdminKeys = useMemo(() => productionLines.flatMap(line =>
    getAllAdmins(line.administrations).map(admin => `${line.name} / ${admin.name}`)
  ), [productionLines]);

  const activeSector = useMemo(() => {
    if (!activeAdmin || !currentLine) return null;
    return currentLine.administrations?.find(a => 'groupName' in a && a.administrations.some(admin => admin.id === activeAdmin.id)) as any;
  }, [activeAdmin, currentLine]);

  useEffect(() => {
    if (isOpen) {
      if (summarySubtype === 'location') {
        setSelectedLocations(locationsList);
      } else if (summarySubtype === 'admin') {
        setSelectedAdmins(allAdminKeys);
      }
    }
  }, [isOpen, summarySubtype, allAdminKeys, locationsList]);

  const handleSummarySubtypeChange = (val: string) => {
    setSummarySubtype(val);
  };

  if (!isOpen) return null;

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelectFullPeriod = () => {
    const formatDate = (date: Date) => date.toISOString().slice(0, 10);
    const endDate = new Date(projectStartDate);
    endDate.setDate(endDate.getDate() + totalProjectDays - 1);
    setDateRange({ start: formatDate(projectStartDate), end: formatDate(endDate) });
  };

  const handleGenerateGenericReport = (type: string, data: any, title: string) => {
    onGenerateReport(type, data, title, filter, dateRange, includePersonnel, false, holidays, absenceData);
  };

  const handleGenerateSummaryReport = () => {
    const selections = summarySubtype === 'location' ? selectedLocations : selectedAdmins;
    if (summarySubtype !== 'all' && selections.length === 0) {
      alert('الرجاء تحديد عنصر واحد على الأقل لإنشاء التقرير المخصص.');
      return;
    }

    let reportTitle = 'ملخص تقدم الصيانة';
    if (summarySubtype === 'location') {
      reportTitle = 'ملخص تقدم الأماكن';
    } else if (summarySubtype === 'admin') {
      reportTitle = 'ملخص تقدم الإدارات';
    } else if (summarySubtype === 'all') {
      reportTitle = 'ملخص شامل لتقدم الصيانة';
    }

    onGenerateReport(
      'summary',
      {
        productionLines,
        locationAssignments,
        subtype: summarySubtype,
        selections,
      },
      reportTitle,
      'all',
      dateRange,
      false, // includePersonnel
      summarySubtype === 'location' ? includeAdminBreakdown : false, // includeAdminBreakdown
      holidays,
      absenceData
    );
  };

  const ganttReportOptions = [
    {
      label: 'تقرير القسم الحالي',
      type: 'section',
      // FIX: Wrap data in an object to include line context for dependency resolution.
      data: { section: selectedSection, line: currentLine },
      title: `تقرير القسم: ${selectedSection?.name}`,
      disabled: !selectedSection,
      description: 'تصدير جدول الصيانة للقسم المحدد في الشريط الجانبي فقط.',
    },
    {
      label: 'تقرير القطاع الحالي بالكامل',
      type: 'sector',
      data: { sector: activeSector, line: currentLine },
      title: `تقرير القطاع: ${activeSector?.groupName}`,
      disabled: !activeSector,
      description: 'تصدير جدول الصيانة لجميع الإدارات والأقسام التابعة للقطاع المحدد.',
    },
    {
      label: 'تقرير القطاع/الإدارة الحالية',
      type: 'admin',
      // FIX: Wrap data in an object to include line context for dependency resolution.
      data: { admin: activeAdmin, line: currentLine },
      title: `تقرير القطاع/الإدارة: ${activeAdmin?.name}`,
      disabled: !activeAdmin,
      description: 'تصدير جدول الصيانة لجميع الأقسام التابعة للإدارة المحددة حالياً.',
    },
    {
      label: 'تقرير خط الإنتاج الحالي',
      type: 'line',
      data: currentLine,
      title: `تقرير خط الإنتاج: ${currentLine?.name}`,
      disabled: !currentLine,
      description: 'تصدير تقرير شامل لجميع الإدارات والأقسام في خط الإنتاج المحدد.',
    },
    {
      label: 'تقرير حسب المكان',
      type: 'location',
      data: { productionLines, locationAssignments },
      title: 'تقرير حسب المكان',
      disabled: false,
      description: 'تصدير تقرير مجمع يوضح المهام المجدولة في كل مكان.',
    },
    {
      label: 'تقرير المشروع الكامل',
      type: 'project',
      data: { productionLines },
      title: 'تقرير المشروع الكامل',
      disabled: productionLines.length === 0,
      description: 'تصدير تقرير كامل يشمل جميع خطوط الإنتاج وكافة الأقسام في المشروع.',
    },
  ];

  const isTimePeriodDisabled = !dateRange.start || !dateRange.end;
  const timePeriodReportOptions = [
    {
      label: 'تقرير أداء القسم الحالي',
      type: 'time_period',
      data: { type: 'section', scope: selectedSection },
      title: `تقرير أداء القسم: ${selectedSection?.name}`,
      disabled: !selectedSection,
    },
    {
      label: 'تقرير أداء القطاع الحالي بالكامل',
      type: 'time_period',
      data: { type: 'sector', scope: activeSector },
      title: `تقرير أداء القطاع: ${activeSector?.groupName}`,
      disabled: !activeSector,
    },
    {
      label: 'تقرير أداء القطاع/الإدارة الحالية',
      type: 'time_period',
      data: { type: 'admin', scope: activeAdmin },
      title: `تقرير أداء القطاع/الإدارة: ${activeAdmin?.name}`,
      disabled: !activeAdmin,
    },
    {
      label: 'تقرير أداء خط الإنتاج الحالي',
      type: 'time_period',
      data: { type: 'line', scope: currentLine },
      title: `تقرير أداء خط الإنتاج: ${currentLine?.name}`,
      disabled: !currentLine,
    },
    {
      label: 'تقرير أداء المشروع الكامل',
      type: 'time_period',
      data: { type: 'project', scope: { productionLines } },
      title: `تقرير أداء المشروع الكامل`,
      disabled: productionLines.length === 0,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="w-[95vw] md:w-[85vw] max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl" dir="rtl">
        <DialogTitle className="sr-only">خيارات تصدير التقارير</DialogTitle>
        <DialogDescription className="sr-only">إنشاء تقارير ومستندات للمشروع</DialogDescription>
        <header className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-center flex-shrink-0 bg-slate-50/50">
          <h2 className="text-xl font-bold text-zinc-800">خيارات تصدير التقارير</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>
        <main className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto bg-white">
          {/* --- Section 1: Filters --- */}
          <fieldset className="p-4 border border-slate-200 rounded-lg bg-slate-50">
            <legend className="px-2 font-bold text-lg text-emerald-700">1. خيارات التصفية العامة</legend>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-md font-semibold text-zinc-700">تصفية حسب التاريخ:</h3>
                  <button onClick={handleSelectFullPeriod} className="text-sm bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold py-1 px-3 rounded-md transition-colors">تحديد فترة الصيانة الكاملة</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label htmlFor="start-date" className="block text-sm font-medium text-zinc-600 mb-1">من:</label><input type="date" id="start-date" name="start" value={dateRange.start} onChange={handleDateChange} className="w-full p-2 border border-slate-300 rounded-md bg-white" /></div>
                  <div><label htmlFor="end-date" className="block text-sm font-medium text-zinc-600 mb-1">إلى:</label><input type="date" id="end-date" name="end" value={dateRange.end} onChange={handleDateChange} className="w-full p-2 border border-slate-300 rounded-md bg-white" /></div>
                </div>
              </div>
              <div>
                <h3 className="text-md font-semibold text-zinc-700 mb-2">تصفية حسب الحالة (لتقارير Gantt):</h3>
                <div className="flex items-center justify-around bg-white border border-slate-200 p-1 rounded-lg">
                  {['all', 'completed', 'incomplete'].map(val => (
                    <label key={val} htmlFor={`filter-${val}`} className="flex-1 text-center">
                      <input type="radio" id={`filter-${val}`} name="task-filter" value={val} checked={filter === val} onChange={() => setFilter(val)} className="sr-only" />
                      <span className={`py-2 px-4 rounded-md cursor-pointer block text-sm font-semibold ${filter === val ? 'bg-emerald-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>{{ all: 'الكل', completed: 'ما تم إنجازه', incomplete: 'ما لم يتم' }[val]}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-md font-semibold text-zinc-700 mb-2">خيارات إضافية (لتقارير Gantt):</h3>
                <div className="flex items-center gap-3 bg-white border border-slate-200 p-3 rounded-lg"><input type="checkbox" id="include-personnel" checked={includePersonnel} onChange={e => setIncludePersonnel(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" /><label htmlFor="include-personnel" className="text-sm font-medium text-zinc-700 cursor-pointer">إضافة أسماء المسؤولين في التقرير</label></div>
              </div>
            </div>
          </fieldset>

          {/* --- Section 2: Gantt Reports --- */}
          <fieldset className="p-4 border border-slate-200 rounded-lg">
            <legend className="px-2 font-bold text-lg text-emerald-700">2. تقارير Gantt التفصيلية</legend>
            <div className="space-y-3">
              {ganttReportOptions.map((opt) => (
                <button key={opt.type} onClick={() => handleGenerateGenericReport(opt.type, opt.data, opt.title)} disabled={opt.disabled} className="w-full text-right p-3 rounded-lg border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 disabled:cursor-not-allowed transition-all">
                  <h3 className="font-bold text-md text-emerald-700 disabled:text-slate-400">{opt.label}</h3>
                  <p className="text-sm text-slate-600 disabled:text-slate-400/70 mt-1">{opt.description}</p>
                </button>
              ))}
            </div>
          </fieldset>

          {/* --- Section 3: Summary Report --- */}
          <fieldset className="p-4 border border-slate-200 rounded-lg">
            <legend className="px-2 font-bold text-lg text-emerald-700">3. تقارير الملخصات الإجمالية</legend>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">إنشاء تقرير يوضح نسب الإنجاز الإجمالية. يمكنك إنشاء تقارير مخصصة للأماكن أو الإدارات أو للمشروع بالكامل.</p>
              <div className="flex items-center justify-around bg-slate-50 border border-slate-200 p-1 rounded-lg">
                {[
                  { value: 'location', label: 'ملخص الأماكن' },
                  { value: 'admin', label: 'ملخص الإدارات' },
                  { value: 'all', label: 'ملخص شامل' }
                ].map(opt => (
                  <label key={opt.value} htmlFor={`summary-${opt.value}`} className="flex-1 text-center">
                    <input type="radio" id={`summary-${opt.value}`} name="summary-subtype" value={opt.value} checked={summarySubtype === opt.value} onChange={() => handleSummarySubtypeChange(opt.value)} className="sr-only" />
                    <span className={`py-2 px-4 rounded-md cursor-pointer block text-sm font-semibold ${summarySubtype === opt.value ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-200'}`}>{opt.label}</span>
                  </label>
                ))}
              </div>

              {summarySubtype === 'location' && (
                <>
                  <MultiSelectPanel title="اختر الأماكن" options={locationsList.map(l => ({ value: l, label: l }))} selected={selectedLocations} onToggle={(loc) => setSelectedLocations(p => p.includes(loc) ? p.filter(i => i !== loc) : [...p, loc])} onSelectAll={() => setSelectedLocations(locationsList)} onDeselectAll={() => setSelectedLocations([])} />
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-lg mt-2 animate-fade-in">
                    <input
                      type="checkbox"
                      id="include-admin-breakdown"
                      checked={includeAdminBreakdown}
                      onChange={e => setIncludeAdminBreakdown(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="include-admin-breakdown" className="text-sm font-medium text-zinc-700 cursor-pointer">تضمين ملخص الإدارات داخل كل مكان</label>
                  </div>
                </>
              )}

              {summarySubtype === 'admin' && (
                <MultiSelectPanel title="اختر الإدارات" options={allAdminKeys.map(key => ({ value: key, label: key.replace(' / ', ' - ') }))} selected={selectedAdmins} onToggle={(adm) => setSelectedAdmins(p => p.includes(adm) ? p.filter(i => i !== adm) : [...p, adm])} onSelectAll={() => setSelectedAdmins(allAdminKeys)} onDeselectAll={() => setSelectedAdmins([])} gridCols="grid-cols-1 sm:grid-cols-2" />
              )}

              <button onClick={handleGenerateSummaryReport} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>
                <span>إنشاء تقرير الملخص</span>
              </button>
            </div>
          </fieldset>

          {/* --- Section 4: Time Period Reports --- */}
          <fieldset className="p-4 border border-slate-200 rounded-lg">
            <legend className="px-2 font-bold text-lg text-emerald-700">4. تقارير الأداء الزمني</legend>
            <p className="text-sm text-slate-600 mb-4">إنشاء تقرير أداء مخصص للفترة الزمنية المحددة في الأعلى. يجب تحديد تاريخ بداية ونهاية لتمكين هذه التقارير.</p>
            {isTimePeriodDisabled && <p className="text-center text-sm text-red-600 bg-red-50 p-2 rounded-md -mt-2 mb-4">الرجاء تحديد تاريخ بداية ونهاية في القسم (1) لتفعيل هذه التقارير.</p>}

            <div className="space-y-3">
              {timePeriodReportOptions.map((opt) => (
                <button key={opt.data.type} onClick={() => handleGenerateGenericReport(opt.type, opt.data, opt.title)} disabled={opt.disabled || isTimePeriodDisabled} className="w-full text-right p-3 rounded-lg border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 disabled:cursor-not-allowed transition-all">
                  <h3 className="font-bold text-md text-emerald-700 disabled:text-slate-400">{opt.label}</h3>
                </button>
              ))}
            </div>
          </fieldset>

        </main>
      </DialogContent>
    </Dialog>
  );
};

export default ExportOptionsModal;