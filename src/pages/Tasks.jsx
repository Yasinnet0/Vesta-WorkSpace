import React, { useState, useEffect, useRef } from 'react';
import { getTasks, addTask, updateTask, deleteTask } from '../api';
import TaskItem from '../components/Tasks/TaskItem';
import CategoryCombobox from '../components/Shared/CategoryCombobox';
import { 
  Plus, 
  Search, 
  CheckCircle2, 
  ListFilter, 
  Tag,
  Calendar,
  Trash2,
  X,
  Clock,
  Flag,
  Edit3,
  RotateCcw,
  ArrowRight,
  FileText,
  Zap,
  Folder,
  FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CategorySidebar from '../components/Shared/CategorySidebar';
import { evaluateSmartFilter } from '../utils/categoryHelpers';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [newTask, setNewTask] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('grid-sidebar-collapsed-tasks') === 'true';
  });

  // Custom category management
  const [customCategories, setCustomCategories] = useState(() => {
    const saved = localStorage.getItem('custom-categories-tasks');
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  // Keep track of the last selected task for smooth exit animation
  const [lastSelectedTask, setLastSelectedTask] = useState(null);

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

  const allCategories = ['All', ...new Set([...customCategories, ...tasks.map(t => t.list || 'Main')])];

  const [showLeftScrollMask, setShowLeftScrollMask] = useState(false);
  const [showRightScrollMask, setShowRightScrollMask] = useState(false);

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
  }, [allCategories]);

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
  }, [allCategories]);

  // Inspector editing state
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editingCategory, setEditingCategory] = useState(false);
  const [editCategory, setEditCategory] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const nameInputRef = useRef(null);
  const notesRef = useRef(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await getTasks();
      setTasks(res.data);
    } catch (err) {
      console.error("Failed to load tasks", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setShowUndoToast(false);
    try {
      await lastAction.restoreAction();
      loadTasks();
    } catch (err) {
      console.error("Failed to undo task deletion", err);
    }
  };

  useEffect(() => {
    if (undoStack.length > 0) {
      const last = undoStack[undoStack.length - 1];
      if (last.type === 'category_delete') {
        setToastMessage(`Category "${last.categoryName}" deleted.`);
      } else {
        setToastMessage(`Task deleted.`);
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

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    try {
      const res = await addTask({ 
        text: newTask, 
        completed: false, 
        priority: newPriority,
        list: newCategory || ''
      });
      setTasks([res.data, ...tasks]);
      setNewTask('');
      setNewPriority('medium');
    } catch (err) {
      console.error("Failed to add task", err);
    }
  };

  const handleToggle = async (id) => {
    const task = tasks.find(t => t.id === id);
    try {
      const res = await updateTask(id, { completed: !task.completed });
      setTasks(tasks.map(t => t.id === id ? res.data : t));
    } catch (err) {
      console.error("Failed to update task", err);
    }
  };

  const handleUpdatePriority = async (id, priority) => {
    try {
      const res = await updateTask(id, { priority });
      setTasks(tasks.map(t => t.id === id ? res.data : t));
    } catch (err) {
      console.error("Failed to update priority", err);
    }
  };

  const handleDelete = async (id) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;
    try {
      await deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
      if (selectedTaskId === id) setSelectedTaskId(null);

      // Add to undo stack
      setUndoStack(prev => [
        ...prev,
        {
          type: 'task_delete',
          task: taskToDelete,
          restoreAction: async () => {
            const res = await addTask({
              text: taskToDelete.text,
              completed: taskToDelete.completed,
              priority: taskToDelete.priority,
              list: taskToDelete.list || 'Main',
              notes: taskToDelete.notes || '',
              due: taskToDelete.due || null
            });
            setTasks(prevTasks => [res.data, ...prevTasks]);
          }
        }
      ]);
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  // Inspector update helpers
  const handleUpdateField = async (id, field, value) => {
    try {
      const res = await updateTask(id, { [field]: value });
      setTasks(tasks.map(t => t.id === id ? res.data : t));
    } catch (err) {
      console.error(`Failed to update ${field}`, err);
    }
  };

  const handleSaveName = async () => {
    if (editName.trim() && editName !== selectedTask?.text) {
      await handleUpdateField(selectedTaskId, 'text', editName.trim());
    }
    setEditingName(false);
  };

  const handleSaveNotes = async () => {
    if (editNotes !== (selectedTask?.notes || '')) {
      await handleUpdateField(selectedTaskId, 'notes', editNotes);
    }
    setEditingNotes(false);
  };

  const handleSaveCategory = async () => {
    const val = editCategory.trim() || '';
    if (val !== (selectedTask?.list || '')) {
      await handleUpdateField(selectedTaskId, 'list', val);
    }
    setEditingCategory(false);
  };

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  useEffect(() => {
    if (selectedTask) {
      setLastSelectedTask(selectedTask);
    }
  }, [selectedTask]);

  const displayTask = selectedTask || lastSelectedTask;

  const handleCreateCategory = (catName) => {
    if (catName && !customCategories.includes(catName)) {
      const updated = [...customCategories, catName];
      setCustomCategories(updated);
      localStorage.setItem('custom-categories-tasks', JSON.stringify(updated));
      setActiveCategory(catName);
    }
  };

  const handleDeleteCategory = async (cat) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Category',
      message: `Are you sure you want to delete the category "${cat}"? Associated tasks will be safely reassigned to "Main".`,
      onConfirm: async () => {
        // 1. Remove from customCategories state
        const updatedCustom = customCategories.filter(c => c !== cat);
        setCustomCategories(updatedCustom);
        localStorage.setItem('custom-categories-tasks', JSON.stringify(updatedCustom));
        
        // 2. Reassign tasks belonging to this category to 'Main' and cache for undo
        const itemsToUpdate = tasks.filter(t => (t.list || 'Main') === cat);
        const itemsReassigned = itemsToUpdate.map(t => ({ id: t.id, prevCat: cat }));

        for (const t of itemsToUpdate) {
          await updateTask(t.id, { list: 'Main' }).catch(() => {});
        }

        // Cache in undo stack
        setUndoStack(prev => [
          ...prev,
          {
            type: 'category_delete',
            categoryName: cat,
            itemsToRestore: itemsReassigned,
            restoreAction: async () => {
              const saved = localStorage.getItem('custom-categories-tasks');
              let currentCustom = [];
              try {
                const parsed = saved ? JSON.parse(saved) : [];
                currentCustom = Array.isArray(parsed) ? parsed : [];
              } catch (e) {
                currentCustom = [];
              }
              if (!currentCustom.includes(cat)) {
                const updated = [...currentCustom, cat];
                localStorage.setItem('custom-categories-tasks', JSON.stringify(updated));
                setCustomCategories(updated);
              }
              for (const refItem of itemsReassigned) {
                await updateTask(refItem.id, { list: cat }).catch(() => {});
              }
            }
          }
        ]);
        
        if (activeCategory === cat) {
          setActiveCategory('All');
        }
        
        loadTasks();
      }
    });
  };
  
  const filteredTasks = (Array.isArray(tasks) ? tasks.filter(Boolean) : []).filter(t => {
    const matchesSearch = String(t.text || '').toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    // Evaluate smart filters vs custom categories
    if (['All', 'Today', 'Priority', 'Stale'].includes(activeCategory)) {
      const mappedItem = {
        ...t,
        category: t.list || 'Main'
      };
      return evaluateSmartFilter(activeCategory, mappedItem, 'tasks');
    }

    const itemCat = String(t.list || 'Main');
    return itemCat.toLowerCase() === activeCategory.toLowerCase();
  });

  const activeTasks = filteredTasks.filter(t => !t.completed).sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 };
    return p[a.priority] - p[b.priority];
  });
  const completedTasks = filteredTasks.filter(t => t.completed);

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearCompleted = async () => {
    setShowClearConfirm(false);
    try {
      for (const task of completedTasks) {
        await deleteTask(task.id).catch(() => {});
      }
      await loadTasks();
    } catch (err) {
      console.error('Failed to clear completed tasks:', err);
    }
  };

  // Reset inspector edit states when switching tasks
  useEffect(() => {
    setEditingName(false);
    setEditingNotes(false);
    setEditingCategory(false);
    setShowDeleteConfirm(false);
    if (selectedTask) {
      setEditName(selectedTask.text);
      setEditNotes(selectedTask.notes || '');
      setEditCategory(selectedTask.list || '');
    }
  }, [selectedTaskId]);

  // Handle Enter to confirm, Escape to cancel when clear confirmation modal is open
  useEffect(() => {
    if (!showClearConfirm) return;

    const handleConfirmKeyDown = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleClearCompleted();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setShowClearConfirm(false);
      }
    };

    window.addEventListener('keydown', handleConfirmKeyDown);
    return () => window.removeEventListener('keydown', handleConfirmKeyDown);
  }, [showClearConfirm, completedTasks]);

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

  // Keyboard handling for inline delete confirmation
  useEffect(() => {
    if (!showDeleteConfirm || !selectedTaskId) return;

    const handleConfirmKeyDown = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        setShowDeleteConfirm(false);
        handleDelete(selectedTaskId);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setShowDeleteConfirm(false);
      }
    };

    window.addEventListener('keydown', handleConfirmKeyDown);
    return () => window.removeEventListener('keydown', handleConfirmKeyDown);
  }, [showDeleteConfirm, selectedTaskId]);

  // Close inspector on Escape
  useEffect(() => {
    if (!selectedTask || showClearConfirm || showDeleteConfirm) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !editingName && !editingNotes && !editingCategory) {
        setSelectedTaskId(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedTask, showClearConfirm, showDeleteConfirm, editingName, editingNotes, editingCategory]);

  // Focus name input when editing
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  // Focus notes textarea when editing
  useEffect(() => {
    if (editingNotes && notesRef.current) {
      notesRef.current.focus();
    }
  }, [editingNotes]);

  const priorityConfig = {
    high: { label: 'High', color: 'rose', icon: '🔴' },
    medium: { label: 'Medium', color: 'blue', icon: '🟡' },
    low: { label: 'Low', color: 'slate', icon: '🟢' },
  };

  const getDueDateLabel = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      const now = new Date();
      const diff = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
      if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, className: 'text-rose-400' };
      if (diff === 0) return { text: 'Due today', className: 'text-amber-400' };
      if (diff === 1) return { text: 'Due tomorrow', className: 'text-amber-400' };
      if (diff <= 7) return { text: `${diff} days left`, className: 'text-blue-400' };
      return { text: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), className: 'text-slate-400' };
    } catch {
      return null;
    }
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
                categories={allCategories}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                items={tasks}
                categoryKey="tasks"
                accentColor="blue"
                onDeleteCategory={handleDeleteCategory}
                onAddCategory={handleCreateCategory}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center Column: Main task list area */}
        <div className="flex-1 min-w-0 max-w-[1300px] mx-auto w-full space-y-6 transition-all duration-300 pr-4">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !isSidebarCollapsed;
                    setIsSidebarCollapsed(next);
                    localStorage.setItem('grid-sidebar-collapsed-tasks', String(next));
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
                Tasks
                <div className="flex items-center gap-2 px-3 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest">
                    {filteredTasks.filter(t => !t.completed).length} focus points
                  </span>
                </div>
              </h2>
            </div>

            <div className="flex">
              <div className="flex items-center px-3 py-1.5 gap-2 bg-[var(--color-background)] border border-[var(--color-border)] focus-within:border-[var(--color-accent-blue-bright)]/50 focus-within:ring-1 focus-within:ring-[var(--color-accent-blue)]/20 rounded-xl transition-all shadow-inner h-9">
                <Search size={14} className="text-slate-500" />
                <input 
                    type="text" 
                    placeholder="Search Tasks..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder:text-slate-600 w-36 font-medium"
                />
              </div>
            </div>
          </header>

          <form onSubmit={handleAddTask} className="flex items-center gap-3 pl-4 pr-2 py-1.5 bg-[var(--color-background)] hover:bg-white/[0.03] border border-[var(--color-border)] rounded-xl shadow-2xl transition-all w-full h-12">
            <Plus size={16} className="text-blue-500 shrink-0" />
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Create a new task..."
              className="flex-1 bg-transparent border-none outline-none text-xs text-slate-100 placeholder:text-slate-500 h-full font-medium"
            />
            
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 w-36 shrink-0">
                <CategoryCombobox
                  value={newCategory}
                  onChange={(val) => setNewCategory(val)}
                  suggestions={allCategories.filter(c => !['All', 'Today', 'Priority', 'Stale', 'General', 'Main'].includes(c))}
                  placeholder="List..."
                  accentColor="rose"
                  variant="minimal"
                />
              </div>

              <div className="flex items-center p-0.5 bg-white/[0.02] border border-white/5 rounded-lg">
                {['low', 'medium', 'high'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewPriority(p)}
                    className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all ${
                      newPriority === p
                        ? p === 'high' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/10' :
                          p === 'medium' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/10' :
                          'bg-slate-600 text-white shadow-md shadow-slate-500/10'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              
              <button 
                type="submit" 
                className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center active:scale-[0.96]"
              >
                Commit
              </button>
            </div>
          </form>

          <div className="grid gap-10">
            <section className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                  <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Active Pipeline</h3>
              </div>
              
              <div key={activeCategory} className="grid gap-3 fade-in">
                {activeTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="minimal-card shadow-lg overflow-hidden border-white/10"
                  >
                    <TaskItem 
                        task={task} 
                        onToggle={handleToggle} 
                        onDelete={handleDelete}
                        onUpdatePriority={handleUpdatePriority}
                        isSelected={selectedTaskId === task.id}
                        onClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                    />
                  </div>
                ))}
                
                {activeTasks.length === 0 && !loading && (
                  <div className="py-20 flex flex-col items-center justify-center text-center bg-white/[0.01] border-2 border-dashed border-border rounded-3xl">
                      <div className="w-16 h-16 rounded-full bg-blue-500/5 flex items-center justify-center mb-6">
                        <CheckCircle2 size={32} className="text-blue-500/40" />
                      </div>
                      <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Neural clear. No active tasks.</p>
                  </div>
                )}
              </div>
            </section>

            {completedTasks.length > 0 && (
              <section className="space-y-6 opacity-40 hover:opacity-100 transition-all duration-500">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-slate-700 rounded-full" />
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Completed Hub</h3>
                  </div>
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="px-3 py-1.5 rounded-lg border border-rose-500/20 hover:border-rose-500 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white text-[9px] font-black uppercase tracking-wider transition-all"
                  >
                    Clear Completed
                  </button>
                </div>
                <div key={activeCategory} className="grid gap-2 fade-in">
                  {completedTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="minimal-card bg-transparent border-dashed overflow-hidden"
                    >
                        <TaskItem 
                            task={task} 
                            onToggle={handleToggle} 
                            onDelete={handleDelete}
                            onUpdatePriority={handleUpdatePriority}
                            isSelected={selectedTaskId === task.id}
                            onClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                        />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* ─── Advanced Task Inspector Panel ─── */}
        <AnimatePresence>
          {selectedTaskId !== null && displayTask && (
            <motion.div
              key="task-inspector"
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
                    <div className={`w-2 h-2 rounded-full ${displayTask.completed ? 'bg-emerald-500' : 'bg-blue-500'} shadow-[0_0_8px_currentColor]`} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Task Inspector</span>
                  </div>
                  <button 
                    onClick={() => setSelectedTaskId(null)} 
                    className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-all group"
                  >
                    <X size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
                  </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  
                  {/* Task Name Section */}
                  <div className="px-5 pt-5 pb-4">
                    {editingName ? (
                      <div className="space-y-2">
                        <textarea
                          ref={nameInputRef}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveName(); }
                            if (e.key === 'Escape') { setEditingName(false); setEditName(displayTask.text); }
                          }}
                          rows={2}
                          className="w-full bg-white/[0.04] border border-blue-500/30 rounded-xl px-4 py-3 text-lg font-bold text-white outline-none resize-none focus:border-blue-500/60 transition-colors"
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => { setEditingName(false); setEditName(displayTask.text); }} className="px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all">Cancel</button>
                          <button onClick={handleSaveName} className="px-3 py-1.5 text-[10px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-all">Save</button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => { setEditName(displayTask.text); setEditingName(true); }}
                        className="group cursor-pointer"
                      >
                        <h3 className={`text-xl font-bold leading-snug tracking-tight transition-colors ${displayTask.completed ? 'text-slate-500 line-through' : 'text-white group-hover:text-blue-300'}`}>
                          {displayTask.text}
                        </h3>
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1.5 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit3 size={9} /> Click to edit
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status banner */}
                  <div className="mx-5 mb-4">
                    <button
                      onClick={() => handleToggle(displayTask.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all group ${
                        displayTask.completed 
                          ? 'bg-emerald-500/[0.08] border-emerald-500/20 hover:border-emerald-500/40' 
                          : 'bg-blue-500/[0.08] border-blue-500/20 hover:border-blue-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${displayTask.completed ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}>
                          {displayTask.completed ? <CheckCircle2 size={15} className="text-emerald-400" /> : <Zap size={15} className="text-blue-400" />}
                        </div>
                        <div className="text-left">
                          <div className={`text-xs font-bold ${displayTask.completed ? 'text-emerald-400' : 'text-blue-400'}`}>
                            {displayTask.completed ? 'Completed' : 'Active'}
                          </div>
                          <div className="text-[9px] text-slate-500 font-medium">
                            {displayTask.completed ? 'Click to reactivate' : 'Click to mark done'}
                          </div>
                        </div>
                      </div>
                      <ArrowRight size={14} className={`${displayTask.completed ? 'text-emerald-500/40' : 'text-blue-500/40'} group-hover:translate-x-0.5 transition-transform`} />
                    </button>
                  </div>

                  {/* Properties grid */}
                  <div className="px-5 space-y-1">
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] mb-3 px-1">Properties</div>
                    
                    {/* Priority */}
                    <div className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <Flag size={13} className="text-slate-500" />
                        <span className="text-[11px] font-semibold text-slate-400">Priority</span>
                      </div>
                      <div className="flex items-center gap-1 p-0.5 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                        {['low', 'medium', 'high'].map((p) => (
                          <button
                            key={p}
                            onClick={() => handleUpdatePriority(displayTask.id, p)}
                            className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${
                              displayTask.priority === p
                                ? p === 'high' ? 'bg-rose-500/90 text-white shadow-sm' :
                                  p === 'medium' ? 'bg-blue-500/90 text-white shadow-sm' :
                                  'bg-slate-500/90 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Category */}
                    <div className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/[0.02] transition-colors gap-4">
                      <div className="flex items-center gap-2.5 shrink-0">
                        <Tag size={13} className="text-slate-500" />
                        <span className="text-[11px] font-semibold text-slate-400">Category</span>
                      </div>
                      <div className="w-48 shrink-0">
                        <CategoryCombobox
                          value={editCategory}
                          onChange={async (val) => {
                            const trimmed = val.trim() || '';
                            setEditCategory(trimmed);
                            await handleUpdateField(displayTask.id, 'list', trimmed);
                          }}
                          suggestions={allCategories.filter(c => !['All', 'Today', 'Priority', 'Stale', 'General', 'Main'].includes(c))}
                          placeholder="Select category..."
                          accentColor="rose"
                        />
                      </div>
                    </div>

                    {/* Due Date */}
                    <div className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <Calendar size={13} className="text-slate-500" />
                        <span className="text-[11px] font-semibold text-slate-400">Due Date</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {displayTask.dueDate && (() => {
                          const info = getDueDateLabel(displayTask.dueDate);
                          return info ? <span className={`text-[9px] font-bold ${info.className}`}>{info.text}</span> : null;
                        })()}
                        <div className="relative">
                          <input
                            type="date"
                            value={displayTask.dueDate ? new Date(displayTask.dueDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => handleUpdateField(displayTask.id, 'dueDate', e.target.value || null)}
                            className="bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] rounded-lg px-2.5 py-1 text-[10px] text-slate-300 font-semibold outline-none cursor-pointer focus:border-blue-500/40 transition-colors w-[120px]"
                            style={{ colorScheme: 'dark' }}
                          />
                        </div>
                        {displayTask.dueDate && (
                          <button
                            onClick={() => handleUpdateField(displayTask.id, 'dueDate', null)}
                            className="p-1 hover:bg-white/[0.05] rounded-md transition-all"
                            title="Clear date"
                          >
                            <X size={10} className="text-slate-600 hover:text-slate-400" />
                          </button>
                        )}
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
                          if (!displayTask.createdAt) return 'Unknown';
                          try {
                            const d = new Date(displayTask.createdAt);
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

                  {/* Divider */}
                  <div className="mx-5 my-4 border-t border-white/[0.04]" />

                  {/* Notes Section */}
                  <div className="px-5 pb-5">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <FileText size={12} className="text-slate-500" />
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.25em]">Notes</span>
                      </div>
                      {!editingNotes && (displayTask.notes || '').length > 0 && (
                        <button
                          onClick={() => { setEditNotes(displayTask.notes || ''); setEditingNotes(true); }}
                          className="text-[9px] font-bold text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1"
                        >
                          <Edit3 size={9} /> Edit
                        </button>
                      )}
                    </div>
                    
                    {editingNotes ? (
                      <div className="space-y-2">
                        <textarea
                          ref={notesRef}
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') { setEditingNotes(false); setEditNotes(displayTask.notes || ''); }
                          }}
                          rows={5}
                          placeholder="Add notes, details, or context..."
                          className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-blue-500/30 rounded-xl px-4 py-3 text-[12px] text-slate-300 placeholder:text-slate-600 outline-none resize-none font-medium leading-relaxed transition-colors"
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => { setEditingNotes(false); setEditNotes(displayTask.notes || ''); }} className="px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all">Cancel</button>
                          <button onClick={handleSaveNotes} className="px-3 py-1.5 text-[10px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-all">Save</button>
                        </div>
                      </div>
                    ) : (displayTask.notes || '').length > 0 ? (
                      <div 
                        onClick={() => { setEditNotes(displayTask.notes || ''); setEditingNotes(true); }}
                        className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] cursor-pointer hover:border-white/[0.1] transition-colors group"
                      >
                        <p className="text-[12px] text-slate-400 leading-relaxed whitespace-pre-wrap">{displayTask.notes}</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditNotes(''); setEditingNotes(true); }}
                        className="w-full p-4 rounded-xl border-2 border-dashed border-white/[0.05] hover:border-blue-500/20 hover:bg-blue-500/[0.02] flex flex-col items-center justify-center gap-2 group transition-all cursor-pointer"
                      >
                        <FileText size={18} className="text-slate-700 group-hover:text-blue-500/50 transition-colors" />
                        <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-400 uppercase tracking-widest transition-colors">Add notes</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom action bar */}
                <div className="border-t border-white/[0.06] bg-white/[0.015] px-5 py-3.5 flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(displayTask.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                      displayTask.completed
                        ? 'bg-amber-500/[0.08] border border-amber-500/20 text-amber-400 hover:bg-amber-500/[0.15] hover:border-amber-500/30'
                        : 'bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/[0.15] hover:border-emerald-500/30'
                    }`}
                  >
                    {displayTask.completed ? <RotateCcw size={12} /> : <CheckCircle2 size={12} />}
                    {displayTask.completed ? 'Reactivate' : 'Complete'}
                  </button>

                  {showDeleteConfirm ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-2.5 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all"
                      >
                        No
                      </button>
                      <button
                        onClick={() => { setShowDeleteConfirm(false); handleDelete(displayTask.id); }}
                        className="px-3 py-2.5 rounded-xl text-[10px] font-bold text-white bg-rose-500 hover:bg-rose-600 border border-rose-400/20 shadow-lg shadow-rose-500/10 transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-2.5 rounded-xl bg-rose-500/[0.06] border border-rose-500/15 text-rose-400 hover:bg-rose-500/[0.15] hover:border-rose-500/30 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom Clear Completed Tasks Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-[#0a0a0d]/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-6 relative text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-rose-400 animate-pulse" />
              </div>
              
              <h3 className="text-md font-bold text-white tracking-tight mb-2">
                Clear Completed Tasks?
              </h3>
              
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Are you sure you want to permanently clear all completed tasks? This action cannot be undone.
              </p>
              
              <div className="flex items-center gap-3 justify-center">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-slate-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.04] text-xxs font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearCompleted}
                  className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-xl hover:shadow-rose-500/10 border border-rose-400/20 text-xxs font-bold uppercase tracking-wider transition-all"
                >
                  Clear Tasks
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

export default Tasks;
