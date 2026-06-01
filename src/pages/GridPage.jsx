import React, { useEffect, useState, useRef } from 'react';
import { Search, Plus, LayoutGrid, List, Sparkles, Tag, X, Clock, Trash2, Edit3, FileText, Folder, FolderOpen } from 'lucide-react';
import NoteCard from '../components/Shared/NoteCard';
import { motion, AnimatePresence } from 'framer-motion';
import CategorySidebar from '../components/Shared/CategorySidebar';
import { evaluateSmartFilter } from '../utils/categoryHelpers';
import CategoryCombobox from '../components/Shared/CategoryCombobox';

const GridPage = ({ title, subtitle, fetchData, deleteItem, addItem, updateItem, categoryKey, accentColor = 'blue', label = 'Module' }) => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem(`grid-sidebar-collapsed-${categoryKey}`) === 'true';
  });
  const [showAddSuggestions, setShowAddSuggestions] = useState(false);
  const [showEditSuggestions, setShowEditSuggestions] = useState(false);

  // Inspector and edit states
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [lastSelectedItem, setLastSelectedItem] = useState(null);
  const [editingContent, setEditingContent] = useState(false);
  const [editContentText, setEditContentText] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState('');

  const [customCategories, setCustomCategories] = useState(() => {
    const saved = localStorage.getItem(`custom-categories-${categoryKey}`);
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  const [showLeftScrollMask, setShowLeftScrollMask] = useState(false);
  const [showRightScrollMask, setShowRightScrollMask] = useState(false);

  const categoriesRef = useRef(null);

  // Undo Stack & Floating Toast states
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

  useEffect(() => {
    loadData();
  }, [customCategories]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemRes, catRes] = await fetchData();
      setItems(itemRes.data);
      const backendCats = (catRes.data[categoryKey] || []).filter(Boolean);
      const combined = ['All', ...new Set([...customCategories, ...backendCats, ...itemRes.data.map(i => i.category || 'General')])];
      setCategories(combined);
    } catch (err) {
      console.error("Failed to load grid data", err);
    }
    setLoading(false);
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setShowUndoToast(false);
    try {
      await lastAction.restoreAction();
      loadData();
    } catch (err) {
      console.error("Failed to undo deletion", err);
    }
  };

  useEffect(() => {
    if (undoStack.length > 0) {
      const last = undoStack[undoStack.length - 1];
      if (last.type === 'category_delete') {
        setToastMessage(`Category "${last.categoryName}" deleted.`);
      } else {
        setToastMessage(`${label} deleted.`);
      }
      setShowUndoToast(true);
      const timer = setTimeout(() => {
        setShowUndoToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [undoStack]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (undoStack.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack]);

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

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    try {
      const res = await addItem({ 
        content: newContent, 
        category: newCategory || 'General',
        created: new Date().toISOString()
      });
      setItems([res.data, ...items]);
      setNewContent('');
      setNewCategory('');
      if (newCategory && !categories.includes(newCategory)) {
          setCategories([...categories, newCategory]);
      }
    } catch (err) {
      console.error("Failed to add item", err);
    }
  };

  const handleDelete = async (id) => {
    const itemToDelete = items.find(i => i.id === id);
    if (!itemToDelete) return;
    try {
      await deleteItem(id);
      setItems(items.filter(i => i.id !== id));
      if (selectedItemId === id) setSelectedItemId(null);

      // Add to undo stack
      setUndoStack(prev => [
        ...prev,
        {
          type: 'item_delete',
          item: itemToDelete,
          restoreAction: async () => {
            const res = await addItem({
              content: itemToDelete.content,
              category: itemToDelete.category || 'General',
              created: itemToDelete.created || new Date().toISOString()
            });
            setItems(prevItems => [res.data, ...prevItems]);
          }
        }
      ]);
    } catch (err) {
      console.error("Failed to delete item", err);
    }
  };

  const handleUpdateField = async (id, field, value) => {
    try {
      if (updateItem) {
        const res = await updateItem(id, { [field]: value });
        setItems(items.map(i => i.id === id ? { ...i, ...res.data } : i));
      }
    } catch (err) {
      console.error(`Failed to update field ${field}`, err);
    }
  };

  const selectedItem = items.find(i => i.id === selectedItemId);

  useEffect(() => {
    if (selectedItem) {
      setLastSelectedItem(selectedItem);
      setEditContentText(selectedItem.content || '');
      setEditCategoryName(selectedItem.category || 'General');
    }
  }, [selectedItemId, items]);

  const displayItem = selectedItem || lastSelectedItem;

  const handleCreateCategory = (catName) => {
    if (catName && !customCategories.includes(catName)) {
      const updated = [...customCategories, catName];
      setCustomCategories(updated);
      localStorage.setItem(`custom-categories-${categoryKey}`, JSON.stringify(updated));
      setActiveCategory(catName);
      setCategories(['All', ...new Set([...updated, ...items.map(i => i.category || 'General')])]);
    }
  };

  const handleDeleteCategory = async (cat) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Category',
      message: `Are you sure you want to delete the category "${cat}"? Associated ${label.toLowerCase()} units will be safely reassigned to "General".`,
      onConfirm: async () => {
        // 1. Remove from customCategories state
        const updatedCustom = customCategories.filter(c => c !== cat);
        setCustomCategories(updatedCustom);
        localStorage.setItem(`custom-categories-${categoryKey}`, JSON.stringify(updatedCustom));
        
        // 2. Reassign items belonging to this category to 'General' and store for undo
        const itemsToUpdate = items.filter(i => i.category === cat);
        const itemsReassigned = itemsToUpdate.map(i => ({ id: i.id, prevCat: cat }));

        for (const item of itemsToUpdate) {
          if (updateItem) {
            await updateItem(item.id, { category: 'General' }).catch(() => {});
          }
        }

        // Cache in undo stack
        setUndoStack(prev => [
          ...prev,
          {
            type: 'category_delete',
            categoryName: cat,
            itemsToRestore: itemsReassigned,
            restoreAction: async () => {
              const saved = localStorage.getItem(`custom-categories-${categoryKey}`);
              let currentCustom = [];
              try {
                const parsed = saved ? JSON.parse(saved) : [];
                currentCustom = Array.isArray(parsed) ? parsed : [];
              } catch (e) {
                currentCustom = [];
              }
              if (!currentCustom.includes(cat)) {
                const updated = [...currentCustom, cat];
                localStorage.setItem(`custom-categories-${categoryKey}`, JSON.stringify(updated));
                setCustomCategories(updated);
              }
              for (const refItem of itemsReassigned) {
                if (updateItem) {
                  await updateItem(refItem.id, { category: cat }).catch(() => {});
                }
              }
            }
          }
        ]);
        
        // 3. Reset active category if it was the deleted one
        if (activeCategory === cat) {
          setActiveCategory('All');
        }
        
        // 4. Reload data
        loadData();
      }
    });
  };

  const filteredItems = (Array.isArray(items) ? items.filter(Boolean) : []).filter(i => {
    const matchesSearch = String(i.content || '').toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    // Evaluate smart filters vs custom categories
    if (['All', 'Today', 'Priority', 'Stale'].includes(activeCategory)) {
      return evaluateSmartFilter(activeCategory, i, categoryKey);
    }

    const itemCat = String(i.category || 'General');
    return itemCat.toLowerCase() === activeCategory.toLowerCase();
  });

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
                items={items}
                categoryKey={categoryKey}
                accentColor={accentColor}
                onDeleteCategory={handleDeleteCategory}
                onAddCategory={handleCreateCategory}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center Column: Main Grid Content Area */}
        <div className="flex-1 min-w-0 max-w-[1300px] mx-auto w-full space-y-6 transition-all duration-300 pr-4">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
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
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)] animate-pulse' 
                      : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.08] hover:border-white/20 hover:text-white'
                  }`}
                  title={isSidebarCollapsed ? "Expand Categories" : "Collapse Categories"}
                >
                  {isSidebarCollapsed ? (
                    <>
                      <Folder className="w-3.5 h-3.5 text-blue-400" />
                      <span>Categories</span>
                    </>
                  ) : (
                    <>
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Hide Sidebar</span>
                    </>
                  )}
                </button>
                {title}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                  {filteredItems.length} units
                </span>
              </h2>
            </div>
            
            <div className="flex gap-2">
                <div className="flex gap-1 p-1 bg-white/[0.02] border border-border rounded-lg h-fit">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-accent-deep text-accent-blue' : 'text-slate-600 hover:text-slate-300'}`}
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-accent-deep text-accent-blue' : 'text-slate-600 hover:text-slate-300'}`}
                  >
                    <List size={15} />
                  </button>
                </div>
            </div>
          </header>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input 
                type="text" 
                placeholder={categoryKey === 'notes' ? `Search across ${filteredItems.length} Notes...` : `Search across ${filteredItems.length} ideas...`} 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-minimal pl-10 text-xs py-2 h-10"
              />
            </div>
          </div>

          <form onSubmit={handleAddItem} className="flex items-center gap-3 pl-4 pr-2 py-1.5 bg-white/[0.02] hover:bg-white/[0.03] border border-white/10 rounded-xl shadow-2xl transition-all w-full h-12">
            <Plus size={16} className="text-blue-500 shrink-0" />
            <input
              type="text"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={`Add new ${title.slice(0, -1).toLowerCase()}...`}
              className="flex-1 bg-transparent border-none outline-none text-xs text-slate-100 placeholder:text-slate-500 h-full font-medium"
            />
            
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 w-36 shrink-0">
                <CategoryCombobox
                  value={newCategory}
                  onChange={(val) => setNewCategory(val)}
                  suggestions={categories.filter(c => !['All', 'Today', 'Priority', 'Stale', 'General', 'Main'].includes(c))}
                  placeholder="Category..."
                  accentColor={accentColor}
                  variant="minimal"
                />
              </div>
              <button type="submit" className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/10">Add</button>
            </div>
          </form>

          <div 
            key={activeCategory}
            className={`grid gap-4 fade-in ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}
          >
            {filteredItems.map((item) => (
              <NoteCard 
                key={item.id}
                note={item} 
                onDelete={handleDelete}
                onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}
                isSelected={selectedItemId === item.id}
              />
            ))}
          </div>
          
          {filteredItems.length === 0 && !loading && (
            <div className="text-center py-20 minimal-card border-dashed fade-in">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.01] flex items-center justify-center text-slate-700 mx-auto mb-4">
                 <Sparkles size={24} />
              </div>
              <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">No nodes found in this sector.</p>
            </div>
          )}
        </div>

        {/* ─── Note/Idea Details Inspector Panel ─── */}
        <AnimatePresence>
          {selectedItemId !== null && displayItem && (
            <motion.div
              key="item-inspector"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="sticky top-6 shrink-0 w-[420px]"
              style={{ height: 'calc(100vh - 48px)' }}
            >
              <div className="h-full w-[420px] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
                
                {/* Header bar */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_currentColor]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label} Inspector</span>
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
                  
                  {/* Note/Idea Content Section */}
                  <div className="px-5 pt-5 pb-4">
                    {editingContent ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContentText}
                          onChange={(e) => setEditContentText(e.target.value)}
                          rows={12}
                          className="w-full bg-white/[0.04] border border-blue-500/30 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none resize-none focus:border-blue-500/60 transition-colors leading-relaxed"
                        />
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => { setEditingContent(false); setEditContentText(displayItem.content || ''); }} 
                            className="px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={async () => {
                              await handleUpdateField(displayItem.id, 'content', editContentText);
                              setEditingContent(false);
                            }} 
                            className="px-3 py-1.5 text-[10px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-all"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => { setEditContentText(displayItem.content || ''); setEditingContent(true); }}
                        className="group cursor-pointer p-4 rounded-xl bg-white/[0.01] border border-white/[0.05] hover:border-white/[0.1] transition-all"
                      >
                        <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                          {displayItem.content}
                        </p>
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1 transition-all duration-200 ease-out max-h-0 opacity-0 overflow-hidden mt-0 group-hover:max-h-5 group-hover:opacity-100 group-hover:mt-2">
                          <Edit3 size={9} /> Click to edit content
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Properties grid */}
                  <div className="px-5 space-y-1">
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] mb-3 px-1">Properties</div>

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
                            await handleUpdateField(displayItem.id, 'category', trimmed);
                          }}
                          suggestions={categories.filter(c => !['All', 'Today', 'Priority', 'Stale', 'General', 'Main'].includes(c))}
                          placeholder="Select category..."
                          accentColor={accentColor}
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
                          if (!displayItem.created) return 'Unknown';
                          try {
                            const d = new Date(displayItem.created);
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
                <div className="border-t border-white/[0.06] bg-white/[0.015] px-5 py-3.5 flex items-center justify-end">
                  <button
                    onClick={async () => {
                      await handleDelete(displayItem.id);
                      setSelectedItemId(null);
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/[0.08] border border-rose-500/15 text-rose-400 hover:bg-rose-500/[0.15] hover:border-rose-500/30 text-[10px] font-bold uppercase tracking-wider transition-all"
                  >
                    <Trash2 size={12} />
                    Delete {label}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Premium Undo Toast Banner ─── */}
      <AnimatePresence>
        {showUndoToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-y-1/2 z-50 flex items-center gap-3.5 px-4.5 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-xl shadow-2xl shadow-black/80"
          >
            <span className="text-xs font-semibold text-slate-300">{toastMessage}</span>
            <div className="w-px h-3.5 bg-white/10" />
            <button
              onClick={handleUndo}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              Undo <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-black text-slate-300 border border-white/5 uppercase">Ctrl+Z</kbd>
            </button>
            <button
              onClick={() => setShowUndoToast(false)}
              className="p-1 hover:bg-white/5 rounded transition-all"
            >
              <X size={12} className="text-slate-500 hover:text-slate-300" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal */}
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
      </AnimatePresence>
    </div>
  );
};

export default GridPage;
