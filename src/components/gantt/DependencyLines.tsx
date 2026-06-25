import React, { useState, useEffect } from 'react';
import type { Task, GanttViewMode } from '../../types';

export type DisplayTask = Task & { depth: number; hasChildren: boolean; };

interface DependencyLinesProps {
  displayedTasks: DisplayTask[];
  allLineTasksMap: Map<string, Task>;
  timelineContainerRef: React.RefObject<HTMLDivElement>;
  zoomLevel: number;
  totalProjectDays: number;
  viewMode?: GanttViewMode;
}

export const DependencyLines = React.memo(({ displayedTasks, allLineTasksMap, timelineContainerRef, zoomLevel, totalProjectDays, viewMode = 'classic' }: DependencyLinesProps) => {
  const [lines, setLines] = useState<React.ReactNode[]>([]);
  const ROW_HEIGHT = viewMode === 'dense' ? 32 : 46;

  useEffect(() => {
    const newLines: React.ReactNode[] = [];
    const timelineEl = timelineContainerRef.current;
    if (!timelineEl) return;

    const timelineContentWidth = timelineEl.scrollWidth;
    type DisplayTaskWithIndex = DisplayTask & { index: number };
    const displayedTasksMap = new Map<string, DisplayTaskWithIndex>(displayedTasks.map((t, i) => [t.id, { ...t, index: i }]));

    for (const task of displayedTasks) {
      if (!task.dependencies || task.dependencies.length === 0) continue;

      for (const dep of task.dependencies) {
        const depObj = typeof dep === 'string' ? { taskId: dep as string, type: 'FS' as const } : dep as import('../../types').Dependency;
        const predecessor = allLineTasksMap.get(depObj.taskId);
        const successor = displayedTasksMap.get(task.id);

        if (!predecessor || !successor || !displayedTasksMap.has(predecessor.id)) continue;

        const predecessorDisplay = displayedTasksMap.get(predecessor.id)!;
        const elbowOffset = 15;

        const y1 = predecessorDisplay.index * ROW_HEIGHT + ROW_HEIGHT / 2;
        const y2 = successor.index * ROW_HEIGHT + ROW_HEIGHT / 2;

        const PADDING_RIGHT = 8;
        const usableWidth = timelineContentWidth - PADDING_RIGHT;

        const pred_end_pos_from_right = PADDING_RIGHT + (((predecessor.startDay + Number(predecessor.duration)) / totalProjectDays) * usableWidth);
        const pred_start_pos_from_right = PADDING_RIGHT + ((predecessor.startDay / totalProjectDays) * usableWidth);
        const succ_end_pos_from_right = PADDING_RIGHT + (((successor.startDay + Number(successor.duration)) / totalProjectDays) * usableWidth);
        const succ_start_pos_from_right = PADDING_RIGHT + ((successor.startDay / totalProjectDays) * usableWidth);

        let x1_ltr = 0, x2_ltr = 0, c1_x = 0, c2_x = 0;

        if (depObj.type === 'FS') {
            x1_ltr = timelineContentWidth - pred_end_pos_from_right;
            x2_ltr = timelineContentWidth - succ_start_pos_from_right;
            c1_x = x1_ltr - elbowOffset * 2;
            c2_x = x2_ltr + elbowOffset * 2;
        } else if (depObj.type === 'SS') {
            x1_ltr = timelineContentWidth - pred_start_pos_from_right;
            x2_ltr = timelineContentWidth - succ_start_pos_from_right;
            c1_x = x1_ltr + elbowOffset * 2;
            c2_x = x2_ltr + elbowOffset * 2;
        } else if (depObj.type === 'FF') {
            x1_ltr = timelineContentWidth - pred_end_pos_from_right;
            x2_ltr = timelineContentWidth - succ_end_pos_from_right;
            c1_x = x1_ltr - elbowOffset * 2;
            c2_x = x2_ltr - elbowOffset * 2;
        }

        const path = `M ${x1_ltr} ${y1} C ${c1_x} ${y1}, ${c2_x} ${y2}, ${x2_ltr} ${y2}`;

        newLines.push(
          <path
            key={`${depObj.taskId}-${task.id}`}
            d={path}
            stroke={viewMode === 'linear' ? "#94a3b8" : (viewMode === 'dense' ? "#475569" : "#64748b")}
            strokeWidth={viewMode === 'linear' ? "2" : "1.5"}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
            markerEnd={`url(#arrowhead-${viewMode})`}
          />
        );
      }
    }
    setLines(newLines);
  }, [displayedTasks, allLineTasksMap, timelineContainerRef, zoomLevel]);

  return (
    <svg className="absolute top-0 right-0 w-full h-full pointer-events-none z-10">
      <defs>
        {[
          { id: 'arrowhead-linear', color: '#94a3b8' },
          { id: 'arrowhead-dense', color: '#475569' },
          { id: 'arrowhead-classic', color: '#64748b' },
        ].map(m => (
          <marker
            key={m.id}
            id={m.id}
            viewBox="0 0 24 24"
            refX="16"
            refY="12"
            markerWidth="12"
            markerHeight="12"
            orient="auto-start-reverse"
          >
            <path
              d="M 6 4 L 17 12 L 6 20"
              fill="none"
              stroke={m.color}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        ))}
      </defs>
      {lines}
    </svg>
  );
});
DependencyLines.displayName = 'DependencyLines';
