import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { ProductionLine, ToplevelAdmin, Administration, AdministrationGroup, LocationAssignmentData } from '../types';
import { getAllAdmins, isAdministrationGroup } from '../utils/taskHelpers';

interface LocationAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    productionLines: ProductionLine[];
    locationAssignments: LocationAssignmentData;
    setAssignment: (id: string, location: string) => void;
    removeAssignment: (id: string) => void;
    locationsList: string[];
    onAddLocation: (newLocation: string) => void;
    onUpdateLocation: (oldLocation: string, newLocation: string) => void;
    onDeleteLocation: (locationToDelete: string) => void;
    renameLocationAssignment: (oldLocation: string, newLocation: string) => void;
}

const LocationAssignmentModal: React.FC<LocationAssignmentModalProps> = ({ isOpen, onClose, productionLines, locationAssignments, setAssignment, removeAssignment, locationsList, onAddLocation, onUpdateLocation, onDeleteLocation, renameLocationAssignment }) => {
    const [selectedLineIndex, setSelectedLineIndex] = useState(0);
    const [newLocationName, setNewLocationName] = useState('');
    const [editingLocation, setEditingLocation] = useState<string | null>(null);
    const [editLocationValue, setEditLocationValue] = useState('');

    if (!isOpen) return null;

    const currentLine = productionLines[selectedLineIndex];

    const handleAssignmentChange = (id: string, location: string) => {
        if (location === 'none') {
            removeAssignment(id);
        } else {
            setAssignment(id, location);
        }
    };

    const renderAdmin = (admin: Administration, line: ProductionLine) => {
        const adminKey = `${line.name}/${admin.name}`;
        const adminLocation = locationAssignments[adminKey] || 'none';

        return (
            <div key={adminKey} className="bg-slate-50 p-3 rounded-md border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-zinc-800">{admin.name}</h4>
                    <select
                        value={adminLocation}
                        onChange={(e) => handleAssignmentChange(adminKey, e.target.value)}
                        className="p-1 border border-slate-300 rounded-md bg-white text-sm"
                    >
                        <option value="none">-- غير مسند --</option>
                        {locationsList.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                </div>
                <div className="space-y-2 pr-4 border-r-2 border-slate-200">
                    {admin.sections.map(section => {
                        const sectionKey = `${line.name}/${admin.name}/${section.name}`;
                        const sectionLocation = locationAssignments[sectionKey] || 'none';
                        return (
                            <div key={sectionKey} className="flex justify-between items-center text-sm">
                                <span className={adminLocation !== 'none' ? 'text-slate-400' : 'text-zinc-600'}>{section.name}</span>
                                <select
                                    value={sectionLocation}
                                    onChange={(e) => handleAssignmentChange(sectionKey, e.target.value)}
                                    disabled={adminLocation !== 'none'}
                                    className="p-1 border border-slate-300 rounded-md bg-white disabled:bg-slate-100 disabled:text-slate-400 text-xs"
                                >
                                    <option value="none">-- غير مسند --</option>
                                    {locationsList.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                                </select>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderContent = () => {
        if (!currentLine) return null;

        return (
            <div className="space-y-4">
                {currentLine.administrations.map(adminOrGroup => {
                    if (isAdministrationGroup(adminOrGroup)) {
                        return (
                            <div key={adminOrGroup.groupName} className="p-3 border-l-4 border-emerald-500 bg-emerald-50/50 rounded-md">
                                <h3 className="text-lg font-bold text-emerald-800 mb-3">{adminOrGroup.groupName}</h3>
                                <div className="space-y-3">
                                    {adminOrGroup.administrations.map(admin => renderAdmin(admin, currentLine))}
                                </div>
                            </div>
                        )
                    }
                    return renderAdmin(adminOrGroup, currentLine);
                })}
            </div>
        )
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent showCloseButton={false} className="w-[95vw] md:w-[85vw] max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl" dir="rtl">
                <DialogTitle className="sr-only">إدارة إسناد الأماكن</DialogTitle>
                <DialogDescription className="sr-only">تخصيص الأماكن للإدارات والأقسام</DialogDescription>
                
                <header className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-center flex-shrink-0 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-zinc-800">إدارة إسناد الأماكن</h2>
                        <select
                            value={selectedLineIndex}
                            onChange={e => setSelectedLineIndex(Number(e.target.value))}
                            className="p-2 border border-slate-300 rounded-md bg-white"
                        >
                            {productionLines.map((line, index) => <option key={line.name} value={index}>{line.name}</option>)}
                        </select>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>
                <main className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-md">
                        <h3 className="font-bold text-blue-800">كيفية الإسناد:</h3>
                        <ul className="list-disc pr-5 text-sm text-blue-700 mt-2 space-y-1">
                            <li>يمكنك إسناد إدارة كاملة إلى مكان معين. عندئذ، سترتبط جميع أقسامها بنفس المكان.</li>
                            <li>أو، يمكنك ترك القطاع/الإدارة "غير مسندة" وتخصيص كل قسم على حدة لمكان مختلف.</li>
                            <li>يمكن أيضاً إسناد مهمة فردية لمكان معين من خلال نافذة تعديل المهمة.</li>
                        </ul>
                    </div>

                    <div className="bg-white border border-slate-200 p-4 mb-6 rounded-md shadow-sm">
                        <h3 className="font-bold text-zinc-800 mb-4">إدارة قائمة الأماكن</h3>
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newLocationName}
                                onChange={e => setNewLocationName(e.target.value)}
                                placeholder="إضافة مكان جديد..."
                                className="flex-1 p-2 border border-slate-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                            />
                            <button
                                onClick={() => {
                                    if (newLocationName.trim()) {
                                        onAddLocation(newLocationName.trim());
                                        setNewLocationName('');
                                    }
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md font-medium"
                            >
                                إضافة
                            </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-2 pr-2 border-r-2 border-slate-200">
                            {locationsList.map(loc => (
                                <div key={loc} className="flex justify-between items-center bg-slate-50 p-2 border border-slate-200 rounded-md">
                                    {editingLocation === loc ? (
                                        <div className="flex flex-1 gap-2 mr-2">
                                            <input
                                                type="text"
                                                value={editLocationValue}
                                                onChange={e => setEditLocationValue(e.target.value)}
                                                className="flex-1 p-1 border border-slate-300 rounded text-sm"
                                            />
                                            <button onClick={() => {
                                                const finalVal = editLocationValue.trim();
                                                if (finalVal && finalVal !== loc) {
                                                    onUpdateLocation(loc, finalVal);
                                                    renameLocationAssignment(loc, finalVal);
                                                }
                                                setEditingLocation(null);
                                            }} className="text-emerald-600 hover:text-emerald-800 text-sm font-bold">حفظ</button>
                                            <button onClick={() => setEditingLocation(null)} className="text-slate-500 hover:text-slate-700 text-sm">إلغاء</button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="font-medium text-sm text-zinc-700">{loc}</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => { setEditingLocation(loc); setEditLocationValue(loc); }} className="text-blue-600 hover:text-blue-800 p-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                                </button>
                                                <button onClick={() => { if (window.confirm(`هل أنت متأكد من حذف المكان "${loc}"؟`)) onDeleteLocation(loc); }} className="text-red-600 hover:text-red-800 p-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {renderContent()}
                </main>
                <footer className="p-4 sm:p-6 bg-slate-50/50 border-t border-slate-200 flex justify-end flex-shrink-0">
                    <button onClick={onClose} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                        إغلاق
                    </button>
                </footer>
            </DialogContent>
        </Dialog>
    );
};

export default LocationAssignmentModal;
// Cache bust
