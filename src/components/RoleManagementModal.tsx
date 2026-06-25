import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { UserRoleAssignment, UserRole, RoleScope, ProductionLine, RolesState, UserRoleScope } from '../types';
import { USER_ROLE_LABELS, USER_ROLE_HIERARCHY } from '../types';
import { getAllAdmins } from '../utils/taskHelpers';
import { Shield, UserPlus, Users, X, ChevronDown, Trash2, Edit3, Check, AlertTriangle, Plus } from 'lucide-react';
import { usePagination } from '../hooks/usePagination';
import PaginationControls from './PaginationControls';

interface RoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  rolesState: RolesState | null;
  currentUserUid: string;
  currentUserRole: UserRoleAssignment | null;
  productionLines: ProductionLine[];
  onAssignRoles: (targetUid: string, roles: UserRoleScope[], assignerUid: string) => void;
  onRemoveUser: (targetUid: string) => void;
  canManageUsers: boolean;
}

// ─── Role Badge Component ───────────────────────────────────────────────

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
  const colors: Record<UserRole, string> = {
    owner: 'bg-amber-100 text-amber-800 border-amber-200',
    manager: 'bg-purple-100 text-purple-800 border-purple-200',
    supervisor: 'bg-blue-100 text-blue-800 border-blue-200',
    editor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    viewer: 'bg-slate-100 text-slate-600 border-slate-200',
    pending: 'bg-rose-100 text-rose-800 border-rose-200',
  };

  const icons: Record<UserRole, string> = {
    owner: '👑',
    manager: '🔧',
    supervisor: '📋',
    editor: '✏️',
    viewer: '👁️',
    pending: '⏳',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[role] || colors.viewer}`}>
      <span>{icons[role] || '❓'}</span>
      {USER_ROLE_LABELS[role] || role}
    </span>
  );
};

// ─── Scope Display Component ────────────────────────────────────────────

const ScopeDisplay: React.FC<{ scopes: RoleScope[] }> = ({ scopes }) => {
  if (!scopes || scopes.length === 0) {
    return <span className="text-xs text-slate-400 italic">بدون نطاق محدد</span>;
  }

  const scopeTypeLabels: Record<string, string> = {
    global: 'شامل',
    line: 'خط',
    sector: 'قطاع',
    administration: 'إدارة',
  };

  const scopeColors: Record<string, string> = {
    global: 'bg-amber-50 text-amber-700 border-amber-200',
    line: 'bg-sky-50 text-sky-700 border-sky-200',
    sector: 'bg-violet-50 text-violet-700 border-violet-200',
    administration: 'bg-teal-50 text-teal-700 border-teal-200',
  };

  return (
    <div className="flex flex-wrap gap-1">
      {scopes.map((scope, i) => (
        <div key={i} className="flex items-center gap-1">
          {scope.type === 'global' ? (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${scopeColors.global}`}>
              🌐 {scopeTypeLabels.global}
            </span>
          ) : (
            scope.values.map((val, j) => (
              <span key={`${i}-${j}`} className={`text-xs px-2 py-0.5 rounded-full border ${scopeColors[scope.type]}`}>
                {scopeTypeLabels[scope.type]}: {val}
              </span>
            ))
          )}
        </div>
      ))}
    </div>
  );
};

const ScopeEditor: React.FC<{
  scopes: RoleScope[];
  onScopesChange: (scopes: RoleScope[]) => void;
  productionLines: ProductionLine[];
}> = ({ scopes, onScopesChange, productionLines }) => {

  // Build per-line admin lists
  const lineAdmins = useMemo(() => {
    return productionLines.map(l => ({
      lineId: l.id,
      lineName: l.name,
      admins: getAllAdmins(l.administrations).map(a => a.name),
    }));
  }, [productionLines]);

  const hasGlobalScope = scopes.some(s => s.type === 'global');

  const toggleGlobal = () => {
    if (hasGlobalScope) {
      onScopesChange(scopes.filter(s => s.type !== 'global'));
    } else {
      onScopesChange([{ type: 'global', values: [] }]);
    }
  };

  const toggleScopeValue = (type: 'line' | 'administration', value: string) => {
    if (hasGlobalScope) return;
    const existing = scopes.find(s => s.type === type);
    if (existing) {
      const newValues = existing.values.includes(value)
        ? existing.values.filter(v => v !== value)
        : [...existing.values, value];
      if (newValues.length === 0) {
        onScopesChange(scopes.filter(s => s.type !== type));
      } else {
        onScopesChange(scopes.map(s => s.type === type ? { ...s, values: newValues } : s));
      }
    } else {
      onScopesChange([...scopes, { type, values: [value] }]);
    }
  };

  const isLineSelected = (name: string) => {
    if (hasGlobalScope) return true;
    return scopes.find(s => s.type === 'line')?.values.includes(name) ?? false;
  };

  const isAdminSelected = (name: string) => {
    if (hasGlobalScope) return true;
    return scopes.find(s => s.type === 'administration')?.values.includes(name) ?? false;
  };

  return (
    <div className="space-y-4">
      {/* Global toggle */}
      <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <label className="flex items-center gap-2 cursor-pointer flex-1">
          <input type="checkbox" checked={hasGlobalScope} onChange={toggleGlobal}
            className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500" />
          <span className="text-sm font-semibold text-amber-800">🌐 نطاق شامل (كل شيء)</span>
        </label>
      </div>

      {!hasGlobalScope && (
        <div className="space-y-3">
          {lineAdmins.map(line => {
            const lineChecked = isLineSelected(line.lineName);
            return (
              <div key={line.lineId} className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Line header */}
                <div className={`p-3 ${lineChecked ? 'bg-sky-50' : 'bg-slate-50'}`}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={lineChecked}
                      onChange={() => toggleScopeValue('line', line.lineName)}
                      className="w-4 h-4 rounded border-sky-300 text-sky-600 focus:ring-sky-500" />
                    <span className={`text-sm font-bold ${lineChecked ? 'text-sky-800' : 'text-slate-700'}`}>
                      📦 {line.lineName}
                    </span>
                    {lineChecked && (
                      <span className="text-xs px-2 py-0.5 bg-sky-200/50 text-sky-700 rounded-full">الخط بالكامل</span>
                    )}
                  </label>
                </div>

                {/* Admins under this line */}
                {line.admins.length > 0 && (
                  <div className="p-3 bg-white border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-2 font-medium">🏢 إدارات {line.lineName}:</p>
                    <div className="flex flex-wrap gap-2">
                      {line.admins.map(admin => {
                        const checked = lineChecked || isAdminSelected(admin);
                        return (
                          <label key={admin}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all ${
                              lineChecked
                                ? 'bg-sky-50 border-sky-200 text-sky-600 cursor-default opacity-70'
                                : checked
                                  ? 'bg-teal-100 border-teal-300 text-teal-800 cursor-pointer'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-teal-50 cursor-pointer'
                            }`}>
                            <input type="checkbox" checked={checked} disabled={lineChecked}
                              onChange={() => !lineChecked && toggleScopeValue('administration', admin)}
                              className="w-3.5 h-3.5 rounded border-teal-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50" />
                            {admin}
                          </label>
                        );
                      })}
                    </div>
                    {lineChecked && (
                      <p className="text-xs text-sky-500 mt-2">✅ الخط محدد بالكامل — جميع الإدارات مشمولة</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main Modal ─────────────────────────────────────────────────────────

const RoleManagementModal: React.FC<RoleManagementModalProps> = ({
  isOpen, onClose, rolesState, currentUserUid, currentUserRole,
  productionLines, onAssignRoles, onRemoveUser, canManageUsers
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'assign'>('users');
  const [editingUid, setEditingUid] = useState<string | null>(null);
  
  const [selectedUid, setSelectedUid] = useState('');
  
  // Managing multiple roles for the selected user
  const [userRoles, setUserRoles] = useState<UserRoleScope[]>([]);
  
  const [currentEditRole, setCurrentEditRole] = useState<UserRole>('viewer');
  const [currentEditScopes, setCurrentEditScopes] = useState<RoleScope[]>([]);

  const [filterRole, setFilterRole] = useState<UserRole | ''>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      handleCancel();
      setActiveTab('users');
      setStatusMsg(null);
    }
  }, [isOpen]);

  const setStatusMessage = (msg: { type: 'success' | 'error'; text: string } | null) => {
    setStatusMsg(msg);
    if (msg?.type === 'success') {
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const getHighestRoleLevel = (roles?: UserRoleScope[]) => {
    if (!roles || roles.length === 0) return 999;
    const levels = roles.map(r => {
      const idx = USER_ROLE_HIERARCHY.indexOf(r.role);
      return idx !== -1 ? idx : 999;
    });
    return Math.min(...levels);
  };

  const users = useMemo(() => {
    if (!rolesState) return [];
    let list = Object.values(rolesState.users);
    if (filterRole) {
      list = list.filter(u => u.roles && u.roles.some(r => r.role === filterRole));
    }
    return list.sort((a, b) => {
      const aLevel = getHighestRoleLevel(a.roles);
      const bLevel = getHighestRoleLevel(b.roles);
      if (aLevel !== bLevel) return aLevel - bLevel;
      return a.displayName.localeCompare(b.displayName, 'ar');
    });
  }, [rolesState, filterRole]);

  const currentLevel = getHighestRoleLevel(currentUserRole?.roles);

  const assignableRoles = useMemo((): UserRole[] => {
    if (currentLevel === 0) return ['manager', 'supervisor', 'editor', 'viewer'];
    if (currentLevel === 1) return ['supervisor', 'editor', 'viewer'];
    return [];
  }, [currentLevel]);

  const handleStartEdit = (user: UserRoleAssignment) => {
    setEditingUid(user.uid);
    setSelectedUid(user.uid);
    setUserRoles(user.roles || []);
    setActiveTab('assign');
    setStatusMsg(null);
  };

  const handleAddRoleScope = () => {
    if (currentEditScopes.length === 0 && currentEditRole !== 'pending') {
      setStatusMessage({ type: 'error', text: 'يجب تحديد نطاق عمل واحد على الأقل للدور' });
      return;
    }
    setUserRoles([...userRoles, { role: currentEditRole, scopes: currentEditScopes }]);
    setCurrentEditRole('viewer');
    setCurrentEditScopes([]);
  };

  const handleRemoveRoleScope = (index: number) => {
    setUserRoles(userRoles.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedUid) {
      setStatusMessage({ type: 'error', text: 'يرجى تحديد المستخدم أولاً' });
      return;
    }
    
    if (userRoles.length === 0) {
      setStatusMessage({ type: 'error', text: 'يجب تعيين دور واحد على الأقل للمستخدم' });
      return;
    }

    setIsSaving(true);
    try {
      await onAssignRoles(selectedUid, userRoles, currentUserUid);
      const userName = rolesState?.users[selectedUid]?.displayName || 'المستخدم';
      setStatusMessage({ type: 'success', text: `✅ تم تحديث أدوار "${userName}" بنجاح` });
      
      if (!editingUid) {
        setSelectedUid('');
        setUserRoles([]);
      }
    } catch (error: any) {
      setStatusMessage({ type: 'error', text: error.message || 'حدث خطأ أثناء الحفظ' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (uid: string) => {
    const user = rolesState?.users[uid];
    if (!user) return;
    
    if (getHighestRoleLevel(user.roles) === 0) {
      setStatusMessage({ type: 'error', text: 'لا يمكن حذف مالك النظام' });
      return;
    }

    if (window.confirm(`هل أنت متأكد من إزالة "${user.displayName}" من قائمة المستخدمين؟`)) {
      try {
        await onRemoveUser(uid);
        setStatusMessage({ type: 'success', text: `✅ تم إزالة "${user.displayName}" بنجاح` });
      } catch (error: any) {
        setStatusMessage({ type: 'error', text: error.message || 'حدث خطأ أثناء الحذف' });
      }
    }
  };

  const handleCancel = () => {
    setEditingUid(null);
    setSelectedUid('');
    setUserRoles([]);
    setCurrentEditRole('viewer');
    setCurrentEditScopes([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="w-[95vw] md:w-[85vw] max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl" dir="rtl">
        {/* Hidden DialogTitle for accessibility */}
        <DialogTitle className="sr-only">إدارة الصلاحيات والمستخدمين</DialogTitle>
        <DialogDescription className="sr-only">نافذة إدارة صلاحيات المستخدمين</DialogDescription>
        
        {/* Header */}
        <header className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">إدارة الصلاحيات والمستخدمين</h2>
              <p className="text-sm text-muted-foreground">التحكم في وصول المستخدمين وأدوارهم في النظام</p>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 flex-shrink-0 bg-white">
          <button
            onClick={() => { setActiveTab('users'); handleCancel(); }}
            className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            <Users size={18} />
            قائمة المستخدمين
          </button>
          {canManageUsers && (
            <button
              onClick={() => setActiveTab('assign')}
              className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'assign' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
            >
              <UserPlus size={18} />
              {editingUid ? 'تعديل الصلاحيات' : 'تعيين صلاحيات جديدة'}
            </button>
          )}
        </div>

        {/* Content */}
        <main className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
          
          {/* Status Message */}
          {statusMsg && (
            <div className={`mb-4 p-3 rounded-xl border flex items-center gap-2 text-sm font-bold ${
              statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {statusMsg.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
              {statusMsg.text}
            </div>
          )}

          {activeTab === 'users' ? (
            <div className="space-y-4">
              {/* Filter */}
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-zinc-700 flex items-center gap-2">
                  <Users size={18} />
                  جميع المستخدمين ({users.length})
                </h3>
                <div className="flex gap-2 items-center">
                  <p className="text-xs text-slate-500">ملاحظة: الحسابات المسجلة حديثاً تظهر هنا بعد تسجيل الدخول لأول مرة.</p>
                  <select
                    value={filterRole}
                    onChange={e => setFilterRole(e.target.value as UserRole | '')}
                    className="p-2 border border-slate-300 rounded-lg text-sm bg-slate-50 hover:bg-white focus:ring-amber-500"
                  >
                    <option value="">جميع الأدوار</option>
                    {USER_ROLE_HIERARCHY.map(role => (
                      <option key={role} value={role}>{USER_ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Users list */}
              <UsersListWithPagination
                users={users}
                currentUserUid={currentUserUid}
                canManageUsers={canManageUsers}
                currentLevel={currentLevel}
                getHighestRoleLevel={getHighestRoleLevel}
                handleStartEdit={handleStartEdit}
                handleDelete={handleDelete}
              />
            </div>
          ) : (
            /* ── Assign/Edit Tab ── */
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="p-4 bg-gradient-to-l from-slate-50 to-white border border-slate-200 rounded-xl">
                <h3 className="font-bold text-lg text-zinc-800 mb-1">
                  {editingUid ? '✏️ تعديل صلاحيات المستخدم' : '➕ تعيين صلاحيات مستخدم'}
                </h3>
                <p className="text-sm text-slate-500">
                  يمكنك تعيين أدوار متعددة بنطاقات مختلفة لنفس المستخدم
                </p>
              </div>

              {/* User selection */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-zinc-700">اختر المستخدم:</label>
                {editingUid ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                      {(rolesState?.users[editingUid]?.displayName || rolesState?.users[editingUid]?.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{rolesState?.users[editingUid]?.displayName || rolesState?.users[editingUid]?.email || 'بدون اسم'}</p>
                      <p className="text-xs text-slate-500">{rolesState?.users[editingUid]?.email}</p>
                    </div>
                  </div>
                ) : (
                  <select
                    value={selectedUid}
                    onChange={e => setSelectedUid(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">-- اختر مستخدم --</option>
                    {rolesState && Object.values(rolesState.users)
                      .filter(u => u.uid !== currentUserUid && getHighestRoleLevel(u.roles) > 0)
                      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'ar'))
                      .map(u => (
                        <option key={u.uid} value={u.uid}>
                          {u.displayName || u.email || 'بدون اسم'} {u.email ? `(${u.email})` : ''} 
                          {u.roles?.some(r => r.role === 'pending') ? ' — (قيد المراجعة)' : ''}
                        </option>
                      ))
                    }
                  </select>
                )}
              </div>

              {/* Roles List for User */}
              {selectedUid && (
                <div className="space-y-4">
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div className="bg-slate-50 p-3 border-b border-slate-200 font-bold text-sm text-slate-700">
                      الأدوار المعينة حالياً
                    </div>
                    {userRoles.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {userRoles.map((r, idx) => (
                          <div key={idx} className="p-3 flex items-center justify-between">
                            <div className="flex flex-col gap-2">
                              <RoleBadge role={r.role} />
                              <ScopeDisplay scopes={r.scopes} />
                            </div>
                            <button
                              onClick={() => handleRemoveRoleScope(idx)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                              title="إزالة هذا الدور"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-slate-500">لا يوجد أدوار معينة بعد. قم بإضافة دور جديد.</div>
                    )}
                  </div>

                  {/* Add New Role Form */}
                  <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-4">
                    <h4 className="font-bold text-amber-800 text-sm">إضافة دور جديد</h4>
                    
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-zinc-700">اختر الدور:</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {assignableRoles.map(role => (
                          <button
                            key={role}
                            onClick={() => setCurrentEditRole(role)}
                            className={`p-2 rounded-xl border-2 text-center transition-all ${currentEditRole === role
                              ? 'border-amber-400 bg-white shadow-sm'
                              : 'border-slate-200 bg-white/50 hover:bg-white'
                            }`}
                          >
                            <RoleBadge role={role} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-zinc-700">حدد نطاق العمل لهذا الدور:</label>
                      <div className="p-3 bg-white border border-slate-200 rounded-xl">
                        <ScopeEditor
                          scopes={currentEditScopes}
                          onScopesChange={setCurrentEditScopes}
                          productionLines={productionLines}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleAddRoleScope}
                      className="w-full py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold rounded-lg flex items-center justify-center gap-2 transition-colors border border-amber-300"
                    >
                      <Plus size={18} />
                      إضافة الدور للقائمة
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
                <button
                  onClick={() => { setActiveTab('users'); handleCancel(); }}
                  className="px-5 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !selectedUid || userRoles.length === 0}
                  className="px-6 py-2 font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      جاري الحفظ...
                    </>
                  ) : (
                    <>حفظ الصلاحيات</>
                  )}
                </button>
              </div>
            </div>
          )}
        </main>
      </DialogContent>
    </Dialog>
  );
};

// Extracted sub-component for pagination
const UsersListWithPagination: React.FC<{
  users: UserRoleAssignment[];
  currentUserUid: string;
  canManageUsers: boolean;
  currentLevel: number;
  getHighestRoleLevel: (roles?: UserRoleScope[]) => number;
  handleStartEdit: (user: UserRoleAssignment) => void;
  handleDelete: (uid: string) => void;
}> = ({ users, currentUserUid, canManageUsers, currentLevel, getHighestRoleLevel, handleStartEdit, handleDelete }) => {
  const pagination = usePagination(users, { initialItemsPerPage: 20 });

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Users size={48} className="mx-auto mb-3 opacity-30" />
        <p>لا يوجد مستخدمون مسجلون بعد</p>
      </div>
    );
  }

  return (
    <>
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        {pagination.paginatedItems.map((user, idx) => {
          const userLevel = getHighestRoleLevel(user.roles);
          const canEditThisUser = canManageUsers && currentLevel < userLevel && user.uid !== currentUserUid;
          const isOwner = userLevel === 0;

          return (
            <div
              key={user.uid}
              className={`p-4 flex flex-col md:flex-row md:items-start justify-between hover:bg-slate-50 transition-colors gap-4 ${idx < pagination.paginatedItems.length - 1 ? 'border-b border-slate-100' : ''} ${user.uid === currentUserUid ? 'bg-amber-50/30' : ''}`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isOwner ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>
                  {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-zinc-800 truncate">{user.displayName || user.email || 'بدون اسم'}</p>
                    {user.uid === currentUserUid && (
                      <span className="text-xs px-2 py-0.5 bg-sky-100 text-sky-600 rounded-full border border-sky-200">أنت</span>
                    )}
                  </div>
                  {user.email && <p className="text-xs text-slate-500 truncate">{user.email}</p>}
                  
                  <div className="flex flex-col gap-2 mt-2">
                    {user.roles?.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <RoleBadge role={r.role} />
                        <div className="flex-1">
                          <ScopeDisplay scopes={r.scopes} />
                        </div>
                      </div>
                    ))}
                    {(!user.roles || user.roles.length === 0) && (
                      <span className="text-xs text-red-500 font-bold">لا يوجد أدوار معينة</span>
                    )}
                  </div>
                </div>
              </div>

              {canEditThisUser && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleStartEdit(user)}
                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
                    title="تعديل الدور"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(user.uid)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="إزالة المستخدم"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <PaginationControls
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        itemsPerPage={pagination.itemsPerPage}
        startIndex={pagination.startIndex}
        endIndex={pagination.endIndex}
        onGoToPage={pagination.goToPage}
        onNextPage={pagination.nextPage}
        onPrevPage={pagination.prevPage}
        onItemsPerPageChange={pagination.setItemsPerPage}
        hasNextPage={pagination.hasNextPage}
        hasPrevPage={pagination.hasPrevPage}
      />
    </>
  );
};

export default RoleManagementModal;
