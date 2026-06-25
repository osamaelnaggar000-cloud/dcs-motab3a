import React, { Suspense, lazy } from 'react';
import { useModalStore } from '../../store/useModalStore';
import { useNavigationStore } from '../../store/useNavigationStore';
import { Administration, AdministrationGroup, Task, Holiday, AbsenceData } from '../../types';

import { useGanttStore } from '../../features/gantt/store/useGanttStore';
import { useProductionLinesTree } from '../../features/gantt/store/useGanttSelectors';
import { usePersonnelState } from '../../hooks/usePersonnelState';
import { useLocationState } from '../../hooks/useLocationState';
import { useAbsenceState } from '../../hooks/useAbsenceState';
import { useHolidaysState } from '../../hooks/useHolidaysState';
import { useLocationsListState } from '../../hooks/useLocationsListState';
import { useHierarchyState } from '../../hooks/useHierarchyState';
import { useRolesState } from '../../hooks/useRolesState';
import { useAuth } from '../Auth';
import { handleSaveTaskAction } from '../../services/taskService';

const TaskDetailModal = lazy(() => import('../TaskDetailModal'));
const ExportOptionsModal = lazy(() => import('../ExportOptionsModal'));
const ReportPreviewModal = lazy(() => import('../ReportPreviewModal'));
const PersonnelManagementModal = lazy(() => import('../PersonnelManagementModal'));
const LocationAssignmentModal = lazy(() => import('../LocationAssignmentModal'));
const AbsenceManagementModal = lazy(() => import('../AbsenceManagementModal'));
const HolidayManagementModal = lazy(() => import('../HolidayManagementModal'));
const BackupRestoreModal = lazy(() => import('../BackupRestoreModal'));
const SectorAssignmentModal = lazy(() => import('../SectorAssignmentModal'));
const RoleManagementModal = lazy(() => import('../RoleManagementModal'));

export const ModalsContainer: React.FC<{ productionLines: any[] }> = ({ productionLines }) => {
    const {
        activeModal, closeModal,
        selectedTask, currentParentId,
        personnelModalContext, setPersonnelModalContext,
        reportData, setReportData,
    } = useModalStore();

    const { selectedSection, activeAdmin, selectedLineIndex } = useNavigationStore();
    
    // Direct store access
    const { user: authUser } = useAuth();
    const projectStartDate = useGanttStore(state => state.projectStartDate);
    const totalProjectDays = useGanttStore(state => state.totalProjectDays);
    const updateTask = useGanttStore(state => state.updateTask);
    const addTask = useGanttStore(state => state.addTask);
    const deleteTask = useGanttStore(state => state.deleteTask);
    const moveAdministration = useGanttStore(state => state.moveAdministration);
    const unassignPersonnel = useGanttStore(state => state.unassignPersonnel);
    const { personnelData, addPerson, updatePerson, deletePerson: deletePersonFromStore } = usePersonnelState();
    const { locationAssignments, setAssignment, removeAssignment, renameLocationAssignment } = useLocationState();
    const { absenceData, addAbsence, updateAbsence, deleteAbsence } = useAbsenceState();
    const { holidays, addHoliday, updateHoliday, deleteHoliday } = useHolidaysState();
    const { locationsList, addLocation, updateLocation, deleteLocation } = useLocationsListState();
    const { nodes: hierarchyNodes, addNode: addHierarchyNode, updateNode: updateHierarchyNode, deleteNode: deleteHierarchyNode, resetHierarchy } = useHierarchyState();
    const { rolesState, currentUserRole, assignRoles, removeUser, canViewInScope, canManageUsers: canManageUsersCheck, canEditInScope, canDeleteTasks, getUserHighestRole } = useRolesState(authUser);

    const startDate = React.useMemo(() => new Date(projectStartDate), [projectStartDate]);
    const productionLinesTree = useProductionLinesTree();
    const currentLine = productionLinesTree[selectedLineIndex] || productionLinesTree[0] || null;

    const personnelMap = React.useMemo(() => {
        if (!personnelData || !personnelData.personnel) return {};
        const idToNameMap: Record<string, string> = {};
        for (const id in personnelData.personnel) {
            idToNameMap[id] = personnelData.personnel[id].name;
        }
        return idToNameMap;
    }, [personnelData]);

    const authUserUid = authUser?.uid;
    const highestRoleLevel = currentUserRole ? (getUserHighestRole(currentUserRole) === 'owner' ? 0 : getUserHighestRole(currentUserRole) === 'manager' ? 1 : 2) : 999;

    const userCanEdit = currentLine && authUserUid ? canEditInScope(authUserUid, currentLine.name, undefined, activeAdmin?.name || undefined) : false;
    const userCanDelete = authUserUid ? canDeleteTasks(authUserUid) : false;
    const userCanManage = authUserUid ? canManageUsersCheck(authUserUid) : false;

    const handleClosePersonnelManagement = () => {
        closeModal();
        setPersonnelModalContext(null);
    };

    const handleDeletePerson = (personId: string) => {
        unassignPersonnel(personId);
        deletePersonFromStore(personId);
    };

    const wrappedAddTask = (adminName: string, sectionName: string, task: any, parentId: string | null) => {
        if (!currentLine) return;
        const allAdmins: Administration[] = [];
        const processAdmins = (admins: (Administration | AdministrationGroup)[]) => {
            for (const adminOrGroup of admins) {
                if ('groupName' in adminOrGroup) {
                    allAdmins.push(...adminOrGroup.administrations);
                } else {
                    allAdmins.push(adminOrGroup);
                }
            }
        };
        processAdmins(currentLine.administrations);
        
        const targetAdmin = allAdmins.find(a => a.name === adminName);
        const targetSection = targetAdmin?.sections.find(s => s.name === sectionName);
        if (targetSection) {
            addTask(targetSection.id, task, parentId);
        }
    };

    const handleSaveTask = (taskId: string | null, updatedProps: Partial<Task> & { location?: string }, parentId: string | null, targetAdminName?: string, targetSectionName?: string) => {
        handleSaveTaskAction({
            taskId, updatedProps, parentId, targetAdminName, targetSectionName,
            currentLine, activeAdminName: activeAdmin?.name, selectedSectionName: selectedSection?.name,
            updateTask, addTask: wrappedAddTask, setAssignment, removeAssignment
        });
    };

    const handleGenerateReport = (type: string, data: any, title: string, filter: string, dateRange: { start: string; end: string }, includePersonnel: boolean, includeAdminBreakdown: boolean = false, reportHolidays: Holiday[], reportAbsenceData: AbsenceData) => {
        setReportData({ type, data, title, filter, dateRange, personnelData, personnelMap, includePersonnel, locationAssignments, includeAdminBreakdown, projectStartDate: startDate, holidays: reportHolidays, absenceData: reportAbsenceData, locationsList, hierarchyNodes });
        closeModal();
        useModalStore.getState().openModal('reportPreview');
    };

    // Identify current Task Context for Modal
    const currentTaskContext = React.useMemo(() => {
        if (!selectedTask || !currentLine) return { adminName: activeAdmin?.name || '', sectionName: selectedSection?.name || '' };

        let foundAdmin = '';
        let foundSection = '';

        const allAdmins: Administration[] = [];
        const processAdmins = (admins: (Administration | AdministrationGroup)[]) => {
            for (const adminOrGroup of admins) {
                if ('groupName' in adminOrGroup) {
                    allAdmins.push(...adminOrGroup.administrations);
                } else {
                    allAdmins.push(adminOrGroup);
                }
            }
        };
        processAdmins(currentLine.administrations);

        for (const admin of allAdmins) {
            for (const section of admin.sections) {
                if (section.tasks.some(t => t.id === selectedTask?.id)) {
                    foundAdmin = admin.name;
                    foundSection = section.name;
                    break;
                }
            }
            if (foundAdmin) break;
        }

        return {
            adminName: foundAdmin || activeAdmin?.name || '',
            sectionName: foundSection || selectedSection?.name || ''
        };
    }, [selectedTask, currentLine, activeAdmin, selectedSection]);

    return (
        <Suspense fallback={null}>
            {activeModal === 'task' && (
                <TaskDetailModal
                    isOpen={true}
                    onClose={closeModal}
                    task={selectedTask}
                    parentId={currentParentId}
                    onSave={handleSaveTask}
                    onDelete={deleteTask}
                    currentLine={currentLine!}
                    personnelMap={personnelMap}
                    locationAssignments={locationAssignments}
                    currentAdminName={currentTaskContext.adminName}
                    currentSectionName={currentTaskContext.sectionName}
                    projectStartDate={startDate}
                    locationsList={locationsList}
                    canEdit={userCanEdit}
                    canDelete={userCanDelete}
                />
            )}

            {activeModal === 'export' && (
                <ExportOptionsModal
                    isOpen={true}
                    onClose={closeModal}
                    onGenerateReport={handleGenerateReport}
                    selectedSection={selectedSection}
                    activeAdmin={activeAdmin}
                    currentLine={currentLine!}
                    productionLines={productionLinesTree}
                    locationAssignments={locationAssignments}
                    projectStartDate={startDate}
                    totalProjectDays={totalProjectDays}
                    holidays={holidays}
                    absenceData={absenceData}
                    locationsList={locationsList}
                />
            )}

            {activeModal === 'location' && (
                <LocationAssignmentModal
                    isOpen={true}
                    onClose={closeModal}
                    productionLines={productionLinesTree}
                    locationAssignments={locationAssignments}
                    setAssignment={setAssignment}
                    removeAssignment={removeAssignment}
                    locationsList={locationsList}
                    onAddLocation={addLocation}
                    onUpdateLocation={updateLocation}
                    onDeleteLocation={deleteLocation}
                    renameLocationAssignment={renameLocationAssignment}
                />
            )}

            {activeModal === 'personnel' && (
                <PersonnelManagementModal
                    isOpen={true}
                    onClose={handleClosePersonnelManagement}
                    personnelData={personnelData!}
                    onAdd={addPerson}
                    onUpdate={updatePerson}
                    onDelete={handleDeletePerson}
                    assignedPersonnelIds={personnelModalContext}
                    productionLines={productionLinesTree}
                    hierarchyNodes={hierarchyNodes}
                    onAddHierarchyNode={addHierarchyNode}
                    onUpdateHierarchyNode={updateHierarchyNode}
                    onDeleteHierarchyNode={deleteHierarchyNode}
                    onResetHierarchy={resetHierarchy}
                    canViewInScope={canViewInScope}
                    currentUserUid={authUserUid}
                    highestRoleLevel={highestRoleLevel}
                />
            )}

            {activeModal === 'absence' && (
                <AbsenceManagementModal
                    isOpen={true}
                    onClose={closeModal}
                    personnelData={personnelData!}
                    absenceData={absenceData}
                    onAdd={addAbsence}
                    onUpdate={updateAbsence}
                    onDelete={deleteAbsence}
                />
            )}

            {activeModal === 'holidays' && (
                <HolidayManagementModal
                    isOpen={true}
                    onClose={closeModal}
                    holidays={holidays}
                    onAdd={addHoliday}
                    onUpdate={updateHoliday}
                    onDelete={deleteHoliday}
                />
            )}

            {activeModal === 'reportPreview' && reportData && (
                <ReportPreviewModal
                    isOpen={true}
                    onClose={() => { setReportData(null); closeModal(); }}
                    reportData={reportData}
                    projectStartDate={startDate}
                    totalProjectDays={totalProjectDays}
                />
            )}

            {activeModal === 'backupRestore' && (
                <BackupRestoreModal
                    isOpen={true}
                    onClose={closeModal}
                />
            )}

            {activeModal === 'sector' && currentLine && (
                <SectorAssignmentModal
                    isOpen={true}
                    onClose={closeModal}
                    currentLine={currentLine}
                    onMoveAdministration={moveAdministration}
                />
            )}

            {activeModal === 'roles' && (
                <RoleManagementModal
                    isOpen={true}
                    onClose={closeModal}
                    rolesState={rolesState}
                    currentUserUid={authUserUid || ''}
                    currentUserRole={currentUserRole}
                    productionLines={productionLinesTree}
                    onAssignRoles={assignRoles}
                    onRemoveUser={removeUser}
                    canManageUsers={userCanManage}
                />
            )}
        </Suspense>
    );
};
