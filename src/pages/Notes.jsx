import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  Sparkles, 
  Trash2, 
  Copy, 
  Check, 
  Clock, 
  Folder, 
  FolderOpen,
  X, 
  FileText, 
  BookOpen, 
  ChevronLeft
} from 'lucide-react';
import { getNotes, addNote, updateNote, deleteNote, getCategories } from '../api';
import CategorySidebar from '../components/Shared/CategorySidebar';
import CategoryCombobox from '../components/Shared/CategoryCombobox';
import { evaluateSmartFilter, getCategoryColor } from '../utils/categoryHelpers';

const Notes = () => {
  const categoryKey = 'notes';
  
  // Data State
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Sidebar Collapse State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem(`grid-sidebar-collapsed-${categoryKey}`) === 'true';
  });

  // Custom Categories
  const [customCategories, setCustomCategories] = useState(() => {
    const saved = localStorage.getItem(`custom-categories-${categoryKey}`);
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Editor and Auto-save State
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [localTitle, setLocalTitle] = useState('');
  const [localContent, setLocalContent] = useState('');
  const [editorMode, setEditorMode] = useState(() => {
    return localStorage.getItem('notes-global-editor-mode') || 'edit';
  });

  useEffect(() => {
    localStorage.setItem('notes-global-editor-mode', editorMode);
  }, [editorMode]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inlineCopiedId, setInlineCopiedId] = useState(null);

  // Undo Stack & Modal state
  const [undoStack, setUndoStack] = useState([]);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const saveTimerRef = useRef(null);
  const titleSaveTimerRef = useRef(null);
  const typingTimerRef = useRef(null);
  const editorRef = useRef(null);

  // Sync collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(`grid-sidebar-collapsed-${categoryKey}`, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Load notes data from API
  const loadData = async () => {
    setLoading(true);
    try {
      const [itemRes, catRes] = await Promise.all([getNotes(), getCategories()]);
      const fetchedNotes = itemRes.data || [];
      setItems(fetchedNotes);
      
      const backendCats = (catRes.data[categoryKey] || []).filter(Boolean);
      const combined = ['All', ...new Set([...customCategories, ...backendCats, ...fetchedNotes.map(i => i.category || 'General')])];
      setCategories(combined);
    } catch (err) {
      console.error("Failed to load notes data", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [customCategories]);

  // Flush any pending auto-saves on unmount or editor switch
  const flushPendingSave = async (noteId, contentText, titleText) => {
    if (!noteId) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (titleSaveTimerRef.current) {
      clearTimeout(titleSaveTimerRef.current);
      titleSaveTimerRef.current = null;
    }
    
    const originalNote = items.find(n => n.id === noteId);
    if (originalNote && (contentText !== originalNote.content || titleText !== originalNote.title)) {
      setIsSaving(true);
      try {
        await updateNote(noteId, { content: contentText, title: titleText });
        setItems(prev => prev.map(n => n.id === noteId ? { ...n, content: contentText, title: titleText } : n));
      } catch (err) {
        console.error("Auto-save flush failed", err);
      }
      setIsSaving(false);
    }
  };

  // Select a note, flushing changes to the previous one
  const handleSelectNote = async (id) => {
    if (selectedItemId === id) return;
    
    // Save current note content if dirty
    await flushPendingSave(selectedItemId, localContent, localTitle);
    
    setSelectedItemId(id);
    const targetNote = items.find(n => n.id === id);
    setLocalContent(targetNote ? targetNote.content || '' : '');
    setLocalTitle(targetNote ? targetNote.title || '' : '');
    setIsTyping(false);
    
    // Focus Editor textarea if editing
    if (id) {
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
        }
      }, 150);
    }
  };

  // Refs to prevent stale closures in global keydown event listener
  const selectedItemIdRef = useRef(selectedItemId);
  const localContentRef = useRef(localContent);
  const localTitleRef = useRef(localTitle);
  const handleSelectNoteRef = useRef(handleSelectNote);

  useEffect(() => {
    selectedItemIdRef.current = selectedItemId;
    localContentRef.current = localContent;
    localTitleRef.current = localTitle;
    handleSelectNoteRef.current = handleSelectNote;
  }, [selectedItemId, localContent, localTitle, handleSelectNote]);

  // Global keydown event listener for Escape key to close editor
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedItemIdRef.current) {
        e.preventDefault();
        handleSelectNoteRef.current(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const triggerTypingIndicator = () => {
    setIsTyping(true);
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1800); // 1.8 seconds of typing silence resets opacity
  };

  // Handle Note Title updates with debounced auto-save
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setLocalTitle(val);
    triggerTypingIndicator();
    
    setItems(prev => prev.map(n => n.id === selectedItemId ? { ...n, title: val } : n));
    
    if (titleSaveTimerRef.current) {
      clearTimeout(titleSaveTimerRef.current);
    }
    
    titleSaveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await updateNote(selectedItemId, { title: val });
      } catch (err) {
        console.error("Title auto-save failed", err);
      }
      setIsSaving(false);
      titleSaveTimerRef.current = null;
    }, 800);
  };

  // Handle Note Content typing with debounced auto-save
  const handleContentChange = (e) => {
    const text = e.target.value;
    setLocalContent(text);
    triggerTypingIndicator();
    
    setItems(prev => prev.map(n => n.id === selectedItemId ? { ...n, content: text } : n));
    
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    saveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await updateNote(selectedItemId, { content: text });
      } catch (err) {
        console.error("Content auto-save failed", err);
      }
      setIsSaving(false);
      saveTimerRef.current = null;
    }, 800);
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (titleSaveTimerRef.current) clearTimeout(titleSaveTimerRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  // Create new note
  const handleCreateNote = async () => {
    const defaultCat = ['All', 'Today', 'Priority', 'Stale'].includes(activeCategory) ? 'General' : activeCategory;
    try {
      const newNoteData = {
        title: 'Untitled Note',
        content: 'Start typing your technical notes or documentation here...',
        category: defaultCat,
        created: new Date().toISOString()
      };
      const res = await addNote(newNoteData);
      const createdNote = res.data;
      
      setItems(prev => [createdNote, ...prev]);
      
      // Select the new note instantly
      await handleSelectNote(createdNote.id);
    } catch (err) {
      console.error("Failed to create new note", err);
    }
  };

  // Delete note
  const handleDeleteNote = async (id, e) => {
    if (e) e.stopPropagation();
    
    const noteToDelete = items.find(n => n.id === id);
    if (!noteToDelete) return;
    
    try {
      await deleteNote(id);
      
      const remainingNotes = items.filter(n => n.id !== id);
      setItems(remainingNotes);
      
      // Setup Undo Toast
      setUndoStack(prev => [
        ...prev,
        {
          type: 'note_delete',
          note: noteToDelete,
          restoreAction: async () => {
            const res = await addNote(noteToDelete);
            setItems(current => [res.data, ...current]);
            setSelectedItemId(res.data.id);
            setLocalContent(res.data.content || '');
            setLocalTitle(res.data.title || '');
          }
        }
      ]);
      
      // Re-evaluate active note selection
      if (selectedItemId === id) {
        setSelectedItemId(null);
        setLocalContent('');
        setLocalTitle('');
      }
    } catch (err) {
      console.error("Failed to delete note", err);
    }
  };

  // Change category of active note
  const handleUpdateNoteCategory = async (catVal) => {
    if (!selectedItemId) return;
    const folder = catVal.trim() || 'General';
    try {
      await updateNote(selectedItemId, { category: folder });
      setItems(prev => prev.map(n => n.id === selectedItemId ? { ...n, category: folder } : n));
    } catch (err) {
      console.error("Failed to assign note category", err);
    }
  };

  // Create category custom
  const handleCreateCategory = (catName) => {
    if (catName && !customCategories.includes(catName)) {
      const updated = [...customCategories, catName];
      setCustomCategories(updated);
      localStorage.setItem(`custom-categories-${categoryKey}`, JSON.stringify(updated));
      setActiveCategory(catName);
      setCategories(['All', ...new Set([...updated, ...items.map(i => i.category || 'General')])]);
    }
  };

  // Delete category custom
  const handleDeleteCategory = async (cat) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Folder Category',
      message: `Are you sure you want to delete the folder category "${cat}"? Associated note documents will be safely reassigned to "General".`,
      onConfirm: async () => {
        const updatedCustom = customCategories.filter(c => c !== cat);
        setCustomCategories(updatedCustom);
        localStorage.setItem(`custom-categories-${categoryKey}`, JSON.stringify(updatedCustom));
        
        const itemsToUpdate = items.filter(i => i.category === cat);
        for (const item of itemsToUpdate) {
          await updateNote(item.id, { category: 'General' }).catch(() => {});
        }
        
        if (activeCategory === cat) {
          setActiveCategory('All');
        }
        loadData();
      }
    });
  };

  // Copy Note content
  const handleCopyContent = () => {
    if (!localContent) return;
    navigator.clipboard.writeText(localContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Copy Content Inline for List row
  const handleCopyContentInline = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setInlineCopiedId(id);
    setTimeout(() => setInlineCopiedId(null), 2000);
  };

  // Undo Handler
  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return;
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setShowUndoToast(false);
    try {
      await lastAction.restoreAction();
      loadData();
    } catch (err) {
      console.error("Failed to undo notes deletion", err);
    }
  }, [undoStack]);

  useEffect(() => {
    if (undoStack.length > 0) {
      const last = undoStack[undoStack.length - 1];
      setToastMessage(last.type === 'category_delete' ? `Category "${last.categoryName}" deleted.` : `Note deleted.`);
      setShowUndoToast(true);
      const timer = setTimeout(() => setShowUndoToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [undoStack]);

  // Filtering Notes based on Search + Active Sidebar Folder
  const filteredNotes = useMemo(() => {
    return (items || []).filter(item => {
      if (!item) return false;
      const matchesSearch = 
        String(item.content || '').toLowerCase().includes(search.toLowerCase()) || 
        String(item.title || '').toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (activeCategory === 'All') return true;
      if (['Today', 'Priority', 'Stale'].includes(activeCategory)) {
        return evaluateSmartFilter(activeCategory, item, categoryKey);
      }
      const itemCat = String(item.category || 'General');
      return itemCat.toLowerCase() === activeCategory.toLowerCase();
    });
  }, [items, activeCategory, search]);

  const activeNote = useMemo(() => {
    return items.find(n => n.id === selectedItemId);
  }, [items, selectedItemId]);

  // Note statistics helper
  const wordStats = useMemo(() => {
    const text = localContent || '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    return { words, chars };
  }, [localContent]);

  // Parse Note Snippet for list rendering
  const parseNoteSnippet = (contentString) => {
    const content = contentString || '';
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.join(' ') || 'No additional content';
  };

  const formatNoteDate = (isoDate) => {
    try {
      const d = new Date(isoDate);
      return isNaN(d.getTime()) 
        ? new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) 
        : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  };

  // Highlights search queries inside note rows
  const highlightText = (text, searchWord) => {
    if (!searchWord || !text) return <span className="select-text">{text}</span>;
    
    const parts = text.split(new RegExp(`(${searchWord.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span className="select-text">
        {parts.map((part, index) => 
          part.toLowerCase() === searchWord.toLowerCase()
            ? <span key={index} className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1 py-0.5 rounded font-black">{part}</span>
            : part
        )}
      </span>
    );
  };

  // Regex-based custom markdown parser
  const renderMarkdown = (markdownText) => {
    const rawText = markdownText || '';
    
    let html = rawText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    // Code blocks
    html = html.replace(/```(?:[a-zA-Z0-9]+)?\n([\s\S]*?)\n```/g, (match, code) => {
      return `<pre class="bg-black/50 border border-white/[0.04] p-4 rounded-xl my-4 text-[11px] font-mono text-blue-400 overflow-x-auto shadow-inner select-text whitespace-pre">${code}</pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono text-blue-300">$1</code>');

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xs font-black text-slate-300 uppercase tracking-widest mt-4 mb-2 select-text">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-sm font-black text-slate-200 uppercase tracking-wide mt-5 mb-2 select-text">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-base font-black text-slate-100 uppercase tracking-wider mt-6 mb-3 pb-1 border-b border-white/5 select-text">$1</h1>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-black text-slate-100 select-text">$1</strong>');

    // Bullet points
    html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li class="text-[11.5px] text-slate-400 list-disc ml-5 my-1.5 leading-relaxed select-text">$1</li>');

    // Paragraph split
    const formatted = html.split('\n').map(line => {
      if (line.trim().startsWith('<h') || line.trim().startsWith('<pre') || line.trim().startsWith('<li') || line.trim().startsWith('<code')) {
        return line;
      }
      return line.trim() ? `<p class="text-[12px] text-slate-350 leading-relaxed my-2.5 select-text">${line}</p>` : '';
    }).join('\n');

    return <div dangerouslySetInnerHTML={{ __html: formatted }} className="space-y-1 select-text" />;
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] w-full gap-6 select-none relative px-6 py-6 overflow-hidden">
      
      {/* ─── Column 1: Collapsible Category Sidebar ─── */}
      <AnimatePresence initial={false}>
        {!isSidebarCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0, marginRight: 0 }}
            animate={{ width: 224, opacity: 1, marginRight: 24 }}
            exit={{ width: 0, opacity: 0, marginRight: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="overflow-hidden shrink-0 h-full"
          >
            <CategorySidebar 
              categories={categories}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              items={items}
              categoryKey={categoryKey}
              accentColor="blue"
              onDeleteCategory={handleDeleteCategory}
              onAddCategory={handleCreateCategory}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Column 2: Main Workspace Content (Toggles between List and Editor) ─── */}
      <div className="flex-1 min-w-0 max-w-full h-full relative overflow-hidden">
        <AnimatePresence mode="wait">
          {!selectedItemId ? (
            /* ==========================================
               MODE A: TABULAR DOCUMENT ROW LIST VIEW
               ========================================== */
            <motion.div
              key="note-deck-list"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col space-y-6"
            >
              {/* Header block with folder controls consistent with other tabs */}
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
                <div>
                  <h2 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isSidebarCollapsed;
                        setIsSidebarCollapsed(next);
                        localStorage.setItem(`grid-sidebar-collapsed-${categoryKey}`, String(next));
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer select-none mr-2 ${
                        isSidebarCollapsed 
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                          : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.08] hover:border-white/20 hover:text-white'
                      }`}
                      title={isSidebarCollapsed ? "Expand Folders" : "Collapse Folders"}
                    >
                      {isSidebarCollapsed ? (
                        <>
                          <Folder className="w-3.5 h-3.5 text-blue-400" />
                          <span>Folders</span>
                        </>
                      ) : (
                        <>
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Hide Sidebar</span>
                        </>
                      )}
                    </button>
                    Notes Deck
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                      {filteredNotes.length} units
                    </span>
                  </h2>
                </div>
                
                {/* Deploy Note Trigger */}
                <button
                  onClick={handleCreateNote}
                  className="premium-btn text-[10px] font-black uppercase tracking-widest px-4 py-2 cursor-pointer"
                >
                  <Plus size={13} />
                  Deploy Note
                </button>
              </header>

              {/* Deck Search Input */}
              <div className="relative shrink-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
                <input 
                  type="text" 
                  placeholder={`Search across ${filteredNotes.length} notes...`} 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-input-premium w-full pl-10 h-10"
                />
              </div>

              {/* Scrollable list of rows */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pb-6">
                {filteredNotes.map((note) => {
                  const snippet = parseNoteSnippet(note.content);
                  const catColor = getCategoryColor(note.category);
                  
                  return (
                    <div
                      key={note.id}
                      onClick={() => handleSelectNote(note.id)}
                      className="group flex items-center justify-between p-4 bg-gradient-to-br from-[var(--color-card-from)] to-[var(--color-card-to)] border-[var(--color-border)] hover:border-accent-blue/35 rounded-2xl transition-all duration-300 cursor-pointer shadow-lg hover:shadow-[0_4px_20px_color-mix(in_srgb,var(--color-accent-blue)_5%,transparent)] select-none"
                    >
                      {/* Left: Document icon and descriptions */}
                      <div className="flex items-center gap-4 min-w-0 flex-1 pr-6">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-300 ${catColor.bg} ${catColor.text} ${catColor.border} group-hover:scale-105`}>
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                            {highlightText(note.title || 'Untitled Note', search)}
                          </h3>
                          <p className="text-[10px] text-slate-500 group-hover:text-slate-400 mt-0.5 truncate font-mono">
                            {highlightText(snippet, search)}
                          </p>
                        </div>
                      </div>

                      {/* Right: Category details, dates, and actions */}
                      <div className="flex items-center gap-6 shrink-0 text-[9px] font-mono tracking-wider uppercase">
                        <div className={`px-2 py-0.5 rounded border text-[8px] font-bold ${catColor.bg} ${catColor.text} ${catColor.border}`}>
                          {note.category || 'General'}
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-slate-605">
                          <Clock size={10} className="opacity-55" />
                          <span>{formatNoteDate(note.created)}</span>
                        </div>

                        {/* Hover commands */}
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity w-14 justify-end">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCopyContentInline(note.content, note.id); }}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
                            title="Copy text content"
                          >
                            {inlineCopiedId === note.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          </button>
                          <button
                            onClick={(e) => handleDeleteNote(note.id, e)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-555 hover:text-rose-400 transition-all cursor-pointer"
                            title="Delete note"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredNotes.length === 0 && !loading && (
                  <div className="text-center py-24 border border-dashed border-white/5 rounded-2xl p-6">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.01] flex items-center justify-center text-slate-700 mx-auto mb-4">
                       <Sparkles size={22} />
                    </div>
                    <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">No notes found in this folder.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* ==========================================
               MODE B: DISTRACTION-FREE FULL EDITOR VIEW
               ========================================== */
            <motion.div
              key="note-document-editor"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-card-from)] to-[var(--color-card-to)] backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden"
            >
              {/* Editor Header panel */}
              <div className={`flex items-center justify-between px-5 py-3.5 border-b border-white/[0.04] bg-white/[0.01] shrink-0 select-none transition-all duration-700 ${
                isTyping ? 'opacity-20 pointer-events-none' : 'opacity-100'
              }`}>
                {/* Back Navigation & Info */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSelectNote(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.08] hover:border-white/20 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer focus:outline-none"
                  >
                    <ChevronLeft size={13} />
                    Back to Deck
                  </button>
                  
                  <span className="text-[10px] font-mono text-slate-550 uppercase tracking-widest font-bold px-3.5 border-l border-white/5">
                    Editor View
                  </span>
                </div>

                {/* Folder sector dropdown & Utilities */}
                <div className="flex items-center gap-4">
                  {/* Sliding Edit/Preview toggle button */}
                  <div className="flex items-center p-0.5 bg-black/40 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-wider shrink-0 select-none mr-2">
                    <button
                      onClick={() => setEditorMode('edit')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer focus:outline-none ${
                        editorMode === 'edit'
                          ? 'bg-[var(--color-accent-blue)] text-white shadow-md'
                          : 'text-slate-500 hover:text-slate-350'
                      }`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setEditorMode('preview')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer focus:outline-none ${
                        editorMode === 'preview'
                          ? 'bg-[var(--color-accent-blue)] text-white shadow-md'
                          : 'text-slate-500 hover:text-slate-350'
                      }`}
                    >
                      Preview
                    </button>
                  </div>

                  {/* Folder selector */}
                  <div className="flex items-center gap-2 border-r border-white/5 pr-4">
                    <Folder size={12} className="text-blue-500" />
                    <span className="text-[9px] font-black uppercase text-slate-550 tracking-wider">Folder:</span>
                    <div className="w-36">
                      <CategoryCombobox 
                        value={activeNote?.category || 'General'}
                        onChange={handleUpdateNoteCategory}
                        suggestions={categories.filter(c => !['All', 'Today', 'Priority', 'Stale', 'General', 'Main'].includes(c))}
                        placeholder="Move folder..."
                        accentColor="blue"
                        variant="minimal"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCopyContent}
                      className="p-1.5 hover:bg-white/[0.04] rounded-lg border border-white/5 hover:border-white/10 text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
                      title="Copy content"
                    >
                      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                    <button
                      onClick={() => handleDeleteNote(activeNote.id)}
                      className="p-1.5 hover:bg-rose-500/10 rounded-lg border border-white/5 hover:border-rose-500/20 text-slate-550 hover:text-rose-400 transition-all cursor-pointer"
                      title="Delete note"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Large, distraction-free editing textarea or parsed Markdown container */}
              <div className={`flex-1 overflow-y-auto p-6 flex flex-col bg-black/5 transition-all duration-700 ${
                isTyping ? 'shadow-[inset_0_0_50px_rgba(59,130,246,0.035)] border-blue-500/10' : ''
              }`}>
                {editorMode === 'edit' ? (
                  <>
                    <input
                      type="text"
                      value={localTitle}
                      onChange={handleTitleChange}
                      placeholder="DOCUMENT TITLE..."
                      className="w-full bg-transparent border-none outline-none text-sm font-black text-slate-100 placeholder:text-slate-650 tracking-wider mb-4 pb-2 border-b border-white/[0.04] focus:border-blue-500/30 transition-colors focus:ring-0 focus:outline-none uppercase"
                    />
                    <textarea
                      ref={editorRef}
                      value={localContent}
                      onChange={handleContentChange}
                      placeholder="Start typing your document..."
                      className="w-full flex-1 bg-transparent border-none outline-none resize-none text-[12.5px] font-mono text-slate-200 placeholder:text-slate-650 leading-relaxed focus:ring-0 focus:outline-none"
                    />
                  </>
                ) : (
                  <div className="flex-1 overflow-y-auto no-scrollbar">
                    <h1 className="text-base font-black text-slate-100 uppercase tracking-wider mb-4 pb-2 border-b border-white/[0.06] select-text">
                      {localTitle || 'Untitled Note'}
                    </h1>
                    {renderMarkdown(localContent)}
                  </div>
                )}
              </div>

              {/* Status footer with statistics and indicators */}
              <div className={`px-5 py-2.5 border-t border-white/[0.03] bg-black/15 flex items-center justify-between text-[8px] font-mono text-slate-600 shrink-0 select-none transition-all duration-700 ${
                isTyping ? 'opacity-20 pointer-events-none' : 'opacity-100'
              }`}>
                <div className="flex items-center gap-4">
                  <span>WORDS: <strong className="text-slate-400">{wordStats.words}</strong></span>
                  <span>CHARACTERS: <strong className="text-slate-400">{wordStats.chars}</strong></span>
                  {activeNote && (
                    <span className="border-l border-white/5 pl-4">
                      CREATED: <strong className="text-slate-400">{new Date(activeNote.created).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-1.5">
                  {isSaving ? (
                    <div className="flex items-center gap-1 text-blue-400 font-black uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                      <span>Saving Changes...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-slate-555 font-bold uppercase">
                      <Check size={10} className="text-emerald-500" />
                      <span>Auto-Saved</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Undo Notification Toast ─── */}
      {createPortal(
        <AnimatePresence>
          {showUndoToast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="fixed bottom-6 right-6 z-[90] flex items-center gap-4 bg-slate-950/90 border border-white/[0.08] backdrop-blur-md rounded-2xl px-4 py-3 shadow-2xl select-none"
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">{toastMessage}</span>
              </div>
              <button
                onClick={handleUndo}
                className="text-[9.5px] font-black text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest cursor-pointer focus:outline-none flex items-center gap-1.5"
              >
                Undo <span className="text-white/20 font-normal">|</span> <kbd className="px-1.5 py-0.5 rounded border border-blue-500/30 bg-blue-500/10 text-blue-400 font-extrabold uppercase font-mono tracking-normal text-[8px] select-none">Ctrl+Z</kbd>
              </button>
              <button
                onClick={() => setShowUndoToast(false)}
                className="p-1 hover:bg-white/5 rounded transition-all cursor-pointer focus:outline-none"
              >
                <X size={12} className="text-slate-500 hover:text-white" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── Confirmation Modal Portal ─── */}
      {createPortal(
        <AnimatePresence>
          {confirmModal.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-950/95 backdrop-blur-xl p-6 shadow-2xl shadow-black/80 space-y-6 z-10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                      {confirmModal.title}
                    </h3>
                    <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mt-0.5">Critical Action</p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {confirmModal.message}
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] text-slate-400 hover:text-white border border-white/5 transition-all text-[10px] font-black uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (confirmModal.onConfirm) {
                        await confirmModal.onConfirm();
                      }
                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/10 transition-all text-[10px] font-black uppercase tracking-wider cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};

export default Notes;
