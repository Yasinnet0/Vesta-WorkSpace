import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getBookmarks, addBookmark, updateBookmark, deleteBookmark, getCategories } from '../api';
import BookmarkCard from '../components/Bookmarks/BookmarkCard';
import CategoryCombobox from '../components/Shared/CategoryCombobox';
import ClearableSearchInput from '../components/Shared/ClearableSearchInput';
import { 
  Plus, 
  Filter, 
  Globe, 
  Sparkles, 
  SlidersHorizontal,
  X,
  Edit3,
  Trash2,
  ExternalLink,
  Clock,
  Tag,
  Pin,
  Folder,
  FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CategorySidebar from '../components/Shared/CategorySidebar';
import { evaluateSmartFilter } from '../utils/categoryHelpers';

const Bookmarks = () => {
  const [bookmarks, setBookmarks] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('grid-sidebar-collapsed-bookmarks') === 'true';
  });

  // Search state
  const [search, setSearch] = useState('');

  // Add bookmark form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategoryVal, setNewCategoryVal] = useState('');

  // Custom categories list
  const [customCategories, setCustomCategories] = useState(() => {
    const saved = localStorage.getItem('custom-categories-bookmarks');
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  // Inspector and caching states
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [lastSelectedBookmark, setLastSelectedBookmark] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitleText, setEditTitleText] = useState('');
  const [editingUrl, setEditingUrl] = useState(false);
  const [editUrlText, setEditUrlText] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [editDescriptionText, setEditDescriptionText] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState('');

  const [showLeftScrollMask, setShowLeftScrollMask] = useState(false);
  const [showRightScrollMask, setShowRightScrollMask] = useState(false);

  // Global Undo System & Toast notification states
  const [undoStack, setUndoStack] = useState([]);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Custom Category Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const categoriesRef = useRef(null);

  const checkScrollLimits = () => {
    const el = categoriesRef.current;
    if (!el) return;
    setShowLeftScrollMask(el.scrollLeft > 2);
    setShowRightScrollMask(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  };

  useEffect(() => {
    const el = categoriesRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [categories]);

  useEffect(() => {
    const el = categoriesRef.current;
    if (!el) return;

    checkScrollLimits();
    el.addEventListener('scroll', checkScrollLimits);
    window.addEventListener('resize', checkScrollLimits);

    return () => {
      el.removeEventListener('scroll', checkScrollLimits);
      window.removeEventListener('resize', checkScrollLimits);
    };
  }, [categories]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bmRes, catRes] = await Promise.all([getBookmarks(), getCategories()]);
      setBookmarks(bmRes.data);
      const backendCats = catRes.data.bookmarks || [];
      const combined = ['All', ...new Set([...customCategories, ...backendCats, ...bmRes.data.map(i => i.category || 'General')])];
      setCategories(combined);
    } catch (err) {
      console.error("Failed to fetch bookmarks", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [customCategories]);

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return;
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setShowUndoToast(false);
    try {
      await lastAction.restoreAction();
      fetchData();
    } catch (err) {
      console.error("Failed to undo deletion", err);
    }
  }, [undoStack]);

  useEffect(() => {
    if (undoStack.length > 0) {
      const last = undoStack[undoStack.length - 1];
      if (last.type === 'category_delete') {
        setToastMessage(`Category "${last.categoryName}" deleted.`);
      } else {
        setToastMessage(`Bookmark deleted.`);
      }
      setShowUndoToast(true);
      const timer = setTimeout(() => {
        setShowUndoToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [undoStack]);

  const undoStackRef = useRef(undoStack);
  const handleUndoRef = useRef(handleUndo);

  useEffect(() => {
    undoStackRef.current = undoStack;
  }, [undoStack]);

  useEffect(() => {
    handleUndoRef.current = handleUndo;
  }, [handleUndo]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isEditingInput = activeEl && (
        (activeEl.tagName === 'INPUT' && activeEl.value !== '') || 
        (activeEl.tagName === 'TEXTAREA' && activeEl.value !== '') || 
        activeEl.isContentEditable
      );

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (!isEditingInput && undoStackRef.current.length > 0) {
          e.preventDefault();
          handleUndoRef.current();
        }
      } else if (e.key === 'Escape') {
        setSelectedItemId(null);
        if (document.activeElement) {
          document.activeElement.blur();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keyboard handling for custom category confirmation modal
  useEffect(() => {
    if (!confirmModal.isOpen) return;

    const handleConfirmKeyDown = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (confirmModal.onConfirm) {
          confirmModal.onConfirm();
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    };

    window.addEventListener('keydown', handleConfirmKeyDown);
    return () => window.removeEventListener('keydown', handleConfirmKeyDown);
  }, [confirmModal]);

  // Keyboard handling for side drawer/add bookmark form
  useEffect(() => {
    if (!showAddForm) return;

    const handleFormKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowAddForm(false);
      }
    };

    window.addEventListener('keydown', handleFormKeyDown);
    return () => window.removeEventListener('keydown', handleFormKeyDown);
  }, [showAddForm]);

  const handleIndexBookmark = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;
    try {
      const fallbackCat = (activeCategory === 'All' || ['Today', 'Priority', 'Stale'].includes(activeCategory)) ? 'General' : activeCategory;
      const finalCategory = newCategoryVal || fallbackCat;
      const res = await addBookmark({
        title: newTitle,
        url: newUrl,
        description: newDescription,
        category: finalCategory,
        created: new Date().toISOString()
      });
      setBookmarks([res.data, ...bookmarks]);
      setNewTitle('');
      setNewUrl('');
      setNewDescription('');
      setNewCategoryVal('');
      setShowAddForm(false);
      
      // Auto update categories
      if (finalCategory && !categories.includes(finalCategory)) {
        setCategories([...categories, finalCategory]);
      }
    } catch (err) {
      console.error("Failed to add bookmark", err);
    }
  };

  const handleDelete = async (id) => {
    const bmToDelete = bookmarks.find(b => b.id === id);
    if (!bmToDelete) return;
    try {
      await deleteBookmark(id);
      setBookmarks(bookmarks.filter(b => b.id !== id));
      if (selectedItemId === id) setSelectedItemId(null);

      // Add to undo stack
      setUndoStack(prev => [
        ...prev,
        {
          type: 'bookmark_delete',
          bookmark: bmToDelete,
          restoreAction: async () => {
            const res = await addBookmark({
              title: bmToDelete.title,
              url: bmToDelete.url,
              description: bmToDelete.description,
              category: bmToDelete.category || 'General',
              created: bmToDelete.created || new Date().toISOString()
            });
            setBookmarks(prevBms => [res.data, ...prevBms]);
          }
        }
      ]);
    } catch (err) {
      console.error("Failed to delete bookmark", err);
    }
  };

  const handleUpdateField = async (id, field, value) => {
    try {
      const res = await updateBookmark(id, { [field]: value });
      setBookmarks(bookmarks.map(b => b.id === id ? { ...b, ...res.data } : b));
    } catch (err) {
      console.error(`Failed to update bookmark ${field}`, err);
    }
  };

  const handleTogglePin = async (id) => {
    const bm = bookmarks.find(b => b.id === id);
    if (!bm) return;
    try {
      const res = await updateBookmark(id, { pinned: !bm.pinned });
      setBookmarks(bookmarks.map(b => b.id === id ? { ...b, ...res.data } : b));
    } catch (err) {
      console.error("Failed to toggle pin state", err);
    }
  };

  const selectedBookmark = bookmarks.find(b => b.id === selectedItemId);

  const prevSelectedItemIdRef = useRef(selectedItemId);

  useEffect(() => {
    if (prevSelectedItemIdRef.current !== selectedItemId) {
      setEditingTitle(false);
      setEditingUrl(false);
      setEditingDescription(false);
      setEditingCategoryName(false);
      prevSelectedItemIdRef.current = selectedItemId;
    }

    if (selectedBookmark) {
      setLastSelectedBookmark(selectedBookmark);
      setEditTitleText(selectedBookmark.title || '');
      setEditUrlText(selectedBookmark.url || '');
      setEditDescriptionText(selectedBookmark.description || '');
      setEditCategoryName(selectedBookmark.category || 'General');
    }
  }, [selectedItemId, bookmarks]);

  const displayBookmark = selectedBookmark || lastSelectedBookmark;

  const handleCreateCategory = (catName) => {
    if (catName && !customCategories.includes(catName)) {
      const updated = [...customCategories, catName];
      setCustomCategories(updated);
      localStorage.setItem('custom-categories-bookmarks', JSON.stringify(updated));
      setActiveCategory(catName);
      setCategories(['All', ...new Set([...updated, ...bookmarks.map(b => b.category || 'General')])]);
    }
  };

  const handleDeleteCategory = async (cat) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Category',
      message: `Are you sure you want to delete the category "${cat}"? Associated bookmarks will be safely reassigned to "General".`,
      onConfirm: async () => {
        // 1. Remove from customCategories state
        const updatedCustom = customCategories.filter(c => c !== cat);
        setCustomCategories(updatedCustom);
        localStorage.setItem('custom-categories-bookmarks', JSON.stringify(updatedCustom));
        
        // 2. Reassign bookmarks belonging to this category to 'General' and cache for undo
        const itemsToUpdate = bookmarks.filter(b => b.category === cat);
        const itemsReassigned = itemsToUpdate.map(b => ({ id: b.id, prevCat: cat }));

        for (const b of itemsToUpdate) {
          await updateBookmark(b.id, { category: 'General' }).catch(() => {});
        }

        // Cache in undo stack
        setUndoStack(prev => [
          ...prev,
          {
            type: 'category_delete',
            categoryName: cat,
            itemsToRestore: itemsReassigned,
            restoreAction: async () => {
              const saved = localStorage.getItem('custom-categories-bookmarks');
              let currentCustom = [];
              try {
                const parsed = saved ? JSON.parse(saved) : [];
                currentCustom = Array.isArray(parsed) ? parsed : [];
              } catch (e) {
                currentCustom = [];
              }
              if (!currentCustom.includes(cat)) {
                const updated = [...currentCustom, cat];
                localStorage.setItem('custom-categories-bookmarks', JSON.stringify(updated));
                setCustomCategories(updated);
              }
              for (const refItem of itemsReassigned) {
                await updateBookmark(refItem.id, { category: cat }).catch(() => {});
              }
            }
          }
        ]);
        
        if (activeCategory === cat) {
          setActiveCategory('All');
        }
        
        fetchData();
      }
    });
  };

  const filteredBookmarks = (Array.isArray(bookmarks) ? bookmarks.filter(Boolean) : []).filter(b => {
    const matchesSearch = 
      String(b.title || '').toLowerCase().includes(search.toLowerCase()) ||
      String(b.url || '').toLowerCase().includes(search.toLowerCase()) ||
      String(b.description || '').toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    // Evaluate smart filters vs custom categories
    if (['All', 'Today', 'Priority', 'Stale'].includes(activeCategory)) {
      return evaluateSmartFilter(activeCategory, b, 'bookmarks');
    }

    const itemCat = String(b.category || 'General');
    return itemCat.toLowerCase() === activeCategory.toLowerCase();
  }).sort((a, b) => {
    const aPinned = a.pinned ? 1 : 0;
    const bPinned = b.pinned ? 1 : 0;
    return bPinned - aPinned;
  });

  const renderToastMessage = (message) => {
    if (!message) return null;
    const parts = message.split('Ctrl+Z');
    if (parts.length === 2) {
      return (
        <>
          {parts[0]}
          <kbd className="px-1.5 py-0.5 mx-1 rounded border border-[var(--color-accent-blue)]/30 bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue-bright)] font-extrabold uppercase font-mono tracking-normal text-[9px] select-none">Ctrl+Z</kbd>
          {parts[1]}
        </>
      );
    }
    return message;
  };

  return (
    <div className="w-full pb-20 premium-page-entrance">
      <div className="flex items-start w-full gap-0">

        {/* Left Column: Category Sidebar */}
        <AnimatePresence initial={false}>
          {!isSidebarCollapsed && (
            <motion.div
              initial={{ width: 0, opacity: 0, marginRight: 0 }}
              animate={{ width: 224, opacity: 1, marginRight: 24 }}
              exit={{ width: 0, opacity: 0, marginRight: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="overflow-hidden shrink-0"
            >
              <CategorySidebar 
                categories={categories}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                items={bookmarks}
                categoryKey="bookmarks"
                accentColor="blue"
                onDeleteCategory={handleDeleteCategory}
                onAddCategory={handleCreateCategory}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center Column: Main Content Area */}
        <div className="flex-1 min-w-0 max-w-full mx-auto w-full px-6 space-y-6 transition-all duration-300">
          <header className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-white/[0.02] gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  const next = !isSidebarCollapsed;
                  setIsSidebarCollapsed(next);
                  localStorage.setItem('grid-sidebar-collapsed-bookmarks', String(next));
                }}
                className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-300 active:scale-95 cursor-pointer ${
                  !isSidebarCollapsed 
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                    : 'bg-white/[0.01] border-white/5 text-slate-400 hover:text-white'
                }`}
                title={isSidebarCollapsed ? "Expand Folders" : "Collapse Folders"}
              >
                {isSidebarCollapsed ? <Folder className="w-4 h-4 text-blue-400" /> : <FolderOpen className="w-4 h-4 text-slate-400" />}
              </button>
              
              <div>
                <span className="text-[10px] font-mono tracking-widest text-slate-555 uppercase block">Bookmarks Registry</span>
                <h2 className="text-base font-extrabold text-white tracking-tight mt-0.5 uppercase flex items-center gap-2">
                  {activeCategory === 'All' ? 'All Bookmarks' : `${activeCategory} Folder`}
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                    {filteredBookmarks.length} nodes
                  </span>
                </h2>
              </div>
            </div>
          </header>

          {/* Dedicated Filter/Search Input */}
          <div className="flex items-center gap-3">
            <ClearableSearchInput
              value={search}
              onChange={setSearch}
              placeholder="SEARCH BOOKMARKS DECK..."
              wrapperClassName="flex-1"
              iconClassName="text-slate-550"
              inputClassName="search-input-premium w-full pl-10 h-10"
            />
            <button 
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="premium-btn flex items-center justify-center gap-2 h-10 text-[9.5px] px-5 font-black uppercase tracking-widest cursor-pointer active:scale-95 shrink-0"
            >
              <Plus size={12} className={`transition-transform duration-300 ${showAddForm ? 'rotate-45' : ''}`} />
              <span>{showAddForm ? 'Close' : 'Add Bookmark'}</span>
            </button>
          </div>

          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                className="overflow-hidden"
              >
                <form 
                  onSubmit={handleIndexBookmark}
                  className="bg-slate-900/30 border border-white/10 hover:border-white/20 focus-within:border-blue-500/40 rounded-xl p-4 space-y-3 transition-all mb-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Resource Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Google DeepMind"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="bg-white/[0.02] border border-white/10 focus:border-blue-500/40 rounded-lg px-3 py-2 outline-none text-xs text-slate-200 placeholder:text-slate-500 focus:ring-0 w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Resource URL</label>
                      <input
                        type="url"
                        required
                        placeholder="https://deepmind.google"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        className="bg-white/[0.02] border border-white/10 focus:border-blue-500/40 rounded-lg px-3 py-2 outline-none text-xs text-slate-200 placeholder:text-slate-500 focus:ring-0 w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Folder / Tag</label>
                      <div className="text-slate-200">
                        <CategoryCombobox
                          value={newCategoryVal || (activeCategory === 'All' || ['Today', 'Priority', 'Stale'].includes(activeCategory) ? '' : activeCategory)}
                          onChange={(val) => setNewCategoryVal(val)}
                          suggestions={categories.filter(c => !['All', 'Today', 'Priority', 'Stale', 'General', 'Main'].includes(c))}
                          placeholder="Select or type folder..."
                          accentColor="blue"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Resource Description (Optional)</label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="e.g. Leading AI research group working on advanced models and solutions."
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        className="flex-1 bg-white/[0.02] border border-white/10 focus:border-blue-500/40 rounded-xl py-2.5 px-4 outline-none placeholder:text-slate-500 text-xs text-slate-200 resize-none leading-relaxed focus:ring-0"
                      />
                      <button 
                        type="submit" 
                        className="premium-btn h-9 px-4 text-[10px] font-black uppercase tracking-wider shrink-0 self-end cursor-pointer"
                      >
                        Index
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div 
            key={activeCategory}
            className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 fade-in"
          >
            {filteredBookmarks.map((bm) => (
              <div key={bm.id}>
                <BookmarkCard 
                  bookmark={bm} 
                  onDelete={handleDelete}
                  onPin={handleTogglePin}
                  onClick={() => setSelectedItemId(selectedItemId === bm.id ? null : bm.id)}
                  isSelected={selectedItemId === bm.id}
                />
              </div>
            ))}
            
            {filteredBookmarks.length === 0 && !loading && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center minimal-card border-dashed fade-in">
                 <div className="w-12 h-12 rounded-2xl bg-white/[0.01] flex items-center justify-center text-slate-700 mb-4">
                   <Sparkles size={24} />
                 </div>
                 <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">No bookmarks found in this folder.</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Bookmark Details Inspector Panel ─── */}
        <AnimatePresence>
          {selectedItemId !== null && displayBookmark && (
            <motion.div
              key="bookmark-inspector"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="sticky top-6 shrink-0 w-[420px] ml-6"
              style={{ height: 'calc(100vh - 130px)' }}
            >
              <div className="h-full w-[420px] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
                
                {/* Header bar */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_currentColor]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Bookmark Inspector</span>
                  </div>
                  <button 
                    onClick={() => setSelectedItemId(null)} 
                    className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-all group"
                  >
                    <X size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
                  </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  
                  {/* Title Editing Section */}
                  <div className="px-5 pt-5 pb-3">
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] mb-2 px-1">Title</div>
                    {editingTitle ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editTitleText}
                          onChange={(e) => setEditTitleText(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              await handleUpdateField(displayBookmark.id, 'title', editTitleText);
                              setEditingTitle(false);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditingTitle(false);
                              setEditTitleText(displayBookmark.title || '');
                            }
                          }}
                          className="w-full bg-white/[0.04] border border-blue-500/30 rounded-xl px-4 py-2 text-xs font-semibold text-white outline-none focus:border-blue-500/60 transition-colors"
                        />
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => { setEditingTitle(false); setEditTitleText(displayBookmark.title || ''); }} 
                            className="px-2.5 py-1 text-[9px] font-bold text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={async () => {
                              await handleUpdateField(displayBookmark.id, 'title', editTitleText);
                              setEditingTitle(false);
                            }} 
                            className="px-2.5 py-1 text-[9px] font-bold text-[var(--color-accent-blue-bright)] bg-[var(--color-accent-blue)]/10 hover:bg-[var(--color-accent-blue)]/20 rounded-lg border border-[var(--color-accent-blue)]/20 transition-all cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => { setEditTitleText(displayBookmark.title || ''); setEditingTitle(true); }}
                        className="group cursor-pointer p-3 rounded-xl bg-white/[0.01] border border-white/[0.05] hover:border-white/[0.1] transition-all"
                      >
                        <h3 className="text-white text-xs font-semibold leading-relaxed">
                          {displayBookmark.title}
                        </h3>
                        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1 transition-all duration-200 ease-out max-h-0 opacity-0 overflow-hidden mt-0 group-hover:max-h-5 group-hover:opacity-100 group-hover:mt-1.5">
                          <Edit3 size={8} /> Click to edit title
                        </span>
                      </div>
                    )}
                  </div>

                  {/* URL Editing Section */}
                  <div className="px-5 py-3">
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] mb-2 px-1">Resource Link</div>
                    {editingUrl ? (
                      <div className="space-y-2">
                        <input
                          type="url"
                          value={editUrlText}
                          onChange={(e) => setEditUrlText(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              await handleUpdateField(displayBookmark.id, 'url', editUrlText);
                              setEditingUrl(false);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditingUrl(false);
                              setEditUrlText(displayBookmark.url || '');
                            }
                          }}
                          className="w-full bg-white/[0.04] border border-blue-500/30 rounded-xl px-4 py-2 text-xs font-medium text-white outline-none focus:border-blue-500/60 transition-colors"
                        />
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => { setEditingUrl(false); setEditUrlText(displayBookmark.url || ''); }} 
                            className="px-2.5 py-1 text-[9px] font-bold text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={async () => {
                              await handleUpdateField(displayBookmark.id, 'url', editUrlText);
                              setEditingUrl(false);
                            }} 
                            className="px-2.5 py-1 text-[9px] font-bold text-[var(--color-accent-blue-bright)] bg-[var(--color-accent-blue)]/10 hover:bg-[var(--color-accent-blue)]/20 rounded-lg border border-[var(--color-accent-blue)]/20 transition-all cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => { setEditUrlText(displayBookmark.url || ''); setEditingUrl(true); }}
                        className="group cursor-pointer p-3 rounded-xl bg-white/[0.01] border border-white/[0.05] hover:border-white/[0.1] transition-all"
                      >
                        <p className="text-slate-400 text-xs truncate leading-relaxed">
                          {displayBookmark.url}
                        </p>
                        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1 transition-all duration-200 ease-out max-h-0 opacity-0 overflow-hidden mt-0 group-hover:max-h-5 group-hover:opacity-100 group-hover:mt-1.5">
                          <Edit3 size={8} /> Click to edit URL
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Description Editing Section */}
                  <div className="px-5 py-3">
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] mb-2 px-1">Description</div>
                    {editingDescription ? (
                      <div className="space-y-2">
                        <textarea
                          value={editDescriptionText}
                          onChange={(e) => setEditDescriptionText(e.target.value)}
                          onKeyDown={async (e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                              e.preventDefault();
                              await handleUpdateField(displayBookmark.id, 'description', editDescriptionText);
                              setEditingDescription(false);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditingDescription(false);
                              setEditDescriptionText(displayBookmark.description || '');
                            }
                          }}
                          rows={4}
                          className="w-full bg-[var(--color-background)]/85 border border-[var(--color-border)] hover:border-[var(--color-accent-blue)]/40 focus:border-[var(--color-accent-blue)]/60 rounded-xl px-4 py-2.5 text-xs font-medium text-white outline-none resize-none transition-colors leading-relaxed"
                        />
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => { setEditingDescription(false); setEditDescriptionText(displayBookmark.description || ''); }} 
                            className="px-2.5 py-1 text-[9px] font-bold text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={async () => {
                              await handleUpdateField(displayBookmark.id, 'description', editDescriptionText);
                              setEditingDescription(false);
                            }} 
                            className="px-2.5 py-1 text-[9px] font-bold text-[var(--color-accent-blue-bright)] bg-[var(--color-accent-blue)]/10 hover:bg-[var(--color-accent-blue)]/20 rounded-lg border border-[var(--color-accent-blue)]/20 transition-all cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => { setEditDescriptionText(displayBookmark.description || ''); setEditingDescription(true); }}
                        className="group cursor-pointer p-3 rounded-xl bg-white/[0.01] border border-white/[0.05] hover:border-white/[0.1] transition-all"
                      >
                        <p className="text-slate-400 text-xs leading-relaxed">
                          {displayBookmark.description || "Synthesizing resource intelligence for later retrieval."}
                        </p>
                        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1 transition-all duration-200 ease-out max-h-0 opacity-0 overflow-hidden mt-0 group-hover:max-h-5 group-hover:opacity-100 group-hover:mt-1.5">
                          <Edit3 size={8} /> Click to edit description
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Properties Grid */}
                  <div className="px-5 py-3 space-y-1">
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] mb-3 px-1">Properties</div>

                    {/* Pin State */}
                    <div className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <Pin size={13} className="text-slate-500" />
                        <span className="text-[11px] font-semibold text-slate-400">Pin State</span>
                      </div>
                      <button
                        onClick={() => handleTogglePin(displayBookmark.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all border cursor-pointer ${
                          displayBookmark.pinned
                            ? 'bg-blue-500/[0.08] border-blue-500/15 text-blue-400 hover:border-blue-500/30'
                            : 'bg-white/[0.02] border-white/5 text-slate-400 hover:border-white/15'
                        }`}
                      >
                        {displayBookmark.pinned ? 'Pinned' : 'Unpinned'}
                      </button>
                    </div>

                    {/* Category */}
                    <div className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/[0.02] transition-colors gap-4">
                      <div className="flex items-center gap-2.5 shrink-0">
                        <Tag size={13} className="text-slate-500" />
                        <span className="text-[11px] font-semibold text-slate-400">Category</span>
                      </div>
                      <div className="w-48 shrink-0">
                        <CategoryCombobox
                          value={editCategoryName}
                          onChange={async (val) => {
                            const trimmed = val.trim() || 'General';
                            setEditCategoryName(trimmed);
                            await handleUpdateField(displayBookmark.id, 'category', trimmed);
                          }}
                          suggestions={categories.filter(c => !['All', 'Today', 'Priority', 'Stale', 'General', 'Main'].includes(c))}
                          placeholder="Select category..."
                          accentColor="blue"
                        />
                      </div>
                    </div>

                    {/* Created */}
                    <div className="flex items-center justify-between py-2.5 px-3 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <Clock size={13} className="text-slate-500" />
                        <span className="text-[11px] font-semibold text-slate-400">Created</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-600">
                        {(() => {
                          if (!displayBookmark.created) return 'Unknown';
                          try {
                            const d = new Date(displayBookmark.created);
                            return isNaN(d.getTime()) 
                              ? 'Unknown' 
                              : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                          } catch {
                            return 'Unknown';
                          }
                        })()}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Bottom action bar */}
                <div className="border-t border-white/[0.06] bg-white/[0.015] px-5 py-3.5 flex items-center justify-between gap-3">
                  <a
                    href={displayBookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/[0.08] border border-blue-500/15 text-blue-400 hover:bg-blue-500/[0.15] hover:border-blue-500/30 text-[10px] font-bold uppercase tracking-wider transition-all"
                  >
                    <ExternalLink size={12} />
                    Open Link
                  </a>

                  <button
                    onClick={async () => {
                      await handleDelete(displayBookmark.id);
                      setSelectedItemId(null);
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/[0.08] border border-rose-500/15 text-rose-400 hover:bg-rose-500/[0.15] hover:border-rose-500/30 text-[10px] font-bold uppercase tracking-wider transition-all"
                  >
                    <Trash2 size={12} />
                    Delete Bookmark
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Premium Undo Toast Banner ─── */}
      {createPortal(
        <AnimatePresence>
          {showUndoToast && (
            <motion.div
              key="bookmarks-undo-toast"
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3.5 px-4.5 py-3 rounded-xl border border-white/10 bg-[#121420]/95 backdrop-blur-xl shadow-2xl shadow-black/80"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-350">{renderToastMessage(toastMessage)}</span>
              <div className="w-px h-3.5 bg-white/10" />
              <button
                onClick={handleUndo}
                className="text-[9.5px] font-black text-[var(--color-accent-blue-bright)] hover:text-white transition-colors uppercase tracking-widest cursor-pointer focus:outline-none flex items-center gap-1.5"
              >
                Undo <span className="text-white/20 font-normal">|</span> <kbd className="px-1.5 py-0.5 rounded border border-[var(--color-accent-blue)]/30 bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue-bright)] font-extrabold uppercase font-mono tracking-normal text-[8px] select-none">Ctrl+Z</kbd>
              </button>
              <button
                onClick={() => setShowUndoToast(false)}
                className="p-1 hover:bg-white/5 rounded transition-all cursor-pointer focus:outline-none"
              >
                <X size={12} className="text-slate-550 hover:text-white" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Custom Confirmation Modal */}
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
                className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-xl p-6 shadow-2xl shadow-black/80 space-y-6 z-10"
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

export default Bookmarks;
