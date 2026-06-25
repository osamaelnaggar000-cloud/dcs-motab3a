import type { Dependency, SparePart } from '../../types';

export interface NormalizedProductionLine {
  id: string;
  name: string;
  // IDs of administrations and groups
  administrationIds: string[];
}

export interface NormalizedAdministrationGroup {
  id: string;
  groupName: string;
  lineId: string;
  administrationIds: string[];
}

export interface NormalizedAdministration {
  id: string;
  name: string;
  lineId: string;
  groupId: string | null;
  sectionIds: string[];
}

export interface NormalizedSection {
  id: string;
  name: string;
  administrationId: string;
  taskIds: string[];
}

export interface NormalizedTask {
  id: string;
  name: string;
  duration: number;
  startDay: number;
  personnel: string[];
  itemCode?: string;
  progress: number;
  notes?: string;
  parentId?: string | null;
  isExpanded?: boolean;
  dependencies?: Dependency[];
  spareParts?: SparePart[];
  nodeId?: string;
  // Foreign keys
  sectionId: string;
}

export interface NormalizedGanttState {
  version: number;
  lines: Record<string, NormalizedProductionLine>;
  groups: Record<string, NormalizedAdministrationGroup>;
  administrations: Record<string, NormalizedAdministration>;
  sections: Record<string, NormalizedSection>;
  tasks: Record<string, NormalizedTask>;
  tasksChunkCount?: number;
  projectStartDate: string;
  totalProjectDays: number;
}
