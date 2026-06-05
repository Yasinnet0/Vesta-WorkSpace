import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FolderPlus, 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Sliders, 
  Tag, 
  Trash2, 
  Clock, 
  Flag, 
  Inbox, 
  FolderHeart,
  MoreVertical,
  X
} from 'lucide-react';
import { getCategoryColor, evaluateSmartFilter } from '../../utils/categoryHelpers';

const CategorySidebar = ({ 
  categories = [], 
  activeCategory = 'All', 
  setActiveCategory, 
  items = [], 
  categoryKey, 
  accentColor = 'blue',
  onDeleteCategory,
  onAddCategory
}) => {
  const [search, setSearch] = useState('');
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  
  // Folder structure stored in localStorage
  const [folders, setFolders] = useState(() => {
    const saved = localStorage.getItem(`vesta-category-folders-${categoryKey}`);
    try {
      const parsed = saved ? JSON.parse(saved) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  });

  // Collapsed folders state
  const [collapsedFolders, setCollapsedFolders] = useState(() => {
    const saved = localStorage.getItem(`vesta-collapsed-folders-${categoryKey}`);
    try {
      const parsed = saved ? JSON.parse(saved) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  });

  // Category menu open state
  const [activeMenuCat, setActiveMenuCat] = useState(null);
  const menuRef = useRef(null);

  // Sync folders to localStorage
  useEffect(() => {
    if (folders && typeof folders === 'object') {
      localStorage.setItem(`vesta-category-folders-${categoryKey}`, JSON.stringify(folders));
    }
  }, [folders, categoryKey]);

  // Sync collapsed state to localStorage
  useEffect(() => {
    if (collapsedFolders && typeof collapsedFolders === 'object') {
      localStorage.setItem(`vesta-collapsed-folders-${categoryKey}`, JSON.stringify(collapsedFolders));
    }
  }, [collapsedFolders, categoryKey]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuCat(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateFolder = (e) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (name && !folders[name]) {
      setFolders({
        ...folders,
        [name]: []
      });
      setNewFolderName('');
      setShowAddFolder(false);
    }
  };

  const handleCreateCategory = (e) => {
    e.preventDefault();
    const name = newCatName.trim();
    if (name) {
      if (onAddCategory) {
        onAddCategory(name);
      }
      setNewCatName('');
      setShowAddCategory(false);
    }
  };

  const handleDeleteFolder = (folderName) => {
    const categoriesToRelease = folders[folderName] || [];
    const newFolders = { ...folders };
    delete newFolders[folderName];
    setFolders(newFolders);
  };

  const toggleFolder = (folderName) => {
    setCollapsedFolders({
      ...collapsedFolders,
      [folderName]: !collapsedFolders[folderName]
    });
  };

  const assignCategoryToFolder = (category, folderName) => {
    // 1. Remove from all other folders first
    const updatedFolders = {};
    Object.keys(folders).forEach(f => {
      updatedFolders[f] = folders[f].filter(c => c !== category);
    });

    // 2. Add to target folder if specified
    if (folderName) {
      updatedFolders[folderName] = [...(updatedFolders[folderName] || []), category];
    }
    
    setFolders(updatedFolders);
    setActiveMenuCat(null);
  };

  // Get raw items count for a category or filter
  const getItemCount = (catOrFilter) => {
    const validItems = Array.isArray(items) ? items.filter(Boolean) : [];
    if (catOrFilter === 'All') return validItems.length;
    
    const smartFilters = ['Today', 'Priority', 'Stale'];
    if (smartFilters.includes(catOrFilter)) {
      return validItems.filter(item => evaluateSmartFilter(catOrFilter, item, categoryKey)).length;
    }
    
    // Default categories counting
    return validItems.filter(item => {
      const itemCat = String(item.category || item.list || 'General');
      return itemCat.toLowerCase() === String(catOrFilter).toLowerCase();
    }).length;
  };

  // Extract custom categories (exclude smart filters)
  const cleanCategories = (Array.isArray(categories) ? categories : [])
    .filter(Boolean)
    .map(c => String(c))
    .filter(c => !['All', 'Today', 'Priority', 'Stale'].includes(c));

  // Filter custom categories based on search input
  const filteredCategories = cleanCategories.filter(cat => 
    cat.toLowerCase().includes(search.toLowerCase())
  );

  // Grouped vs Unsorted categories
  const groupedCategoryList = Object.values(
    folders && typeof folders === 'object' && !Array.isArray(folders) ? folders : {}
  ).filter(Array.isArray).flat();
  const unsortedCategories = filteredCategories.filter(c => !groupedCategoryList.includes(c));

  // Render a category list item
  const renderCategoryItem = (cat) => {
    const colorTheme = getCategoryColor(cat);
    const count = getItemCount(cat);
    const isActive = activeCategory === cat;

    return (
      <div 
        key={cat} 
        className={`group/item flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer transition-all relative ${
          isActive 
            ? 'bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue-bright)] border border-[var(--color-accent-blue)]/20 shadow-md shadow-[var(--color-accent-blue)]/5' 
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border border-transparent'
        }`}
        onClick={() => setActiveCategory(cat)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div 
            className="w-2 h-2 rounded-full shrink-0 transition-transform duration-300 group-hover/item:scale-125"
            style={{ 
              backgroundColor: colorTheme.hex, 
              boxShadow: `0 0 6px ${colorTheme.glow}`
            }} 
          />
          <span className="truncate pr-1 uppercase tracking-wider text-[10px] font-bold">{cat}</span>
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick options trigger */}
          {cat !== 'General' && cat !== 'Main' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuCat(activeMenuCat === cat ? null : cat);
              }}
              className="p-0.5 rounded hover:bg-white/10 opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer shrink-0"
            >
              <MoreVertical size={11} className="text-slate-500 hover:text-slate-300" />
            </button>
          ) : (
            <div className="w-4 shrink-0" />
          )}

          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
            isActive ? 'bg-blue-500/20 text-blue-300' : 'bg-white/[0.04] text-slate-500 group-hover/item:text-slate-400'
          }`}>
            {count}
          </span>
        </div>

        {/* Dropdown Menu for Category Settings */}
        {activeMenuCat === cat && (
          <div 
            ref={menuRef}
            className="absolute right-2 top-7 z-50 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-xl shadow-2xl p-1.5 space-y-1 text-[10px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-slate-500 font-bold uppercase tracking-wider text-[8px] border-b border-white/5 mb-1">
              Organize
            </div>
            
            {/* Move to Folders list */}
            {Object.keys(folders).map(folder => {
              const inThisFolder = folders[folder].includes(cat);
              return (
                <button
                  key={folder}
                  onClick={() => assignCategoryToFolder(cat, inThisFolder ? null : folder)}
                  className={`w-full text-left px-2 py-1.5 rounded-lg font-bold uppercase tracking-wider flex items-center justify-between ${
                    inThisFolder 
                      ? 'bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue-bright)] hover:bg-[var(--color-accent-blue)]/20' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <span className="truncate">{inThisFolder ? `✓ ${folder}` : `Move to ${folder}`}</span>
                </button>
              );
            })}

            {Object.keys(folders).length === 0 && (
              <div className="px-2 py-1 text-slate-600 italic">No folders created yet.</div>
            )}

            {/* Delete Category action */}
            {onDeleteCategory && (
              <button
                onClick={() => {
                  onDeleteCategory(cat);
                  setActiveMenuCat(null);
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 font-bold uppercase tracking-wider flex items-center gap-1.5 border-t border-white/5 mt-1"
              >
                <Trash2 size={10} /> Delete Category
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-56 border border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-xl shrink-0 h-[calc(100vh-8rem)] sticky top-6 flex flex-col p-4 space-y-5 overflow-y-auto no-scrollbar rounded-2xl shadow-xl">
      
      {/* Search & Management Header */}
      <div className="space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Folders</span>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowAddFolder(!showAddFolder)} 
              className="p-1 hover:bg-white/[0.04] rounded-lg transition-colors text-slate-500 hover:text-slate-300"
              title="New Folder"
            >
              <FolderPlus size={13} />
            </button>
            <button 
              onClick={() => setShowAddCategory(!showAddCategory)} 
              className="p-1 hover:bg-white/[0.04] rounded-lg transition-colors text-slate-500 hover:text-slate-300"
              title="New Category"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {/* Inline Folder Addition Form */}
        {showAddFolder && (
          <form onSubmit={handleCreateFolder} className="flex items-center gap-1.5 p-1.5 bg-white/[0.02] border border-white/5 rounded-lg w-full">
            <input 
              type="text" 
              placeholder="FOLDER NAME..." 
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setShowAddFolder(false);
              }}
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-[9px] font-black text-slate-200 placeholder:text-slate-655 uppercase focus:ring-0 focus:outline-none"
            />
            <button type="button" onClick={() => setShowAddFolder(false)} className="text-slate-500 hover:text-white cursor-pointer"><X size={10} /></button>
          </form>
        )}

        {/* Inline Category Addition Form */}
        {showAddCategory && (
          <form onSubmit={handleCreateCategory} className="flex items-center gap-1.5 p-1.5 bg-white/[0.02] border border-white/5 rounded-lg w-full">
            <input 
              type="text" 
              placeholder="NEW CATEGORY..." 
              autoFocus
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setShowAddCategory(false);
              }}
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-[9px] font-black text-slate-200 placeholder:text-slate-655 uppercase focus:ring-0 focus:outline-none"
            />
            <button type="button" onClick={() => setShowAddCategory(false)} className="text-slate-500 hover:text-white cursor-pointer"><X size={10} /></button>
          </form>
        )}

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" size={11} />
          <input 
            type="text" 
            placeholder="SEARCH..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--color-background)] border border-[var(--color-border)] focus:border-[var(--color-accent-blue-bright)]/50 rounded-lg pl-8 pr-3 py-1.5 outline-none text-[9px] font-black uppercase tracking-widest text-slate-300 placeholder:text-slate-600 transition-colors"
          />
        </div>
      </div>

      {/* Smart Filters Hub */}
      <div className="space-y-1.5 shrink-0">
        <div className="flex items-center gap-1.5 px-1.5">
          <Sliders size={10} className="text-slate-600" />
          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Smart Filters</span>
        </div>
        <div className="space-y-0.5">          {/* ALL FILTER */}
          <div 
            onClick={() => setActiveCategory('All')}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeCategory === 'All'
                ? 'bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue-bright)] border border-[var(--color-accent-blue)]/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.01]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Inbox size={12} className={activeCategory === 'All' ? 'text-[var(--color-accent-blue-bright)]' : 'text-slate-550'} />
              <span className="uppercase tracking-wider text-[10px] font-bold">All Units</span>
            </div>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
              activeCategory === 'All' ? 'bg-[var(--color-accent-blue)]/20 text-[var(--color-accent-blue-bright)]' : 'bg-white/[0.03] text-slate-500'
            }`}>{getItemCount('All')}</span>
          </div>

          {/* TODAY FILTER */}
          <div 
            onClick={() => setActiveCategory('Today')}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeCategory === 'Today'
                ? 'bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue-bright)] border border-[var(--color-accent-blue)]/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.01]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock size={12} className={activeCategory === 'Today' ? 'text-[var(--color-accent-blue-bright)]' : 'text-slate-550'} />
              <span className="uppercase tracking-wider text-[10px] font-bold">Created Today</span>
            </div>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
              activeCategory === 'Today' ? 'bg-[var(--color-accent-blue)]/20 text-[var(--color-accent-blue-bright)]' : 'bg-white/[0.03] text-slate-500'
            }`}>{getItemCount('Today')}</span>
          </div>

          {/* PRIORITY / PINNED FILTER */}
          <div 
            onClick={() => setActiveCategory('Priority')}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeCategory === 'Priority'
                ? 'bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue-bright)] border border-[var(--color-accent-blue)]/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.01]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Flag size={12} className={activeCategory === 'Priority' ? 'text-[var(--color-accent-blue-bright)]' : 'text-slate-550'} />
              <span className="uppercase tracking-wider text-[10px] font-bold">
                {categoryKey === 'tasks' ? 'High Focus' : categoryKey === 'bookmarks' ? 'Pinned Core' : 'Starred Ideas'}
              </span>
            </div>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
              activeCategory === 'Priority' ? 'bg-[var(--color-accent-blue)]/20 text-[var(--color-accent-blue-bright)]' : 'bg-white/[0.03] text-slate-500'
            }`}>{getItemCount('Priority')}</span>
          </div>

          {/* STALE UNITS */}
          <div 
            onClick={() => setActiveCategory('Stale')}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeCategory === 'Stale'
                ? 'bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue-bright)] border border-[var(--color-accent-blue)]/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.01]'
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderHeart size={12} className={activeCategory === 'Stale' ? 'text-[var(--color-accent-blue-bright)]' : 'text-slate-550'} />
              <span className="uppercase tracking-wider text-[10px] font-bold">Stale (&gt;14d)</span>
            </div>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
              activeCategory === 'Stale' ? 'bg-[var(--color-accent-blue)]/20 text-[var(--color-accent-blue-bright)]' : 'bg-white/[0.03] text-slate-500'
            }`}>{getItemCount('Stale')}</span>
          </div>
        </div>
      </div>

      {/* Main Folders and Sub-Categories List */}
      <div className="flex-1 space-y-4">
        
        {/* Render Nestable Folders */}
        {Object.keys(folders && typeof folders === 'object' && !Array.isArray(folders) ? folders : {}).map(folderName => {
          const isCollapsed = collapsedFolders[folderName];
          const folderCats = Array.isArray(folders[folderName]) ? folders[folderName] : [];
          const searchFilteredFolderCats = folderCats.filter(c => 
            cleanCategories.includes(String(c)) && String(c).toLowerCase().includes(search.toLowerCase())
          );
          
          if (search && searchFilteredFolderCats.length === 0) return null;

          return (
            <div key={folderName} className="space-y-1">
              {/* Folder Header */}
              <div 
                className="group/folder flex items-center justify-between px-1 py-1 rounded hover:bg-white/[0.02] cursor-pointer"
                onClick={() => toggleFolder(folderName)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-slate-600 shrink-0">
                    {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                  </span>
                  <span className="text-slate-500 shrink-0">
                    {isCollapsed ? <Folder size={11} /> : <FolderOpen size={11} />}
                  </span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{folderName}</span>
                </div>
                
                {/* Delete Folder */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folderName);
                  }}
                  className="opacity-0 group-hover/folder:opacity-100 p-0.5 rounded hover:bg-white/10 text-slate-600 hover:text-rose-400 transition-all shrink-0"
                  title={`Delete Folder "${folderName}"`}
                >
                  <Trash2 size={10} />
                </button>
              </div>

              {/* Folder Categories */}
              {!isCollapsed && (
                <div className="pl-3.5 border-l border-white/[0.04] ml-2 space-y-0.5">
                  {searchFilteredFolderCats.map(cat => renderCategoryItem(cat))}
                  
                  {folderCats.length === 0 && (
                    <div className="text-[8px] text-slate-600 italic px-2 py-1 uppercase tracking-wider">Empty Folder</div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Render Unsorted Categories (collapsible by default) */}
        {unsortedCategories.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 px-1 py-1">
              <Tag size={10} className="text-slate-600" />
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Categories</span>
            </div>
            <div className="space-y-0.5">
              {unsortedCategories.map(cat => renderCategoryItem(cat))}
            </div>
          </div>
        )}

        {filteredCategories.length === 0 && !search && (
          <div className="text-center py-6 text-slate-700 italic text-[10px] uppercase tracking-wider">
            No categories.
          </div>
        )}
      </div>

    </aside>
  );
};

export default CategorySidebar;
