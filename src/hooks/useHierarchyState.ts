import { useState, useEffect, useCallback, useMemo } from 'react';
import type { OrganizationalNode } from '../types';
import { buildTree, computePath, recomputeDescendantPaths, getDescendants } from '../utils/hierarchyHelpers';
import type { HierarchyTreeNode } from '../utils/hierarchyHelpers';
import { getDocumentFromDB, saveDocumentToDB } from '../utils/firebaseService';

// ─── Firestore Persistence ──────────────────────────────────────────────

interface HierarchyState {
  nodes: OrganizationalNode[];
}

const STORE_KEY = 'hierarchyStateStore';

// ─── Default Hierarchy Seed ─────────────────────────────────────────────

const createDefaultHierarchy = (): OrganizationalNode[] => {
  const now = Date.now();
  const factoriesSectorHeadId = 'node-factories-sector-head-default';
  const deputyFactoriesSectorHeadId = 'node-deputy-factories-sector-head-default';
  const sectorHeadId = 'node-sector-head-default';
  const deputySectorHeadId = 'node-deputy-sector-head-default';
  const generalManagerId = 'node-general-manager-default';
  const engineersId = 'node-engineers-default';
  const techniciansId = 'node-technicians-default';
  const workersId = 'node-workers-default';

  return [
    {
      id: factoriesSectorHeadId,
      name: 'رئيس قطاعات المصانع',
      type: 'factories_sector_head',
      parentId: null,
      path: [],
      createdAt: now,
      order: 0,
    },
    {
      id: deputyFactoriesSectorHeadId,
      name: 'نائب رئيس قطاعات المصانع',
      type: 'deputy_factories_sector_head',
      parentId: factoriesSectorHeadId,
      path: [factoriesSectorHeadId],
      createdAt: now + 1,
      order: 0,
    },
    {
      id: sectorHeadId,
      name: 'رئيس قطاع ',
      type: 'sector_head',
      parentId: deputyFactoriesSectorHeadId,
      path: [factoriesSectorHeadId, deputyFactoriesSectorHeadId],
      createdAt: now + 2,
      order: 0,
    },
    {
      id: deputySectorHeadId,
      name: 'نائب رئيس قطاع',
      type: 'deputy_sector_head',
      parentId: sectorHeadId,
      path: [factoriesSectorHeadId, deputyFactoriesSectorHeadId, sectorHeadId],
      createdAt: now + 3,
      order: 0,
    },
    {
      id: generalManagerId,
      name: 'المدير العام',
      type: 'general_manager',
      parentId: deputySectorHeadId,
      path: [factoriesSectorHeadId, deputyFactoriesSectorHeadId, sectorHeadId, deputySectorHeadId],
      createdAt: now + 4,
      order: 0,
    },
    {
      id: engineersId,
      name: 'فريق المهندسين',
      type: 'engineer',
      parentId: generalManagerId,
      path: [factoriesSectorHeadId, deputyFactoriesSectorHeadId, sectorHeadId, deputySectorHeadId, generalManagerId],
      createdAt: now + 5,
      order: 0,
    },
    {
      id: techniciansId,
      name: 'فريق الفنيين',
      type: 'technician',
      parentId: engineersId,
      path: [factoriesSectorHeadId, deputyFactoriesSectorHeadId, sectorHeadId, deputySectorHeadId, generalManagerId, engineersId],
      createdAt: now + 6,
      order: 0,
    },
    {
      id: workersId,
      name: 'العمال',
      type: 'worker',
      parentId: techniciansId,
      path: [factoriesSectorHeadId, deputyFactoriesSectorHeadId, sectorHeadId, deputySectorHeadId, generalManagerId, engineersId, techniciansId],
      createdAt: now + 7,
      order: 0,
    },
  ];
};

// ─── Hook ───────────────────────────────────────────────────────────────

export const useHierarchyState = () => {
  const [nodes, setNodes] = useState<OrganizationalNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoadError, setIsDataLoadError] = useState(false);

  // Load state from Firestore
  useEffect(() => {
    const loadState = async () => {
      try {
        const savedState = await getDocumentFromDB<HierarchyState>(STORE_KEY);
        if (savedState && savedState.nodes && savedState.nodes.length > 0) {
          setNodes(savedState.nodes);
        } else {
          // Seed with default hierarchy
          const defaultNodes = createDefaultHierarchy();
          await saveDocumentToDB(STORE_KEY, { nodes: defaultNodes });
          setNodes(defaultNodes);
        }
      } catch (error) {
        setIsDataLoadError(true);
        // Fallback: use default hierarchy locally
        setNodes(createDefaultHierarchy());
      } finally {
        setIsLoading(false);
      }
    };
    loadState();
  }, []);

  // Auto-save on changes
  useEffect(() => {
    if (isLoading || nodes.length === 0 || isDataLoadError) return;

    const save = async () => {
      try {
        await saveDocumentToDB(STORE_KEY, { nodes });
      } catch (error) {
        // silently fail — user can retry
      }
    };
    save();
  }, [nodes, isLoading, isDataLoadError]);

  // Computed tree for rendering
  const tree: HierarchyTreeNode[] = useMemo(() => buildTree(nodes), [nodes]);

  // ─── CRUD Operations ─────────────────────────────────────────────────

  const addNode = useCallback((name: string, type: string, parentId: string | null) => {
    setNodes(prev => {
      const newNode: OrganizationalNode = {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        type,
        parentId,
        path: computePath(prev, parentId),
        createdAt: Date.now(),
        order: prev.filter(n => n.parentId === parentId).length,
      };
      return [...prev, newNode];
    });
  }, []);

  const updateNode = useCallback((nodeId: string, updates: Partial<Pick<OrganizationalNode, 'name' | 'type'>>) => {
    setNodes(prev => {
      return prev.map(n => {
        if (n.id === nodeId) {
          return { ...n, ...updates };
        }
        return n;
      });
    });
  }, []);

  const moveNode = useCallback((nodeId: string, newParentId: string | null) => {
    setNodes(prev => {
      // Prevent moving a node under itself or its own descendants
      const descendants = getDescendants(prev, nodeId);
      if (newParentId && (newParentId === nodeId || descendants.some(d => d.id === newParentId))) {
        return prev; // Invalid move
      }

      let updated = prev.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            parentId: newParentId,
            path: computePath(prev, newParentId),
          };
        }
        return n;
      });

      // Recompute paths for all descendants
      updated = recomputeDescendantPaths(updated, nodeId);
      return updated;
    });
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes(prev => {
      // Collect all descendants to delete
      const descendantIds = new Set<string>();
      const queue = [nodeId];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        descendantIds.add(currentId);
        prev.filter(n => n.parentId === currentId).forEach(child => {
          queue.push(child.id);
        });
      }
      return prev.filter(n => !descendantIds.has(n.id));
    });
  }, []);

  // ─── Lookup Helpers ───────────────────────────────────────────────────

  const getNodeById = useCallback((nodeId: string): OrganizationalNode | undefined => {
    return nodes.find(n => n.id === nodeId);
  }, [nodes]);

  const getNodeName = useCallback((nodeId: string): string => {
    return nodes.find(n => n.id === nodeId)?.name ?? '';
  }, [nodes]);

  const resetHierarchy = useCallback(() => {
    const defaultNodes = createDefaultHierarchy();
    setNodes(defaultNodes);
  }, []);

  return {
    nodes,
    tree,
    isLoading,
    addNode,
    updateNode,
    moveNode,
    deleteNode,
    getNodeById,
    getNodeName,
    resetHierarchy,
  };
};
