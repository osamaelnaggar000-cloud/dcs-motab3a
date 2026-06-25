import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { exportAllData, importAllData, AppBackupData } from '../utils/backupHelpers';
import { DatabaseBackup, UploadCloud, DownloadCloud, AlertTriangle, RefreshCw } from 'lucide-react';

interface BackupRestoreModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({ isOpen, onClose }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [importSuccess, setImportSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleExport = async () => {
        setIsExporting(true);
        setImportError(null);
        setImportSuccess(false);
        try {
            const data = await exportAllData();
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `motab3a_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export failed:", error);
            alert("حدث خطأ أثناء تصدير البيانات. تأكد من اتصالك بالإنترنت.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportClick = () => {
        setImportError(null);
        setImportSuccess(false);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            setImportError('يرجى اختيار ملف JSON صالح.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const confirmImport = window.confirm(
            'تحذير: استيراد نسخة احتياطية سيقوم بمسح واستبدال جميع البيانات الحالية في التطبيق بشكل نهائي. هل أنت متأكد أنك تريد المتابعة؟'
        );

        if (!confirmImport) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsImporting(true);
        setImportError(null);
        setImportSuccess(false);

        try {
            const fileContent = await file.text();
            let backupData: AppBackupData;

            try {
                backupData = JSON.parse(fileContent);
            } catch (e) {
                throw new Error('محتوى الملف غير صالح أو تالف.');
            }

            if (!backupData || typeof backupData !== 'object' || typeof backupData.version !== 'number' || typeof backupData.timestamp !== 'string') {
                throw new Error('الملف لا يحتوي على نسخة احتياطية صالحة للنظام.');
            }

            await importAllData(backupData);
            setImportSuccess(true);

            // Reload after short delay to apply changes
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error: any) {
            console.error("Import failed:", error);
            setImportError(error.message || "حدث خطأ غير معروف أثناء استيراد البيانات.");
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };



    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent showCloseButton={false} className="w-[95vw] md:w-[50vw] max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl" dir="rtl">
                <DialogTitle className="sr-only">النسخ الاحتياطي والاستيراد</DialogTitle>
                <DialogDescription className="sr-only">أخذ نسخة احتياطية من البيانات أو استعادتها</DialogDescription>
                <header className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                            <DatabaseBackup className="text-indigo-600" size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">النسخ الاحتياطي والاستيراد</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                        disabled={isImporting || isExporting}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                </header>

                <main className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 bg-white">
                    {/* Export Section */}
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                            <DownloadCloud size={20} className="text-indigo-500" />
                            تصدير نسخة احتياطية
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                            حفظ جميع بيانات التطبيق الحالية (المهام، المسؤولين، الإجازات، إسناد الأماكن...) في ملف JSON واحد على جهازك.
                        </p>
                        <button
                            onClick={handleExport}
                            disabled={isExporting || isImporting || isMigrating}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 pl-4 pr-6 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {isExporting ? 'جاري التصدير...' : 'تحميل النسخة الاحتياطية'}
                            {!isExporting && <DownloadCloud size={18} />}
                        </button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200"></span>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-slate-400 font-medium">أو</span>
                        </div>
                    </div>

                    {/* Import Section */}
                    <div className="bg-amber-50 p-5 rounded-xl border border-amber-200">
                        <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                            <UploadCloud size={20} className="text-amber-600" />
                            استيراد من ملف
                        </h3>
                        <p className="text-sm text-amber-700 mb-4">
                            استعادة بيانات التطبيق من ملف نسخة احتياطية (JSON) تم حفظه سابقاً.
                        </p>

                        <div className="bg-amber-100 p-3 rounded-lg flex gap-3 text-amber-800 text-xs mb-4 items-start">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                            <p><strong>تنبيه هام:</strong> الاستيراد سيقوم بمسح كافة البيانات الحالية الموجودة في النظام واستبدالها ببيانات الملف بالكامل.</p>
                        </div>

                        <input
                            type="file"
                            accept=".json,application/json"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />

                        <button
                            onClick={handleImportClick}
                            disabled={isExporting || isImporting || isMigrating || importSuccess}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 pl-4 pr-6 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {isImporting ? 'جاري الاستيراد والحفظ...' : 'اختيار ملف الاستيراد'}
                            {!isImporting && <UploadCloud size={18} />}
                        </button>

                        {importError && (
                            <div className="mt-3 p-3 bg-red-100 text-red-700 text-sm rounded-lg flex items-center gap-2">
                                <AlertTriangle size={16} />
                                {importError}
                            </div>
                        )}

                        {importSuccess && (
                            <div className="mt-3 p-3 bg-green-100 text-green-700 text-sm rounded-lg text-center font-medium animate-pulse">
                                تم الاستيراد بنجاح! سيتم إعادة تحميل الصفحة الآن...
                            </div>
                        )}
                    </div>
                </main>
            </DialogContent>
        </Dialog>
    );
};

export default BackupRestoreModal;
