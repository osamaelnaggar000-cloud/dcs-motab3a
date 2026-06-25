import type { Holiday } from '../types';

export const daysBetween = (date1: Date, date2: Date): number => {
    if (!date1 || !date2) return 0;
    const oneDay = 1000 * 60 * 60 * 24;
    // Use UTC to avoid DST issues
    const d1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const d2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return Math.round((d2 - d1) / oneDay);
};

export const getHolidaySet = (projectStartDate: Date, customHolidays: Holiday[], totalProjectDays: number): Set<number> => {
    const holidaySet = new Set<number>();
    if (!projectStartDate || !customHolidays) return holidaySet;

    const projStart = new Date(projectStartDate);
    
    for (let i = 0; i < totalProjectDays; i++) {
        const currentDate = new Date(projStart);
        currentDate.setUTCDate(currentDate.getUTCDate() + i);
        
        // Friday is a recurring holiday
        if (currentDate.getUTCDay() === 5) {
            holidaySet.add(i);
            continue;
        }
        
        // Check for custom holidays (leaves, etc.)
        for (const holiday of customHolidays) {
            const h_start = new Date(holiday.startDate + 'T00:00:00Z');
            const h_end = new Date(holiday.endDate + 'T23:59:59Z');
            if (currentDate >= h_start && currentDate <= h_end) {
                holidaySet.add(i);
                break; // No need to check other holidays for this date
            }
        }
    }
    return holidaySet;
};