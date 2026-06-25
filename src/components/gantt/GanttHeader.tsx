import React, { useState } from 'react';
import type { Section } from '../../types';

interface GanttHeaderProps {
    section: Section;
    showTitle: boolean;
    showPersonnel: boolean;
    isLocationView: boolean;
    isForPrint: boolean;
    canEdit: boolean;
    onAddTask: (parentId?: string | null) => void;
    assignedPersonnelByCategory: Record<string, string[]>;
    assignedPersonnelIds: string[];
    onOpenPersonnelManagement?: (personnelIds?: string[]) => void;
    overallProgress: number;
    showProgress: boolean;
}

export const GanttHeader: React.FC<GanttHeaderProps> = ({
    section, showTitle, showPersonnel, isLocationView, isForPrint, canEdit,
    onAddTask, assignedPersonnelByCategory, assignedPersonnelIds, onOpenPersonnelManagement, overallProgress, showProgress
}) => {
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
    };

    return (
        <div className="flex-shrink-0">
            <div className="flex justify-between items-center mb-4">
                {showTitle && <h2 className="text-xl sm:text-2xl font-bold mb-2 text-emerald-700">{section.name}</h2>}
                {!isForPrint && !isLocationView && onAddTask && canEdit && showTitle && (
                    <button
                        onClick={() => onAddTask(null)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        <span className="hidden sm:inline">إضافة مهمة رئيسية</span>
                    </button>
                )}
            </div>

            {!isLocationView && showPersonnel && Object.keys(assignedPersonnelByCategory).length > 0 && (
                <div className="mb-4 p-3 bg-zinc-50 border border-zinc-200 rounded-md relative">
                    {onOpenPersonnelManagement && (
                        <button
                            onClick={() => onOpenPersonnelManagement(assignedPersonnelIds)}
                            className="absolute top-2 left-2 p-2 text-slate-400 hover:text-emerald-600 rounded-full hover:bg-emerald-100 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0 2l.15.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                    )}
                    <div className="mb-2">
                        <h3 className="text-md font-semibold text-zinc-600 mb-3 border-b border-zinc-200 pb-2">فريق العمل المشارك في هذا القسم:</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {Object.entries(assignedPersonnelByCategory).map(([category, names]) => {
                                const isExpanded = expandedCategories[category] !== false;
                                return (
                                    <div key={category} className="bg-white border border-zinc-200 rounded-md shadow-sm overflow-hidden">
                                        <button onClick={() => toggleCategory(category)} className="w-full flex justify-between items-center bg-slate-50 p-2 hover:bg-slate-100 transition-colors border-b border-zinc-100">
                                            <h4 className="text-sm font-bold text-emerald-700">{category} <span className="text-xs font-normal text-slate-500">({names.length})</span></h4>
                                            <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        {isExpanded && (
                                            <div className="p-2 text-sm text-zinc-700 leading-relaxed max-h-32 overflow-y-auto">
                                                {names.join('، ')}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {showProgress && !isForPrint && section.tasks.length > 0 && (
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-1">
                        <h3 className="text-md font-semibold text-zinc-600">تقدم {section.name}</h3>
                        <span className="text-lg font-bold text-emerald-600">{overallProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-4 shadow-inner" dir="rtl">
                        <div
                            className="bg-emerald-500 h-4 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${overallProgress}%` }}
                        ></div>
                    </div>
                </div>
            )}
        </div>
    );
};
