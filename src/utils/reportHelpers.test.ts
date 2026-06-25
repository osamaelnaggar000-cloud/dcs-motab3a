import { describe, it, expect } from 'vitest';
import { calculateAchievedProgress, calculateTargetProgress } from './reportHelpers';
import { daysBetween } from './dateHelpers';

describe('Date Helpers - daysBetween', () => {
    it('calculates exact days between two identical dates as 0', () => {
        const d1 = new Date('2025-08-16T00:00:00Z');
        const d2 = new Date('2025-08-16T00:00:00Z');
        expect(daysBetween(d1, d2)).toBe(0);
    });

    it('calculates days between consecutive dates', () => {
        const d1 = new Date('2025-08-16T00:00:00Z');
        const d2 = new Date('2025-08-17T00:00:00Z');
        expect(daysBetween(d1, d2)).toBe(1);
    });

    it('handles month boundaries correctly', () => {
        const d1 = new Date('2025-08-31T00:00:00Z');
        const d2 = new Date('2025-09-01T00:00:00Z');
        expect(daysBetween(d1, d2)).toBe(1);
    });
});

describe('Report Helpers - calculateAchievedProgress', () => {
    it('returns 0 for empty tasks array', () => {
        expect(calculateAchievedProgress([])).toBe(0);
    });

    it('calculates weighted average based on duration correctly', () => {
        const tasks: any[] = [
            { id: '1', progress: 50, duration: 2, parentId: null }, // Weight: 100
            { id: '2', progress: 100, duration: 4, parentId: null } // Weight: 400
            // Total Duration: 6, Total Weight: 500, Expected: Math.round(500/6) = 83
        ];
        expect(calculateAchievedProgress(tasks)).toBe(83);
    });

    it('returns 100 if all tasks are 100% complete regardless of duration 0', () => {
        const tasks: any[] = [
            { id: '1', progress: 100, duration: 0, parentId: null },
            { id: '2', progress: 100, duration: 0, parentId: null }
        ];
        expect(calculateAchievedProgress(tasks)).toBe(100);
    });

    it('ignores parent tasks in calculation', () => {
        const tasks: any[] = [
            { id: '1', progress: 50, duration: 10, parentId: null }, // Parent
            { id: '2', progress: 100, duration: 5, parentId: '1' }   // Child
            // Only child should be counted
        ];
        expect(calculateAchievedProgress(tasks)).toBe(100);
    });
});

describe('Report Helpers - calculateTargetProgress', () => {
    it('returns 0 if current day is before start day', () => {
        const task: any = { id: '1', startDay: 10, duration: 5, personnel: [] };
        expect(calculateTargetProgress([task], 5, new Set(), new Map())).toBe(0);
    });

    it('returns 100 if current day is after task end day', () => {
        const task: any = { id: '1', startDay: 10, duration: 5, personnel: [] };
        expect(calculateTargetProgress([task], 15, new Set(), new Map())).toBe(100);
    });

    it('calculates partial progress correctly', () => {
        const task: any = { id: '1', startDay: 10, duration: 10, personnel: [] };
        // currentDay is 14 (5th day of the task)
        // Elapsed = 14 - 10 + 1 = 5. Total = 10. Expected: 50
        expect(calculateTargetProgress([task], 14, new Set(), new Map())).toBe(50);
    });

    it('returns 100 for 0 duration tasks if currentDay >= startDay', () => {
        const task: any = { id: '1', startDay: 10, duration: 0, personnel: [] };
        expect(calculateTargetProgress([task], 10, new Set(), new Map())).toBe(100);
        expect(calculateTargetProgress([task], 12, new Set(), new Map())).toBe(100);
    });
});
