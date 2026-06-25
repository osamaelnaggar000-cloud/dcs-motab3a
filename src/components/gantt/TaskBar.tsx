import React, { useState } from 'react';
import type { Task, GanttViewMode } from '../../types';

interface TaskBarProps {
  task: Task;
  totalDays: number;
  onTaskClick: (task: Task) => void;
  todayOffset: number;
  isParent: boolean;
  personnelMap: Record<string, string>;
  isCritical: boolean;
  projectStartDate: Date;
  viewMode?: GanttViewMode;
  onDrawDependencyStart?: (taskId: string, dotType: 'start'|'end', e: React.MouseEvent) => void;
  onDrawDependencyEnd?: (taskId: string, dotType: 'start'|'end') => void;
}

export const TaskBar = React.memo(({ task, totalDays, onTaskClick, todayOffset, isParent, personnelMap, isCritical, projectStartDate, viewMode = 'classic', onDrawDependencyStart, onDrawDependencyEnd }: TaskBarProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const barStyle = {
    right: `${(task.startDay / totalDays) * 100}%`,
    width: `${(Number(task.duration) / totalDays) * 100}%`,
  };

  const progressStyle = {
    width: `${task.progress}%`
  }

  const taskEndDay = task.startDay + Number(task.duration);
  let statusColorClasses = 'bg-slate-300 border-slate-400';

  if (viewMode === 'linear') {
    if (isParent) statusColorClasses = 'bg-indigo-300 border-indigo-300';
    else if (task.progress === 100) statusColorClasses = 'bg-sky-400 border-sky-400';
    else if (todayOffset > taskEndDay && todayOffset !== -1) statusColorClasses = 'bg-rose-400 border-rose-400';
    else if (todayOffset >= task.startDay && todayOffset !== -1) statusColorClasses = 'bg-emerald-400 border-emerald-400';
    else statusColorClasses = 'bg-slate-200 border-slate-200';
  } else if (viewMode === 'dense') {
    if (isParent) statusColorClasses = 'bg-indigo-600 border-indigo-700';
    else if (task.progress === 100) statusColorClasses = 'bg-sky-600 border-sky-700';
    else if (todayOffset > taskEndDay && todayOffset !== -1) statusColorClasses = 'bg-red-600 border-red-700';
    else if (todayOffset >= task.startDay && todayOffset !== -1) statusColorClasses = 'bg-emerald-600 border-emerald-700';
    else statusColorClasses = 'bg-slate-400 border-slate-500';
  } else {
    if (isParent) statusColorClasses = 'bg-indigo-400 border-indigo-500';
    else if (task.progress === 100) statusColorClasses = 'bg-sky-500 border-sky-600'; // Completed
    else if (todayOffset > taskEndDay && todayOffset !== -1) statusColorClasses = 'bg-amber-500 border-amber-600'; // Behind schedule
    else if (todayOffset >= task.startDay && todayOffset !== -1) statusColorClasses = 'bg-emerald-500 border-emerald-600'; // In progress, on schedule
  }

  const criticalClasses = isCritical ? 'border-2 border-red-600 shadow-lg ring-2 ring-red-300 ring-offset-1' : 'border';

  const startDate = new Date(projectStartDate);
  startDate.setDate(startDate.getDate() + task.startDay);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + Number(task.duration) - 1);

  const personnelNames = task.personnel.map(id => personnelMap[id] || id).join('، ');

  return (
    <div
      className="relative h-10 flex items-center cursor-pointer group"
      onClick={() => onTaskClick(task)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={barStyle}
        className={`absolute top-0 h-full shadow-sm transition-all duration-300 ${statusColorClasses} ${criticalClasses} group-hover:opacity-80 ${viewMode === 'linear' ? 'rounded-full' : (viewMode === 'dense' ? 'rounded-sm' : 'rounded-md')}`}
      >
        <div style={progressStyle} className={`h-full ${isParent ? 'bg-indigo-200' : 'bg-black'} bg-opacity-30 transition-all duration-300 ${viewMode === 'linear' ? 'rounded-full' : (viewMode === 'dense' ? 'rounded-sm' : 'rounded-md')}`}></div>
        
        {/* Connector Dots for Dependency Drawing */}
        {onDrawDependencyStart && onDrawDependencyEnd && !isParent && (
          <>
            <div 
              className="absolute left-0 w-3 h-3 bg-slate-400 rounded-full cursor-crosshair opacity-0 group-hover:opacity-100 hover:bg-emerald-500 hover:scale-125 transition-all z-20"
              style={{ transform: 'translate(-50%, -50%)', top: '50%' }}
              onMouseDown={(e) => { e.stopPropagation(); onDrawDependencyStart(task.id, 'end', e); }}
              onMouseUp={(e) => { e.stopPropagation(); onDrawDependencyEnd(task.id, 'end'); }}
              onClick={(e) => e.stopPropagation()}
              title="نهاية المهمة (سحب لإنشاء اعتماد)"
            />
            <div 
              className="absolute right-0 w-3 h-3 bg-slate-400 rounded-full cursor-crosshair opacity-0 group-hover:opacity-100 hover:bg-emerald-500 hover:scale-125 transition-all z-20"
              style={{ transform: 'translate(50%, -50%)', top: '50%' }}
              onMouseDown={(e) => { e.stopPropagation(); onDrawDependencyStart(task.id, 'start', e); }}
              onMouseUp={(e) => { e.stopPropagation(); onDrawDependencyEnd(task.id, 'start'); }}
              onClick={(e) => e.stopPropagation()}
              title="بداية المهمة (سحب لإنشاء اعتماد)"
            />
          </>
        )}
      </div>

      {/* Progress percentage text next to the bar */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          right: `calc(${((task.startDay + Number(task.duration)) / totalDays) * 100}% + 8px)`,
          transform: 'translateY(-50%)',
        }}
        className="text-xs font-bold text-slate-600 pointer-events-none"
        aria-hidden="true"
      >
        {`${task.progress}%`}
      </div>

      {isHovered && todayOffset !== -1 && (
        <div className="absolute z-30 p-3 bg-white text-zinc-800 rounded-lg shadow-xl text-sm min-w-max border border-slate-200"
          style={{ right: `calc(${(task.startDay / totalDays) * 100}% + 10px)`, top: '100%', marginTop: '5px' }}>
          <p className="font-bold mb-1">{task.name}</p>
          <p><strong>الإنجاز:</strong> {task.progress}%</p>
          <p><strong>المدة:</strong> {task.duration} يوم</p>
          <p><strong>تبدأ:</strong> {startDate.toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p><strong>تنتهي:</strong> {endDate.toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p><strong>المسؤول:</strong> {personnelNames}</p>
          {task.notes && <p className="pt-2 mt-2 border-t border-slate-200 max-w-xs whitespace-pre-wrap"><strong>ملاحظات:</strong> {task.notes}</p>}
          {task.itemCode && <p><strong>كود:</strong> {task.itemCode}</p>}
        </div>
      )}
    </div>
  )
});
TaskBar.displayName = 'TaskBar';
