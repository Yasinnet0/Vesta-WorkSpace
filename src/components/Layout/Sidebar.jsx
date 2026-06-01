import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Share2, 
  CheckSquare, 
  StickyNote, 
  Lightbulb, 
  Bookmark,
  Settings,
  ChevronLeft,
  ChevronRight,
  Workflow
} from 'lucide-react';

const Sidebar = () => {
  const [sidebarWidth, setSidebarWidth] = React.useState(() => {
    const saved = localStorage.getItem('sidebar-width');
    return saved ? parseInt(saved, 10) : 224; // 224px (w-56)
  });
  const [isResizing, setIsResizing] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });

  const [displayName, setDisplayName] = React.useState(() => {
    return localStorage.getItem('user-display-name') || 'Yasin';
  });

  React.useEffect(() => {
    const handleUpdate = () => {
      setDisplayName(localStorage.getItem('user-display-name') || 'Yasin');
    };
    window.addEventListener('display-name-changed', handleUpdate);
    return () => window.removeEventListener('display-name-changed', handleUpdate);
  }, []);

  const startResizing = React.useCallback((mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback((mouseMoveEvent) => {
    if (isResizing) {
      // Clamp between 180 and 350
      const newWidth = Math.max(180, Math.min(350, mouseMoveEvent.clientX));
      setSidebarWidth(newWidth);
      localStorage.setItem('sidebar-width', newWidth);
    }
  }, [isResizing]);

  React.useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Graph', path: '/graph', icon: Share2 },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Notes', path: '/notes', icon: StickyNote },
    { name: 'Ideas', path: '/ideas', icon: Lightbulb },
    { name: 'Bookmarks', path: '/bookmarks', icon: Bookmark },
    { name: 'Charts', path: '/charts', icon: Workflow },
  ];

  const currentWidth = isCollapsed ? 64 : sidebarWidth;

  return (
    <aside 
      style={{ width: `${currentWidth}px` }}
      className={`relative border-r border-border flex flex-col h-full bg-[#050506] overflow-hidden shrink-0 ${isResizing ? '' : 'transition-all duration-300'}`}
    >
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
        {!isCollapsed && (
          <div className="mb-2 px-3">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Neural Hub</span>
          </div>
        )}
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''} ${isCollapsed ? 'justify-center px-0' : ''}`}
            title={isCollapsed ? item.name : undefined}
          >
            {({ isActive }) => (
              <>
                <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                {!isCollapsed && <span className="text-xs font-bold tracking-tight truncate">{item.name}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border mt-auto shrink-0 space-y-3">
        <button
          onClick={() => {
            const next = !isCollapsed;
            setIsCollapsed(next);
            localStorage.setItem('sidebar-collapsed', String(next));
          }}
          className="w-full flex items-center justify-center p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-border/30 transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={15} /> : (
            <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider">
              <ChevronLeft size={15} />
              <span>Collapse</span>
            </div>
          )}
        </button>

        <NavLink
          to="/settings"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''} ${isCollapsed ? 'justify-center px-0' : ''}`}
          title={isCollapsed ? "Settings" : undefined}
        >
          {({ isActive }) => (
            <>
              <Settings size={16} strokeWidth={2} className="shrink-0" />
              {!isCollapsed && <span className="text-xs font-bold tracking-tight">Settings</span>}
            </>
          )}
        </NavLink>
        
        <div className={isCollapsed 
          ? "flex items-center justify-center" 
          : "rounded-2xl bg-white/[0.03] border border-border flex items-center p-3 gap-3"
        } title={isCollapsed ? displayName : undefined}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-inner shrink-0 flex items-center justify-center text-white font-bold text-xs uppercase select-none">
            {displayName.trim().slice(0, 2)}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-foreground truncate tracking-tight uppercase" title={displayName}>{displayName}</p>
              <p className="text-[9px] font-bold text-blue-500 truncate uppercase tracking-widest">Active</p>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Drag Handle (only active when expanded) */}
      {!isCollapsed && (
        <div 
          onMouseDown={startResizing}
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/30 active:bg-blue-500 transition-colors z-50 group flex items-center justify-center"
        >
          <div className="w-0.5 h-10 bg-slate-700/60 rounded group-hover:bg-blue-400 group-active:bg-blue-400 transition-all opacity-0 group-hover:opacity-100" />
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
