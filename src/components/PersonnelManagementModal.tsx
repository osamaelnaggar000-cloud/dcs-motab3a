import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { PersonnelData, Personnel, ProductionLine, AdministrationGroup, OrganizationalNode } from '../types';
import { getAllAdmins, isAdministrationGroup } from '../utils/taskHelpers';
import HierarchyTreeView from './HierarchyTreeView';
import { FolderTree, Users, RotateCcw } from 'lucide-react';
import { usePagination } from '../hooks/usePagination';
import PaginationControls from './PaginationControls';

import { NODE_TYPE_LABELS } from '../types';

interface PersonnelManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  personnelData: PersonnelData;
  onAdd: (name: string, nodeId: string, assignment: string, jobTitle?: string) => void;
  onUpdate: (id: string, newName: string, newNodeId: string, newAssignment: string, newJobTitle?: string) => void;
  onDelete: (id: string) => void;
  assignedPersonnelIds: string[] | null;
  productionLines: ProductionLine[];
  hierarchyNodes?: OrganizationalNode[];
  onAddHierarchyNode?: (name: string, type: string, parentId: string | null) => void;
  onUpdateHierarchyNode?: (nodeId: string, updates: Partial<Pick<OrganizationalNode, 'name' | 'type'>>) => void;
  onDeleteHierarchyNode?: (nodeId: string) => void;
  onResetHierarchy?: () => void;
  canViewInScope?: (uid: string, lineName?: string, sectorName?: string, adminName?: string) => boolean;
  currentUserUid?: string;
  highestRoleLevel?: number;
}

const PersonnelManagementModal: React.FC<PersonnelManagementModalProps> = ({ 
  isOpen, onClose, personnelData, onAdd, onUpdate, onDelete, assignedPersonnelIds, productionLines,
  hierarchyNodes = [], onAddHierarchyNode, onUpdateHierarchyNode, onDeleteHierarchyNode, onResetHierarchy,
  canViewInScope, currentUserUid, highestRoleLevel = 999
}) => {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'personnel' | 'hierarchy'>('personnel');

  // Form state
  const [name, setName] = useState('');
  const [nodeId, setNodeId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [selectedLine, setSelectedLine] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter state
  const [filterLine, setFilterLine] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [filterAdmin, setFilterAdmin] = useState('');
  const [filterJob, setFilterJob] = useState('');

  // Extract filter dropdown options
  const allSectors = useMemo(() => {
    const sectors = new Set<string>();
    productionLines.forEach(l => {
      l.administrations.forEach(a => {
        if (isAdministrationGroup(a)) {
          sectors.add(a.groupName);
        }
      });
    });
    return Array.from(sectors).sort();
  }, [productionLines]);

  const allAdminsFlat = useMemo(() => {
    const admins = new Set<string>();
    productionLines.forEach(l => {
      getAllAdmins(l.administrations).forEach(a => admins.add(a.name));
    });
    return Array.from(admins).sort();
  }, [productionLines]);

  // Reset state on open/close
  useEffect(() => {
    if (!isOpen) {
      setIsAdding(false);
      setIsEditing(null);
      setName('');
      setNodeId('');
      setJobTitle('');
      setSelectedLine('');
      setSelectedAdmin('');
      setSelectedSection('');
      setSearchQuery('');
      setFilterLine('');
      setFilterSector('');
      setFilterAdmin('');
      setFilterJob('');
      setActiveTab('personnel');
    }
  }, [isOpen]);

  const handleEditClick = (id: string, person: Personnel) => {
    setIsEditing(id);
    setIsAdding(false);
    setName(person.name);
    setNodeId(person.nodeId || '');
    setJobTitle(person.jobTitle || '');
    setSearchQuery('');

    const parts = person.assignment ? person.assignment.split(' / ') : [];
    setSelectedLine(parts[0] || '');
    setSelectedAdmin(parts[1] || '');
    setSelectedSection(parts[2] || '');
  };

  const handleAddClick = () => {
    setIsAdding(true);
    setIsEditing(null);
    setName('');
    setNodeId('');
    setJobTitle('');
    setSelectedLine('');
    setSelectedAdmin('');
    setSelectedSection('');
    setSearchQuery('');
  };

  const handleCancel = () => {
    setIsAdding(false);
    setIsEditing(null);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (trimmedName === '') {
      toast.error('الرجاء إدخال اسم.');
      return;
    }
    if (!nodeId) {
      toast.error('الرجاء اختيار الوظيفة من الهيكل التنظيمي.');
      return;
    }

    const allPersonnelList = Object.entries(personnelData?.personnel || {});

    const isDuplicate = allPersonnelList.some(([id, person]: [string, Personnel]) => {
      const isSamePerson = isEditing && id === isEditing;
      return !isSamePerson && person.name.trim().toLowerCase() === trimmedName.toLowerCase();
    });

    if (isDuplicate) {
      toast.error('يوجد شخص بنفس الاسم بالفعل. الرجاء إدخال اسم فريد.');
      return;
    }

    const assignmentParts = [];
    if (selectedLine) assignmentParts.push(selectedLine);
    if (selectedAdmin) assignmentParts.push(selectedAdmin);
    if (selectedSection) assignmentParts.push(selectedSection);
    const finalAssignment = assignmentParts.join(' / ');

    if (isEditing) {
      onUpdate(isEditing, trimmedName, nodeId, finalAssignment, jobTitle);
      toast.success('تم التعديل بنجاح');
    } else if (isAdding) {
      onAdd(trimmedName, nodeId, finalAssignment, jobTitle);
      toast.success('تمت الإضافة بنجاح');
    }
    handleCancel();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الشخص؟ سيتم إزالته من جميع المهام المسندة إليه.')) {
      onDelete(id);
      toast.success('تم الحذف بنجاح');
    }
  };

  const allPersonnel = useMemo(() => {
    if (!personnelData || !personnelData.personnel) return [];
    const allMapped = Object.entries(personnelData.personnel).map(([id, person]: [string, Personnel]) => {
      const node = hierarchyNodes.find(n => n.id === person.nodeId);
      let catName = 'غير مصنف / قديم';
      if (node) {
        catName = NODE_TYPE_LABELS[node.type] || node.name;
      }
      return { 
        id, 
        name: person.name, 
        assignment: person.assignment, 
        jobTitle: person.jobTitle, 
        nodeId: person.nodeId,
        nodeType: node?.type || 'unknown',
        categoryName: catName
      };
    });

    // RBAC Filtering: Only owners and managers (level 0 or 1) can see all personnel.
    // Others can only see personnel whose assignment falls within their scope.
    if (highestRoleLevel > 1 && canViewInScope && currentUserUid) {
      return allMapped.filter(person => {
        if (!person.assignment) return false;
        const parts = person.assignment.split(' / ');
        const line = parts[0] || undefined;
        const admin = parts[1] || undefined;
        return canViewInScope(currentUserUid, line, undefined, admin);
      });
    }

    return allMapped;
  }, [personnelData, hierarchyNodes, highestRoleLevel, canViewInScope, currentUserUid]);

  const filteredAndSortedPersonnel = useMemo(() => {
    let result = allPersonnel;

    if (filterLine) {
      result = result.filter(p => p.assignment && p.assignment.startsWith(filterLine));
    }
    if (filterSector) {
      const group = productionLines.flatMap(l => l.administrations).find(g => isAdministrationGroup(g) && g.groupName === filterSector) as AdministrationGroup | undefined;
      if (group) {
        const adminNames = group.administrations.map(a => a.name);
        result = result.filter(p => {
          if (!p.assignment) return false;
          const parts = p.assignment.split(' / ');
          return parts.length > 1 && adminNames.includes(parts[1]);
        });
      }
    }
    if (filterAdmin) {
      result = result.filter(p => {
        if (!p.assignment) return false;
        const parts = p.assignment.split(' / ');
        return parts.length > 1 && parts[1] === filterAdmin;
      });
    }
    if (filterJob) {
      result = result.filter(p => p.jobTitle === filterJob);
    }

    if (searchQuery) {
      result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    return result.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [allPersonnel, searchQuery, filterLine, filterSector, filterAdmin, filterJob, productionLines]);

  const availableAdmins = useMemo(() => {
    if (!selectedLine) return [];
    const line = productionLines.find(l => l.name === selectedLine);
    return line ? getAllAdmins(line.administrations) : [];
  }, [selectedLine, productionLines]);

  const availableSections = useMemo(() => {
    if (!selectedAdmin) return [];
    const admin = availableAdmins.find(a => a.name === selectedAdmin);
    return admin ? admin.sections : [];
  }, [selectedAdmin, availableAdmins]);

  const handleSelectionReset = (level: 'line' | 'admin') => {
    if (level === 'line') {
      setSelectedAdmin('');
      setSelectedSection('');
    }
    if (level === 'admin') {
      setSelectedSection('');
    }
  };

  const renderPersonnelList = (title: string, personnelList: any[]) => {
    if (personnelList.length === 0) return null;

    return (
      <>
        <h4 className="font-bold text-md text-slate-600 bg-slate-100 p-2 rounded-t-md mt-4">{title} ({personnelList.length})</h4>
        <ul className="divide-y divide-slate-200 border border-slate-200 rounded-b-md">
          {personnelList.map(person => (
            <li key={person.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
              <div>
                <p className="font-semibold text-zinc-800">{person.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {person.jobTitle && (
                    <span className="text-xs font-medium px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full">
                      {hierarchyNodes.find(n => n.id === person.jobTitle)?.name || person.jobTitle}
                    </span>
                  )}
                  <p className="text-xs text-slate-500">{person.assignment || 'غير مسند'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEditClick(person.id, person)} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-100 rounded-full transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></button>
                <button onClick={() => handleDelete(person.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
              </div>
            </li>
          ))}
        </ul>
      </>
    )
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="w-[95vw] md:w-[85vw] max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl" dir="rtl">
        <DialogTitle className="sr-only">إدارة المسئولين</DialogTitle>
        <DialogDescription className="sr-only">نافذة إدارة الأشخاص والهيكل التنظيمي</DialogDescription>
        <header className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-center flex-shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-zinc-800 flex items-center gap-2">
              <Users className="text-emerald-600" />
              إدارة المسئولين ({filteredAndSortedPersonnel.length} / {allPersonnel.length})
            </h2>
          <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('personnel')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'personnel' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}
              >
                <Users size={16} />
                الأشخاص
              </button>
              <button
                onClick={() => setActiveTab('hierarchy')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'hierarchy' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}
              >
                <FolderTree size={16} />
                الهيكل التنظيمي
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'hierarchy' && onResetHierarchy && (
              <button
                onClick={() => {
                  if (window.confirm('هل أنت متأكد من إعادة تعيين الهيكل التنظيمي إلى الوضع الافتراضي؟\nسيتم حذف جميع التعديلات.')) {
                    onResetHierarchy();
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                title="إعادة تعيين الهيكل"
              >
                <RotateCcw size={14} />
                إعادة تعيين
              </button>
            )}
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </header>
        
        {activeTab === 'personnel' ? (
          <main className="p-4 sm:p-6 overflow-hidden flex-1 grid grid-cols-1 md:grid-cols-[1fr_2.5fr] gap-4 sm:gap-6 bg-slate-50/50">
          {/* Sidebar for filtering */}
          <aside className="border-r border-slate-200 pr-4 flex flex-col overflow-y-auto">
            <h3 className="font-bold text-zinc-700 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              تصفية العرض
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600">فرز حسب الخط:</label>
                <select value={filterLine} onChange={e => setFilterLine(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm bg-slate-50 hover:bg-white focus:ring-emerald-500">
                  <option value="">الجميع</option>
                  {productionLines.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600">فرز حسب القطاع:</label>
                <select value={filterSector} onChange={e => setFilterSector(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm bg-slate-50 hover:bg-white focus:ring-emerald-500">
                  <option value="">الجميع</option>
                  {allSectors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600">فرز حسب الإدارة العامة:</label>
                <select value={filterAdmin} onChange={e => setFilterAdmin(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm bg-slate-50 hover:bg-white focus:ring-emerald-500">
                  <option value="">الجميع</option>
                  {allAdminsFlat.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600">فرز حسب الهيكل التنظيمي:</label>
                <select value={filterJob} onChange={e => setFilterJob(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm bg-slate-50 hover:bg-white focus:ring-emerald-500">
                  <option value="">الجميع</option>
                  {hierarchyNodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
              </div>

              <button 
                onClick={() => {
                  setFilterLine('');
                  setFilterSector('');
                  setFilterAdmin('');
                  setFilterJob('');
                  setSearchQuery('');
                }}
                className="w-full mt-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-md transition-colors"
              >
                مسح التصفية
              </button>
            </div>
          </aside>
          
          {/* Main content */}
          <div className="overflow-y-auto">
            {isAdding || isEditing ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                <h3 className="text-lg font-bold text-emerald-700">{isAdding ? 'إضافة شخص جديد' : 'تعديل بيانات'}</h3>
                <div className="space-y-1">
                  <label htmlFor="person-name" className="block text-sm font-medium text-zinc-700">الاسم:</label>
                  <input type="text" id="person-name" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="person-node" className="block text-sm font-medium text-zinc-700">الرتبة في الهيكل التنظيمي:</label>
                  <select id="person-node" value={nodeId} onChange={e => setNodeId(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md bg-white">
                    <option value="">-- اختر القسم/الإدارة --</option>
                    {hierarchyNodes.map(node => (
                      <option key={node.id} value={node.id}>{node.name} ({NODE_TYPE_LABELS[node.type] || node.type})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="person-job" className="block text-sm font-medium text-zinc-700">المسمى الوظيفي (اختياري):</label>
                  <input type="text" id="person-job" placeholder="مثال: فني ميكانيكا، كيميائي..." value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-zinc-700">الموقع الإداري المسند إليه (اختياري):</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select value={selectedLine} onChange={e => { setSelectedLine(e.target.value); handleSelectionReset('line'); }} className="p-2 border border-slate-300 rounded-md bg-white text-sm"><option value="">اختر الخط...</option>{productionLines.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}</select>
                    <select value={selectedAdmin} disabled={!selectedLine} onChange={e => { setSelectedAdmin(e.target.value); handleSelectionReset('admin'); }} className="p-2 border border-slate-300 rounded-md bg-white text-sm disabled:bg-slate-100"><option value="">اختر الإدارة...</option>{availableAdmins.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}</select>
                    <select value={selectedSection} disabled={!selectedAdmin} onChange={e => setSelectedSection(e.target.value)} className="p-2 border border-slate-300 rounded-md bg-white text-sm disabled:bg-slate-100"><option value="">اختر القسم...</option>{availableSections.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}</select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-3">
                  <button onClick={handleCancel} className="bg-white hover:bg-slate-100 text-zinc-700 font-bold py-2 px-4 rounded-lg border border-slate-300">إلغاء</button>
                  <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg">حفظ</button>
                </div>
              </div>
            ) : (
              <PersonnelListWithPagination
                filteredAndSortedPersonnel={filteredAndSortedPersonnel}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleAddClick={handleAddClick}
                renderPersonnelList={renderPersonnelList}
              />
            )}
          </div>
        </main>
        ) : (
          <main className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
            <HierarchyTreeView
              nodes={hierarchyNodes}
              onAddNode={onAddHierarchyNode || (() => {})}
              onUpdateNode={onUpdateHierarchyNode || (() => {})}
              onDeleteNode={onDeleteHierarchyNode || (() => {})}
            />
          </main>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Extracted sub-component so usePagination hook is called unconditionally
const PersonnelListWithPagination: React.FC<{
  filteredAndSortedPersonnel: any[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  handleAddClick: () => void;
  renderPersonnelList: (title: string, personnelList: any[]) => React.ReactNode;
}> = ({ filteredAndSortedPersonnel, searchQuery, setSearchQuery, handleAddClick, renderPersonnelList }) => {
  const pagination = usePagination(filteredAndSortedPersonnel, { initialItemsPerPage: 30 });

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><svg className="w-5 h-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></div>
          <input type="text" placeholder="بحث بالاسم..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg" />
        </div>
        <button onClick={handleAddClick} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 w-full sm:w-auto">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>إضافة جديد</span>
        </button>
      </div>
      <div className="space-y-4">
        {(() => {
          const groups: Record<string, any[]> = {};
          pagination.paginatedItems.forEach(p => {
            if (!groups[p.categoryName]) groups[p.categoryName] = [];
            groups[p.categoryName].push(p);
          });

          return Object.entries(groups).map(([categoryName, personnel]) => (
            <div key={categoryName}>
              {renderPersonnelList(categoryName, personnel)}
            </div>
          ));
        })()}

        {filteredAndSortedPersonnel.length === 0 && (
          <p className="text-center text-slate-500 py-8">لا يوجد أشخاص يطابقون معايير البحث أو التصفية.</p>
        )}
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

export default PersonnelManagementModal;