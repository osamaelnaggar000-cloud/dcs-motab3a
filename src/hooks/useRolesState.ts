import { useState, useEffect, useCallback } from 'react';
import type { UserRole, UserRoleAssignment, RoleScope, RolesState, UserRoleScope } from '../types';
import { USER_ROLE_HIERARCHY } from '../types';
import { getDocumentFromDB, saveDocumentToDB } from '../utils/firebaseService';
import { produce } from 'immer';

// ─── Firestore Persistence ──────────────────────────────────────────────

const STORE_KEY = 'rolesStateStore';

// ─── Helpers ────────────────────────────────────────────────────────────

const getRoleLevelInternal = (role: UserRole): number => {
  const idx = USER_ROLE_HIERARCHY.indexOf(role);
  return idx === -1 ? 999 : idx;
};

const getUserHighestRole = (user: UserRoleAssignment): UserRole => {
  if (!user || !user.roles || user.roles.length === 0) return 'pending';
  let highestLevel = 999;
  let highestRole: UserRole = 'pending';
  
  user.roles.forEach(r => {
    const level = getRoleLevelInternal(r.role);
    if (level < highestLevel) {
      highestLevel = level;
      highestRole = r.role;
    }
  });
  return highestRole;
};

const doesScopeMatch = (
  scopes: RoleScope[],
  lineName?: string,
  sectorName?: string,
  adminName?: string,
): boolean => {
  return scopes.some(scope => {
    if (scope.type === 'global') return true;
    if (scope.type === 'line' && lineName && scope.values.includes(lineName)) return true;
    if (scope.type === 'sector' && sectorName && scope.values.includes(sectorName)) return true;
    if (scope.type === 'administration' && adminName && scope.values.includes(adminName)) return true;
    return false;
  });
};

const migrateState = (rawState: any): RolesState => {
  const newUsers: Record<string, UserRoleAssignment> = {};
  for (const uid in rawState.users) {
    const user = rawState.users[uid];
    if (user.role && !user.roles) {
      // Migrate old format to new format
      newUsers[uid] = {
        uid: user.uid || uid,
        email: user.email || '',
        displayName: user.displayName || user.email || 'بدون اسم',
        roles: [{ role: user.role, scopes: user.scopes || [] }],
        assignedBy: user.assignedBy || 'system',
        assignedAt: user.assignedAt || Date.now(),
      };
    } else {
      newUsers[uid] = {
        ...user,
        uid: user.uid || uid,
        displayName: user.displayName || user.email || 'بدون اسم'
      } as UserRoleAssignment;
    }
  }
  return { ...rawState, users: newUsers };
};

// ─── Hook ───────────────────────────────────────────────────────────────

interface CurrentUser {
  uid: string;
  email: string;
  displayName: string;
}

export const useRolesState = (currentUser: CurrentUser | null) => {
  const [rolesState, setRolesState] = useState<RolesState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load state from Firestore & auto-register user
  useEffect(() => {
    if (!currentUser) {
      setRolesState(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadAndRegister = async () => {
      setIsLoading(true);
      try {
        const rawState = await getDocumentFromDB<any>(STORE_KEY);
        let state = rawState ? migrateState(rawState) : undefined;

        if (!state) {
          // First user ever — register as owner
          const assignment: UserRoleAssignment = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            roles: [{ role: 'owner', scopes: [{ type: 'global', values: [] }] }],
            assignedBy: currentUser.uid,
            assignedAt: Date.now(),
          };
          state = {
            users: { [currentUser.uid]: assignment },
            ownerUid: currentUser.uid,
          };
          await saveDocumentToDB(STORE_KEY, state);
        } else if (!state.users[currentUser.uid]) {
          // Existing store but new user — register as pending
          const assignment: UserRoleAssignment = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            roles: [{ role: 'pending', scopes: [] }],
            assignedBy: 'system',
            assignedAt: Date.now(),
          };
          const updated: RolesState = {
            ...state,
            users: { ...state.users, [currentUser.uid]: assignment },
          };
          await saveDocumentToDB(STORE_KEY, updated);
          state = updated;
        }

        if (!cancelled) {
          setRolesState(state);
        }
      } catch (error) {
        // On error, set a fallback pending state so UI doesn't break
        if (!cancelled) {
          setRolesState({
            users: {
              [currentUser.uid]: {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName,
                roles: [{ role: 'pending', scopes: [] }],
                assignedBy: 'system',
                assignedAt: Date.now(),
              },
            },
            ownerUid: '',
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadAndRegister();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, currentUser?.email, currentUser?.displayName]);

  // Current user's role assignment
  const currentUserRole: UserRoleAssignment | null =
    rolesState && currentUser ? rolesState.users[currentUser.uid] ?? null : null;

  // ─── Role Level ───────────────────────────────────────────────────────

  const getRoleLevel = useCallback((role: UserRole): number => {
    return getRoleLevelInternal(role);
  }, []);

  // ─── Assign Roles ─────────────────────────────────────────────────────

  const assignRoles = useCallback(
    async (targetUid: string, roles: UserRoleScope[], assignerUid: string) => {
      if (!rolesState) throw new Error('حالة الصلاحيات غير محمّلة');

      const assigner = rolesState.users[assignerUid];
      if (!assigner) throw new Error('المستخدم المعيِّن غير موجود');

      const assignerHighestRole = getUserHighestRole(assigner);
      const assignerLevel = getRoleLevelInternal(assignerHighestRole);

      if (assignerLevel > 1) {
        throw new Error('ليس لديك صلاحية لتعيين أدوار');
      }

      for (const r of roles) {
        if (r.role === 'owner') {
          throw new Error('لا يمكن تعيين دور مالك النظام');
        }
        if (r.role === 'manager' && assignerHighestRole !== 'owner') {
          throw new Error('فقط مالك النظام يمكنه تعيين مدير');
        }
        if (assignerHighestRole === 'manager') {
          const targetLevel = getRoleLevelInternal(r.role);
          if (targetLevel <= assignerLevel) {
            throw new Error('لا يمكنك تعيين دور أعلى من أو مساوٍ لدورك');
          }
        }
      }

      const existingUser = rolesState.users[targetUid];
      const assignment: UserRoleAssignment = {
        ...existingUser,
        uid: targetUid,
        email: existingUser?.email ?? '',
        displayName: existingUser?.displayName ?? '',
        roles,
        assignedBy: assignerUid,
        assignedAt: Date.now(),
      };

      const updated: RolesState = JSON.parse(JSON.stringify(rolesState));
      updated.users[targetUid] = assignment;

      await saveDocumentToDB(STORE_KEY, updated);
      setRolesState(updated);
    },
    [rolesState],
  );

  // ─── Remove User ─────────────────────────────────────────────────────

  const removeUser = useCallback(
    async (targetUid: string) => {
      if (!rolesState) throw new Error('حالة الصلاحيات غير محمّلة');

      const target = rolesState.users[targetUid];
      if (!target) throw new Error('المستخدم غير موجود');

      if (getUserHighestRole(target) === 'owner') {
        throw new Error('لا يمكن إزالة مالك النظام');
      }

      const updated: RolesState = JSON.parse(JSON.stringify(rolesState));
      delete updated.users[targetUid];

      await saveDocumentToDB(STORE_KEY, updated);
      setRolesState(updated);
    },
    [rolesState],
  );

  // ─── Permission Checks ───────────────────────────────────────────────

  const canEditInScope = useCallback(
    (uid: string, lineName?: string, sectorName?: string, adminName?: string): boolean => {
      if (!rolesState) return false;
      const user = rolesState.users[uid];
      if (!user || !user.roles) return false;

      return user.roles.some(r => {
        if (r.role === 'owner') return true;
        if (r.role === 'viewer' || r.role === 'pending') return false;
        // Manager, supervisor, editor — check scope match
        return doesScopeMatch(r.scopes, lineName, sectorName, adminName);
      });
    },
    [rolesState],
  );

  const canViewInScope = useCallback(
    (uid: string, lineName?: string, sectorName?: string, adminName?: string): boolean => {
      if (!rolesState) return false;
      const user = rolesState.users[uid];
      if (!user || !user.roles) return false;

      return user.roles.some(r => {
        if (r.role === 'owner') return true;
        if (r.role === 'pending') return false;
        // Anyone with a role mapped to this scope can view it
        return doesScopeMatch(r.scopes, lineName, sectorName, adminName);
      });
    },
    [rolesState],
  );

  const canManageUsers = useCallback(
    (uid: string): boolean => {
      if (!rolesState) return false;
      const user = rolesState.users[uid];
      if (!user) return false;
      const role = getUserHighestRole(user);
      return role === 'owner' || role === 'manager';
    },
    [rolesState],
  );

  const canDeleteTasks = useCallback(
    (uid: string): boolean => {
      if (!rolesState) return false;
      const user = rolesState.users[uid];
      if (!user) return false;
      const role = getUserHighestRole(user);
      return role === 'owner' || role === 'manager';
    },
    [rolesState],
  );

  const canApproveProgress = useCallback(
    (uid: string): boolean => {
      if (!rolesState) return false;
      const user = rolesState.users[uid];
      if (!user) return false;
      const role = getUserHighestRole(user);
      return role === 'owner' || role === 'manager' || role === 'supervisor';
    },
    [rolesState],
  );

  return {
    rolesState,
    currentUserRole,
    isLoading,
    assignRoles,
    removeUser,
    canEditInScope,
    canViewInScope,
    canManageUsers,
    canDeleteTasks,
    canApproveProgress,
    getRoleLevel,
    getUserHighestRole
  };
};
