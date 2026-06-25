import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Section, Task, PersonnelData, Holiday, AbsenceData, OrganizationalNode, GanttViewMode } from '../types';
import { getHolidaySet } from '../utils/dateHelpers';
import { TaskBar } from './gantt/TaskBar';
import { TimelineHeader } from './gantt/TimelineHeader';
import { DependencyLines, DisplayTask } from './gantt/DependencyLines';
import { useGanttDragDrop } from '../hooks/useGanttDragDrop';
import { GanttHeader } from './gantt/GanttHeader';
import { useGanttDataPrep } from '../features/gantt/hooks/useGanttDataPrep';

interface GanttChartProps {
  section: Section;
  projectStartDate: Date;
  totalProjectDays: number;
  onTaskClick: (task: Task) => void;
  onReorderTasks?: (newTasks: Task[]) => void;
  onAddDependency?: (fromId: string, toId: string, type: 'FS'|'SS'|'FF') => void;
  showTitle?: boolean;
  showPersonnel?: boolean;
  isForPrint?: boolean;
  onAddTask: (parentId?: string | null) => void;
  onToggleExpansion: (taskId: string) => void;
  zoomLevel: number;
  showProgress?: boolean;
  highlightedTaskId?: string | null;
  onHighlightComplete?: () => void;
  personnelData: PersonnelData;
  personnelMap: Record<string, string>;
  onOpenPersonnelManagement?: (personnelIds?: string[]) => void;
  isLocationView?: boolean;
  sectionNameForPrint?: string;
  adminNameForPrint?: string;
  showCriticalPath?: boolean;
  criticalPathTaskIds?: Set<string>;
  allLineTasks: Task[]; 
  holidays: Holiday[];
  absenceData: AbsenceData;
  canEdit?: boolean;
  hierarchyNodes?: OrganizationalNode[];
  viewMode?: GanttViewMode;
}

const daysBetween = (date1: Date, date2: Date): number => {
  const oneDay = 1000 * 60 * 60 * 24;
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.round((d2.getTime() - d1.getTime()) / oneDay);
}

const GanttChart: React.FC<GanttChartProps> = ({
  section, projectStartDate, totalProjectDays, onTaskClick, onReorderTasks, onAddDependency,
  showTitle = true, showPersonnel = true, isForPrint = false, onAddTask, onToggleExpansion,
  zoomLevel, showProgress = true, highlightedTaskId, onHighlightComplete, personnelData,
  personnelMap, onOpenPersonnelManagement, isLocationView = false, sectionNameForPrint,
  adminNameForPrint, showCriticalPath = false, criticalPathTaskIds = new Set(),
  allLineTasks, holidays, absenceData, canEdit = true, hierarchyNodes, viewMode = 'classic',
}) => {
  const taskRowRefs = useRef(new Map<string, { list: HTMLDivElement | null, timeline: HTMLDivElement | null }>());
  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const isResizing = useRef(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const gridStyle = { gridTemplateColumns: isDesktop ? `${sidebarWidth}px 5px 1fr` : '180px 1fr' };

  const handleMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !ganttContainerRef.current) return;
    const containerRight = ganttContainerRef.current.getBoundingClientRect().right;
    const newWidth = containerRight - e.clientX;
    if (newWidth >= 180 && newWidth <= 800) setSidebarWidth(newWidth);
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const {
    holidaySet, displayedTasks, allLineTasksMap, hasDependencies,
    assignedPersonnelByCategory, assignedPersonnelIds, overallProgress
  } = useGanttDataPrep(
    section.tasks, allLineTasks, personnelData, personnelMap, hierarchyNodes,
    projectStartDate, totalProjectDays, holidays
  );

  const canDrag = !isForPrint && !isLocationView && !!onReorderTasks && !hasDependencies;

  const {
    draggedTaskId, dragOverTaskId, dragPosition,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd,
    drawingDepStart, drawingDepCurrent,
    handleDrawDependencyStart, handleDrawDependencyTarget
  } = useGanttDragDrop({ section, canDrag, onReorderTasks, onAddDependency });

  useEffect(() => {
    if (highlightedTaskId && onHighlightComplete) {
      const refs = taskRowRefs.current.get(highlightedTaskId);
      if (refs?.list) {
        refs.list.scrollIntoView({ behavior: 'smooth', block: 'center' });
        refs.list.classList.add('highlight-task');
        refs.timeline?.classList.add('highlight-task');
        setTimeout(() => {
          refs.list?.classList.remove('highlight-task');
          refs.timeline?.classList.remove('highlight-task');
          onHighlightComplete();
        }, 2500);
      } else {
        onHighlightComplete();
      }
    }
  }, [highlightedTaskId, section.tasks, onHighlightComplete]);

  const todayOffset = useMemo(() => daysBetween(projectStartDate, new Date()), [projectStartDate]);
  const todayMarkerPosition = `${(todayOffset / totalProjectDays) * 100}%`;

  const timelineRef = useRef<HTMLDivElement>(null);
  const taskListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timelineEl = timelineRef.current;
    const taskListEl = taskListRef.current;
    if (!timelineEl || !taskListEl) return;
    let isSyncing = false;
    const handleTimelineScroll = () => {
      if (!isSyncing) {
        isSyncing = true;
        taskListEl.scrollTop = timelineEl.scrollTop;
        requestAnimationFrame(() => { isSyncing = false; });
      }
    };
    const handleTaskListScroll = () => {
      if (!isSyncing) {
        isSyncing = true;
        timelineEl.scrollTop = taskListEl.scrollTop;
        requestAnimationFrame(() => { isSyncing = false; });
      }
    };
    timelineEl.addEventListener('scroll', handleTimelineScroll);
    taskListEl.addEventListener('scroll', handleTaskListScroll);
    return () => {
      timelineEl.removeEventListener('scroll', handleTimelineScroll);
      taskListEl.removeEventListener('scroll', handleTaskListScroll);
    };
  }, []);

  const ROW_HEIGHT_CLASS = viewMode === 'dense' ? 'h-[32px]' : 'h-[46px]';
  const HEADER_HEIGHT_CLASS = 'h-10';

  if (isForPrint) {
    const fullSectionName = adminNameForPrint ? `${adminNameForPrint} - ${sectionNameForPrint}` : sectionNameForPrint;
    return (
      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        <thead style={{ display: 'table-header-group' }}>
          <tr className="continuation-header-row">
            <th colSpan={2} className="text-right p-2 pt-4">
              <div className="border-b-2 border-slate-500 pb-2">
                <h3 className="text-lg font-bold text-slate-800">
                  {fullSectionName}
                  <span className="text-sm font-normal text-gray-500 italic ml-2">(تابع)</span>
                </h3>
              </div>
            </th>
          </tr>
          <tr className="column-header-row">
            <th className="w-[250px] align-top text-right p-2 font-semibold text-slate-600 bg-slate-100 border-b-2 border-slate-300">المهمة</th>
            <th className="align-top p-0 font-semibold text-slate-600 bg-slate-100 border-b-2 border-slate-300">
              <TimelineHeader projectStartDate={projectStartDate} totalProjectDays={totalProjectDays} />
            </th>
          </tr>
        </thead>
        <tbody>
          {displayedTasks.map((task) => (
            <tr key={task.id} className="border-b border-slate-100" style={{ pageBreakInside: 'avoid' }}>
              <td className="align-middle p-2 text-sm font-medium text-zinc-700" style={{ paddingRight: `${8 + task.depth * 20}px` }}>
                <p className="break-words">{task.name}</p>
              </td>
              <td className={`align-middle px-1 ${ROW_HEIGHT_CLASS}`}>
                <div className={`w-full bg-slate-200 h-10 relative ${viewMode === 'linear' ? 'rounded-full' : 'rounded-md'}`}>
                  <TaskBar task={task} totalDays={totalProjectDays} onTaskClick={() => { }} todayOffset={-1} isParent={task.hasChildren} personnelMap={personnelMap} isCritical={false} projectStartDate={projectStartDate} viewMode={viewMode} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="bg-white p-2 sm:p-6 rounded-xl shadow-md flex flex-col h-full">
      <GanttHeader 
        section={section} showTitle={showTitle} showPersonnel={showPersonnel} isLocationView={isLocationView}
        isForPrint={isForPrint} canEdit={canEdit} onAddTask={onAddTask} assignedPersonnelByCategory={assignedPersonnelByCategory}
        assignedPersonnelIds={assignedPersonnelIds} onOpenPersonnelManagement={onOpenPersonnelManagement} overallProgress={overallProgress} showProgress={showProgress}
      />
      <div className="flex-1 min-h-0">
        {section.tasks.length > 0 ? (
          <div ref={ganttContainerRef} className="grid border border-slate-200 rounded-lg h-full overflow-hidden" style={gridStyle}>
            <div ref={taskListRef} className="overflow-y-auto overflow-x-hidden">
              <div className={`${HEADER_HEIGHT_CLASS} sticky top-0 z-20 bg-slate-50/80 backdrop-blur-sm flex items-center border-b-2 border-slate-300`}>
                <h3 className="pr-2 font-semibold text-slate-600">المهمة</h3>
              </div>
              <div>
                {displayedTasks.map((task) => {
                  const isCritical = showCriticalPath && criticalPathTaskIds.has(task.id);
                  return (
                    <div
                      key={task.id}
                      ref={el => {
                        if (!taskRowRefs.current.has(task.id)) taskRowRefs.current.set(task.id, { list: null, timeline: null });
                        taskRowRefs.current.get(task.id)!.list = el;
                      }}
                      draggable={canDrag} onDragStart={(e) => handleDragStart(e, task)} onDragOver={(e) => handleDragOver(e, task)}
                      onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, task)} onDragEnd={handleDragEnd}
                      className={`${ROW_HEIGHT_CLASS} flex items-center border-slate-100 pr-2 group transition-all duration-150 relative
                                ${isCritical ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50'}
                                ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}
                                ${draggedTaskId === task.id ? 'opacity-50 bg-slate-200' : ''}
                                ${dragOverTaskId === task.id && dragPosition === 'top' ? 'border-t-2 border-t-emerald-500' : ''}
                                ${dragOverTaskId === task.id && dragPosition === 'bottom' ? 'border-b-2 border-b-emerald-500 shadow-[0_2px_0_#10b981]' : ''}
                                ${viewMode === 'linear' ? '' : 'border-b'}
                                ${viewMode === 'dense' ? 'text-xs' : ''}`
                      }
                      style={{ paddingRight: `${4 + task.depth * 8}px` }}
                    >
                      {isCritical && <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-400"></div>}
                      <div className="flex items-center gap-1">
                        {task.hasChildren && !isLocationView ? (
                          <button onClick={() => onToggleExpansion(task.id)} className="p-1.5 rounded-sm hover:bg-slate-200">
                            <svg className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${task.isExpanded ? 'rotate-90' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                          </button>
                        ) : <div className="w-6"></div>}
                        {canDrag ? (
                          <span className="text-slate-400 hidden sm:inline"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg></span>
                        ) : (hasDependencies && (
                          <span className="cursor-not-allowed text-slate-300 hidden sm:inline"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg></span>
                        ))}
                      </div>
                      <div className={`line-clamp-2 leading-tight text-xs sm:text-sm ${isCritical ? 'font-semibold text-red-900' : (task.hasChildren ? 'font-bold text-indigo-800' : 'font-medium text-zinc-700')}`} title={task.name}>{task.name}</div>
                      <div className="flex-1"></div>
                      {!isLocationView && canEdit && (
                        <button onClick={() => onAddTask(task.id)} className="p-1 sm:p-2 rounded-full text-slate-400 hover:bg-emerald-100 hover:text-emerald-600 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity ml-1 sm:ml-2 flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-[14px] h-[14px] sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div onMouseDown={handleMouseDown} className="cursor-ew-resize bg-slate-100 hover:bg-emerald-300 transition-colors duration-200 w-full h-full items-center justify-center group hidden md:flex"><div className="w-1 h-8 bg-slate-300 rounded-full group-hover:bg-emerald-500 transition-colors"></div></div>

            <div ref={timelineRef} className="overflow-auto gantt-scroll-container">
              <div style={{ minWidth: `${totalProjectDays * 10 * zoomLevel}px` }} className="relative">
                <div className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-sm"><TimelineHeader projectStartDate={projectStartDate} totalProjectDays={totalProjectDays} /></div>
                <div className="absolute top-0 right-0 bottom-0 left-0 pointer-events-none">
                  {Array.from(holidaySet).map(dayOffset => (
                    <div key={`holiday-${dayOffset}`} className="absolute top-0 bottom-0 bg-slate-200/60" style={{ right: `${(dayOffset / totalProjectDays) * 100}%`, width: `${(1 / totalProjectDays) * 100}%` }} />
                  ))}
                  {todayOffset >= 0 && todayOffset <= totalProjectDays && !isForPrint && (
                    <div className="absolute top-0 bottom-0 z-30" style={{ right: todayMarkerPosition }}>
                      <div className="absolute top-0 -right-5 text-xs text-red-500 font-bold bg-white px-1 rounded shadow z-30 pointer-events-auto">اليوم</div>
                      <div className="absolute top-10 bottom-0 w-0.5 bg-red-500 opacity-70"></div>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <DependencyLines displayedTasks={displayedTasks} allLineTasksMap={allLineTasksMap} timelineContainerRef={timelineRef as React.RefObject<HTMLDivElement>} zoomLevel={zoomLevel} totalProjectDays={totalProjectDays} viewMode={viewMode} />
                  {displayedTasks.map((task) => {
                    const isCritical = showCriticalPath && criticalPathTaskIds.has(task.id);
                    return (
                      <div key={task.id} ref={el => { if (!taskRowRefs.current.has(task.id)) taskRowRefs.current.set(task.id, { list: null, timeline: null }); taskRowRefs.current.get(task.id)!.timeline = el; }} className={`${ROW_HEIGHT_CLASS} flex items-center border-slate-100 pr-2 group transition-all duration-150 ${isCritical ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50/50'} ${viewMode === 'linear' ? '' : 'border-b'}`}>
                        <div className={`w-full bg-slate-200 h-10 relative ${viewMode === 'dense' ? 'h-6' : ''} ${viewMode === 'linear' ? 'rounded-full' : (viewMode === 'dense' ? 'rounded-sm' : 'rounded-md')}`}>
                          <TaskBar task={task} totalDays={totalProjectDays} onTaskClick={onTaskClick} todayOffset={todayOffset} isParent={task.hasChildren} personnelMap={personnelMap} isCritical={isCritical} projectStartDate={projectStartDate} viewMode={viewMode} onDrawDependencyStart={handleDrawDependencyStart} onDrawDependencyEnd={handleDrawDependencyTarget} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : <div className="text-center py-10"><p className="text-slate-500">لا توجد مهام صيانة مجدولة لهذا القسم.</p></div>}
      </div>

      {drawingDepStart && drawingDepCurrent && createPortal(
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          <svg className="w-full h-full" style={{ direction: 'ltr' }}>
            <line x1={drawingDepStart.startX} y1={drawingDepStart.startY} x2={drawingDepCurrent.x} y2={drawingDepCurrent.y} stroke="#10b981" strokeWidth="2.5" strokeDasharray="5,5" markerEnd="url(#temp-arrowhead)" />
            <defs><marker id="temp-arrowhead" viewBox="0 0 24 24" refX="16" refY="12" markerWidth="12" markerHeight="12" orient="auto"><path d="M 6 4 L 17 12 L 6 20" fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></marker></defs>
          </svg>
        </div>, document.body
      )}
    </div>
  );
};

export default GanttChart;
