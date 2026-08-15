import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { AppearanceMenu } from './AppearanceMenu';
import { downloadMarkdownFile } from '../../services/exportService';
import {
  Highlighter,
  Edit3,
  BookOpen,
  FolderOpen,
  Save,
  Download,
  Cloud,
  Check,
  RefreshCw,
  MoreVertical,
  WifiOff,
  Settings,
  FilePlus,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    document: currentDoc,
    setDocument,
    fileHandle,
    setFileHandle,
    isHighlightMode,
    toggleHighlightMode,
    isEditable,
    setIsEditable,
    highlightCount,
    syncStatus,
    setSyncStatus,
    userProfile,
    setIsOneDriveModalOpen,
    setIsSettingsModalOpen,
  } = useAppStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Monitor online status for sync resilience
  useEffect(() => {
    const handleOnline = () => {
      if (syncStatus === 'offline-pending') {
        setSyncStatus('idle');
      }
    };
    const handleOffline = () => {
      if (currentDoc.isDirty) {
        setSyncStatus('offline-pending');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncStatus, currentDoc.isDirty, setSyncStatus]);

  // Start Blank File
  const handleNewFile = () => {
    if (currentDoc.isDirty) {
      const confirmNew = window.confirm('Você tem alterações não salvas. Deseja iniciar um novo arquivo e descartá-las?');
      if (!confirmNew) return;
    }
    setFileHandle(null);
    setDocument({
      title: 'Sem Título.md',
      content: '',
      oneDriveItemId: null,
      lastSavedAt: new Date().toLocaleTimeString(),
      isDirty: false,
    });
  };

  // Native Open File with iPad/Mobile Fallback
  const handleOpenFile = async () => {
    try {
      if ('showOpenFilePicker' in window) {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'Arquivos Markdown',
              accept: { 'text/markdown': ['.md', '.txt'] },
            },
          ],
          multiple: false,
        });

        const file = await handle.getFile();
        const text = await file.text();

        setFileHandle(handle);
        setDocument({
          title: file.name,
          content: text,
          oneDriveItemId: null,
          lastSavedAt: new Date().toLocaleTimeString(),
          isDirty: false,
        });
      } else {
        // iPad / Mobile Fallback: Uses native Files app picker
        fileInputRef.current?.click();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        fileInputRef.current?.click();
      }
    }
  };

  // Fallback File Upload Event (Mobile / iPad)
  const handleFileUploadFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawText = event.target?.result as string;
      if (rawText) {
        setFileHandle(null);
        setDocument({
          title: file.name,
          content: rawText,
          oneDriveItemId: null,
          lastSavedAt: new Date().toLocaleTimeString(),
          isDirty: false,
        });
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save File with iPad / Mobile Resilience
  const handleSaveFile = async () => {
    const contentToSave = currentDoc.content;

    try {
      if (fileHandle && typeof fileHandle.createWritable === 'function') {
        // Desktop direct file overwrite
        const writable = await fileHandle.createWritable();
        await writable.write(contentToSave);
        await writable.close();

        setDocument({ isDirty: false, lastSavedAt: new Date().toLocaleTimeString() });
        showNotification('Arquivo salvo!');
      } else if ('showSaveFilePicker' in window) {
        // Desktop Save As Picker
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: currentDoc.title || 'documento_grifado.md',
          types: [{ description: 'Arquivo Markdown', accept: { 'text/markdown': ['.md'] } }],
        });

        const writable = await handle.createWritable();
        await writable.write(contentToSave);
        await writable.close();

        const file = await handle.getFile();
        setFileHandle(handle);
        setDocument({
          title: file.name,
          isDirty: false,
          lastSavedAt: new Date().toLocaleTimeString(),
        });
        showNotification('Arquivo salvo!');
      } else {
        // iPad / Mobile Fallback: Triggers iOS "Save to Files" prompt
        downloadMarkdownFile(contentToSave, currentDoc.title || 'documento.md');
        setDocument({ isDirty: false, lastSavedAt: new Date().toLocaleTimeString() });
        showNotification('Salvo no dispositivo!');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // Mobile fallback if picker fails or is restricted by iOS Safari
        downloadMarkdownFile(contentToSave, currentDoc.title || 'documento.md');
        setDocument({ isDirty: false, lastSavedAt: new Date().toLocaleTimeString() });
        showNotification('Salvo no dispositivo!');
      }
    }
  };

  // Show temporary toast message
  const showNotification = (msg: string) => {
    setSaveSuccessMessage(msg);
    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 3000);
  };

  // Export Standalone MD Copy
  const handleExportMD = () => {
    downloadMarkdownFile(currentDoc.content, currentDoc.title || 'documento.md');
  };

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 header-safe-area transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Left Section: Logo & Document Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md shrink-0">
            <Highlighter className="w-5 h-5" />
          </div>

          <div className="truncate">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                {currentDoc.title}
              </h1>
              {currentDoc.isDirty && (
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Alterações não salvas" />
              )}
              {saveSuccessMessage && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full animate-in fade-in">
                  ✓ {saveSuccessMessage}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:block">
              {fileHandle
                ? 'Arquivo local conectado (Salvar direto)'
                : currentDoc.oneDriveItemId
                ? 'Sincronizado via OneDrive'
                : 'Salvo em cache'}
            </p>
          </div>
        </div>

        {/* Center/Right Section: Actions Toolbar */}
        <div className="flex items-center gap-2">
          {/* Modo Grifar (Toggle Button + Badge) */}
          <button
            onClick={toggleHighlightMode}
            className={`px-3 h-8 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all ${
              isHighlightMode
                ? 'bg-amber-500 text-white shadow-sm font-semibold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Ativar/Desativar Modo Grifar (Atalho: tecla G)"
          >
            <Highlighter className="w-4 h-4" />
            <span className="hidden md:inline">Grifar</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                isHighlightMode ? 'bg-amber-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {highlightCount}
            </span>
          </button>

          {/* Modo Leitura / Edição Toggle */}
          <button
            onClick={() => setIsEditable(!isEditable)}
            className={`px-3 h-8 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all ${
              isEditable
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title={isEditable ? 'Alternar para Modo Leitura' : 'Alternar para Modo Edição'}
          >
            {isEditable ? <Edit3 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
            <span className="hidden sm:inline">{isEditable ? 'Edição' : 'Leitura'}</span>
          </button>

          {/* Desktop Actions: Abrir, Salvar, Exportar */}
          <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
            {/* Input Fallback */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown,.txt"
              className="hidden"
              onChange={handleFileUploadFallback}
            />

            {/* Botão Novo */}
            <button
              onClick={handleNewFile}
              title="Iniciar novo arquivo em branco"
              className="px-3 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 text-xs font-medium transition-colors"
            >
              <FilePlus className="w-4 h-4 text-purple-500" /> Novo
            </button>

            {/* Botão Abrir */}
            <button
              onClick={handleOpenFile}
              title="Abrir arquivo Markdown local"
              className="px-3 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 text-xs font-medium transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-blue-500" /> Abrir
            </button>

            <button
              onClick={handleSaveFile}
              title="Salvar alterações substituindo o arquivo original (Ctrl+S)"
              className="px-3 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 text-xs font-medium transition-colors"
            >
              <Save className="w-4 h-4 text-emerald-500" /> Salvar
            </button>

            {/* Botão Exportar (Baixar nova cópia) */}
            <button
              onClick={handleExportMD}
              title="Baixar nova cópia Markdown com grifos"
              className="px-3 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 text-xs font-medium transition-colors"
            >
              <Download className="w-4 h-4 text-purple-500" /> Exportar
            </button>
          </div>

          {/* Aparência Menu */}
          <AppearanceMenu />

          {/* OneDrive Sync Button */}
          <button
            onClick={() => setIsOneDriveModalOpen(true)}
            className="px-3 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 text-xs font-medium transition-colors"
          >
            <Cloud className="w-4 h-4 text-blue-500" />
            <span className="hidden sm:inline">
              {userProfile ? userProfile.name.split(' ')[0] : 'OneDrive'}
            </span>

            {/* Sync status indicator badge */}
            {syncStatus === 'saving' && <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
            {syncStatus === 'saved' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
            {syncStatus === 'offline-pending' && <WifiOff className="w-3.5 h-3.5 text-amber-500" />}
          </button>

          {/* Mobile Overflow Menu */}
          <div className="relative lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`px-2 h-8 rounded-xl transition-colors ${
                isMobileMenuOpen
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {isMobileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-40 space-y-1 animate-in fade-in">
                <button
                  onClick={() => {
                    handleNewFile();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full p-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2"
                >
                  <FilePlus className="w-4 h-4 text-purple-500" /> Novo
                </button>
                <button
                  onClick={() => {
                    handleOpenFile();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full p-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2"
                >
                  <FolderOpen className="w-4 h-4 text-blue-500" /> Abrir
                </button>
                <button
                  onClick={() => {
                    handleSaveFile();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full p-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2"
                >
                  <Save className="w-4 h-4 text-emerald-500" /> Salvar
                </button>
                <button
                  onClick={() => {
                    handleExportMD();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full p-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-purple-500" /> Exportar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
