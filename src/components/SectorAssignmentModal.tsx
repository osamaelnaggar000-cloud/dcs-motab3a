import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { ProductionLine, AdministrationGroup } from '../types';
import { isAdministrationGroup, getAllAdmins } from '../utils/taskHelpers';

interface SectorAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentLine: ProductionLine;
    onMoveAdministration: (lineId: string, adminId: string, targetGroupId: string | null) => void;
}

const SectorAssignmentModal: React.FC<SectorAssignmentModalProps> = ({
    isOpen,
    onClose,
    currentLine,
    onMoveAdministration
}) => {
    if (!isOpen) return null;

    const sectors = currentLine.administrations.filter(isAdministrationGroup) as AdministrationGroup[];
    const allAdmins = getAllAdmins(currentLine.administrations);

    const getAdminSector = (adminId: string): string | null => {
        for (const group of sectors) {
            if (group.administrations.some(a => a.id === adminId)) return group.id;
        }
        return null;
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent showCloseButton={false} className="w-[95vw] md:w-[85vw] max-w-5xl h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl" dir="rtl">
                <DialogTitle className="sr-only">إدارة القطاعات والإدارات العامة</DialogTitle>
                <DialogDescription className="sr-only">إسناد الإدارات للقطاعات</DialogDescription>
                <header className="p-4 sm:p-6 bg-gradient-to-r from-teal-600 to-emerald-700 flex justify-between items-center text-white flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
                            إدارة القطاعات والإدارات العامة
                        </h2>
                        <p className="text-teal-100 text-sm mt-1 opacity-90">
                            قم بإسناد كل إدارة عامة إلى القطاع المناسب لها
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                        title="إغلاق"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>

                <main className="p-4 sm:p-6 flex-1 overflow-auto bg-slate-50">
                    <div className="bg-blue-50 border-r-4 border-blue-500 p-4 mb-6 rounded-l-lg shadow-sm">
                        <div className="flex items-start gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                            <div>
                                <h3 className="font-bold text-blue-800">توجيهات الإسناد:</h3>
                                <ul className="list-disc pr-5 text-sm text-blue-700 mt-2 space-y-1">
                                    <li>قم باختيار القطاع الذي تنتمي إليه كل إدارة عامة من القائمة المنسدلة.</li>
                                    <li>الإدارة التي لا تنتمي لأي قطاع اختر لها "بدون قطاع (مستقلة)".</li>
                                    <li>يتم حفظ التغييرات فوراً بمجرد تغيير الاختيار.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
                        <table className="w-full text-right border-collapse whitespace-nowrap md:whitespace-normal">
                            <thead>
                                <tr className="bg-slate-100 border-b border-slate-200">
                                    <th className="p-4 font-semibold text-slate-700 w-1/2">الإدارة العامة</th>
                                    <th className="p-4 font-semibold text-slate-700 w-1/2">القطاع التابعة له</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {allAdmins.map(admin => {
                                    const currentSector = getAdminSector(admin.id);
                                    return (
                                        <tr key={admin.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-semibold text-zinc-800">{admin.name}</div>
                                                <div className="text-xs text-slate-500 mt-1">يحتوي على {admin.sections.length} أقسام</div>
                                            </td>
                                            <td className="p-4">
                                                <select
                                                    value={currentSector || 'none'}
                                                    onChange={(e) => onMoveAdministration(currentLine.id, admin.id, e.target.value === 'none' ? null : e.target.value)}
                                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm font-medium text-slate-700 cursor-pointer"
                                                >
                                                    <option value="none" className="text-slate-500 font-bold">-- بدون قطاع (مستقلة) --</option>
                                                    {sectors.length > 0 && <option disabled>────────────────────</option>}
                                                    {sectors.map(sector => (
                                                        <option key={sector.id} value={sector.id}>قطاع: {sector.groupName}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {allAdmins.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="p-8 text-center text-slate-500">
                                            لا توجد إدارات عامة في خط الإنتاج الحالي.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>

                <footer className="p-4 sm:p-6 bg-slate-50/50 border-t border-slate-200 flex justify-end flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors shadow-sm focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                    >
                        إغلاق النافذة
                    </button>
                </footer>
            </DialogContent>
        </Dialog>
    );
};

export default SectorAssignmentModal;
