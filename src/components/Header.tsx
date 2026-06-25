import React, { useState, useRef, useEffect } from 'react';
import type { ProductionLine, Task, UserRoleAssignment, UserRole, GanttViewMode } from '../types';
import { USER_ROLE_LABELS } from '../types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Settings, LogOut, Calendar, Clock, MapPin, Users, Download, Database, Link as LinkIcon, RotateCcw, AlertTriangle, Menu, ShieldAlert } from 'lucide-react';

import { SearchResult } from '../hooks/useTaskSearch';

interface HeaderProps {
  productionLines: ProductionLine[];
  selectedLineIndex: number;
  onSelectLine: (index: number) => void;
  onOpenExportOptions: () => void;
  onOpenPersonnelManagement: () => void;
  onOpenLocationAssignment: () => void;
  onOpenSectorAssignment: () => void;
  onOpenAbsenceManagement: () => void;
  onOpenHolidaysManagement: () => void;
  onOpenBackupRestore: () => void;
  onResetData: () => void;
  onAutoLinkAllTasks: () => void;
  totalProgress: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: SearchResult[];
  onSearchResultClick: (result: SearchResult) => void;
  onNavigateHome: () => void;
  showCriticalPath: boolean;
  onToggleCriticalPath: () => void;
  projectStartDate: Date;
  totalProjectDays: number;
  onProjectStartDateChange: (newDate: string) => void;
  onTotalProjectDaysChange: (days: number) => void;
  onToggleSidebar: () => void;
  onAddProductionLine: (name: string) => void;
  onDeleteProductionLine: (id: string) => void;
  onOpenRolesManagement: () => void;
  onSignOut: () => void;
  userDisplayName: string;
  highestRole: UserRole | null;
  canManageUsers: boolean;
  viewMode: GanttViewMode;
  onViewModeChange: (mode: GanttViewMode) => void;
}

const ProgressDisplay: React.FC<{ label: string; progress: number }> = ({ label, progress }) => (
  <div className="flex items-center gap-3 w-56">
    <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">{label}</span>
    <div className="w-full bg-slate-200 rounded-full h-2 shadow-inner" dir="rtl">
      <div
        className="bg-sky-500 h-2 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${progress}%` }}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${progress}%`}
      ></div>
    </div>
    <span className="font-bold text-sky-700 text-sm">{progress}%</span>
  </div>
);

const Header: React.FC<HeaderProps> = (props) => {
  const {
    productionLines, selectedLineIndex, onSelectLine, totalProgress,
    searchQuery, onSearchChange, searchResults, onSearchResultClick,
    onNavigateHome, projectStartDate, totalProjectDays, onProjectStartDateChange, onTotalProjectDaysChange, onToggleSidebar,
    onAddProductionLine, onDeleteProductionLine, onOpenBackupRestore, onAutoLinkAllTasks,
    onOpenRolesManagement, onSignOut, userDisplayName, highestRole, canManageUsers,
    onToggleCriticalPath, showCriticalPath, onOpenHolidaysManagement, onOpenAbsenceManagement
  } = props;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const seasonYear = projectStartDate.getFullYear();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="relative bg-background shadow-sm p-3 sm:p-4 flex justify-between items-center w-full no-print border-b border-border">
      <div className="flex items-center gap-2 sm:gap-4 text-right min-w-0">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} aria-label="فتح القائمة الجانبية">
          <Menu className="w-5 h-5" />
        </Button>
        <button onClick={onNavigateHome} className="flex items-center gap-2 sm:gap-4 min-w-0" aria-label="العودة إلى لوحة التحكم الرئيسية">
          <div className="flex-shrink-0">
            <svg className="w-10 h-10 sm:w-12 sm:h-12" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="Delta Sugar Company Logo">
              <title>شعار شركة الدلتا للسكر</title>
              <g role="presentation">
                <path d="M50 6 a 44 44 0 0 1 0 88 a 44 44 0 0 1 0 -88 M50 16 a 34 34 0 0 0 0 68 a 34 34 0 0 0 0 -68" fill="#047857" />
                <path d="M50 2 L50 14 M93.3 25 L85.98 29.32 M98 50 L86 50 M93.3 75 L85.98 70.68 M50 98 L50 86 M6.7 75 L14.02 70.68 M2 50 L14 50 M6.7 25 L14.02 29.32" stroke="#047857" strokeWidth="8" strokeLinecap="round" />
                <path d="M50 82 C 42 72, 42 62, 50 55 C 58 62, 58 72, 50 82 Z M50 82 Q 48 87 47 92 M50 82 Q 52 87 53 92" fill="#9f1239" />
                <path d="M50 56 C 40 46, 35 46, 40 31 Q 50 46 50 56 Z M50 56 C 60 46, 65 46, 60 31 Q 50 46 50 56 Z M50 56 C 45 41, 55 41, 50 26 Q 50 46 50 56 Z" fill="#10b981" />
              </g>
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-zinc-800 truncate">برنامج الصيانة</h1>
            <p className="text-xs sm:text-sm text-slate-500 truncate">شركة الدلتا للسكر</p>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">

        {/* Mobile Search Button */}
        {!isSearchExpanded && (
          <button 
            onClick={() => {
              setIsSearchExpanded(true);
              setTimeout(() => document.getElementById('search-input')?.focus(), 100);
            }} 
            className="p-2 text-slate-600 rounded-full hover:bg-slate-100 flex-shrink-0"
            aria-label="فتح البحث"
          >
            <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </button>
        )}

        {/* Search Bar Container */}
        <div className={`
          ${isSearchExpanded ? 'absolute inset-0 z-50 bg-white p-3 sm:p-4 flex items-center gap-2 animate-fade-in' : 'hidden'}
        `}>
          {isSearchExpanded && (
            <button 
              onClick={() => {
                setIsSearchExpanded(false);
                onSearchChange('');
              }} 
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full flex-shrink-0 transition-colors"
              aria-label="إغلاق البحث"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          )}

          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <Input
              id="search-input"
              type="text"
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full py-2 pr-10 pl-3 bg-muted/50 focus:bg-background"
              aria-label="بحث شامل في المشروع"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onSearchChange('');
                  setIsSearchExpanded(false);
                }
              }}
            />

            {searchQuery && (
              <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-[60vh] overflow-y-auto">
                {searchResults.length > 0 ? (
                  <ul>
                    {searchResults.map((result, index) => (
                      <li key={`${result.task.id}-${index}`}>
                        <button
                          onClick={() => {
                            onSearchResultClick(result);
                            if (isSearchExpanded) setIsSearchExpanded(false);
                          }}
                          className="w-full text-right p-3 hover:bg-emerald-50 focus:bg-emerald-100 transition-colors border-b border-slate-100"
                        >
                          <p className="font-semibold text-zinc-800">{result.task.name}</p>
                          <p className="text-xs text-slate-500 mt-1 flex flex-wrap gap-1">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded">{result.lineName}</span>
                            <span className="text-slate-300">/</span>
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded">{result.adminName}</span>
                            <span className="text-slate-300">/</span>
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded">{result.sectionName}</span>
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="p-4 text-center text-slate-500">لا توجد نتائج</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="hidden items-center gap-4">
          <ProgressDisplay label="التقدم الإجمالي" progress={totalProgress} />
        </div>

        <div className="flex items-center gap-1">
          <select
            id="line-select"
            value={selectedLineIndex}
            onChange={(e) => onSelectLine(Number(e.target.value))}
            className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-3 rounded-lg flex items-center gap-2 transition-colors border border-slate-300 text-sm max-w-[150px] truncate"
            aria-label="اختر خط الإنتاج"
          >
            {productionLines.length > 0 ? (
              productionLines.map((line, index) => (
                <option key={line.id} value={index}>
                  {line.name}
                </option>
              ))
            ) : (
              <option disabled>لا يوجد خطوط إنتاج</option>
            )}
          </select>
        </div>

          <button className="bg-white hover:bg-slate-50 text-slate-700 p-2.5 rounded-lg transition-colors border border-slate-300 hidden" aria-label="إشارة مرجعية">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" /></svg>
        </button>

        {/* User Role Badge */}
        {highestRole && (
          <div className="hidden items-center gap-2 px-3 py-1.5 bg-gradient-to-l from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
            <span className="text-xs font-semibold text-amber-800">{userDisplayName || 'مستخدم'}</span>
            <span className="text-xs px-2 py-0.5 bg-amber-200/50 text-amber-700 rounded-full font-bold">{USER_ROLE_LABELS[highestRole]}</span>
          </div>
        )}

        <div className="border-r border-slate-200 pl-4 pr-2 sm:pr-4 flex-shrink-0 hidden items-center gap-4">
          <div className="flex flex-col">
            <p className="text-sm font-semibold text-zinc-700">موسم {seasonYear}-{seasonYear + 1}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <label htmlFor="start-date-input" className="text-xs text-slate-500 font-medium">يبدأ:</label>
              <input
                type="date"
                id="start-date-input"
                value={projectStartDate.toISOString().slice(0, 10)}
                onChange={(e) => onProjectStartDateChange(e.target.value)}
                className="text-xs text-slate-600 bg-slate-100 rounded-md border border-slate-200 p-0.5 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
                aria-label="تغيير تاريخ بدء الموسم"
              />
            </div>
          </div>

          <div className="flex flex-col border-r border-slate-200 pr-4">
            <label htmlFor="total-days-input" className="text-xs text-slate-500 font-medium whitespace-nowrap">مدة المشروع (يوم):</label>
            <input
              type="number"
              id="total-days-input"
              value={totalProjectDays}
              onChange={(e) => onTotalProjectDaysChange(Number(e.target.value))}
              min={1}
              className="text-xs text-slate-600 bg-slate-100 rounded-md border border-slate-200 p-0.5 mt-0.5 w-[60px] focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              aria-label="مدة المشروع بالأيام"
            />
          </div>
        </div>

        <div className="relative">
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="قائمة الإجراءات">
                <Settings className="w-5 h-5 text-zinc-700" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white shadow-xl border border-slate-200 z-[100]">
              {canManageUsers && (
                <DropdownMenuItem onClick={onOpenRolesManagement} className="text-amber-700 focus:text-amber-700 focus:bg-amber-50">
                  <ShieldAlert className="w-4 h-4 ml-2" />
                  <span>إدارة الصلاحيات</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={onToggleCriticalPath} 
                className={showCriticalPath ? 'text-red-700 focus:text-red-700 focus:bg-red-50' : ''}
              >
                <AlertTriangle className="w-4 h-4 ml-2" />
                <span>المسار الحرج</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>طريقة العرض (Gantt View)</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => props.onViewModeChange('classic')} className={props.viewMode === 'classic' ? 'bg-emerald-50 text-emerald-700 font-bold' : ''}>
                <span className="w-4 h-4 ml-2 flex items-center justify-center">{props.viewMode === 'classic' && '✓'}</span>
                <span>الافتراضي (Classic)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => props.onViewModeChange('linear')} className={props.viewMode === 'linear' ? 'bg-emerald-50 text-emerald-700 font-bold' : ''}>
                <span className="w-4 h-4 ml-2 flex items-center justify-center">{props.viewMode === 'linear' && '✓'}</span>
                <span>الخطي البسيط (Linear)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => props.onViewModeChange('dense')} className={props.viewMode === 'dense' ? 'bg-emerald-50 text-emerald-700 font-bold' : ''}>
                <span className="w-4 h-4 ml-2 flex items-center justify-center">{props.viewMode === 'dense' && '✓'}</span>
                <span>المكثف (Dense)</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>العمليات والموارد</DropdownMenuLabel>
              <DropdownMenuItem onClick={onOpenHolidaysManagement}>
                <Calendar className="w-4 h-4 ml-2" />
                <span>إدارة الإجازات</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenAbsenceManagement}>
                <Clock className="w-4 h-4 ml-2" />
                <span>سجل الحضور</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={props.onOpenSectorAssignment}>
                <Users className="w-4 h-4 ml-2" />
                <span>إسناد القطاعات</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={props.onOpenLocationAssignment}>
                <MapPin className="w-4 h-4 ml-2" />
                <span>إسناد الأماكن</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={props.onOpenPersonnelManagement}>
                <User className="w-4 h-4 ml-2" />
                <span>إدارة المسؤولين</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>الإعدادات والبيانات</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="w-full flex items-center cursor-pointer">
                  <Settings className="w-4 h-4 ml-2" />
                  <span>إعدادات النظام</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={props.onOpenExportOptions}>
                <Download className="w-4 h-4 ml-2" />
                <span>التقارير / تصدير</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={props.onOpenBackupRestore}>
                <Database className="w-4 h-4 ml-2" />
                <span>النسخ الاحتياطي / استيراد</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={props.onAutoLinkAllTasks} className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50">
                <LinkIcon className="w-4 h-4 ml-2" />
                <span>ربط المهام القديمة</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={props.onResetData} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                <RotateCcw className="w-4 h-4 ml-2" />
                <span>إعادة تعيين</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={props.onSignOut} className="text-red-600 focus:text-red-700 focus:bg-red-50 font-bold">
                <LogOut className="w-4 h-4 ml-2" />
                <span>تسجيل الخروج</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;