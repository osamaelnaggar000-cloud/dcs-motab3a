import { useMemo } from 'react';
import type { NormalizedGanttState, NormalizedAdministration, NormalizedAdministrationGroup, NormalizedProductionLine } from '../types';

export const useGanttPermissions = (
  store: Pick<NormalizedGanttState, 'lines' | 'administrations' | 'groups'>,
  currentLineId: string | null,
  activeAdminId: string | null,
  authUser: { uid: string } | null,
  canViewInScope: (uid: string, lineName?: string, sectionName?: string, adminName?: string) => boolean,
  canEditInScope: (uid: string, lineName?: string, sectionName?: string, adminName?: string) => boolean,
  canManageUsersCheck: (uid: string) => boolean,
  canDeleteTasks: (uid: string) => boolean
) => {
  const visibleProductionLines = useMemo(() => {
    if (!authUser || Object.keys(store.lines).length === 0) return [];
    
    // We build a list of visible lines by mapping over the store.lines
    const visibleLines = Object.values(store.lines).map(line => {
        const visibleAdminIds: string[] = [];
        
        line.administrationIds.forEach(adminOrGroupId => {
            const group = store.groups[adminOrGroupId];
            if (group) {
                // It's a group
                const visibleGroupAdmins = group.administrationIds.filter(adminId => {
                    const admin = store.administrations[adminId];
                    return admin && canViewInScope(authUser.uid, line.name, undefined, admin.name);
                });
                
                if (visibleGroupAdmins.length > 0) {
                    visibleAdminIds.push(group.id); // Add group ID if it has visible admins
                }
            } else {
                // It's a toplevel administration
                const admin = store.administrations[adminOrGroupId];
                if (admin && canViewInScope(authUser.uid, line.name, undefined, admin.name)) {
                    visibleAdminIds.push(admin.id);
                }
            }
        });

        return { ...line, administrationIds: visibleAdminIds };
    }).filter(line => line.administrationIds.length > 0 || canViewInScope(authUser.uid, line.name));

    return visibleLines;
  }, [store.lines, store.administrations, store.groups, authUser, canViewInScope]);

  const userCanEdit = useMemo(() => {
    if (!authUser) return false;
    const line = currentLineId ? store.lines[currentLineId] : null;
    const admin = activeAdminId ? store.administrations[activeAdminId] : null;
    return canEditInScope(authUser.uid, line?.name, undefined, admin?.name);
  }, [authUser, canEditInScope, currentLineId, activeAdminId, store.lines, store.administrations]);

  const userCanManage = useMemo(() => {
    if (!authUser) return false;
    return canManageUsersCheck(authUser.uid);
  }, [authUser, canManageUsersCheck]);

  const userCanDelete = useMemo(() => {
    if (!authUser) return false;
    return canDeleteTasks(authUser.uid);
  }, [authUser, canDeleteTasks]);

  return {
    visibleProductionLines,
    userCanEdit,
    userCanManage,
    userCanDelete
  };
};

