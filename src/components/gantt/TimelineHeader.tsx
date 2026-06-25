import React from 'react';

interface TimelineHeaderProps {
  projectStartDate: Date;
  totalProjectDays: number;
}

export const TimelineHeader = React.memo(({ projectStartDate, totalProjectDays }: TimelineHeaderProps) => {
  const months = [];
  let currentDate = new Date(projectStartDate);
  let daysCovered = 0;

  const locale = 'ar-EG';

  while (daysCovered < totalProjectDays) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleString(locale, { month: 'long' });

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let daysInThisSegment: number;

    if (daysCovered === 0) { // First month
      daysInThisSegment = daysInMonth - currentDate.getDate() + 1;
    } else {
      daysInThisSegment = daysInMonth;
    }

    const remainingDays = totalProjectDays - daysCovered;
    if (daysInThisSegment > remainingDays) {
      daysInThisSegment = remainingDays;
    }

    months.push({
      name: `${monthName} ${year}`,
      days: daysInThisSegment,
    });

    daysCovered += daysInThisSegment;
    currentDate.setDate(currentDate.getDate() + daysInThisSegment);
  }

  return (
    <div className="flex h-10 border-b-2 border-slate-300">
      {months.map((month, index) => {
        const widthPercentage = (month.days / totalProjectDays) * 100;
        return (
          <div key={`${month.name}-${index}`} style={{ width: `${widthPercentage}%` }} className="flex-shrink-0 text-center font-semibold text-slate-600 border-l border-slate-200 text-xs sm:text-sm">
            {month.name}
          </div>
        )
      })}
      </div>
    );
});
TimelineHeader.displayName = 'TimelineHeader';
