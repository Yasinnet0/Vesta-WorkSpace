import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getTasks, addTask, updateTask, deleteTask } from '../api';
import TaskItem from '../components/Tasks/TaskItem';
import CategoryCombobox from '../components/Shared/CategoryCombobox';
import ClearableSearchInput from '../components/Shared/ClearableSearchInput';
import { 
  Plus, 
  CheckCircle2, 
  Tag,
  Calendar,
  Trash2,
  X,
  Clock,
  Flag,
  Edit3,
  RotateCcw,
  FileText,
  Folder,
  FolderOpen,
  LayoutGrid,
  List
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
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('grid-tasks-viewmode') || 'grid';
  });
  const [newDueDate, setNewDueDate] = useState('');
  const [draggedOverColumn, setDraggedOverColumn] = useState(null);
  const [isDraggingTask, setIsDraggingTask] = useState(false);
  const [laneInputs, setLaneInputs] = useState({ high: '', medium: '', low: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  // Custom categories list
  const [customCategories, setCustomCategories] = useState(() => {
    const saved = localStorage.getItem('custom-categories-tasks');
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Global Undo System & Toast state
  const [undoStack, setUndoStack] = useState([]);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Confirmation Modal overlays
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Inspector edits
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const nameInputRef = useRef(null);
  const notesRef = useRef(null);

  // Fetch tasks
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

  useEffect(() => {
    setNewCategory(activeCategory === 'All' || ['Today', 'Priority', 'Stale'].includes(activeCategory) ? '' : activeCategory);
  }, [activeCategory]);

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
      setToastMessage(last.type === 'category_delete' ? `Category "${last.categoryName}" deleted.` : `Task deleted.`);
      setShowUndoToast(true);
      const timer = setTimeout(() => setShowUndoToast(false), 5000);
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
      } else if (e.key === 'Escape') {
        setSelectedTaskId(null);
        if (document.activeElement) {
          document.activeElement.blur();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack]);

  const handleAddTask = async (e) => {
    if (e) e.preventDefault();
    if (!newTask.trim()) return;
    try {
      const fallbackList = (activeCategory === 'All' || ['Today', 'Priority', 'Stale'].includes(activeCategory)) ? '' : activeCategory;
      const res = await addTask({ 
        text: newTask, 
        completed: false, 
        priority: newPriority,
        list: newCategory || fallbackList,
        dueDate: newDueDate || null
      });
      setTasks([res.data, ...tasks]);
      setNewTask('');
      setNewPriority('medium');
      setNewDueDate('');
      setSelectedTaskId(res.data.id);
    } catch (err) {
      console.error("Failed to add task", err);
    }
  };

  const handleAddLaneTask = async (priority) => {
    const text = laneInputs[priority]?.trim();
    if (!text) return;
    try {
      const fallbackList = (activeCategory === 'All' || ['Today', 'Priority', 'Stale'].includes(activeCategory)) ? '' : activeCategory;
      const res = await addTask({ 
        text, 
        completed: false, 
        priority,
        list: fallbackList,
        dueDate: null
      });
      setTasks([res.data, ...tasks]);
      setLaneInputs(prev => ({ ...prev, [priority]: '' }));
      setSelectedTaskId(res.data.id);
    } catch (err) {
      console.error("Failed to add lane task", err);
    }
  };



  const handleCardDrop = async (taskId, targetColumn) => {
    const id = parseInt(taskId) || taskId;
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    try {
      let updates = {};
      if (targetColumn === 'completed') {
        if (!task.completed) {
          updates.completed = true;
        }
      } else {
        updates.priority = targetColumn;
        if (task.completed) {
          updates.completed = false;
        }
      }

      if (Object.keys(updates).length > 0) {
        const res = await updateTask(id, updates);
        setTasks(prev => prev.map(t => t.id === id ? res.data : t));
        
        if (selectedTaskId === id) {
          setSelectedTaskId(null);
          setTimeout(() => setSelectedTaskId(id), 50);
        }
      }
    } catch (err) {
      console.error("Failed to update task priority via drop", err);
    }
  };

  const handleClearCompleted = useCallback(async () => {
    const completedList = tasks.filter(t => t.completed);
    try {
      for (const t of completedList) {
        await deleteTask(t.id).catch(() => {});
      }
      setTasks(tasks.filter(t => !t.completed));
      setShowClearConfirm(false);
    } catch (err) {
      console.error("Failed to clear completed tasks", err);
    }
  }, [tasks]);

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
              dueDate: taskToDelete.dueDate || null
            });
            setTasks(prevTasks => [res.data, ...prevTasks]);
          }
        }
      ]);
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  const handleUpdateField = async (id, field, value) => {
    try {
      const res = await updateTask(id, { [field]: value });
      setTasks(tasks.map(t => t.id === id ? res.data : t));
    } catch (err) {
      console.error(`Failed to update ${field}`, err);
    }
  };

  const handleSaveName = async () => {
    if (editName.trim() && editName !== focusedTask?.text) {
      await handleUpdateField(focusedTask.id, 'text', editName.trim());
    }
    setEditingName(false);
  };

  const handleSaveNotes = async () => {
    if (editNotes !== (focusedTask?.notes || '')) {
      await handleUpdateField(focusedTask.id, 'notes', editNotes);
    }
    setEditingNotes(false);
  };

  const allCategories = ['All', ...new Set([...customCategories, ...tasks.map(t => t.list || 'Main')])];

  const getColumnClassName = (columnKey, accentColor) => {
    const isOver = draggedOverColumn === columnKey;
    const isAnyOver = draggedOverColumn !== null;
    
    let baseClass = "border backdrop-blur-md rounded-2xl p-5 h-[calc(100vh-230px)] min-h-[500px] flex flex-col relative shadow-2xl overflow-hidden transition-all duration-300";
    
    let colorStyles = "";
    if (accentColor === 'rose') {
      colorStyles = isOver 
        ? 'border-rose-500/40 bg-gradient-to-b from-[#1b1420]/75 to-[#0e0a13]/90 shadow-[0_0_25px_rgba(244,63,94,0.08),inset_0_0_15px_rgba(244,63,94,0.02)] scale-[1.01]'
        : 'bg-white/[0.035] border-white/[0.05] shadow-[inset_0_0_20px_rgba(244,63,94,0.025)]';
    } else if (accentColor === 'blue') {
      colorStyles = isOver
        ? 'border-accent-blue/40 bg-gradient-to-b from-[#101931]/75 to-[#080d1a]/90 shadow-[0_0_25px_rgba(96,165,250,0.08),inset_0_0_15px_rgba(96,165,250,0.02)] scale-[1.01]'
        : 'bg-white/[0.035] border-white/[0.05] shadow-[inset_0_0_20px_rgba(96,165,250,0.025)]';
    } else if (accentColor === 'slate') {
      colorStyles = isOver
        ? 'border-slate-500/40 bg-gradient-to-b from-[#171a25]/75 to-[#0b0d13]/90 shadow-[0_0_25px_rgba(255,255,255,0.03),inset_0_0_15px_rgba(255,255,255,0.01)] scale-[1.01]'
        : 'bg-white/[0.035] border-white/[0.05] shadow-[inset_0_0_25px_rgba(255,255,255,0.008)]';
    } else if (accentColor === 'emerald') {
      colorStyles = isOver
        ? 'border-emerald-500/40 bg-gradient-to-b from-[#0f1d17]/75 to-[#070e0b]/90 shadow-[0_0_25px_rgba(16,185,129,0.08),inset_0_0_15px_rgba(16,185,129,0.02)] scale-[1.01]'
        : 'bg-white/[0.035] border-white/[0.05] shadow-[inset_0_0_20px_rgba(16,185,129,0.025)]';
    }
    
    let stateStyle = "";
    if (isDraggingTask) {
      if (isOver) {
        stateStyle = "border-dashed border-opacity-70";
      } else if (isAnyOver) {
        stateStyle = "opacity-45 scale-[0.98] blur-[0.2px]";
      } else {
        stateStyle = "border-dashed border-white/10 hover:border-white/20";
      }
    }
    
    return `${baseClass} ${colorStyles} ${stateStyle}`;
  };

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
        const updatedCustom = customCategories.filter(c => c !== cat);
        setCustomCategories(updatedCustom);
        localStorage.setItem('custom-categories-tasks', JSON.stringify(updatedCustom));
        
        const itemsToUpdate = tasks.filter(t => (t.list || 'Main') === cat);
        const itemsReassigned = itemsToUpdate.map(t => ({ id: t.id, prevCat: cat }));

        for (const t of itemsToUpdate) {
          await updateTask(t.id, { list: 'Main' }).catch(() => {});
        }

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

  // Filter evaluation
  const filteredTasks = (Array.isArray(tasks) ? tasks.filter(Boolean) : []).filter(t => {
    const matchesSearch = String(t.text || '').toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

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

  // Focus targets
  const focusedTask = tasks.find(t => t.id === selectedTaskId) || activeTasks[0] || tasks[0] || null;

  const [prevFocusedTaskId, setPrevFocusedTaskId] = useState(focusedTask?.id);
  if (focusedTask?.id !== prevFocusedTaskId) {
    setPrevFocusedTaskId(focusedTask?.id);
    setEditingName(false);
    setEditingNotes(false);
    setShowDeleteConfirm(false);
    if (focusedTask) {
      setEditName(focusedTask.text);
      setEditNotes(focusedTask.notes || '');
      setEditCategory(focusedTask.list || '');
    }
  }

  const { isOpen, onConfirm } = confirmModal;
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = async (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) {
          await onConfirm();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm]);

  useEffect(() => {
    if (!showClearConfirm) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowClearConfirm(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        setShowClearConfirm(false);
        handleClearCompleted();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showClearConfirm, handleClearCompleted]);

  // Keyboard handling for add task form
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

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  useEffect(() => {
    if (editingNotes && notesRef.current) {
      notesRef.current.focus();
    }
  }, [editingNotes]);

  const getDueDateLabel = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      const now = new Date();
      now.setHours(0,0,0,0);
      const target = new Date(date);
      target.setHours(0,0,0,0);
      const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
      if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, className: 'text-rose-500/80 font-bold' };
      if (diff === 0) return { text: 'Today', className: 'text-amber-500/80 font-bold' };
      if (diff === 1) return { text: 'Tomorrow', className: 'text-slate-400' };
      return { text: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), className: 'text-slate-500' };
    } catch {
      return null;
    }
  };

  const renderToastMessage = (message) => {
    if (!message) return null;
    const parts = message.split('Ctrl+Z');
    if (parts.length === 2) {
      return (
        <>
          {parts[0]}
          <kbd className="px-1.5 py-0.5 mx-1 rounded border border-blue-500/30 bg-blue-500/10 text-blue-400 font-extrabold uppercase font-mono tracking-normal text-[9px] select-none">Ctrl+Z</kbd>
          {parts[1]}
        </>
      );
    }
    return message;
  };

  return (
    <div className="w-full pb-20 premium-page-entrance select-none text-slate-200">
      <div className="flex items-start w-full gap-0">

        {/* Column 1: Collapsible Category Sidebar */}
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

        {/* Column 2: Main Focal Grid (Cards Viewport) */}
        <div className="flex-1 min-w-0 max-w-full mx-auto w-full px-6 space-y-7 transition-all duration-300">
          
          {/* Main Header Row */}
          <header className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-white/[0.02] gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  const next = !isSidebarCollapsed;
                  setIsSidebarCollapsed(next);
                  localStorage.setItem('grid-sidebar-collapsed-tasks', String(next));
                }}
                className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-300 active:scale-95 cursor-pointer ${
                  !isSidebarCollapsed 
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                    : 'bg-white/[0.01] border-white/5 text-slate-400 hover:text-white'
                }`}
                title={isSidebarCollapsed ? "Collapse Folders" : "Expand Folders"}
              >
                {isSidebarCollapsed ? <Folder className="w-4 h-4 text-blue-400" /> : <FolderOpen className="w-4 h-4 text-slate-400" />}
              </button>
              
              <div>
                <span className="text-[10px] font-mono tracking-widest text-slate-555 uppercase block">Tasks Registry</span>
                <h2 className="text-base font-extrabold text-white tracking-tight mt-0.5 uppercase">
                  {activeCategory} Folder
                </h2>
              </div>
            </div>

            {/* Actions panel */}
            <div className="flex items-center gap-3">
              {/* Layout switch buttons */}
              <div className="flex items-center p-0.5 bg-slate-950/45 border border-white/[0.03] backdrop-blur-md rounded-xl select-none">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('grid');
                    localStorage.setItem('grid-tasks-viewmode', 'grid');
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[9.5px] font-black uppercase tracking-widest transition-all duration-200 cursor-pointer active:scale-95 ${
                    viewMode === 'grid'
                      ? 'bg-accent-blue text-white shadow-[0_4px_12px_rgba(59,130,246,0.25)]'
                      : 'text-slate-550 hover:text-slate-200 hover:bg-white/[0.02]'
                  }`}
                >
                  <LayoutGrid size={11} />
                  <span>Grid Deck</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('board');
                    localStorage.setItem('grid-tasks-viewmode', 'board');
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[9.5px] font-black uppercase tracking-widest transition-all duration-200 cursor-pointer active:scale-95 ${
                    viewMode === 'board'
                      ? 'bg-accent-blue text-white shadow-[0_4px_12px_rgba(59,130,246,0.25)]'
                      : 'text-slate-550 hover:text-slate-200 hover:bg-white/[0.02]'
                  }`}
                >
                  <List size={11} />
                  <span>Kanban Lanes</span>
                </button>
              </div>

            </div>
          </header>

          {/* Dedicated Filter/Search Input */}
          <div className="flex items-center gap-3">
            <ClearableSearchInput
              value={search}
              onChange={setSearch}
              placeholder="SEARCH OBJECTIVES DECK..."
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
              <span>{showAddForm ? 'Close' : 'Add Task'}</span>
            </button>
          </div>

          {/* Advanced Inline Task Creator */}
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
                  onSubmit={handleAddTask} 
                  className="bg-gradient-to-br from-[var(--color-card-from)] to-[var(--color-card-to)] border border-[var(--color-border)] rounded-2xl p-6 shadow-2xl space-y-4 relative backdrop-blur-lg group mb-6"
                >
                  {/* Cybersecurity style status label */}
                  <div className="flex items-center justify-between pb-1 text-[8.5px] font-mono tracking-widest text-slate-500 font-bold uppercase select-none">
                    <span>[DIRECTIVE ENTRY PANEL]</span>
                  </div>

                  <div className="flex items-center gap-3 bg-[var(--color-background)]/60 border border-[var(--color-border)] rounded-xl px-4 py-3 focus-within:border-accent-blue/30 focus-within:bg-[var(--color-background)]/85 focus-within:shadow-[0_0_15px_rgba(59,130,246,0.03)] transition-all">
                    <Plus size={16} className="text-accent-blue-bright shrink-0" />
                    <input
                      type="text"
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      placeholder="ADD NEW TASK TARGET (PRESS ENTER)..."
                      className="flex-1 bg-transparent border-none outline-none text-xs text-slate-100 placeholder:text-slate-600 font-bold uppercase tracking-wider focus:ring-0 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-1.5 text-[9px] font-mono tracking-widest uppercase text-slate-500">
                    {/* Priority Option Selector with Borders */}
                    <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[var(--color-background)]/60 border border-[var(--color-border)] rounded-xl">
                      <span className="text-slate-500 flex items-center gap-1.5 text-[8.5px] font-bold">
                        <Flag size={10} className="text-slate-500" /> PRIORITY:
                      </span>
                      <div className="flex items-center gap-1 font-bold">
                        {['low', 'medium', 'high'].map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setNewPriority(p)}
                            className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer focus:outline-none ${
                              newPriority === p 
                                ? p === 'high' 
                                  ? 'bg-rose-500/15 text-rose-450 border border-rose-500/30 shadow-sm' 
                                  : p === 'medium' 
                                    ? 'bg-blue-500/15 text-blue-455 border border-blue-500/30 shadow-sm' 
                                    : 'bg-white/10 text-white border border-white/20 shadow-sm'
                                : 'text-slate-600 border border-transparent hover:text-slate-400 hover:bg-white/[0.02]'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sector Option Selector with Borders */}
                    <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[var(--color-background)]/60 border border-[var(--color-border)] rounded-xl">
                      <span className="text-slate-555 flex items-center gap-1.5 text-[8.5px] font-bold">
                        <Tag size={10} className="text-slate-555" /> FOLDER:
                      </span>
                      <div className="w-32 text-slate-300">
                        <CategoryCombobox
                          value={newCategory}
                          onChange={(val) => setNewCategory(val)}
                          suggestions={allCategories.filter(c => !['All', 'Today', 'Priority', 'Stale', 'General', 'Main'].includes(c))}
                          placeholder="Assign folder..."
                          accentColor="blue"
                          variant="minimal"
                        />
                      </div>
                    </div>

                    {/* Deadline Option Selector with Borders */}
                    <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[var(--color-background)]/60 border border-[var(--color-border)] rounded-xl">
                      <span className="text-slate-500 flex items-center gap-1.5 text-[8.5px] font-bold">
                        <Calendar size={10} className="text-slate-555" /> DEADLINE:
                      </span>
                      <input
                        type="date"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className="bg-transparent border-none p-0 outline-none text-[9px] font-mono text-slate-355 tracking-wider cursor-pointer w-22 focus:ring-0 focus:outline-none"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>

                    {/* Add Trigger Button */}
                    <button
                      type="submit"
                      className="premium-btn ml-auto text-[9.5px] font-mono font-black uppercase tracking-widest px-4 py-2"
                    >
                      <Plus size={11} />
                      Add
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Viewport content */}
          <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
              
              /* ====================================================
                 GRID DECK PIPELINE
                 ==================================================== */
              <motion.div
                key="grid-viewport"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-10"
              >
                {/* Active Grid Card List */}
                <div className="space-y-4">
                  <div className="text-[9.5px] font-mono tracking-widest text-slate-500 uppercase select-none px-0.5">
                    Active targets
                  </div>
                  
                  <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                    {activeTasks.map((task) => (
                      <TaskItem 
                        key={task.id}
                        task={task} 
                        onToggle={handleToggle} 
                        onDelete={handleDelete}
                        onUpdatePriority={handleUpdatePriority}
                        isSelected={selectedTaskId === task.id}
                        onClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                      />
                    ))}
                  </div>

                  {activeTasks.length === 0 && !loading && (
                    <div className="py-20 text-center bg-white/[0.005] border border-dashed border-white/[0.02] rounded-xl select-none">
                      <p className="text-[9.5px] font-mono text-slate-600 uppercase tracking-widest">Active cards database standby</p>
                    </div>
                  )}
                </div>

                {/* Completed Cards archives */}
                {completedTasks.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-white/[0.01]">
                    <div className="flex items-center justify-between px-0.5 text-[9.5px] font-mono tracking-widest text-slate-500 uppercase select-none">
                      <span>Completed archives</span>
                      <button
                        onClick={() => setShowClearConfirm(true)}
                        className="text-rose-500 hover:text-rose-455 transition-colors focus:outline-none cursor-pointer font-bold"
                      >
                        Purge Completed
                      </button>
                    </div>

                    <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 opacity-70 hover:opacity-100 transition-opacity duration-300">
                      {completedTasks.map((task) => (
                        <TaskItem 
                          key={task.id}
                          task={task} 
                          onToggle={handleToggle} 
                          onDelete={handleDelete}
                          onUpdatePriority={handleUpdatePriority}
                          isSelected={selectedTaskId === task.id}
                          onClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

              </motion.div>
            ) : (
              
              /* ====================================================
                 UPGRADED PREMIUM KANBAN BOARD VIEWPORT
                 ==================================================== */
              <motion.div
                key="board-viewport"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onDragStart={() => setIsDraggingTask(true)}
                onDragEnd={() => {
                  setIsDraggingTask(false);
                  setDraggedOverColumn(null);
                }}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start w-full select-none"
              >
                {/* 1. High priority Column */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); setDraggedOverColumn('high'); }}
                  onDragLeave={() => setDraggedOverColumn(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('text/plain');
                    handleCardDrop(id, 'high');
                    setDraggedOverColumn(null);
                  }}
                  className={getColumnClassName('high', 'rose')}
                >
                  <div className="flex items-center justify-between pb-2 mb-3 px-0.5">
                    <div className="flex items-center gap-2 text-[9.5px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)] animate-pulse" />
                      <span>High Focus</span>
                    </div>
                    <span className="px-2.5 py-0.5 text-[9px] font-mono font-black text-rose-400 bg-rose-500/10 rounded-full border border-rose-500/20">
                      {activeTasks.filter(t => t.priority === 'high').length}
                    </span>
                  </div>

                  {/* Inline deploy input */}
                  <div className="mb-4 mt-2">
                    <div className="relative bg-white/[0.01] hover:bg-white/[0.02] focus-within:bg-black/20 border border-white/5 focus-within:border-rose-500/30 rounded-xl p-2.5 transition-all">
                      <input
                        type="text"
                        value={laneInputs.high || ''}
                        onChange={(e) => setLaneInputs(prev => ({ ...prev, high: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddLaneTask('high');
                          }
                        }}
                        placeholder="+ DEPLOY HIGH TARGET..."
                        className="w-full bg-transparent border-none outline-none text-[10px] font-bold text-slate-200 placeholder:text-slate-655 uppercase tracking-wider focus:ring-0 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3.5 overflow-y-auto no-scrollbar flex-1 pb-4">
                    {activeTasks.filter(t => t.priority === 'high').map((task) => (
                      <TaskItem 
                        key={task.id} 
                        task={task} 
                        compact={true}
                        onToggle={handleToggle} 
                        onDelete={handleDelete}
                        onUpdatePriority={handleUpdatePriority}
                        isSelected={selectedTaskId === task.id}
                        onClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                      />
                    ))}
                    {activeTasks.filter(t => t.priority === 'high').length === 0 && (
                      <div className="flex-1 border border-dashed border-white/[0.02] rounded-xl flex flex-col items-center justify-center py-16 px-4">
                        <p className="text-[9px] font-mono text-slate-655 uppercase tracking-widest">Zone Clear</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Medium priority Column */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); setDraggedOverColumn('medium'); }}
                  onDragLeave={() => setDraggedOverColumn(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('text/plain');
                    handleCardDrop(id, 'medium');
                    setDraggedOverColumn(null);
                  }}
                  className={getColumnClassName('medium', 'blue')}
                >
                  <div className="flex items-center justify-between pb-2 mb-3 px-0.5">
                    <div className="flex items-center gap-2 text-[9.5px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-blue shadow-[0_0_6px_rgba(96,165,250,0.7)] animate-pulse" />
                      <span>Medium Focus</span>
                    </div>
                    <span className="px-2.5 py-0.5 text-[9px] font-mono font-black text-accent-blue-bright bg-accent-blue/10 rounded-full border border-accent-blue/20">
                      {activeTasks.filter(t => t.priority === 'medium').length}
                    </span>
                  </div>

                  {/* Inline deploy input */}
                  <div className="mb-4 mt-2">
                    <div className="relative bg-white/[0.01] hover:bg-white/[0.02] focus-within:bg-black/20 border border-white/5 focus-within:border-accent-blue/30 rounded-xl p-2.5 transition-all">
                      <input
                        type="text"
                        value={laneInputs.medium || ''}
                        onChange={(e) => setLaneInputs(prev => ({ ...prev, medium: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddLaneTask('medium');
                          }
                        }}
                        placeholder="+ DEPLOY MEDIUM TARGET..."
                        className="w-full bg-transparent border-none outline-none text-[10px] font-bold text-slate-200 placeholder:text-slate-655 uppercase tracking-wider focus:ring-0 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3.5 overflow-y-auto no-scrollbar flex-1 pb-4">
                    {activeTasks.filter(t => t.priority === 'medium').map((task) => (
                      <TaskItem 
                        key={task.id} 
                        task={task} 
                        compact={true}
                        onToggle={handleToggle} 
                        onDelete={handleDelete}
                        onUpdatePriority={handleUpdatePriority}
                        isSelected={selectedTaskId === task.id}
                        onClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                      />
                    ))}
                    {activeTasks.filter(t => t.priority === 'medium').length === 0 && (
                      <div className="flex-1 border border-dashed border-white/[0.02] rounded-xl flex flex-col items-center justify-center py-16 px-4">
                        <p className="text-[9px] font-mono text-slate-655 uppercase tracking-widest">Zone Clear</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Low priority Column */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); setDraggedOverColumn('low'); }}
                  onDragLeave={() => setDraggedOverColumn(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('text/plain');
                    handleCardDrop(id, 'low');
                    setDraggedOverColumn(null);
                  }}
                  className={getColumnClassName('low', 'slate')}
                >
                  <div className="flex items-center justify-between pb-2 mb-3 px-0.5">
                    <div className="flex items-center gap-2 text-[9.5px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      <span>Low Focus</span>
                    </div>
                    <span className="px-2.5 py-0.5 text-[9px] font-mono font-black text-slate-400 bg-white/[0.03] rounded-full border border-white/10">
                      {activeTasks.filter(t => t.priority === 'low').length}
                    </span>
                  </div>

                  {/* Inline deploy input */}
                  <div className="mb-4 mt-2">
                    <div className="relative bg-white/[0.01] hover:bg-white/[0.02] focus-within:bg-black/20 border border-white/5 focus-within:border-white/10 rounded-xl p-2.5 transition-all">
                      <input
                        type="text"
                        value={laneInputs.low || ''}
                        onChange={(e) => setLaneInputs(prev => ({ ...prev, low: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddLaneTask('low');
                          }
                        }}
                        placeholder="+ DEPLOY LOW TARGET..."
                        className="w-full bg-transparent border-none outline-none text-[10px] font-bold text-slate-200 placeholder:text-slate-655 uppercase tracking-wider focus:ring-0 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3.5 overflow-y-auto no-scrollbar flex-1 pb-4">
                    {activeTasks.filter(t => t.priority === 'low').map((task) => (
                      <TaskItem 
                        key={task.id} 
                        task={task} 
                        compact={true}
                        onToggle={handleToggle} 
                        onDelete={handleDelete}
                        onUpdatePriority={handleUpdatePriority}
                        isSelected={selectedTaskId === task.id}
                        onClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                      />
                    ))}
                    {activeTasks.filter(t => t.priority === 'low').length === 0 && (
                      <div className="flex-1 border border-dashed border-white/[0.02] rounded-xl flex flex-col items-center justify-center py-16 px-4">
                        <p className="text-[9px] font-mono text-slate-655 uppercase tracking-widest">Zone Clear</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Completed Column */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); setDraggedOverColumn('completed'); }}
                  onDragLeave={() => setDraggedOverColumn(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('text/plain');
                    handleCardDrop(id, 'completed');
                    setDraggedOverColumn(null);
                  }}
                  className={getColumnClassName('completed', 'emerald')}
                >
                  <div className="flex items-center justify-between pb-2 mb-4 px-0.5">
                    <div className="flex items-center gap-2 text-[9.5px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)] animate-pulse" />
                      <span>Completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {completedTasks.length > 0 && (
                        <button
                          onClick={() => setShowClearConfirm(true)}
                          className="text-[8.5px] font-mono font-black text-rose-500 hover:text-rose-450 transition-colors focus:outline-none cursor-pointer uppercase tracking-widest"
                        >
                          Clear
                        </button>
                      )}
                      <span className="px-2.5 py-0.5 text-[9px] font-mono font-black text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                        {completedTasks.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3.5 overflow-y-auto no-scrollbar flex-1 pb-4 mt-2">
                    {completedTasks.map((task) => (
                      <TaskItem 
                        key={task.id} 
                        task={task} 
                        compact={true}
                        onToggle={handleToggle} 
                        onDelete={handleDelete}
                        onUpdatePriority={handleUpdatePriority}
                        isSelected={selectedTaskId === task.id}
                        onClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                      />
                    ))}
                    {completedTasks.length === 0 && (
                      <div className="flex-1 border border-dashed border-white/[0.02] rounded-xl flex flex-col items-center justify-center py-16 px-4">
                        <p className="text-[9px] font-mono text-slate-655 uppercase tracking-widest">Archive Empty</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

            )}
          </AnimatePresence>
        </div>

        {/* Column 3: Telemetry Details Workspace (Right Inspector) */}
        <AnimatePresence>
          {selectedTaskId !== null && focusedTask && (() => {
            const totalInScope = filteredTasks.length;
            const completedInScope = completedTasks.length;
            const progressPercent = totalInScope > 0 ? Math.round((completedInScope / totalInScope) * 100) : 0;

            return (
              <motion.div
                key="task-inspector"
                initial={{ opacity: 0, x: 120 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 120 }}
                transition={{ type: "spring", damping: 28, stiffness: 260 }}
                className="sticky top-6 shrink-0 w-[420px] ml-6"
                style={{ height: 'calc(100vh - 130px)' }}
              >
                <div className="h-full w-[420px] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-xl shadow-[-15px_0_50px_rgba(0,0,0,0.6)] overflow-hidden">
                  
                  {/* Linear visual completion indicator */}
                  <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/[0.02] overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-500 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Header bar */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04] bg-white/[0.01] mt-[1.5px] select-none">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${focusedTask.completed ? 'bg-emerald-500' : 'bg-blue-500'} shadow-[0_0_10px_currentColor]`} />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">TELEMETRY SHEETS</span>
                    </div>
                    <button 
                      onClick={() => setSelectedTaskId(null)} 
                      className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-all group cursor-pointer focus:outline-none"
                    >
                      <X size={14} className="text-slate-550 group-hover:text-white transition-colors" />
                    </button>
                  </div>

                  {/* Scrollable details body */}
                  <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-5 space-y-6">
                    
                    {/* Visual metrics bar text */}
                    <div className="p-4 bg-[#121629]/10 border border-white/[0.03] rounded-xl flex items-center justify-between text-[10px] font-mono tracking-widest uppercase font-bold text-slate-500 select-none">
                      <span>Folder clearing:</span>
                      <span className="text-blue-400">{completedInScope} / {totalInScope} ({progressPercent}%)</span>
                    </div>

                    {/* Task Title */}
                    <div className="space-y-1.5">
                      <div className="text-[8.5px] font-mono tracking-widest text-slate-500 uppercase select-none px-1">Objective</div>
                      {editingName ? (
                        <div className="space-y-2">
                          <textarea
                            ref={nameInputRef}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveName(); }
                              if (e.key === 'Escape') { setEditingName(false); setEditName(focusedTask.text); }
                            }}
                            rows={2}
                            className="w-full bg-[var(--color-background)]/85 border border-[var(--color-border)] rounded-xl px-4 py-3 text-xs font-semibold text-white outline-none resize-none focus:border-[var(--color-accent-blue)]/50 uppercase tracking-wider transition-colors focus:ring-0"
                          />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => { setEditingName(false); setEditName(focusedTask.text); }} className="px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-white rounded-lg hover:bg-white/[0.03] transition-all cursor-pointer">Cancel</button>
                            <button onClick={handleSaveName} className="px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-[var(--color-accent-blue-bright)] bg-[var(--color-accent-blue)]/10 hover:bg-[var(--color-accent-blue)]/20 rounded-lg border border-[var(--color-accent-blue)]/20 transition-all cursor-pointer">Save</button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => { setEditName(focusedTask.text); setEditingName(true); }}
                          className="group cursor-pointer p-4 bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.03] hover:border-white/[0.06] rounded-xl transition-all"
                        >
                          <h3 className={`text-[13px] font-bold leading-relaxed tracking-wide transition-colors uppercase ${focusedTask.completed ? 'text-slate-550 line-through' : 'text-slate-100 group-hover:text-blue-400'}`}>
                            {focusedTask.text}
                          </h3>
                          <span className="text-[8px] font-mono tracking-widest text-slate-600 uppercase mt-2 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <Edit3 size={9} /> Click to edit directive title
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Parameters Grid */}
                    <div className="space-y-3">
                      <div className="text-[8.5px] font-mono tracking-widest text-slate-500 uppercase select-none px-1">Parameters</div>
                      
                      <div className="bg-white/[0.012] border border-white/[0.04] rounded-xl p-2.5 divide-y divide-white/[0.03] space-y-3.5 select-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                        
                        {/* Focus Priority selector */}
                        <div className="flex items-center justify-between pt-1 pb-1 px-1.5 gap-4">
                          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider font-bold text-slate-500">
                            <Flag size={12} />
                            <span>Priority Index</span>
                          </div>
                          <div className="flex items-center gap-1 p-0.5 bg-black/40 border border-white/5 rounded-lg w-48 shrink-0">
                            {['low', 'medium', 'high'].map((p) => (
                              <button
                                key={p}
                                onClick={() => handleUpdatePriority(focusedTask.id, p)}
                                className={`flex-1 text-[8.5px] py-1 rounded font-black uppercase tracking-wider transition-all cursor-pointer focus:outline-none ${
                                  focusedTask.priority === p
                                    ? p === 'high' 
                                      ? 'bg-rose-500 text-white shadow-sm' 
                                      : p === 'medium' 
                                        ? 'bg-[var(--color-accent-blue)] text-white shadow-sm' 
                                        : 'bg-slate-600 text-white'
                                    : 'text-slate-550 hover:text-slate-350 hover:bg-white/[0.02]'
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Category list sector */}
                        <div className="flex items-center justify-between pt-3.5 pb-1 px-1.5 gap-4">
                          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider font-bold text-slate-500">
                            <Tag size={12} />
                            <span>Folder Assignment</span>
                          </div>
                          <div className="w-48 shrink-0">
                            <CategoryCombobox
                              value={editCategory}
                              onChange={async (val) => {
                                const trimmed = val.trim() || '';
                                setEditCategory(trimmed);
                                await handleUpdateField(focusedTask.id, 'list', trimmed);
                              }}
                              suggestions={allCategories.filter(c => !['All', 'Today', 'Priority', 'Stale', 'General', 'Main'].includes(c))}
                              placeholder="Select Category..."
                              accentColor="blue"
                            />
                          </div>
                        </div>

                        {/* Calendar Due Date */}
                        <div className="flex items-center justify-between pt-3.5 pb-1 px-1.5 gap-4">
                          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider font-bold text-slate-500">
                            <Calendar size={12} />
                            <span>Deadline Date</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {focusedTask.dueDate && (() => {
                              const info = getDueDateLabel(focusedTask.dueDate);
                              return info ? <span className={`text-[8.5px] font-mono tracking-wider uppercase px-2 py-0.5 rounded border ${info.className}`}>{info.text}</span> : null;
                            })()}
                            <div className="relative">
                              <input
                                type="date"
                                value={focusedTask.dueDate ? new Date(focusedTask.dueDate).toISOString().split('T')[0] : ''}
                                onChange={(e) => handleUpdateField(focusedTask.id, 'dueDate', e.target.value || null)}
                                className="bg-black/30 border border-white/10 hover:border-blue-500/30 rounded-lg px-2.5 py-1 text-[10px] text-slate-355 font-bold uppercase tracking-wider outline-none cursor-pointer focus:border-blue-500/40 transition-colors w-[120px] focus:ring-0 focus:outline-none"
                                style={{ colorScheme: 'dark' }}
                              />
                            </div>
                            {focusedTask.dueDate && (
                              <button
                                onClick={() => handleUpdateField(focusedTask.id, 'dueDate', null)}
                                className="p-1 hover:bg-white/[0.05] rounded-md transition-all cursor-pointer focus:outline-none"
                              >
                                <X size={11} className="text-slate-550 hover:text-white" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Created time log info */}
                        <div className="flex items-center justify-between pt-3.5 pb-1 px-1.5 gap-4">
                          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider font-bold text-slate-500">
                            <Clock size={12} />
                            <span>Created Log</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-550 font-mono tracking-wider uppercase">
                            {(() => {
                              if (!focusedTask.createdAt) return 'UNKNOWN';
                              try {
                                const d = new Date(focusedTask.createdAt);
                                return isNaN(d.getTime()) 
                                  ? 'UNKNOWN' 
                                  : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
                              } catch {
                                return 'UNKNOWN';
                              }
                            })()}
                          </span>
                        </div>

                      </div>
                    </div>

                    {/* Context description notepad */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between mb-1.5 px-1 select-none">
                        <div className="flex items-center gap-2 text-[8.5px] font-mono tracking-widest text-slate-555 uppercase">
                          <FileText size={12} />
                          <span>Notebook logs</span>
                        </div>
                        {!editingNotes && (focusedTask.notes || '').length > 0 && (
                          <button
                            onClick={() => { setEditNotes(focusedTask.notes || ''); setEditingNotes(true); }}
                            className="text-[9px] font-black uppercase tracking-wider text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 cursor-pointer focus:outline-none"
                          >
                            <Edit3 size={9} /> Edit Log
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
                              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveNotes();
                              } else if (e.key === 'Escape') {
                                setEditingNotes(false);
                                setEditNotes(focusedTask.notes || '');
                              }
                            }}
                            rows={6}
                            placeholder="WRITE LOG DATA AND CONTEXT INSTRUCTIONS..."
                            className="w-full bg-[var(--color-background)]/80 border border-[var(--color-border)] focus:border-[var(--color-accent-blue)]/50 rounded-xl px-4 py-3.5 text-xs text-slate-300 placeholder:text-slate-600 outline-none resize-none font-bold uppercase tracking-wider leading-relaxed transition-colors focus:ring-0"
                          />
                          <div className="flex gap-2 justify-end select-none">
                            <button onClick={() => { setEditingNotes(false); setEditNotes(focusedTask.notes || ''); }} className="px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-white rounded-lg hover:bg-white/[0.03] transition-all cursor-pointer">Cancel</button>
                            <button onClick={handleSaveNotes} className="px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-[var(--color-accent-blue-bright)] bg-[var(--color-accent-blue)]/10 hover:bg-[var(--color-accent-blue)]/20 rounded-lg border border-[var(--color-accent-blue)]/20 transition-all cursor-pointer">Save</button>
                          </div>
                        </div>
                      ) : (focusedTask.notes || '').length > 0 ? (
                        <div 
                          onClick={() => { setEditNotes(focusedTask.notes || ''); setEditingNotes(true); }}
                          className="p-4 rounded-xl bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.03] hover:border-white/[0.06] cursor-pointer transition-colors"
                        >
                          <p className="text-xs text-slate-455 leading-relaxed font-semibold uppercase tracking-wide whitespace-pre-wrap">{focusedTask.notes}</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditNotes(''); setEditingNotes(true); }}
                          className="w-full p-5 rounded-xl border border-dashed border-white/[0.03] hover:border-blue-500/20 hover:bg-blue-500/[0.01] flex flex-col items-center justify-center gap-2 transition-all cursor-pointer focus:outline-none select-none"
                        >
                          <FileText size={16} className="text-slate-700" />
                          <span className="text-[9px] font-black text-slate-550 uppercase tracking-widest">Append Context Log</span>
                        </button>
                      )}
                    </div>

                  </div>

                  {/* Inspector bottom drawer actions */}
                  <div className="border-t border-white/[0.04] bg-white/[0.005] px-5 py-4 flex items-center gap-2 select-none">
                    <button
                      onClick={() => handleToggle(focusedTask.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer focus:outline-none ${
                        focusedTask.completed
                          ? 'bg-amber-500/5 border border-amber-500/20 text-amber-400 hover:bg-amber-500/10'
                          : 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                    >
                      {focusedTask.completed ? <RotateCcw size={12} /> : <CheckCircle2 size={12} />}
                      {focusedTask.completed ? 'Reactivate target' : 'Archive Objective'}
                    </button>

                    {showDeleteConfirm ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-4.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer focus:outline-none"
                        >
                          No
                        </button>
                        <button
                          onClick={() => { setShowDeleteConfirm(false); handleDelete(focusedTask.id); }}
                          className="px-4.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-500 border border-rose-500/20 shadow-lg shadow-rose-500/15 transition-all cursor-pointer focus:outline-none"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-455 hover:bg-rose-500/10 transition-all cursor-pointer focus:outline-none"
                        title="Purge Task"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      {/* Confirmation Modal - Clear Completed */}
      {createPortal(
        <AnimatePresence>
          {showClearConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="w-full max-w-sm bg-[#0a0a0d] border border-white/5 rounded-xl p-5 text-center shadow-2xl select-none"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xs font-mono font-black uppercase tracking-widest text-white mb-2">
                  Purge Completed Tasks?
                </h3>
                
                <p className="text-[11px] font-medium tracking-wide uppercase text-slate-550 leading-relaxed mb-5">
                  Are you sure you want to permanently clear all completed tasks from storage? This operation is final.
                </p>
                
                <div className="flex items-center gap-3 justify-center text-[9.5px] font-mono font-bold tracking-widest uppercase">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-4 py-2 rounded border border-white/5 hover:border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearCompleted}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded transition-all cursor-pointer focus:outline-none"
                  >
                    Confirm Purge
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Confirmation Modal - Custom Categories */}
      {createPortal(
        <AnimatePresence>
          {confirmModal.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="relative w-full max-w-sm overflow-hidden rounded-xl border border-white/5 bg-[#0c0e17] p-5 shadow-2xl z-10 text-center select-none"
              >
                <h3 className="text-xs font-mono font-black uppercase tracking-widest text-slate-200 mb-2">
                  {confirmModal.title}
                </h3>

                <p className="text-[11px] font-medium tracking-wide uppercase text-slate-555 leading-relaxed mb-5">
                  {confirmModal.message}
                </p>

                <div className="flex items-center justify-center gap-3 text-[9.5px] font-mono font-bold tracking-widest uppercase">
                  <button
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 rounded border border-white/5 hover:border-white/10 text-slate-455 hover:text-white transition-colors cursor-pointer focus:outline-none"
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
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded transition-all cursor-pointer focus:outline-none"
                  >
                    Confirm Action
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Undo Toast notification banner */}
      {createPortal(
        <AnimatePresence>
          {showUndoToast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3.5 px-4.5 py-3 rounded-xl border border-white/10 bg-[#121420]/95 backdrop-blur-xl shadow-2xl shadow-black/80"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-350">{renderToastMessage(toastMessage)}</span>
              <div className="w-px h-3.5 bg-white/10" />
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
                <X size={12} className="text-slate-550 hover:text-white" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}



    </div>
  );
};

export default Tasks;
