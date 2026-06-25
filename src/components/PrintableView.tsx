import React, { useMemo } from 'react';
import GanttChart from './GanttChart';
import type { Section, PersonnelData, Task, OrganizationalNode } from '../types';
import { NODE_TYPE_LABELS } from '../types';

interface PrintableViewProps {
  section: Section;
  allLineTasks: Task[];
  isSubcomponent?: boolean;
  lineName?: string;
  adminName?: string;
  personnelData: PersonnelData;
  personnelMap: Record<string, string>;
  includePersonnel: boolean;
  progress?: number;
  projectStartDate: Date;
  totalProjectDays: number;
  hierarchyNodes?: OrganizationalNode[];
}

const PrintableView: React.FC<PrintableViewProps> = ({ section, allLineTasks, isSubcomponent = false, lineName, adminName, personnelData, personnelMap, includePersonnel, progress, projectStartDate, totalProjectDays, hierarchyNodes }) => {
  const currentDate = new Date();

  const { assignedPersonnelByCategory } = useMemo(() => {
    const personnelSet = new Set<string>();
    section.tasks.forEach(task => {
      task.personnel.forEach(personId => {
        personnelSet.add(personId);
      });
    });

    const categoryMap: Record<string, string[]> = {};
    
    personnelSet.forEach(id => {
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

    return { assignedPersonnelByCategory: categoryMap };
  }, [section, personnelMap, personnelData, hierarchyNodes]);

  return (
    <div id={!isSubcomponent ? "printable-area" : undefined} className={!isSubcomponent ? "p-6 bg-white h-full flex flex-col" : ""}>
      {!isSubcomponent && (
        <header id="print-header" className="mb-4 pb-2 border-b-2 border-black">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-black">برنامج الصيانة - شركة الدلتا للسكر</h1>
              <p className="text-md text-gray-700">{lineName || 'الخط الأول'} - موسم 2025-2026</p>
            </div>
            <div className="text-left">
              <div className="bg-slate-200 text-slate-800 p-2 rounded-md inline-block">
                <h2 className="text-lg font-bold text-slate-800">{section.name}</h2>
                {progress !== undefined && (
                  <div className="flex items-center gap-2 mt-1" dir="ltr">
                    <div className="w-32 bg-slate-300 rounded-full h-3 shadow-inner">
                      <div className="bg-emerald-500 h-3 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                    <span className="font-bold text-emerald-700 text-sm">{progress}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      {isSubcomponent && (
        <header className="mb-4 pb-2 border-b-2 border-slate-500 print:hidden">
          <div className="bg-white border border-slate-200 p-2 rounded-md">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">{adminName ? `${adminName} - ` : ''}{section.name}</h3>
              {progress !== undefined && (
                <div className="flex items-center gap-2" dir="ltr">
                  <div className="w-40 bg-slate-200 rounded-full h-3.5 shadow-inner">
                    <div className="bg-emerald-500 h-3.5 rounded-full" style={{ width: `${progress}%` }}></div>
                  </div>
                  <span className="font-bold text-emerald-700 text-md">{progress}%</span>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      <main className="flex-grow">
        {includePersonnel && Object.keys(assignedPersonnelByCategory).length > 0 && (
          <div id="print-personnel-info" className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-md">
            <h3 className="text-md font-semibold text-slate-600 mb-2 border-b border-slate-200 pb-1">فريق العمل المشارك:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(assignedPersonnelByCategory).map(([category, names]) => (
                <div key={category} className="mb-2">
                  <h4 className="text-sm font-bold text-indigo-700 mb-1">{category}:</h4>
                  <p className="text-sm text-slate-800 leading-relaxed pr-2">
                    {names.join('، ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div id="print-gantt-chart">
          <GanttChart
            section={section}
            projectStartDate={projectStartDate}
            totalProjectDays={totalProjectDays}
            onTaskClick={() => { }}
            showTitle={false}
            showPersonnel={false}
            isForPrint
            zoomLevel={1}
            onAddTask={() => { }}
            onToggleExpansion={() => { }}
            personnelData={personnelData}
            personnelMap={personnelMap}
            sectionNameForPrint={section.name}
            adminNameForPrint={adminName}
            allLineTasks={allLineTasks}
            holidays={[]}
            absenceData={{}}
            hierarchyNodes={hierarchyNodes}
          />
        </div>
      </main>

      {!isSubcomponent && (
        <footer className="mt-4 pt-2 border-t border-gray-400 text-xs text-gray-600">
          <div className="flex justify-between">
            <p>بداية المشروع: {projectStartDate.toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p>تاريخ الطباعة: {currentDate.toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p>برنامج الصيانة السنوي</p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default PrintableView;