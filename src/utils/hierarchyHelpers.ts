import type { OrganizationalNode, AppUser } from '../types';

/**
 * Tree node representation for recursive rendering.
 * Contains the node data plus computed children.
 */
export interface HierarchyTreeNode {
  node: OrganizationalNode;
  children: HierarchyTreeNode[];
}

// ─── Tree Construction ──────────────────────────────────────────────────

/**
 * Build a recursive tree from a flat list of organizational nodes.
 * Supports unlimited depth — no hardcoded levels.
 */
export const buildTree = (nodes: OrganizationalNode[]): HierarchyTreeNode[] => {
  const nodeMap = new Map<string, HierarchyTreeNode>();
  const roots: HierarchyTreeNode[] = [];

  // Create tree node wrappers
  nodes.forEach(node => {
    nodeMap.set(node.id, { node, children: [] });
  });

  // Link children to parents
  nodes.forEach(node => {
    const treeNode = nodeMap.get(node.id)!;
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  });

  // Sort children by order (if defined), then by createdAt
  const sortChildren = (treeNodes: HierarchyTreeNode[]) => {
    treeNodes.sort((a, b) => {
      const orderA = a.node.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.node.order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.node.createdAt - b.node.createdAt;
    });
    treeNodes.forEach(tn => sortChildren(tn.children));
  };

  sortChildren(roots);
  return roots;
};

// ─── Traversal Helpers ──────────────────────────────────────────────────

/**
 * Get direct children of a node.
 */
export const getChildren = (nodes: OrganizationalNode[], parentId: string): OrganizationalNode[] => {
  return nodes.filter(n => n.parentId === parentId);
};

/**
 * Get all descendants of a node (recursive, unlimited depth).
 */
export const getDescendants = (nodes: OrganizationalNode[], nodeId: string): OrganizationalNode[] => {
  const descendants: OrganizationalNode[] = [];
  const queue = [nodeId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = nodes.filter(n => n.parentId === currentId);
    children.forEach(child => {
      descendants.push(child);
      queue.push(child.id);
    });
  }

  return descendants;
};

/**
 * Get all ancestors of a node using the path array.
 * Returns nodes in order from root to immediate parent.
 */
export const getAncestors = (nodes: OrganizationalNode[], node: OrganizationalNode): OrganizationalNode[] => {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  return node.path.map(id => nodeMap.get(id)).filter(Boolean) as OrganizationalNode[];
};

/**
 * Get a node by its ID.
 */
export const getNodeById = (nodes: OrganizationalNode[], nodeId: string): OrganizationalNode | undefined => {
  return nodes.find(n => n.id === nodeId);
};

// ─── Path Computation ───────────────────────────────────────────────────

/**
 * Compute the ancestry path for a node.
 * path = parent's path + [parentId]
 * If parentId is null, path is empty (root node).
 */
export const computePath = (nodes: OrganizationalNode[], parentId: string | null): string[] => {
  if (!parentId) return [];

  const parent = nodes.find(n => n.id === parentId);
  if (!parent) return [];

  return [...parent.path, parent.id];
};

/**
 * Recompute paths for all descendants when a node is moved.
 * Returns a new array of nodes with updated paths.
 */
export const recomputeDescendantPaths = (allNodes: OrganizationalNode[], movedNodeId: string): OrganizationalNode[] => {
  const updatedNodes = [...allNodes];
  const nodeMap = new Map(updatedNodes.map(n => [n.id, n]));

  const recompute = (nodeId: string) => {
    const node = nodeMap.get(nodeId);
    if (!node) return;

    node.path = computePath(updatedNodes, node.parentId);
    nodeMap.set(nodeId, node);

    // Recursively update children
    updatedNodes.filter(n => n.parentId === nodeId).forEach(child => {
      recompute(child.id);
    });
  };

  recompute(movedNodeId);
  return updatedNodes;
};

// ─── Access Control ─────────────────────────────────────────────────────

/**
 * Determine if a user can access a specific organizational node.
 * 
 * Logic:
 * - User can access node if nodeId is in their assignedNodeIds
 * - OR if any of the user's assigned nodes appears in node.path (ancestor access)
 * 
 * This means: if you're assigned to "مدير عام", you can see everything under it.
 */
export const canAccessNode = (user: AppUser, nodeId: string, nodes: OrganizationalNode[]): boolean => {
  // Direct assignment
  if (user.assignedNodeIds.includes(nodeId)) {
    return true;
  }

  // Ancestor-based access: check if any assigned node is an ancestor of the target node
  const targetNode = nodes.find(n => n.id === nodeId);
  if (!targetNode) return false;

  // Check if any assigned node is in the target node's path (meaning user is assigned to an ancestor)
  for (const assignedId of user.assignedNodeIds) {
    if (targetNode.path.includes(assignedId)) {
      return true;
    }
  }

  return false;
};

/**
 * Get all nodes a user can access based on their assignments.
 * Includes assigned nodes + all their descendants.
 */
export const getAccessibleNodes = (user: AppUser, nodes: OrganizationalNode[]): OrganizationalNode[] => {
  const accessibleIds = new Set<string>();

  user.assignedNodeIds.forEach(assignedId => {
    // Add the assigned node itself
    accessibleIds.add(assignedId);

    // Add all descendants
    getDescendants(nodes, assignedId).forEach(desc => {
      accessibleIds.add(desc.id);
    });
  });

  return nodes.filter(n => accessibleIds.has(n.id));
};

// ─── Hierarchy Display Helpers ──────────────────────────────────────────

/**
 * Get the depth of a node (0 = root).
 */
export const getNodeDepth = (node: OrganizationalNode): number => {
  return node.path.length;
};

/**
 * Generate a breadcrumb path string for a node.
 */
export const getNodeBreadcrumb = (nodes: OrganizationalNode[], node: OrganizationalNode): string => {
  const ancestors = getAncestors(nodes, node);
  return [...ancestors.map(a => a.name), node.name].join(' ← ');
};

/**
 * Flatten a tree into a display-ordered list with depth info.
 * Useful for rendering an indented list.
 */
export const flattenTree = (treeNodes: HierarchyTreeNode[], depth: number = 0): { node: OrganizationalNode; depth: number }[] => {
  const result: { node: OrganizationalNode; depth: number }[] = [];

  treeNodes.forEach(treeNode => {
    result.push({ node: treeNode.node, depth });
    result.push(...flattenTree(treeNode.children, depth + 1));
  });

  return result;
};

/**
 * Count total nodes in a subtree.
 */
export const countSubtreeNodes = (nodes: OrganizationalNode[], rootId: string): number => {
  return getDescendants(nodes, rootId).length + 1; // +1 for root itself
};
