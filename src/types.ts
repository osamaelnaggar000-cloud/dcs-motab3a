export interface Personnel {
  name: string;
  assignment: string;
  jobTitle?: string; // e.g. مهندس, فني, كيميائي
  nodeId?: string; // Link to organizational hierarchy node
}

export interface SparePart {
  id: string;
  name: string;
  quantity?: string;
}

export interface Dependency {
  taskId: string;
  type: 'FS' | 'SS' | 'FF';
}

export interface Task {
  id: string;
  name: string;
  duration: number; // in days
  startDay: number; // day offset from project start
  personnel: string[];
  itemCode?: string;
  progress: number; // 0-100
  notes?: string;
  parentId?: string | null;
  isExpanded?: boolean;
  dependencies?: Dependency[];
  spareParts?: SparePart[];
  nodeId?: string; // Link to organizational hierarchy node
}

export interface Section {
  id: string;
  name: string;
  tasks: Task[];
}

export interface Administration {
  id: string;
  name: string;
  sections: Section[];
}

export interface AdministrationGroup {
  id: string;
  groupName: string;
  administrations: Administration[];
}

export type ToplevelAdmin = Administration | AdministrationGroup;

export interface ProductionLine {
  id: string;
  name: string;
  administrations: ToplevelAdmin[];
}

export interface PersonnelData {
  personnel: Record<string, Personnel>;
}

export interface LocationAssignmentData {
  // id can be 'line/admin', 'line/admin/section', or 'task-id'
  [id: string]: string;
}

export interface AbsenceRecord {
  id: string;
  type: 'leave' | 'absence'; // إجازة | غياب
  startDate: string; // ISO string YYYY-MM-DD
  endDate: string; // ISO string YYYY-MM-DD
  reason: string;
}

export interface AbsenceData {
  [personnelId: string]: AbsenceRecord[];
}

export interface Holiday {
  id: string;
  name: string;
  startDate: string; // ISO string YYYY-MM-DD
  endDate: string; // ISO string YYYY-MM-DD
}

// ─── Dynamic Organizational Hierarchy ───────────────────────────────────

export interface OrganizationalNode {
  id: string;
  name: string;
  type: string; // e.g. 'sector_head', 'general_manager', 'engineer', 'technician', 'worker'
  parentId: string | null;
  path: string[]; // ancestry path — array of ancestor node IDs from root to immediate parent
  createdAt: number; // timestamp (Date.now())
  order?: number; // for manual ordering of siblings
}

export interface AppUser {
  id: string;
  name: string;
  role: string; // RBAC role — separate from hierarchy (e.g. 'admin', 'manager', 'engineer', 'viewer')
  jobTitle: string; // display title (e.g. 'رئيس قطاع', 'مهندس ميكانيكا')
  assignedNodeIds: string[]; // organizational nodes this user is assigned to
}

// Predefined node type labels for UI display (not a hard limit — any string type is valid)
export const NODE_TYPE_LABELS: Record<string, string> = {
  factories_sector_head: 'رئيس قطاعات المصانع',
  deputy_factories_sector_head: 'نائب رئيس قطاعات المصانع',
  sector_head: 'رئيس قطاع',
  deputy_sector_head: 'نائب رئيس قطاع',
  general_manager: 'مدير عام',
  engineer: 'مهندسين',
  technician: 'فنيين',
  worker: 'عمال',
};

// ─── RBAC System ────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'manager' | 'supervisor' | 'editor' | 'viewer' | 'pending';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  owner: 'مالك النظام',
  manager: 'مدير',
  supervisor: 'مشرف',
  editor: 'محرر',
  viewer: 'مشاهد',
  pending: 'بانتظار الموافقة',
};

export const USER_ROLE_HIERARCHY: UserRole[] = ['owner', 'manager', 'supervisor', 'editor', 'viewer', 'pending'];

export interface RoleScope {
  type: 'global' | 'line' | 'sector' | 'administration';
  values: string[]; // empty for global
}

export interface UserRoleScope {
  role: UserRole;
  scopes: RoleScope[];
}

export interface UserRoleAssignment {
  uid: string;
  email: string;
  displayName: string;
  roles: UserRoleScope[];
  assignedBy: string; // UID
  assignedAt: number; // timestamp
}

export interface RolesState {
  users: Record<string, UserRoleAssignment>; // keyed by UID
  ownerUid: string;
}
export type GanttViewMode = 'classic' | 'linear' | 'dense';
