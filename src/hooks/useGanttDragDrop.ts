import { useState, useCallback, useEffect } from 'react';
import type { Task, Section } from '../types';

interface UseGanttDragDropProps {
    section: Section;
    canDrag: boolean;
    onReorderTasks?: (newTasks: Task[]) => void;
    onAddDependency?: (fromId: string, toId: string, type: 'FS'|'SS'|'FF') => void;
}

export const useGanttDragDrop = ({ section, canDrag, onReorderTasks, onAddDependency }: UseGanttDragDropProps) => {
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
    const [dragPosition, setDragPosition] = useState<'top' | 'bottom' | null>(null);

    const handleDragStart = (e: React.DragEvent, task: Task) => {
        if (!canDrag) return;
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
        setDraggedTaskId(task.id);
    };

    const handleDragOver = (e: React.DragEvent, task: Task) => {
        if (!canDrag || draggedTaskId === task.id) {
            setDragOverTaskId(null);
            setDragPosition(null);
            return;
        }
        e.preventDefault();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const y = e.clientY - rect.top;
        if (y < rect.height / 2) {
            setDragPosition('top');
        } else {
            setDragPosition('bottom');
        }
        setDragOverTaskId(task.id);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        setDragOverTaskId(null);
        setDragPosition(null);
    };

    const handleDrop = (e: React.DragEvent, dropTask: Task) => {
        e.preventDefault();
        setDragOverTaskId(null);
        setDragPosition(null);

        if (!canDrag || !draggedTaskId || draggedTaskId === dropTask.id || !onReorderTasks) {
            setDraggedTaskId(null);
            return;
        }

        const currentTasks = [...section.tasks];
        const draggedTask = currentTasks.find(t => t.id === draggedTaskId);

        if (draggedTask && draggedTask.parentId === dropTask.parentId) {
            const draggedIndex = currentTasks.findIndex(t => t.id === draggedTaskId);
            const dropIndex = currentTasks.findIndex(t => t.id === dropTask.id);

            if (draggedIndex > -1 && dropIndex > -1) {
                const [draggedItem] = currentTasks.splice(draggedIndex, 1);
                
                const adjustedDropIndex = currentTasks.findIndex(t => t.id === dropTask.id);
                
                if (dragPosition === 'top') {
                    currentTasks.splice(adjustedDropIndex, 0, draggedItem);
                } else {
                    currentTasks.splice(adjustedDropIndex + 1, 0, draggedItem);
                }

                onReorderTasks(currentTasks);
            }
        }
        setDraggedTaskId(null);
    };

    const handleDragEnd = () => {
        setDraggedTaskId(null);
        setDragOverTaskId(null);
        setDragPosition(null);
    };

    // --- Dependency Drawing Logic ---
    const [drawingDepStart, setDrawingDepStart] = useState<{ taskId: string, dotType: 'start'|'end', startX: number, startY: number } | null>(null);
    const [drawingDepCurrent, setDrawingDepCurrent] = useState<{ x: number, y: number } | null>(null);

    const handleDrawDependencyStart = useCallback((taskId: string, dotType: 'start'|'end', e: React.MouseEvent) => {
        e.stopPropagation();
        setDrawingDepStart({ taskId, dotType, startX: e.clientX, startY: e.clientY });
        setDrawingDepCurrent({ x: e.clientX, y: e.clientY });
    }, []);

    const handleDrawDependencyMove = useCallback((e: MouseEvent) => {
        if (drawingDepStart) {
            setDrawingDepCurrent({ x: e.clientX, y: e.clientY });
        }
    }, [drawingDepStart]);

    const handleDrawDependencyEndDocument = useCallback(() => {
        setDrawingDepStart(null);
        setDrawingDepCurrent(null);
    }, []);

    useEffect(() => {
        if (drawingDepStart) {
            document.addEventListener('mousemove', handleDrawDependencyMove);
            document.addEventListener('mouseup', handleDrawDependencyEndDocument);
            return () => {
                document.removeEventListener('mousemove', handleDrawDependencyMove);
                document.removeEventListener('mouseup', handleDrawDependencyEndDocument);
            };
        }
    }, [drawingDepStart, handleDrawDependencyMove, handleDrawDependencyEndDocument]);

    const handleDrawDependencyTarget = useCallback((targetTaskId: string, targetDotType: 'start'|'end') => {
        if (drawingDepStart && drawingDepStart.taskId !== targetTaskId && onAddDependency) {
            let type: 'FS'|'SS'|'FF' = 'FS';
            if (drawingDepStart.dotType === 'end' && targetDotType === 'start') type = 'FS';
            else if (drawingDepStart.dotType === 'start' && targetDotType === 'start') type = 'SS';
            else if (drawingDepStart.dotType === 'end' && targetDotType === 'end') type = 'FF';
            else if (drawingDepStart.dotType === 'start' && targetDotType === 'end') type = 'FS';

            onAddDependency(drawingDepStart.taskId, targetTaskId, type);
        }
        setDrawingDepStart(null);
        setDrawingDepCurrent(null);
    }, [drawingDepStart, onAddDependency]);

    return {
        draggedTaskId, dragOverTaskId, dragPosition,
        handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd,
        drawingDepStart, drawingDepCurrent,
        handleDrawDependencyStart, handleDrawDependencyTarget
    };
};
