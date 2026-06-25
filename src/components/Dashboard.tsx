import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { AppLayout } from './layout/AppLayout';
import GanttChart from './GanttChart';
import ZoomControls from './ZoomControls';
import PendingApprovalScreen from './PendingApprovalScreen';
import { Toaster } from '@/components/ui/sonner';
import { ModalsContainer } from './layout/ModalsContainer';
import { getAllAdmins } from '../utils/taskHelpers';

import { useAuth } from './Auth';
import { useProductionLinesTree, useStoreForHooks } from '../features/gantt/store/useGanttSelectors';
import { useGanttStore } from '../features/gantt/store/useGanttStore';
import { useGanttData } from '../features/gantt/api/ganttApi';
import { usePersonnelState } from '../hooks/usePersonnelState';
import { useLocationState } from '../hooks/useLocationState';
import { useAbsenceState } from '../hooks/useAbsenceState';
import { useHolidaysState } from '../hooks/useHolidaysState';
import { useLocationsListState } from '../hooks/useLocationsListState';
import { useHierarchyState } from '../hooks/useHierarchyState';
import { useRolesState } from '../hooks/useRolesState';
import { useNavigationStore } from '../store/useNavigationStore';
import { useModalStore } from '../store/useModalStore';
import { useViewStore } from '../store/useViewStore';
import { useModalRouting } from '../hooks/useModalRouting';
import { useTaskSearch, SearchResult } from '../hooks/useTaskSearch';
import { useGanttPermissions } from '../features/gantt/hooks/useGanttPermissions';
import { useGanttCalculations } from '../features/gantt/hooks/useGanttCalculations';
import { getInitialAdminAndSection } from '../utils/ganttCalculations';
import { handleAddDependencyAction } from '../services/taskService';
import type { Task, Administration } from '../types';

const Dashboard: React.FC = () => {
    useModalRouting();


    // Direct store access
    const { user: authUser, handleSignOut } = useAuth();
    const projectStartDate = useGanttStore(state => state.projectStartDate);
    const totalProjectDays = useGanttStore(state => state.totalProjectDays);
    const isInitialized = useGanttStore(state => state.isInitialized);
    const initializeState = useGanttStore(state => state.initializeState);
    const { data: ganttData, isLoading: isGanttLoading } = useGanttData();

    useEffect(() => {
        if (ganttData && !isInitialized) {
            initializeState(ganttData);
        }
    }, [ganttData, isInitialized, initializeState]);
    const { 
        updateProjectStartDate, updateTotalProjectDays, 
        addAdministration, addAdministrationGroup, updateAdministration, deleteAdministration, deleteSectorOnly, 
        addSection, updateSection, deleteSection, addProductionLine, removeProductionLine, autoLinkAllTasks, 
        toggleTaskExpansion, reorderTasks, resetAllProgress, removeAllDependencies, setAdministrationProgressToDate,
        updateTask
    } = useGanttStore.getState();

    const resetState = useCallback(() => {
      if (window.confirm('هل أنت متأكد من رغبتك في إعادة تعيين كافة البيانات؟')) {
        window.location.reload(); 
      }
    }, []);

    const storeForHooks = useStoreForHooks();
    
    const { personnelData, isLoading: isPersonnelLoading } = usePersonnelState();
    const { locationAssignments, isLoading: isLocationLoading } = useLocationState();
    const { absenceData, isLoading: isAbsenceLoading } = useAbsenceState();
    const { holidays, isLoading: isHolidaysLoading } = useHolidaysState();
    const { locationsList, addLocation, deleteLocation, isLoading: isLocationsListLoading } = useLocationsListState();
    const { nodes: hierarchyNodes, isLoading: isHierarchyLoading } = useHierarchyState();
    const { currentUserRole, isLoading: isRolesLoading, canEditInScope, canViewInScope, canManageUsers: canManageUsersCheck, canDeleteTasks, getUserHighestRole } = useRolesState(authUser);

    const {
        selectedLineIndex, setSelectedLineIndex,
        activeAdmin, setActiveAdmin,
        selectedSection, setSelectedSection,
        sidebarView, setSidebarView,
        selectedLocation, setSelectedLocation,
        isSidebarOpen, setIsSidebarOpen
    } = useNavigationStore();

    const { openModal, setSelectedTask, setCurrentParentId, setPersonnelModalContext } = useModalStore();

    const {
        zoomLevel, setZoomLevel,
        isFullScreen, setIsFullScreen,
        showCriticalPath, setShowCriticalPath,
        viewMode, setViewMode,
    } = useViewStore();

    const startDate = useMemo(() => new Date(projectStartDate), [projectStartDate]);
    const isLoading = isGanttLoading || !isInitialized || isPersonnelLoading || isLocationLoading || isAbsenceLoading || isHolidaysLoading || isLocationsListLoading || isHierarchyLoading || isRolesLoading;

    // We still need legacy productionLines for the UI components
    const productionLines = useProductionLinesTree();

    const currentLineId = productionLines.length > 0 ? productionLines[selectedLineIndex]?.id || productionLines[0].id : null;

    // Use extracted permissions logic
    const { visibleProductionLines, userCanEdit, userCanManage, userCanDelete } = useGanttPermissions(
        storeForHooks,
        currentLineId,
        activeAdmin ? activeAdmin.id : null,
        authUser,
        canViewInScope,
        canEditInScope,
        canManageUsersCheck,
        canDeleteTasks
    );

    const currentLine = !isLoading && productionLines.length > 0 ? productionLines[selectedLineIndex] || productionLines[0] : null;

    const personnelMap = useMemo(() => {
        if (!personnelData || !personnelData.personnel) return {};
        const idToNameMap: Record<string, string> = {};
        for (const id in personnelData.personnel) {
            idToNameMap[id] = personnelData.personnel[id].name;
        }
        return idToNameMap;
    }, [personnelData]);

    const { inputValue, setInputValue, searchResults, highlightedTaskId, setHighlightedTaskId } = useTaskSearch(storeForHooks, personnelMap);

    // Use extracted calculations logic
    const { totalProgress, criticalPathTaskIds, locationProgressMap, virtualSectionForLocation } = useGanttCalculations(
        storeForHooks,
        currentLineId,
        isLoading,
        showCriticalPath,
        locationAssignments,
        sidebarView,
        selectedLocation
    );

    useEffect(() => {
        if (currentLine) {
            const state = useNavigationStore.getState();
            const allAdmins = getAllAdmins(currentLine.administrations);
            const updatedAdmin = state.activeAdmin ? allAdmins.find(a => a.name === state.activeAdmin!.name) : null;

            if (updatedAdmin) {
                if (updatedAdmin !== state.activeAdmin) setActiveAdmin(updatedAdmin);
                
                const updatedSection = state.selectedSection ? updatedAdmin.sections.find(s => s.name === state.selectedSection!.name) : null;
                const newSection = updatedSection || updatedAdmin.sections[0] || null;
                
                if (newSection !== state.selectedSection) setSelectedSection(newSection);
            } else {
                const { admin, section } = getInitialAdminAndSection(currentLine);
                if (admin !== state.activeAdmin) setActiveAdmin(admin);
                if (section !== state.selectedSection) setSelectedSection(section);
            }
        }
    }, [selectedLineIndex, productionLines]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (isFullScreen) setIsFullScreen(false);
                if (inputValue) setInputValue('');
                if (isSidebarOpen) setIsSidebarOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullScreen, inputValue, isSidebarOpen]);

    const handleSelectLine = (index: number) => {
        setSelectedLineIndex(index);
        setSidebarView('admin');
        setSelectedLocation(null);
    };

    const handleAdminChange = (admin: Administration) => {
        setActiveAdmin(admin);
        setSelectedSection(admin.sections[0] || null);
        setSidebarView('admin');
        setSelectedLocation(null);
    };

    const handleTaskClick = useCallback((task: Task) => {
        setSelectedTask(task);
        setCurrentParentId(null);
        openModal('task');
    }, [setSelectedTask, setCurrentParentId, openModal]);

    const handleAddTask = useCallback((parentId: string | null = null) => {
        setSelectedTask(null);
        setCurrentParentId(parentId);
        openModal('task');
    }, [setSelectedTask, setCurrentParentId, openModal]);

    const handleReorderTasks = (newTasks: Task[]) => {
        if (selectedSection) {
            reorderTasks(selectedSection.id, newTasks.map(t => t.id));
        }
    };

    const handleAddDependency = (fromTaskId: string, toTaskId: string, type: 'FS'|'SS'|'FF' = 'FS') => {
        handleAddDependencyAction({ fromTaskId, toTaskId, type, currentLine, updateTask });
    };

    const handleOpenPersonnelManagement = useCallback((personnelIds: string[] | null = null) => {
        setPersonnelModalContext(personnelIds);
        openModal('personnel');
    }, []);

    const handleSearchResultClick = (result: SearchResult) => {
        const targetLineIndex = productionLines.findIndex(l => l.id === result.lineId);
        if (targetLineIndex === -1) return;
        
        const targetLine = productionLines[targetLineIndex];
        const allAdmins = getAllAdmins(targetLine.administrations);
        const targetAdmin = allAdmins.find(a => a.name === result.adminName);
        const targetSection = targetAdmin?.sections.find(s => s.name === result.sectionName);

        if (targetAdmin && targetSection) {
            setSelectedLineIndex(targetLineIndex);
            setActiveAdmin(targetAdmin);
            setSelectedSection(targetSection);
            setSidebarView('admin');
            setSelectedLocation(null);
            setHighlightedTaskId(result.task.id);
            setInputValue('');

            let parentId = result.task.parentId;
            while (parentId) {
                const parentTask = targetSection.tasks.find(t => t.id === parentId);
                if (parentTask && !parentTask.isExpanded) toggleTaskExpansion(parentId);
                parentId = parentTask?.parentId ?? null;
            }
        }
    };

    const ganttContent = sidebarView === 'location' ? virtualSectionForLocation : selectedSection;

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen"><p>جارٍ تحميل البيانات...</p></div>;
    }

    if (!personnelData) {
        return <div className="flex items-center justify-center h-screen"><p>لا توجد بيانات متاحة. الرجاء محاولة إعادة تعيين البيانات.</p></div>;
    }

    if (currentUserRole && getUserHighestRole(currentUserRole) === 'pending') {
        return <PendingApprovalScreen onSignOut={handleSignOut} />;
    }

    return (
        <>
            <AppLayout
                isFullScreen={isFullScreen}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                header={
                    <Header
                        productionLines={visibleProductionLines as any}

                        selectedLineIndex={selectedLineIndex}
                        onSelectLine={handleSelectLine}
                        onOpenExportOptions={() => openModal('export')}
                        onOpenPersonnelManagement={() => handleOpenPersonnelManagement()}
                        onOpenLocationAssignment={() => openModal('location')}
                        onOpenSectorAssignment={() => openModal('sector')}
                        onOpenAbsenceManagement={() => openModal('absence')}
                        onOpenHolidaysManagement={() => openModal('holidays')}
                        onResetData={resetState}
                        totalProgress={totalProgress}
                        searchQuery={inputValue}
                        onSearchChange={setInputValue}
                        searchResults={searchResults}
                        onSearchResultClick={handleSearchResultClick}
                        onNavigateHome={() => {}}
                        showCriticalPath={showCriticalPath}
                        onToggleCriticalPath={() => setShowCriticalPath(prev => !prev)}
                        projectStartDate={startDate}
                        totalProjectDays={totalProjectDays}
                        onProjectStartDateChange={updateProjectStartDate}
                        onTotalProjectDaysChange={updateTotalProjectDays}
                        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                        onAddProductionLine={addProductionLine}
                        onDeleteProductionLine={removeProductionLine}
                        onOpenBackupRestore={() => openModal('backupRestore')}
                        onAutoLinkAllTasks={autoLinkAllTasks}
                        onOpenRolesManagement={() => openModal('roles')}
                        onSignOut={handleSignOut}
                        userDisplayName={authUser?.displayName || ''}
                        highestRole={currentUserRole ? getUserHighestRole(currentUserRole) : null}
                        canManageUsers={userCanManage}
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                    />
                }
                sidebar={
                    currentLine && (
                        <Sidebar
                            administrations={currentLine.administrations}
                            selectedSection={selectedSection}
                            onSelectSection={(section) => {
                                setSelectedSection(section);
                                setIsSidebarOpen(false); // Close sidebar on selection in mobile
                            }}
                            activeAdmin={activeAdmin}
                            onAdminChange={handleAdminChange}
                            sidebarView={sidebarView}
                            onSetSidebarView={setSidebarView}
                            selectedLocation={selectedLocation}
                            onSelectLocation={(location) => {
                                setSelectedLocation(location);
                                setIsSidebarOpen(false); // Close sidebar on selection in mobile
                            }}
                            locationProgressMap={locationProgressMap}
                            currentLineName={currentLine.name}
                            locationAssignments={locationAssignments}
                            isOpen={isSidebarOpen}
                            onClose={() => setIsSidebarOpen(false)}
                            isFullScreen={isFullScreen}
                            locationsList={locationsList}
                            onAddAdministration={(name, groupId) => addAdministration(currentLine.id, name, groupId)}
                            onAddAdministrationGroup={(name) => addAdministrationGroup(currentLine.id, name)}
                            onEditAdministration={updateAdministration}
                            onDeleteAdministration={deleteAdministration}
                            onDeleteSectorOnly={deleteSectorOnly}
                            onAddSection={addSection}
                            onEditSection={updateSection}
                            onDeleteSection={deleteSection}
                            onAddLocation={addLocation}
                            onDeleteLocation={deleteLocation}
                        />
                    )
                }
                zoomControls={
                    <ZoomControls
                        zoomLevel={zoomLevel}
                        onZoomIn={() => setZoomLevel(z => Math.min(3, z + 0.25))}
                        onZoomOut={() => setZoomLevel(z => Math.max(0.25, z - 0.25))}
                        isFullScreen={isFullScreen}
                        onToggleFullScreen={() => setIsFullScreen(prev => !prev)}
                    />
                }
            >
                {ganttContent ? (
                    <GanttChart
                        section={ganttContent}
                                    projectStartDate={startDate}
                                    totalProjectDays={totalProjectDays}
                                    onTaskClick={handleTaskClick}
                                    onReorderTasks={handleReorderTasks}
                                    onAddDependency={handleAddDependency}
                                    onAddTask={handleAddTask}
                                    onToggleExpansion={toggleTaskExpansion}
                                    isLocationView={sidebarView === 'location'}
                                    showTitle={!isFullScreen}
                                    showPersonnel={!isFullScreen}
                                    showProgress={!isFullScreen}
                                    isForPrint={false}
                                    zoomLevel={zoomLevel}
                                    viewMode={viewMode}
                                    highlightedTaskId={highlightedTaskId}
                                    onHighlightComplete={() => setHighlightedTaskId(null)}
                                    personnelData={personnelData}
                                    personnelMap={personnelMap}
                                    onOpenPersonnelManagement={handleOpenPersonnelManagement}
                                    showCriticalPath={showCriticalPath}
                                    criticalPathTaskIds={criticalPathTaskIds}
                                    allLineTasks={currentLine ? getAllAdmins(currentLine.administrations).flatMap(admin => admin.sections.flatMap(sec => sec.tasks)) : []}
                                    absenceData={absenceData}
                                    holidays={holidays}
                                    canEdit={userCanEdit}
                                    hierarchyNodes={hierarchyNodes}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full bg-white rounded-xl shadow-md">
                                    <p className="text-slate-500 text-lg text-center p-4">
                                        {sidebarView === 'admin'
                                            ? (activeAdmin ? 'لا توجد أقسام في هذه الإدارة.' : 'الرجاء اختيار قسم من القائمة لعرض جدول الصيانة.')
                                            : 'الرجاء اختيار مكان لعرض المهام المسندة إليه.'
                                        }
                                    </p>
                                </div>
                            )}
            </AppLayout>

            <ModalsContainer productionLines={productionLines} />

            <Toaster richColors position="top-center" dir="rtl" />
        </>
    );
};

export default Dashboard;