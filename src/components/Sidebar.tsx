import React from 'react';
import type { Section, Administration, ToplevelAdmin, AdministrationGroup, LocationAssignmentData } from '../types';
import { isAdministrationGroup } from '../utils/taskHelpers';
import { SectorView, AdminView, LocationView } from '../features/gantt/components/Sidebar/SidebarViews';

type SidebarView = 'admin' | 'sector' | 'location';

interface SidebarProps {
    administrations: ToplevelAdmin[];
    selectedSection: Section | null;
    onSelectSection: (section: Section) => void;
    activeAdmin: Administration | null;
    onAdminChange: (admin: Administration) => void;
    sidebarView: SidebarView;
    onSetSidebarView: (view: SidebarView) => void;
    selectedLocation: string | null;
    onSelectLocation: (location: string) => void;
    locationProgressMap: Record<string, number>;
    currentLineName: string;
    locationAssignments: LocationAssignmentData;
    isOpen: boolean;
    onClose: () => void;
    isFullScreen: boolean;
    locationsList: string[];
    onAddAdministrationGroup?: (name: string) => void;
    onAddAdministration?: (name: string, groupId?: string) => void;
    onEditAdministration?: (adminId: string, newName: string) => void;
    onDeleteAdministration?: (adminId: string) => void;
    onDeleteSectorOnly?: (sectorId: string) => void;
    onAddSection?: (adminId: string, name: string) => void;
    onEditSection?: (sectionId: string, newName: string) => void;
    onDeleteSection?: (sectionId: string) => void;
    onAddLocation?: (name: string) => void;
    onDeleteLocation?: (name: string) => void;
}

const Sidebar: React.FC<SidebarProps> = (props) => {
    const {
        administrations, selectedSection, onSelectSection, activeAdmin, onAdminChange,
        sidebarView, onSetSidebarView, selectedLocation, onSelectLocation,
        locationProgressMap, isOpen, onClose, isFullScreen, locationsList,
        onAddAdministrationGroup, onAddAdministration, onEditAdministration,
        onDeleteAdministration, onDeleteSectorOnly, onAddSection, onEditSection,
        onDeleteSection, onAddLocation, onDeleteLocation
    } = props;

    const [activeSectorId, setActiveSectorId] = React.useState<string>('');

    const handleAdminChange = (admin: Administration) => {
        onAdminChange(admin);
        if (admin.sections.length > 0) onSelectSection(admin.sections[0]);
    };

    const handleLocationSelect = (location: string) => onSelectLocation(location);

    const handleEditAdmin = () => {
        if (!activeAdmin) return;
        const name = window.prompt("تعديل اسم الإدارة العامة:", activeAdmin.name);
        if (name && name.trim() && name.trim() !== activeAdmin.name) {
            onEditAdministration?.(activeAdmin.id, name.trim());
        }
    };

    const handleDeleteAdmin = () => {
        if (!activeAdmin) return;
        if (window.confirm(`هل أنت متأكد من حذف الإدارة العامة "${activeAdmin.name}" وجميع أقسامها؟\nلن يمكن التراجع عن هذا الإجراء.`)) {
            onDeleteAdministration?.(activeAdmin.id);
        }
    };

    const handleAddSection = () => {
        if (!activeAdmin) return;
        const name = window.prompt("أدخل اسم القسم الجديد:");
        if (name && name.trim()) onAddSection?.(activeAdmin.id, name.trim());
    };

    const handleEditSection = (e: React.MouseEvent, section: Section) => {
        e.stopPropagation();
        const name = window.prompt("تعديل اسم القسم:", section.name);
        if (name && name.trim() && name.trim() !== section.name) {
            onEditSection?.(section.id, name.trim());
        }
    };

    const handleDeleteSection = (e: React.MouseEvent, section: Section) => {
        e.stopPropagation();
        if (window.confirm(`هل أنت متأكد من حذف القسم "${section.name}" وجميع مهامه؟\nلن يمكن التراجع عن هذا الإجراء.`)) {
            onDeleteSection?.(section.id);
        }
    };

    const sidebarClasses = `
    bg-white border-border flex-shrink-0 no-print flex flex-col
    transition-all duration-300 ease-in-out
    fixed inset-y-0 right-0 z-40 shadow-2xl md:shadow-none md:static
    ${isOpen ? 'translate-x-0 w-72 p-4 border-l overflow-y-auto opacity-100' : 'translate-x-full w-72 p-4 border-l md:translate-x-0 md:w-0 md:p-0 md:border-0 md:overflow-hidden md:opacity-0'}
    ${isFullScreen ? 'hidden' : ''}
    `;

    return (
        <aside className={sidebarClasses}>
            <div className="flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-zinc-700">التنقل</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100" aria-label="إغلاق القائمة">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="flex items-center justify-around bg-slate-100 p-1 rounded-lg mb-4 gap-1">
                    <button onClick={() => onSetSidebarView('sector')} className={`flex-1 text-center py-2 px-1 rounded-md cursor-pointer transition-colors duration-200 block text-[11px] font-bold ${sidebarView === 'sector' ? 'bg-emerald-600 text-white shadow' : 'text-slate-600 hover:bg-slate-200'}`}>حسب القطاع</button>
                    <button onClick={() => onSetSidebarView('admin')} className={`flex-1 text-center py-2 px-1 rounded-md cursor-pointer transition-colors duration-200 block text-[11px] font-bold ${sidebarView === 'admin' ? 'bg-emerald-600 text-white shadow' : 'text-slate-600 hover:bg-slate-200'}`}>حسب الإدارة</button>
                    <button onClick={() => onSetSidebarView('location')} className={`flex-1 text-center py-2 px-1 rounded-md cursor-pointer transition-colors duration-200 block text-[11px] font-bold ${sidebarView === 'location' ? 'bg-emerald-600 text-white shadow' : 'text-slate-600 hover:bg-slate-200'}`}>حسب المكان</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {sidebarView === 'sector' && (
                    <SectorView
                        administrations={administrations} activeSectorId={activeSectorId} setActiveSectorId={setActiveSectorId}
                        onAddAdministrationGroup={onAddAdministrationGroup} onEditAdministration={onEditAdministration} onDeleteSectorOnly={onDeleteSectorOnly}
                        onSetSidebarView={onSetSidebarView} handleAdminChange={handleAdminChange}
                    />
                )}
                {sidebarView === 'admin' && (
                    <AdminView
                        administrations={administrations} activeAdmin={activeAdmin} handleAdminChange={handleAdminChange}
                        selectedSection={selectedSection} onSelectSection={onSelectSection} onAddAdministration={onAddAdministration}
                        handleEditAdmin={handleEditAdmin} handleDeleteAdmin={handleDeleteAdmin} handleAddSection={handleAddSection}
                        handleEditSection={handleEditSection} handleDeleteSection={handleDeleteSection}
                    />
                )}
                {sidebarView === 'location' && (
                    <LocationView
                        lineSpecificLocations={locationsList} locationProgressMap={locationProgressMap}
                        selectedLocation={selectedLocation} handleLocationSelect={handleLocationSelect}
                        onAddLocation={onAddLocation} onDeleteLocation={onDeleteLocation}
                    />
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
