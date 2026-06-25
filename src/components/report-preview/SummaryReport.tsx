import React from 'react';



const ProgressBar: React.FC<{ value: number; colorClass: string }> = ({ value, colorClass }) => (
    <div className="flex items-center gap-2" dir="rtl">
        <div className="w-full bg-slate-200 rounded-full h-5 shadow-inner" >
            <div
                className={`${colorClass} h-5 rounded-full`}
                style={{ width: `${Math.min(value, 100)}%` }}
            />
        </div>
        <span className="font-mono font-bold text-sm text-slate-700 w-12 text-left">{value}%</span>
    </div>
);

const PerformanceBar: React.FC<{ value: number }> = ({ value }) => {
    const isAhead = value >= 100;
    const barWidth = Math.min(Math.abs(100 - value), 100);
    let colorClass = 'bg-slate-500';
    let textColorClass = 'text-slate-600';

    if (value > 105) {
        colorClass = 'bg-green-500';
        textColorClass = 'text-green-600';
    } else if (value < 95) {
        colorClass = 'bg-red-500';
        textColorClass = 'text-red-600';
    }

    return (
        <div className="flex items-center gap-2" dir="rtl">
            <div className="w-full bg-slate-200 rounded-full h-5 relative flex items-center shadow-inner">
                {/* Center line */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-slate-400 opacity-50"></div>

                {isAhead ? (
                    <div
                        className={`absolute left-1/2 h-full rounded-r-full ${colorClass}`}
                        style={{ width: `${barWidth / 2}%` }}
                    />
                ) : (
                    <div
                        className={`absolute right-1/2 h-full rounded-l-full ${colorClass}`}
                        style={{ width: `${barWidth / 2}%` }}
                    />
                )}
            </div>
            <span className={`font-mono font-bold text-sm w-16 text-left ${textColorClass}`}>{value.toFixed(0)}%</span>
        </div>
    );
};


const SummaryReport: React.FC<{ summaryData: any }> = ({ summaryData }) => {
    if (!summaryData) {
        return <div className="p-10 text-center text-slate-500">جاري حساب الملخص...</div>;
    }
    const { locationSummary, hierarchicalSummary } = summaryData;

    const calculatePerformanceIndex = (achieved: number, target: number): number => {
        if (target > 0) {
            return Math.round((achieved / target) * 100);
        }
        if (achieved > 0) {
            return 200; // Cap at 200% if work done on a 0 target
        }
        return 100; // On track if both are 0
    };

    return (
        <div id="report-preview-content" className="space-y-8">
            {locationSummary && locationSummary.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold text-white bg-indigo-700 p-3 rounded-md mb-4 print:hidden">ملخص التقدم حسب المكان</h2>
                    {locationSummary.map((lineSummary: any) => (
                        <div key={lineSummary.lineName} className="mb-6 page-break-inside-avoid">
                            <h3 className="text-xl font-bold text-indigo-800 bg-indigo-100 p-2 rounded-md mb-3 print:hidden">{lineSummary.lineName}</h3>
                            <table className="w-full border-collapse">
                                <thead style={{ display: 'table-header-group' }}>
                                    <tr>
                                        <th colSpan={4} className="text-right p-2 pt-4">
                                            <div className="border-b-2 border-slate-500 pb-2">
                                                <h3 className="text-xl font-bold text-indigo-800">{lineSummary.lineName} <span className="text-sm font-normal text-gray-500 italic ml-2">(تابع)</span></h3>
                                            </div>
                                        </th>
                                    </tr>
                                    <tr className="bg-slate-100 border-b-2 border-slate-300">
                                        <th className="p-3 font-semibold text-slate-700 text-right w-2/5">المكان / القطاع/الإدارة</th>
                                        <th className="p-3 font-semibold text-slate-700">التقدم المحقق</th>
                                        <th className="p-3 font-semibold text-slate-700">التقدم المستهدف</th>
                                        <th className="p-3 font-semibold text-slate-700">مؤشر الأداء (النسبة)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lineSummary.locations.map((item: any) => (
                                        <React.Fragment key={item.name}>
                                            <tr className="border-b border-slate-300 bg-slate-50 summary-table-row" style={{ pageBreakInside: 'avoid' }}>
                                                <td className="p-3 text-right font-semibold text-zinc-800">{item.name}</td>
                                                <td className="p-3"><ProgressBar value={item.achieved} colorClass="bg-emerald-500" /></td>
                                                <td className="p-3"><ProgressBar value={item.target} colorClass="bg-sky-500" /></td>
                                                <td className="p-3"><PerformanceBar value={calculatePerformanceIndex(item.achieved, item.target)} /></td>
                                            </tr>
                                            {item.admins && item.admins.map((adminItem: any) => (
                                                <tr key={`${item.name}-${adminItem.name}`} className="border-b border-slate-100 summary-table-row hover:bg-slate-50" style={{ pageBreakInside: 'avoid' }}>
                                                    <td className="p-2 text-right text-sm text-zinc-600 pr-8">{adminItem.name}</td>
                                                    <td className="p-2"><ProgressBar value={adminItem.achieved} colorClass="bg-emerald-400" /></td>
                                                    <td className="p-2"><ProgressBar value={adminItem.target} colorClass="bg-sky-400" /></td>
                                                    <td className="p-2"><PerformanceBar value={calculatePerformanceIndex(adminItem.achieved, adminItem.target)} /></td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            )}

            {hierarchicalSummary && hierarchicalSummary.length > 0 && hierarchicalSummary.map((lineData: any) => (
                <div key={lineData.lineName}>
                    <h2 className="text-2xl font-bold text-white bg-emerald-700 p-3 rounded-md mb-4 print:hidden">ملخص التقدم - {lineData.lineName}</h2>
                    <table className="w-full border-collapse">
                        <thead style={{ display: 'table-header-group' }}>
                            <tr>
                                <th colSpan={4} className="text-right p-2 pt-4">
                                    <div className="border-b-2 border-slate-500 pb-2">
                                        <h3 className="text-xl font-bold text-emerald-800">ملخص التقدم - {lineData.lineName} <span className="text-sm font-normal text-gray-500 italic ml-2">(تابع)</span></h3>
                                    </div>
                                </th>
                            </tr>
                            <tr className="bg-slate-100 border-b-2 border-slate-300">
                                <th className="p-3 font-semibold text-slate-700 text-right w-2/5">الكيان (القطاع/الإدارة / القسم)</th>
                                <th className="p-3 font-semibold text-slate-700">التقدم المحقق</th>
                                <th className="p-3 font-semibold text-slate-700">التقدم المستهدف</th>
                                <th className="p-3 font-semibold text-slate-700">مؤشر الأداء (النسبة)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b-2 border-slate-400 bg-slate-200 summary-table-row" style={{ pageBreakInside: 'avoid' }}>
                                <td className="p-3 text-right font-bold text-lg text-zinc-800">{lineData.lineName} (الإجمالي)</td>
                                <td className="p-3"><ProgressBar value={lineData.achieved} colorClass="bg-emerald-500" /></td>
                                <td className="p-3"><ProgressBar value={lineData.target} colorClass="bg-sky-500" /></td>
                                <td className="p-3"><PerformanceBar value={calculatePerformanceIndex(lineData.achieved, lineData.target)} /></td>
                            </tr>
                            {lineData.admins.map((adminData: any) => (
                                <React.Fragment key={adminData.name}>
                                    <tr className="border-b border-slate-300 bg-slate-50 summary-table-row" style={{ pageBreakInside: 'avoid' }}>
                                        <td className="p-3 text-right font-semibold text-zinc-700 pr-6">{adminData.name}</td>
                                        <td className="p-3"><ProgressBar value={adminData.achieved} colorClass="bg-emerald-500" /></td>
                                        <td className="p-3"><ProgressBar value={adminData.target} colorClass="bg-sky-500" /></td>
                                        <td className="p-3"><PerformanceBar value={calculatePerformanceIndex(adminData.achieved, adminData.target)} /></td>
                                    </tr>
                                    {adminData.sections.map((sectionData: any) => (
                                        <tr key={sectionData.name} className="border-b border-slate-200 summary-table-row hover:bg-slate-50" style={{ pageBreakInside: 'avoid' }}>
                                            <td className="p-2 text-right text-sm text-zinc-600 pr-12">{sectionData.name}</td>
                                            <td className="p-2"><ProgressBar value={sectionData.achieved} colorClass="bg-emerald-400" /></td>
                                            <td className="p-2"><ProgressBar value={sectionData.target} colorClass="bg-sky-400" /></td>
                                            <td className="p-2"><PerformanceBar value={calculatePerformanceIndex(sectionData.achieved, sectionData.target)} /></td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
};


export { SummaryReport, ProgressBar, PerformanceBar };
