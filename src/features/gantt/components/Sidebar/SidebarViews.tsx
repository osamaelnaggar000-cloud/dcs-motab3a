import React from 'react';
import type { Section, Administration, AdministrationGroup, ToplevelAdmin } from '../../../../types';
import { isAdministrationGroup, getAllAdmins } from '../../../../utils/taskHelpers';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const SectorView = ({
    administrations, activeSectorId, setActiveSectorId,
    onAddAdministrationGroup, onEditAdministration, onDeleteSectorOnly,
    onSetSidebarView, handleAdminChange
}: any) => {
    return (
        <>
            <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                    <label htmlFor="sector-select" className="block text-sm font-medium text-zinc-700">اختر القطاع:</label>
                    <button onClick={() => {
                        const name = window.prompt("أدخل اسم القطاع الجديد:");
                        if (name && name.trim()) onAddAdministrationGroup?.(name.trim());
                    }} className="text-emerald-600 hover:text-emerald-700 p-1" title="إضافة قطاع"><Plus size={16} /></button>
                </div>
                <div className="flex gap-1 items-stretch">
                    <select
                        id="sector-select"
                        value={activeSectorId || ''}
                        onChange={(e) => setActiveSectorId(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-300 text-zinc-800 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5"
                    >
                        <option value="">-- الإدارات بدون قطاع (مستقلة) --</option>
                        {administrations.filter(isAdministrationGroup).map((group: any) => (
                            <option key={group.id} value={group.id}>{group.groupName}</option>
                        ))}
                    </select>
                    {activeSectorId && (
                        <div className="flex flex-col gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                            <button onClick={() => {
                                const group = administrations.find((g: any) => isAdministrationGroup(g) && g.id === activeSectorId);
                                if (!group) return;
                                const newName = window.prompt("تعديل اسم القطاع:", group.groupName);
                                if (newName && newName.trim() && newName.trim() !== group.groupName) {
                                    onEditAdministration?.(group.id, newName.trim());
                                }
                            }} className="flex-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 flex items-center justify-center rounded px-1 transition-colors"><Edit2 size={14} /></button>
                            <button onClick={() => {
                                if (window.confirm("هل أنت متأكد من حذف هذا القطاع؟\nملاحظة: سيتم حذف القطاع فقط مع الاحتفاظ بجميع الإدارات التابعة له لتصبح مستقلة.")) {
                                    onDeleteSectorOnly?.(activeSectorId);
                                    setActiveSectorId('');
                                }
                            }} className="flex-1 text-red-600 hover:text-red-800 hover:bg-red-100 flex items-center justify-center rounded px-1 transition-colors"><Trash2 size={14} /></button>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4">
                <h3 className="text-md font-semibold text-zinc-700 mb-2">الإدارات التابعة:</h3>
                <ul className="space-y-2">
                    {(() => {
                        let adminsToShow: Administration[] = [];
                        if (activeSectorId) {
                            const group = administrations.find((g: any) => isAdministrationGroup(g) && g.id === activeSectorId) as AdministrationGroup;
                            if (group) adminsToShow = group.administrations;
                        } else {
                            adminsToShow = administrations.filter((a: any) => !isAdministrationGroup(a)) as Administration[];
                        }
                        if (adminsToShow.length === 0) return <li className="text-sm text-slate-500">لا توجد إدارات هنا</li>;

                        return (
                            <AnimatePresence>
                                {adminsToShow.map((admin, index) => (
                                    <motion.li key={admin.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { onSetSidebarView('admin'); handleAdminChange(admin); }} className="w-full text-right p-3 bg-white border border-border rounded-lg hover:border-primary hover:shadow-md transition-all flex items-center justify-between group">
                                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{admin.name}</span>
                                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">{admin.sections.length} أقسام</span>
                                        </motion.button>
                                    </motion.li>
                                ))}
                            </AnimatePresence>
                        );
                    })()}
                </ul>
            </div>
        </>
    );
};

export const AdminView = ({
    administrations, activeAdmin, handleAdminChange, selectedSection, onSelectSection,
    onAddAdministration, handleEditAdmin, handleDeleteAdmin, handleAddSection, handleEditSection, handleDeleteSection
}: any) => {
    return (
        <>
            <h2 className="text-lg font-bold mb-4 text-zinc-700">الإدارات العامة</h2>
            <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                    <label htmlFor="admin-select" className="block text-sm font-medium text-zinc-700">اختر الإدارة العامة:</label>
                    <button onClick={() => {
                        const name = window.prompt("أدخل اسم الإدارة العامة الجديدة:");
                        if (name && name.trim()) onAddAdministration?.(name.trim());
                    }} className="text-emerald-600 hover:text-emerald-700 p-1" title="إضافة إدارة عامة"><Plus size={16} /></button>
                </div>
                <div className="flex gap-1 items-stretch">
                    <select
                        id="admin-select"
                        value={activeAdmin?.name || ''}
                        onChange={(e) => {
                            const selectedAdminName = e.target.value;
                            const allAdmins = getAllAdmins(administrations);
                            const selectedAdmin = allAdmins.find(a => a.name === selectedAdminName);
                            if (selectedAdmin) handleAdminChange(selectedAdmin);
                        }}
                        className="flex-1 bg-slate-50 border border-slate-300 text-zinc-800 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5"
                    >
                        {getAllAdmins(administrations).map(admin => (
                            <option key={admin.id || admin.name} value={admin.name}>{admin.name}</option>
                        ))}
                    </select>
                    {activeAdmin && (
                        <div className="flex flex-col gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                            <button onClick={handleEditAdmin} className="flex-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 flex items-center justify-center rounded px-1 transition-colors"><Edit2 size={14} /></button>
                            <button onClick={handleDeleteAdmin} className="flex-1 text-red-600 hover:text-red-800 hover:bg-red-100 flex items-center justify-center rounded px-1 transition-colors"><Trash2 size={14} /></button>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex justify-between items-center mb-2 mt-4">
                <h3 className="text-md font-semibold text-zinc-700">الأقسام</h3>
                {activeAdmin && (
                    <button onClick={handleAddSection} className="text-emerald-600 hover:text-emerald-700 p-1 flex items-center gap-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 rounded px-2 transition-colors">
                        <Plus size={14} /> إضافة
                    </button>
                )}
            </div>
            <nav>
                {activeAdmin ? (
                    activeAdmin.sections.length > 0 ? (
                        <ul>
                            {activeAdmin.sections.map((section: any) => (
                                <li key={section.id} className="mb-2 flex items-stretch shadow-sm">
                                    <button onClick={() => onSelectSection(section)} className={`flex-1 text-right p-3 rounded-r-lg transition-all border-y border-r flex items-center justify-between ${selectedSection?.id === section.id ? 'bg-primary/10 border-primary text-primary shadow-sm font-bold scale-[1.02]' : 'bg-background border-border text-foreground hover:bg-muted/50 hover:border-primary/50'}`}>
                                        <span>{section.name}</span>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${selectedSection?.id === section.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground bg-muted'}`}>{section.tasks.length}</span>
                                    </button>
                                    <div className="flex flex-col border-y border-l border-slate-200 rounded-l-lg bg-white overflow-hidden w-8">
                                        <button onClick={(e) => handleEditSection(e, section)} className="flex-1 text-blue-500 hover:text-white hover:bg-blue-500 flex items-center justify-center transition-colors"><Edit2 size={12} /></button>
                                        <div className="h-px bg-slate-200"></div>
                                        <button onClick={(e) => handleDeleteSection(e, section)} className="flex-1 text-red-500 hover:text-white hover:bg-red-500 flex items-center justify-center transition-colors"><Trash2 size={12} /></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-sm text-slate-500 italic p-2 bg-slate-50 rounded border border-slate-100">لا توجد أقسام. قم بإضافة قسم جديد.</p>
                ) : <p className="text-sm text-slate-500 italic p-2 bg-slate-50 rounded border border-slate-100">يرجى اختيار إدارة عامة أولاً</p>}
            </nav>
        </>
    );
};

export const LocationView = ({
    lineSpecificLocations, locationProgressMap, selectedLocation, handleLocationSelect, onAddLocation, onDeleteLocation
}: any) => {
    return (
        <>
            <h2 className="text-lg font-bold mb-4 text-zinc-700">الأماكن والمواقع</h2>
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-zinc-700">الأماكن المتوفرة:</label>
                    <button onClick={() => {
                        const name = window.prompt("أدخل اسم المكان الجديد:");
                        if (name && name.trim()) onAddLocation?.(name.trim());
                    }} className="text-emerald-600 hover:text-emerald-700 p-1" title="إضافة مكان"><Plus size={16} /></button>
                </div>
            </div>
            <nav>
                {lineSpecificLocations.length > 0 ? (
                    <ul className="space-y-2">
                        <AnimatePresence>
                            {lineSpecificLocations.map((location: string, index: number) => {
                                const progress = locationProgressMap[location] || 0;
                                return (
                                    <motion.li key={location} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: index * 0.05 }} className="flex items-stretch shadow-sm">
                                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleLocationSelect(location)} className={`flex-1 text-right p-3 rounded-r-lg transition-all border-y border-r flex flex-col gap-2 ${selectedLocation === location ? 'bg-primary/10 border-primary text-primary shadow-sm font-bold' : 'bg-background border-border text-foreground hover:bg-muted/50 hover:border-primary/50'}`}>
                                            <div className="flex justify-between items-center w-full"><span>{location}</span></div>
                                            <div className="w-full bg-slate-200 rounded-full h-1.5 shadow-inner" dir="rtl">
                                                <div className={`h-1.5 rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : progress > 0 ? 'bg-blue-500' : 'bg-slate-300'}`} style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </motion.button>
                                        <div className="flex flex-col border-y border-l border-slate-200 rounded-l-lg bg-white overflow-hidden w-8">
                                            <button onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`هل أنت متأكد من حذف المكان "${location}"؟`)) onDeleteLocation?.(location);
                                            }} className="flex-1 text-red-500 hover:text-white hover:bg-red-500 flex items-center justify-center transition-colors"><Trash2 size={12} /></button>
                                        </div>
                                    </motion.li>
                                );
                            })}
                        </AnimatePresence>
                    </ul>
                ) : <p className="text-sm text-slate-500 italic p-2 bg-slate-50 rounded border border-slate-100">لا توجد أماكن. قم بإضافة مكان جديد.</p>}
            </nav>
        </>
    );
};
