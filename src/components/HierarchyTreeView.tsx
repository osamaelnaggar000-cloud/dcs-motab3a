import React, { useState, useMemo } from 'react';
import type { OrganizationalNode } from '../types';
import { NODE_TYPE_LABELS } from '../types';
import { buildTree } from '../utils/hierarchyHelpers';
import type { HierarchyTreeNode } from '../utils/hierarchyHelpers';
import { ChevronDown, ChevronLeft, Plus, Edit2, Trash2, Network, Users, FolderTree } from 'lucide-react';

interface HierarchyTreeViewProps {
  nodes: OrganizationalNode[];
  onAddNode: (name: string, type: string, parentId: string | null) => void;
  onUpdateNode: (nodeId: string, updates: Partial<Pick<OrganizationalNode, 'name' | 'type'>>) => void;
  onDeleteNode: (nodeId: string) => void;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
}

// ─── Node Type Color System ─────────────────────────────────────────────

const getNodeColor = (type: string): { bg: string; border: string; text: string; badge: string; glow: string } => {
  const colors: Record<string, { bg: string; border: string; text: string; badge: string; glow: string }> = {
    sector_head: {
      bg: 'bg-gradient-to-r from-amber-50 to-orange-50',
      border: 'border-amber-300',
      text: 'text-amber-900',
      badge: 'bg-amber-100 text-amber-700 border-amber-200',
      glow: 'shadow-amber-100',
    },
    general_manager: {
      bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
      border: 'border-blue-300',
      text: 'text-blue-900',
      badge: 'bg-blue-100 text-blue-700 border-blue-200',
      glow: 'shadow-blue-100',
    },
    engineer: {
      bg: 'bg-gradient-to-r from-emerald-50 to-teal-50',
      border: 'border-emerald-300',
      text: 'text-emerald-900',
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      glow: 'shadow-emerald-100',
    },
    technician: {
      bg: 'bg-gradient-to-r from-purple-50 to-violet-50',
      border: 'border-purple-300',
      text: 'text-purple-900',
      badge: 'bg-purple-100 text-purple-700 border-purple-200',
      glow: 'shadow-purple-100',
    },
    worker: {
      bg: 'bg-gradient-to-r from-slate-50 to-zinc-50',
      border: 'border-slate-300',
      text: 'text-slate-800',
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      glow: 'shadow-slate-100',
    },
  };

  return colors[type] || {
    bg: 'bg-gradient-to-r from-gray-50 to-gray-100',
    border: 'border-gray-300',
    text: 'text-gray-900',
    badge: 'bg-gray-100 text-gray-700 border-gray-200',
    glow: 'shadow-gray-100',
  };
};

const getNodeIcon = (type: string): React.ReactNode => {
  switch (type) {
    case 'sector_head': return <Network size={16} />;
    case 'general_manager': return <Users size={16} />;
    case 'engineer': return <FolderTree size={16} />;
    default: return <Users size={16} />;
  }
};

// ─── Add Node Form (Inline) ─────────────────────────────────────────────

const AddNodeForm: React.FC<{
  parentId: string | null;
  onAdd: (name: string, type: string, parentId: string | null) => void;
  onCancel: () => void;
}> = ({ parentId, onAdd, onCancel }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !type.trim()) return;
    onAdd(name.trim(), type.trim(), parentId);
    setName('');
    setType('');
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-3 bg-white border-2 border-dashed border-emerald-300 rounded-xl animate-fadeIn">
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="اسم العقدة الجديدة..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none transition-all"
          autoFocus
          dir="rtl"
        />
        <div className="flex gap-2">
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none transition-all"
            dir="rtl"
          >
            <option value="">اختر النوع...</option>
            {Object.entries(NODE_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
            <option value="custom">نوع مخصص</option>
          </select>
          {type === 'custom' && (
            <input
              type="text"
              placeholder="اكتب النوع..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none transition-all"
              onChange={e => setType(e.target.value === '' ? 'custom' : e.target.value)}
              dir="rtl"
            />
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={!name.trim() || !type.trim() || type === 'custom'}
            className="px-4 py-1.5 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            إضافة
          </button>
        </div>
      </div>
    </form>
  );
};

// ─── Single Tree Node ───────────────────────────────────────────────────

const TreeNodeItem: React.FC<{
  treeNode: HierarchyTreeNode;
  depth: number;
  onAddNode: (name: string, type: string, parentId: string | null) => void;
  onUpdateNode: (nodeId: string, updates: Partial<Pick<OrganizationalNode, 'name' | 'type'>>) => void;
  onDeleteNode: (nodeId: string) => void;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
}> = ({ treeNode, depth, onAddNode, onUpdateNode, onDeleteNode, selectedNodeId, onSelectNode }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(treeNode.node.name);
  const [showActions, setShowActions] = useState(false);

  const { node, children } = treeNode;
  const colors = getNodeColor(node.type);
  const hasChildren = children.length > 0;
  const isSelected = selectedNodeId === node.id;

  const typeLabel = NODE_TYPE_LABELS[node.type] || node.type;

  const handleEdit = () => {
    if (editName.trim() && editName.trim() !== node.name) {
      onUpdateNode(node.id, { name: editName.trim() });
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    const descendantCount = children.length;
    const msg = descendantCount > 0
      ? `هل أنت متأكد من حذف "${node.name}" و ${descendantCount} عنصر فرعي؟\nلن يمكن التراجع عن هذا الإجراء.`
      : `هل أنت متأكد من حذف "${node.name}"؟`;
    if (window.confirm(msg)) {
      onDeleteNode(node.id);
    }
  };

  return (
    <div className="select-none">
      {/* Connector lines */}
      <div
        className="relative"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* The node card */}
        <div
          className={`
            flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 cursor-pointer
            transition-all duration-200 group
            ${colors.bg} ${colors.border}
            ${isSelected ? `ring-2 ring-emerald-400 ring-offset-2 shadow-lg ${colors.glow}` : 'hover:shadow-md'}
          `}
          onClick={() => {
            onSelectNode?.(node.id);
            if (hasChildren) setIsExpanded(!isExpanded);
          }}
        >
          {/* Expand/collapse indicator */}
          <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            {hasChildren ? (
              <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                <ChevronDown size={16} className={colors.text} />
              </span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-current opacity-30"></span>
            )}
          </div>

          {/* Node icon */}
          <div className={`flex-shrink-0 ${colors.text} opacity-70`}>
            {getNodeIcon(node.type)}
          </div>

          {/* Node name */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={handleEdit}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleEdit();
                  if (e.key === 'Escape') { setEditName(node.name); setIsEditing(false); }
                }}
                className="w-full px-2 py-1 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-400 outline-none bg-white"
                autoFocus
                dir="rtl"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span className={`font-semibold text-sm ${colors.text} truncate block`}>
                {node.name}
              </span>
            )}
          </div>

          {/* Type badge */}
          <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${colors.badge}`}>
            {typeLabel}
          </span>

          {/* Action buttons */}
          <div className={`flex-shrink-0 flex items-center gap-1 transition-opacity duration-150 ${showActions ? 'opacity-100' : 'opacity-0'}`}>
            <button
              onClick={e => { e.stopPropagation(); setIsAdding(true); }}
              className="p-1 rounded-md hover:bg-emerald-100 text-emerald-600 transition-colors"
              title="إضافة عقدة فرعية"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); setIsEditing(true); setEditName(node.name); }}
              className="p-1 rounded-md hover:bg-blue-100 text-blue-600 transition-colors"
              title="تعديل"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); handleDelete(); }}
              className="p-1 rounded-md hover:bg-red-100 text-red-600 transition-colors"
              title="حذف"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Add child form */}
        {isAdding && (
          <div className="mr-8 mt-1">
            <AddNodeForm
              parentId={node.id}
              onAdd={onAddNode}
              onCancel={() => setIsAdding(false)}
            />
          </div>
        )}

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mr-6 mt-1 border-r-2 border-slate-200 pr-4 space-y-1">
            {children.map(child => (
              <TreeNodeItem
                key={child.node.id}
                treeNode={child}
                depth={depth + 1}
                onAddNode={onAddNode}
                onUpdateNode={onUpdateNode}
                onDeleteNode={onDeleteNode}
                selectedNodeId={selectedNodeId}
                onSelectNode={onSelectNode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Tree View Component ───────────────────────────────────────────

const HierarchyTreeView: React.FC<HierarchyTreeViewProps> = ({
  nodes,
  onAddNode,
  onUpdateNode,
  onDeleteNode,
  selectedNodeId,
  onSelectNode,
}) => {
  const [isAddingRoot, setIsAddingRoot] = useState(false);

  const tree = useMemo(() => buildTree(nodes), [nodes]);

  return (
    <div className="space-y-2" dir="rtl">
      {/* Tree header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <FolderTree size={18} className="text-emerald-600" />
          <h3 className="text-md font-bold text-zinc-700">الهيكل التنظيمي</h3>
        </div>
        <button
          onClick={() => setIsAddingRoot(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
        >
          <Plus size={14} />
          إضافة جذر
        </button>
      </div>

      {/* Root add form */}
      {isAddingRoot && (
        <AddNodeForm
          parentId={null}
          onAdd={onAddNode}
          onCancel={() => setIsAddingRoot(false)}
        />
      )}

      {/* Tree nodes */}
      {tree.length > 0 ? (
        <div className="space-y-1">
          {tree.map(treeNode => (
            <TreeNodeItem
              key={treeNode.node.id}
              treeNode={treeNode}
              depth={0}
              onAddNode={onAddNode}
              onUpdateNode={onUpdateNode}
              onDeleteNode={onDeleteNode}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <FolderTree size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm mb-2">لا يوجد هيكل تنظيمي بعد.</p>
          <p className="text-slate-400 text-xs">اضغط "إضافة جذر" لبناء الهيكل.</p>
        </div>
      )}

      {/* Stats */}
      {nodes.length > 0 && (
        <div className="flex items-center gap-4 pt-3 px-2 border-t border-slate-200 mt-4">
          <span className="text-xs text-slate-500">
            إجمالي العقد: <strong className="text-emerald-700">{nodes.length}</strong>
          </span>
          <span className="text-xs text-slate-500">
            المستويات: <strong className="text-emerald-700">{nodes.length > 0 ? Math.max(...nodes.map(n => (n.path || []).length)) + 1 : 0}</strong>
          </span>
        </div>
      )}
    </div>
  );
};

export default HierarchyTreeView;
