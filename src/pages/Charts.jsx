import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Plus, Trash2, Download, Copy, Workflow, Layers, 
  FileText, Sparkles, Code, ZoomIn, ZoomOut, 
  Play, Check, X, FileEdit, Link2, Unlink, MousePointer,
  Sliders, PenTool, ChevronDown, Bold, Database, Activity,
  HelpCircle, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTasks, getNotes, getBookmarks } from '../api';

/* ─── Helper: Normalize strings for key-matching ─── */
const normalizeForMatch = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
};

/* ─── Core Workflow Node Categories ─── */
const NODE_CATEGORIES = [
  { type: 'trigger', label: 'Trigger', icon: Play, color: 'text-emerald-400', border: 'border-emerald-500/30', accent: '#10b981', desc: 'Process entry point (e.g. Schedule, Webhook)' },
  { type: 'action', label: 'Action', icon: Sliders, color: 'text-blue-400', border: 'border-blue-500/30', accent: '#3b82f6', desc: 'Operational task (e.g. Write code, Sync)' },
  { type: 'condition', label: 'Condition', icon: Workflow, color: 'text-amber-400', border: 'border-amber-500/30', accent: '#fbbf24', desc: 'Logic routing or check (If/Else)' },
  { type: 'database', label: 'Database', icon: Database, color: 'text-pink-400', border: 'border-pink-500/30', accent: '#ec4899', desc: 'External storage read or write' }
];

const EDGE_STYLES = [
  { type: 'arrow', label: 'Solid', icon: '──▶' },
  { type: 'dashed', label: 'Dashed', icon: '┈┈▶' },
  { type: 'thick', label: 'Thick', icon: '━━▶' }
];

/* ─── Migration & Safe Parsing ─── */
const migrateDiagramCode = (code) => {
  if (!code || typeof code !== 'string') return { nodes: [], links: [] };
  
  const trimmed = code.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && Array.isArray(parsed.nodes)) {
        const validNodes = parsed.nodes.map(n => {
          const rawSub = n.subNodes || [];
          const subNodes = rawSub.map((sub, sidx) => {
            if (typeof sub === 'string') {
              return {
                id: `${n.id}_sub_${sidx}`,
                text: sub,
                completed: false,
                linkedItem: null
              };
            }
            return {
              id: sub.id || `${n.id}_sub_${sidx}`,
              text: sub.text || '',
              completed: !!sub.completed,
              linkedItem: sub.linkedItem || null
            };
          });
          return {
            id: n.id,
            text: n.text || n.id,
            shape: n.shape || 'box',
            category: n.category || (n.shape === 'stadium' ? 'trigger' : n.shape === 'diamond' ? 'condition' : n.shape === 'circle' ? 'database' : 'action'),
            description: n.description || `Task element`,
            subNodes: subNodes,
            linkedItem: n.linkedItem || null,
            x: typeof n.x === 'number' ? n.x : 1000,
            y: typeof n.y === 'number' ? n.y : 1000,
            style: n.style
          };
        });
        const validLinks = (parsed.links || []).map(l => ({
          source: l.source,
          target: l.target,
          label: l.label || '',
          type: l.type || 'arrow',
          controlPoint: l.controlPoint || { x: 0, y: 0 }
        }));
        return { nodes: validNodes, links: validLinks };
      }
    } catch {}
  }
  
  return { nodes: [], links: [] };
};

/* ─── Premium Glassmorphic Custom Searchable Combobox ─── */
const CustomCombobox = ({ value, options, onChange, placeholder, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative w-full select-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-8.5 flex items-center justify-between bg-[var(--color-background)]/90 border border-white/10 hover:border-white/20 rounded-xl px-3 text-[10px] font-bold text-slate-300 hover:text-white focus:outline-none transition-all duration-150 cursor-pointer active:scale-98"
      >
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="w-3.5 h-3.5 shrink-0 text-slate-400" />}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform duration-250 ${isOpen ? 'rotate-180 text-white' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 bg-[var(--color-card)]/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-2xl p-1.5 flex flex-col gap-1.5 max-h-48 overflow-visible border-t-[1.5px] border-t-white/20">
          <div className="relative">
            <Search className="absolute left-2 top-1.5 w-3 h-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--color-background)]/65 border border-white/5 rounded-lg pl-7 pr-2 py-1 text-[10px] text-white focus:outline-none focus:border-blue-500/30"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-0.5 max-h-36">
            <div
              onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}
              className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer transition-colors ${
                !value ? 'bg-white/10 text-white' : 'text-slate-500 hover:bg-white/[0.03] hover:text-slate-200'
              }`}
            >
              <span>None</span>
              {!value && <Check className="w-3 h-3 text-white" />}
            </div>
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[9.5px] font-bold cursor-pointer transition-colors ${
                    opt.value === value ? 'bg-blue-600/10 text-blue-400 border border-blue-500/10' : 'text-slate-300 hover:bg-white/[0.03] hover:text-white'
                  }`}
                >
                  <span className="truncate pr-2">{opt.label}</span>
                  {opt.value === value && <Check className="w-3 h-3 text-blue-400" />}
                </div>
              ))
            ) : (
              <div className="px-2 py-3 text-[9px] text-slate-600 font-bold text-center uppercase tracking-wider">
                No results
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── High-End Combined User Data Template Generator ─── */
const generateUserTemplates = (tasks, notes, bookmarks) => {
  const templates = [];

  const hasTasks = tasks && tasks.length > 0;
  const hasNotes = notes && notes.length > 0;
  const hasBookmarks = bookmarks && bookmarks.length > 0;

  // 1. Combination: Tasks & Notes (Project Planner Automation Pipeline)
  if (hasTasks && hasNotes) {
    const latestNote = notes[0];
    const pendingTasks = tasks.filter(t => !t.completed).slice(0, 3);
    
    if (pendingTasks.length > 0) {
      const data = {
        nodes: [
          { id: "NoteResearch", text: latestNote.title || "Latest Note research", category: "trigger", description: "Triggered from workspace ideation", x: 800, y: 1000, linkedItem: { type: "note", id: latestNote.id, title: latestNote.title } },
          { id: "Approval", text: "Approved?", category: "condition", description: "Verify scope feasibility", x: 1080, y: 1000 },
          { id: "UpdateDB", text: "Log Planner DB", category: "database", description: "Save permanent log", x: 1360, y: 880 }
        ],
        links: [
          { source: "NoteResearch", target: "Approval", label: "Inspect note", type: "arrow", controlPoint: { x: 0, y: 0 } },
          { source: "Approval", target: "UpdateDB", label: "Yes", type: "arrow", controlPoint: { x: 0, y: 0 } }
        ]
      };

      // Add actual pending tasks as sequential steps
      pendingTasks.forEach((t, i) => {
        const taskId = `Task_${i}`;
        data.nodes.push({
          id: taskId,
          text: t.text.length > 22 ? `${t.text.substring(0, 20)}...` : t.text,
          category: "action",
          description: "Active workspace task",
          linkedItem: { type: "task", id: t.id, title: t.text },
          x: 1360,
          y: 1020 + i * 120
        });
        data.links.push({
          source: "Approval",
          target: taskId,
          label: i === 0 ? "Pending Tasks" : "",
          type: "dashed",
          controlPoint: { x: -30, y: 10 }
        });
      });

      templates.push({
        name: '💼 Workspace Project Pipeline',
        description: `Links note "${latestNote.title || 'ideas'}" with ${pendingTasks.length} pending action tasks!`,
        icon: '💼',
        code: JSON.stringify(data, null, 2),
        isPersonal: true
      });
    }
  }

  // 2. Combination: Bookmarks & Notes (Knowledge Curator Router)
  if (hasNotes && hasBookmarks) {
    const latestBookmark = bookmarks[0];
    const latestNote = notes[0];

    const data = {
      nodes: [
        { id: "BookmarkTrigger", text: latestBookmark.title ? (latestBookmark.title.length > 20 ? `${latestBookmark.title.substring(0, 18)}...` : latestBookmark.title) : "New Bookmark Link", category: "trigger", description: `URL: ${latestBookmark.url ? latestBookmark.url.substring(0, 20) : ''}`, x: 800, y: 1000, linkedItem: { type: "bookmark", id: latestBookmark.id, title: latestBookmark.title || latestBookmark.url } },
        { id: "Review", text: "Sync Topic?", category: "condition", description: "Evaluate content utility", x: 1080, y: 1000 },
        { id: "NoteSync", text: `Update: ${latestNote.title ? (latestNote.title.length > 18 ? `${latestNote.title.substring(0, 16)}...` : latestNote.title) : 'Active Notes'}`, category: "action", description: "Append bookmark reference", linkedItem: { type: "note", id: latestNote.id, title: latestNote.title }, x: 1360, y: 880 },
        { id: "Logger", text: "Knowledge Database", category: "database", description: "Index curated topics", x: 1360, y: 1100 }
      ],
      links: [
        { source: "BookmarkTrigger", target: "Review", label: "New bookmark", type: "arrow", controlPoint: { x: 0, y: 0 } },
        { source: "Review", target: "NoteSync", label: "Keep", type: "arrow", controlPoint: { x: 0, y: 0 } },
        { source: "Review", target: "Logger", label: "Ignore", type: "dashed", controlPoint: { x: 0, y: 0 } }
      ]
    };

    templates.push({
      name: '🧠 Knowledge Curator Automation',
      description: `Dispatches new bookmark items into your active note "${latestNote.title || 'notebook'}".`,
      icon: '🧠',
      code: JSON.stringify(data, null, 2),
      isPersonal: true
    });
  }

  // 3. Combination: Bookmarks & Tasks (Research Pipeline Router)
  if (hasBookmarks && hasTasks) {
    const latestBookmark = bookmarks[0];
    const pendingTasks = tasks.filter(t => !t.completed).slice(0, 2);

    if (pendingTasks.length > 0) {
      const data = {
        nodes: [
          { id: "BookmarkSource", text: latestBookmark.title ? (latestBookmark.title.substring(0, 18) + '...') : "Bookmark Input", category: "trigger", description: "Knowledge stream reference", x: 800, y: 1000, linkedItem: { type: "bookmark", id: latestBookmark.id, title: latestBookmark.title || latestBookmark.url } },
          { id: "Analyze", text: "Topic Feasible?", category: "condition", description: "Filter content relevancy", x: 1050, y: 1000 }
        ],
        links: [
          { source: "BookmarkSource", target: "Analyze", label: "Inspect URL", type: "arrow", controlPoint: { x: 0, y: 0 } }
        ]
      };

      pendingTasks.forEach((task, idx) => {
        const taskId = `ResearchTask_${idx}`;
        data.nodes.push({
          id: taskId,
          text: task.text.length > 20 ? `${task.text.substring(0, 18)}...` : task.text,
          category: "action",
          description: "Workspace roadmap action",
          linkedItem: { type: "task", id: task.id, title: task.text },
          x: 1300,
          y: 900 + idx * 200
        });
        data.links.push({
          source: "Analyze",
          target: taskId,
          label: idx === 0 ? "Dispatch Roadmap" : "Auxiliary action",
          type: "arrow",
          controlPoint: { x: 0, y: idx === 0 ? -15 : 15 }
        });
      });

      templates.push({
        name: '🔍 Research Pipeline Router',
        description: `Dispatches tasks from bookmark "${latestBookmark.title || 'link'}" into your development flow!`,
        icon: '🔍',
        code: JSON.stringify(data, null, 2),
        isPersonal: true
      });
    }
  }

  // 4. Triple Combo: Notes & Bookmarks & Tasks (Deep Knowledge Mindmap)
  if (hasNotes && hasBookmarks && hasTasks) {
    const latestBookmark = bookmarks[0];
    const latestNote = notes[0];
    const latestTask = tasks[0];

    const data = {
      nodes: [
        { id: "Discovery", text: "Bookmark Ingest", category: "trigger", description: latestBookmark.title || "Read Later Link", x: 750, y: 1000, linkedItem: { type: "bookmark", id: latestBookmark.id, title: latestBookmark.title || latestBookmark.url } },
        { id: "NoteCapture", text: "Workspace Synthesis", category: "action", description: latestNote.title || "Ideation Notebook", x: 1000, y: 880, linkedItem: { type: "note", id: latestNote.id, title: latestNote.title } },
        { id: "Router", text: "Is Project Worthy?", category: "condition", description: "Audit design alignment", x: 1000, y: 1120 },
        { id: "ActionPlan", text: "Task Mobilize", category: "action", description: latestTask.text || "Primary Objective", x: 1250, y: 1000, linkedItem: { type: "task", id: latestTask.id, title: latestTask.text } },
        { id: "DatabaseStore", text: "Central Database", category: "database", description: "Sync knowledge base", x: 1500, y: 1000 }
      ],
      links: [
        { source: "Discovery", target: "NoteCapture", label: "Analyze", type: "arrow", controlPoint: { x: 0, y: -10 } },
        { source: "Discovery", target: "Router", label: "Inspect", type: "dashed", controlPoint: { x: 0, y: 10 } },
        { source: "NoteCapture", target: "ActionPlan", label: "Commit", type: "arrow", controlPoint: { x: 0, y: 0 } },
        { source: "Router", target: "ActionPlan", label: "Accept", type: "arrow", controlPoint: { x: 0, y: 0 } },
        { source: "ActionPlan", target: "DatabaseStore", label: "Sync Logs", type: "arrow", controlPoint: { x: 0, y: 0 } }
      ]
    };

    templates.push({
      name: '📝 Deep Knowledge Mindmap',
      description: 'Triple-link visual automations connecting Notes, Bookmarks, and Tasks in a unified flow.',
      icon: '📝',
      code: JSON.stringify(data, null, 2),
      isPersonal: true
    });
  }

  // 5. Data Source: Tasks only (Task Goal Checklist & Tracker)
  if (hasTasks && !hasNotes && !hasBookmarks) {
    const pendingTasks = tasks.filter(t => !t.completed).slice(0, 4);
    if (pendingTasks.length >= 2) {
      const data = {
        nodes: [
          { id: "TasksEntry", text: "Task Core Hub", category: "trigger", description: `${pendingTasks.length} active items`, x: 800, y: 1000 }
        ],
        links: []
      };

      pendingTasks.forEach((t, i) => {
        const id = `TaskNode_${i}`;
        data.nodes.push({
          id,
          text: t.text.length > 22 ? `${t.text.substring(0, 20)}...` : t.text,
          category: "action",
          description: "Active task item",
          linkedItem: { type: "task", id: t.id, title: t.text },
          x: 1080 + (i % 2) * 260,
          y: 900 + Math.floor(i / 2) * 200
        });
        data.links.push({
          source: "TasksEntry",
          target: id,
          label: i === 0 ? "Dispatch Flow" : "",
          type: "arrow",
          controlPoint: { x: 0, y: 0 }
        });
      });

      templates.push({
        name: '⚡ Tasks Automation Router',
        description: `Visual pipeline routing your active workspace tasks.`,
        icon: '⚡',
        code: JSON.stringify(data, null, 2),
        isPersonal: true
      });
    }
  }

  // 6. Data Source: Notes only (Notes Mindmap Flow)
  if (hasNotes && !hasBookmarks && !hasTasks) {
    const recent = notes.slice(0, 4);
    if (recent.length >= 2) {
      const data = {
        nodes: [
          { id: "NotesRoot", text: "Workspace Brain", category: "trigger", description: "Workspace ideation core", x: 1000, y: 1000 }
        ],
        links: []
      };

      recent.forEach((n, i) => {
        const id = `NoteNode_${i}`;
        const angle = (i * 2 * Math.PI) / recent.length;
        const rx = 1000 + 260 * Math.cos(angle);
        const ry = 1000 + 180 * Math.sin(angle);

        data.nodes.push({
          id,
          text: n.title ? (n.title.length > 20 ? `${n.title.substring(0, 18)}...` : n.title) : 'Untitled Note',
          category: "action",
          description: "Curated idea card",
          linkedItem: { type: "note", id: n.id, title: n.title },
          x: Math.round(rx),
          y: Math.round(ry)
        });
        data.links.push({
          source: "NotesRoot",
          target: id,
          label: "",
          type: "dashed",
          controlPoint: { x: 0, y: 0 }
        });
      });

      templates.push({
        name: '🌌 Notes Mindmap System',
        description: `Interactive mind map of your recent notes.`,
        icon: '🌌',
        code: JSON.stringify(data, null, 2),
        isPersonal: true
      });
    }
  }

  return templates;
};

/* ─── Default Workflow Serialized Diagram ─── */
const DEFAULT_CODE = `{
  "nodes": [
    {
      "id": "Trigger",
      "text": "Task Created",
      "category": "trigger",
      "description": "Listen for new workspace items",
      "x": 800,
      "y": 1000
    },
    {
      "id": "Condition",
      "text": "Is Large Task?",
      "category": "condition",
      "description": "Evaluate scope size",
      "x": 1080,
      "y": 1000
    },
    {
      "id": "SyncDB",
      "text": "Update Database",
      "category": "database",
      "description": "Log payload in cloud DB",
      "x": 1360,
      "y": 900
    },
    {
      "id": "NotifyUser",
      "text": "Send Alert",
      "category": "action",
      "description": "Dispatch UI system alert",
      "x": 1360,
      "y": 1100
    }
  ],
  "links": [
    {
      "source": "Trigger",
      "target": "Condition",
      "label": "On creation",
      "type": "arrow",
      "controlPoint": {
        "x": 0,
        "y": 0
      }
    },
    {
      "source": "Condition",
      "target": "SyncDB",
      "label": "Yes",
      "type": "arrow",
      "controlPoint": {
        "x": 0,
        "y": -20
      }
    },
    {
      "source": "Condition",
      "target": "NotifyUser",
      "label": "No",
      "type": "dashed",
      "controlPoint": {
        "x": 0,
        "y": 20
      }
    }
  ]
}`;

/* ─── Starter Templates ─── */
const STARTER_TEMPLATES = [
  {
    name: 'CI/CD Pipeline',
    description: 'DevOps automated deployment pipeline workflow.',
    icon: '🚀',
    code: `{
  "nodes": [
    { "id": "Commit", "text": "Git Push", "category": "trigger", "description": "Triggered on master branch", "x": 800, "y": 1000 },
    { "id": "Lint", "text": "Run Linters", "category": "action", "description": "Validate syntax standards", "x": 1030, "y": 900 },
    { "id": "Test", "text": "Unit Tests", "category": "action", "description": "Execute suite tests", "x": 1030, "y": 1100 },
    { "id": "Gate", "text": "Passed?", "category": "condition", "description": "Verify code checks", "x": 1250, "y": 1000 },
    { "id": "Prod", "text": "Deploy Prod", "category": "database", "description": "Ship production container", "x": 1470, "y": 1000 }
  ],
  "links": [
    { "source": "Commit", "target": "Lint", "label": "", "type": "arrow", "controlPoint": { "x": 0, "y": -10 } },
    { "source": "Commit", "target": "Test", "label": "", "type": "arrow", "controlPoint": { "x": 0, "y": 10 } },
    { "source": "Lint", "target": "Gate", "label": "", "type": "arrow", "controlPoint": { "x": 0, "y": 0 } },
    { "source": "Test", "target": "Gate", "label": "", "type": "arrow", "controlPoint": { "x": 0, "y": 0 } },
    { "source": "Gate", "target": "Prod", "label": "Passed", "type": "arrow", "controlPoint": { "x": 0, "y": 0 } }
  ]
}`
  },
  {
    name: 'Lead Generation Router',
    description: 'Marketing pipeline for evaluating customer signups.',
    icon: '🎯',
    code: `{
  "nodes": [
    { "id": "Signup", "text": "User Signup", "category": "trigger", "description": "New organic site lead", "x": 800, "y": 1000 },
    { "id": "Check", "text": "Enterprise?", "category": "condition", "description": "Review company domain", "x": 1050, "y": 1000 },
    { "id": "CRM", "text": "Sync CRM Hub", "category": "database", "description": "Add High-Priority record", "x": 1300, "y": 900 },
    { "id": "Onboard", "text": "Self-Serve Email", "category": "action", "description": "Dispatch automated course", "x": 1300, "y": 1100 }
  ],
  "links": [
    { "source": "Signup", "target": "Check", "label": "", "type": "arrow", "controlPoint": { "x": 0, "y": 0 } },
    { "source": "Check", "target": "CRM", "label": "Domain match", "type": "arrow", "controlPoint": { "x": 0, "y": -15 } },
    { "source": "Check", "target": "Onboard", "label": "Gmail/Yahoo", "type": "dashed", "controlPoint": { "x": 0, "y": 15 } }
  ]
}`
  }
];

const Charts = () => {
  const activeTheme = localStorage.getItem('vesta-theme') || 'carbon';
  const themeBackgrounds = {
    carbon: '#0c0e17',
    plasma: '#080612',
    matrix: '#040706'
  };
  const currentBgColor = themeBackgrounds[activeTheme] || '#0c0e17';

  // Saved Diagrams state
  const [charts, setCharts] = useState(() => {
    try {
      const saved = localStorage.getItem('vesta-saved-charts');
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(c => ({
          id: c.id, 
          name: c.name || 'Untitled', 
          code: c.code || DEFAULT_CODE,
          lastModified: c.lastModified || new Date().toISOString()
        }));
      }
    } catch {}
    return [{ id: '1', name: 'Standard Flow', code: DEFAULT_CODE, lastModified: new Date().toISOString() }];
  });

  const [activeChartId, setActiveChartId] = useState(() => charts[0]?.id || '1');
  const [chartCode, setChartCode] = useState(() => charts[0]?.code || DEFAULT_CODE);
  const [chartName, setChartName] = useState(() => charts[0]?.name || 'Standard Flow');
  const [isEditingName, setIsEditingName] = useState(false);

  const activeChart = useMemo(() => charts.find(c => c.id === activeChartId) || charts[0], [charts, activeChartId]);

  // Selector state for node active link category (note | task | bookmark)
  const [nodeLinkCategory, setNodeLinkCategory] = useState('note');
  const [multiConnect, setMultiConnect] = useState(true);

  // Left & Right Panels
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [rightView, setRightView] = useState('inspector'); // inspector | json

  // Selections
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);

  // Canvas zoom/pan
  const [canvasZoom, setCanvasZoom] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);

  // Spawners
  const [connectMode, setConnectMode] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState(null);

  // Modals
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'alert', confirmText: 'OK', cancelText: 'Cancel', onConfirm: null, onCancel: null });

  // Live user workspace data
  const [userTasks, setUserTasks] = useState([]);
  const [userNotes, setUserNotes] = useState([]);
  const [userBookmarks, setUserBookmarks] = useState([]);

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    const handleOutsideExportClick = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideExportClick);
    return () => document.removeEventListener('mousedown', handleOutsideExportClick);
  }, []);

  // Fetch live workspace data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const [tasksRes, notesRes, bookmarksRes] = await Promise.allSettled([
          getTasks(), getNotes(), getBookmarks()
        ]);
        if (tasksRes.status === 'fulfilled') setUserTasks(tasksRes.value.data || []);
        if (notesRes.status === 'fulfilled') setUserNotes(notesRes.value.data || []);
        if (bookmarksRes.status === 'fulfilled') setUserBookmarks(bookmarksRes.value.data || []);
      } catch {}
    };
    fetchUserData();
  }, []);

  const userTemplates = useMemo(() => {
    return generateUserTemplates(userTasks, userNotes, userBookmarks);
  }, [userTasks, userNotes, userBookmarks]);

  // Refs for smooth 60fps GPU dragging
  const previewRef = useRef(null);
  const canvasRef = useRef(null);
  const clickStartRef = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);
  
  const draggedNodeIdRef = useRef(null);
  const draggedEdgeRef = useRef(null);
  const nodeInitialOffsetRef = useRef({ x: 0, y: 0 });
  const edgeInitialOffsetRef = useRef({ x: 0, y: 0 });

  // Parse state into nodes and links
  const { nodes, links } = useMemo(() => {
    try {
      return migrateDiagramCode(chartCode);
    } catch {
      return { nodes: [], links: [] };
    }
  }, [chartCode]);

  // Dynamic helper to resolve coordinates for either a main node or a visual sub-node
  const findNodeOrSubNode = useCallback((id) => {
    const main = nodes.find(n => n.id === id);
    if (main) return main;
    
    for (const n of nodes) {
      if (n.subNodes) {
        const subIdx = n.subNodes.findIndex(s => s.id === id);
        if (subIdx !== -1) {
          const sub = n.subNodes[subIdx];
          const M = n.subNodes.length;
          const sx = n.x + (subIdx - (M - 1) / 2) * 130;
          const sy = n.y + 110;
          return {
            id: sub.id,
            text: sub.text,
            category: n.category,
            x: sx,
            y: sy,
            isSubNode: true
          };
        }
      }
    }
    return null;
  }, [nodes]);

  const selectedNode = useMemo(() => selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null, [nodes, selectedNodeId]);

  // Save/Sync Helpers
  const saveCharts = useCallback((updated) => {
    setCharts(updated);
    localStorage.setItem('vesta-saved-charts', JSON.stringify(updated));
  }, []);

  const applyCodeChange = useCallback((newCode) => {
    setChartCode(newCode);
    try {
      const parsed = JSON.parse(newCode);
      if (parsed && Array.isArray(parsed.nodes)) {
        const updated = charts.map(c => c.id === activeChartId ? { ...c, code: newCode, lastModified: new Date().toISOString() } : c);
        saveCharts(updated);
      }
    } catch (e) {}
  }, [charts, activeChartId, saveCharts]);

  const updateDiagramData = useCallback((newNodes, newLinks) => {
    const serialized = JSON.stringify({ nodes: newNodes, links: newLinks }, null, 2);
    applyCodeChange(serialized);
  }, [applyCodeChange]);

  const showAlert = (title, message) => {
    setModal({ isOpen: true, type: 'alert', title, message, confirmText: 'OK', cancelText: '', onConfirm: () => setModal(m => ({ ...m, isOpen: false })) });
  };

  const showConfirm = (title, message, onConfirm) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      onConfirm: () => { onConfirm(); setModal(m => ({ ...m, isOpen: false })); },
      onCancel: () => setModal(m => ({ ...m, isOpen: false }))
    });
  };

  // High-Fidelity Client-Side Vector & Image Rasterization Exporter
  const handleExport = (format) => {
    if (nodes.length === 0) {
      showAlert('Empty Canvas', 'There are no stages on the canvas to export.');
      return;
    }

    const baseName = (chartName || 'diagram').toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Helper to trigger unified file download (supports native Save File Picker where possible)
    const triggerDownload = async (blob, extension, mimeType) => {
      const suggestedName = `${baseName}_diagram.${extension}`;

      if ('showSaveFilePicker' in window) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName,
            types: [{
              description: `${extension.toUpperCase()} Diagram Export`,
              accept: {
                [mimeType]: [`.${extension}`]
              }
            }]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        } catch (err) {
          // If the user cancelled the picker dialog, abort download naturally
          if (err.name === 'AbortError') return;
          // For permission errors or unsupported secure contexts, fallback to classical link trigger
        }
      }

      // Classic Fallback: Programmatic link click download
      const blobURL = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobURL;
      downloadLink.download = suggestedName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      setTimeout(() => URL.revokeObjectURL(blobURL), 150);
    };

    if (format === 'svg') {
      // 1. Calculate boundaries of all nodes and subnodes to crop the diagram beautifully
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(n => {
        const cardH = 64 + (n.subNodes && n.subNodes.length > 0 ? 18 : 0) + (n.linkedItem ? 18 : 0);
        const paddingX = 174 / 2;
        const paddingY = (n.subNodes && n.subNodes.length > 0) ? 140 : (cardH / 2);
        
        minX = Math.min(minX, n.x - paddingX);
        minY = Math.min(minY, n.y - paddingY);
        maxX = Math.max(maxX, n.x + paddingX);
        maxY = Math.max(maxY, n.y + paddingY);

        if (n.subNodes) {
          n.subNodes.forEach((sub, sidx) => {
            const M = n.subNodes.length;
            const sx = n.x + (sidx - (M - 1) / 2) * 130;
            const sy = n.y + 110;
            minX = Math.min(minX, sx - 58);
            minY = Math.min(minY, sy - 18);
            maxX = Math.max(maxX, sx + 58);
            maxY = Math.max(maxY, sy + 18);
          });
        }
      });

      // Include connection lines control points (bends) so boundaries expand for looping curves
      links.forEach((link) => {
        const sNode = findNodeOrSubNode(link.source);
        const tNode = findNodeOrSubNode(link.target);
        if (sNode && tNode) {
          const mx = sNode.x + (tNode.x - sNode.x) / 2;
          const my = sNode.y + (tNode.y - sNode.y) / 2;
          const ctrlX = mx + (link.controlPoint?.x || 0);
          const ctrlY = my + (link.controlPoint?.y || 0);
          
          minX = Math.min(minX, ctrlX);
          minY = Math.min(minY, ctrlY);
          maxX = Math.max(maxX, ctrlX);
          maxY = Math.max(maxY, ctrlY);
        }
      });

      const margin = 60;
      minX -= margin;
      minY -= margin;
      maxX += margin;
      maxY += margin;

      const width = maxX - minX;
      const height = maxY - minY;

      const originalSvg = previewRef.current.querySelector('svg');
      if (!originalSvg) return;

      const svgClone = originalSvg.cloneNode(true);
      svgClone.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
      svgClone.setAttribute('width', width);
      svgClone.setAttribute('height', height);
      svgClone.setAttribute('style', `background-color: ${currentBgColor}; font-family: sans-serif;`);

      // Custom lightweight styles for SVG
      const cssStyles = `
        div, span, svg, path { box-sizing: border-box; }
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .items-center { align-items: center; }
        .justify-center { justify-content: center; }
        .justify-between { justify-content: space-between; }
        .shrink-0 { flex-shrink: 0; }
        .flex-1 { flex: 1 1 0%; }
        .min-w-0 { min-width: 0; }
        .relative { position: relative; }
        .absolute { position: absolute; }
        .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .w-\\[174px\\] { width: 174px; }
        .min-h-\\[64px\\] { min-height: 64px; }
        .rounded-2xl { border-radius: 16px; }
        .border { border: 1.2px solid rgba(255, 255, 255, 0.1); }
        .px-3\\.5 { padding-left: 14px; padding-right: 14px; }
        .py-3 { padding-top: 12px; padding-bottom: 12px; }
        .backdrop-blur-xl { background-color: rgba(11, 13, 23, 0.82); backdrop-filter: blur(20px); }
        .gap-2\\.5 { gap: 10px; }
        .gap-1\\.5 { gap: 6px; }
        .w-8\\.5 { width: 34px; }
        .h-8\\.5 { height: 34px; }
        .rounded-xl { border-radius: 12px; }
        .bg-white\\/\\\\[0\\\/\\\\[0\\\\.02\\\\\\] { background-color: rgba(255, 255, 255, 0.02); }
        .text-\\[10\\.5px\\] { font-size: 10.5px; }
        .text-\\[8px\\] { font-size: 8px; }
        .text-\\[8\\.5px\\] { font-size: 8.5px; }
        .text-\\[6\\.5px\\] { font-size: 6.5px; }
        .font-bold { font-weight: 700; }
        .font-medium { font-weight: 500; }
        .text-white { color: #ffffff; }
        .text-slate-400 { color: #94a3b8; }
        .text-slate-500 { color: #64748b; }
        .mt-1\\.5 { margin-top: 6px; }
        .pt-1\\.5 { padding-top: 6px; }
        .mt-2 { margin-top: 8px; }
        .pt-2 { padding-top: 8px; }
        .border-t { border-top: 1px solid rgba(255, 255, 255, 0.05); }
        .border-white\\/5 { border-color: rgba(255, 255, 255, 0.05); }
        .text-\\[7px\\] { font-size: 7px; }
        .font-black { font-weight: 900; }
        .uppercase { text-transform: uppercase; }
        .tracking-wider { letter-spacing: 0.05em; }
        .w-\\[116px\\] { width: 116px; }
        .min-h-\\[36px\\] { min-height: 36px; }
        .px-2 { padding-left: 8px; padding-right: 8px; }
        .py-1\\.5 { padding-top: 6px; padding-bottom: 6px; }
        .bg-emerald-950\\/20 { background-color: rgba(16, 185, 129, 0.1); }
        .border-emerald-500\\/20 { border-color: rgba(16, 185, 129, 0.2); }
        .w-4 { width: 16px; }
        .h-4 { height: 16px; }
        .w-3 { width: 12px; }
        .h-3 { height: 12px; }
        .w-3\\.5 { width: 14px; }
        .h-3\\.5 { height: 14px; }
        .w-2\\.5 { width: 10px; }
        .h-2\\.5 { height: 10px; }
      `;

      const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleEl.textContent = `/* <![CDATA[ */\n${cssStyles}\n/* ]]> */`;
      svgClone.insertBefore(styleEl, svgClone.firstChild);

      const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      foreignObject.setAttribute('x', minX);
      foreignObject.setAttribute('y', minY);
      foreignObject.setAttribute('width', width);
      foreignObject.setAttribute('height', height);

      const htmlContainer = document.createElement('div');
      htmlContainer.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      htmlContainer.setAttribute('style', `position: relative; width: ${width}px; height: ${height}px; overflow: visible;`);

      const nodeCards = previewRef.current.querySelectorAll('[data-node-id], [data-sub-node-id]');
      nodeCards.forEach(card => {
        const clone = card.cloneNode(true);
        const style = window.getComputedStyle(card);
        const left = parseFloat(style.left) - minX;
        const top = parseFloat(style.top) - minY;
        
        clone.style.left = `${left}px`;
        clone.style.top = `${top}px`;
        clone.style.position = 'absolute';
        clone.style.transform = 'translate(-50%, -50%)';
        clone.style.transition = 'none';
        clone.style.animation = 'none';
        
        htmlContainer.appendChild(clone);
      });

      foreignObject.appendChild(htmlContainer);
      svgClone.appendChild(foreignObject);

      const svgString = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      
      triggerDownload(svgBlob, 'svg', 'image/svg+xml');
    } else {
      // 2. High-Fidelity Native 2D Canvas Exporter for PNG/JPG to bypass Electron file:// security boundaries
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Compute content boundaries (exact crop)
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(n => {
          const cardH = 64 + (n.subNodes && n.subNodes.length > 0 ? 18 : 0) + (n.linkedItem ? 18 : 0);
          const paddingX = 174 / 2;
          const paddingY = (n.subNodes && n.subNodes.length > 0) ? 140 : (cardH / 2);
          
          minX = Math.min(minX, n.x - paddingX);
          minY = Math.min(minY, n.y - paddingY);
          maxX = Math.max(maxX, n.x + paddingX);
          maxY = Math.max(maxY, n.y + paddingY);

          if (n.subNodes) {
            n.subNodes.forEach((sub, sidx) => {
              const M = n.subNodes.length;
              const sx = n.x + (sidx - (M - 1) / 2) * 130;
              const sy = n.y + 110;
              minX = Math.min(minX, sx - 58);
              minY = Math.min(minY, sy - 18);
              maxX = Math.max(maxX, sx + 58);
              maxY = Math.max(maxY, sy + 18);
            });
          }
        });

        // Include connection curves control points (bends) so boundaries expand for looping curves
        links.forEach((link) => {
          const sNode = findNodeOrSubNode(link.source);
          const tNode = findNodeOrSubNode(link.target);
          if (sNode && tNode) {
            const mx = sNode.x + (tNode.x - sNode.x) / 2;
            const my = sNode.y + (tNode.y - sNode.y) / 2;
            const ctrlX = mx + (link.controlPoint?.x || 0);
            const ctrlY = my + (link.controlPoint?.y || 0);
            
            minX = Math.min(minX, ctrlX);
            minY = Math.min(minY, ctrlY);
            maxX = Math.max(maxX, ctrlX);
            maxY = Math.max(maxY, ctrlY);
          }
        });

        const margin = 60;
        minX -= margin;
        minY -= margin;
        maxX += margin;
        maxY += margin;

        const width = maxX - minX;
        const height = maxY - minY;

        // Draw and rasterize completely in same-origin space (guarantees zero CORS taint)
        canvas.width = width * 2;
        canvas.height = height * 2;
        ctx.scale(2, 2);
        ctx.translate(-minX, -minY);

        // Draw solid dark background
        ctx.fillStyle = currentBgColor;
        ctx.fillRect(minX, minY, width, height);

        const getAccent = (category) => {
          const cat = NODE_CATEGORIES.find(c => c.type === category);
          return cat ? cat.accent : '#3b82f6';
        };

        const getIntersection = (fromX, fromY, toX, toY, targetNode) => {
          const dx = toX - fromX;
          const dy = toY - fromY;
          if (dx === 0 && dy === 0) return { x: toX, y: toY };
          const isSub = targetNode && targetNode.isSubNode;
          const halfW = (isSub ? (116 / 2) : (174 / 2)) + 6;
          let cardH = 64;
          if (targetNode && !isSub) {
            if (targetNode.subNodes && targetNode.subNodes.length > 0) cardH += 18;
            if (targetNode.linkedItem) cardH += 18;
          }
          const halfH = (isSub ? (36 / 2) : (cardH / 2)) + 6;
          const scaleX = dx !== 0 ? Math.abs(halfW / dx) : Infinity;
          const scaleY = dy !== 0 ? Math.abs(halfH / dy) : Infinity;
          const scale = Math.min(scaleX, scaleY);
          if (scale < 1) return { x: toX - dx * scale, y: toY - dy * scale };
          return { x: toX, y: toY };
        };

        // Draw subnode curved branches
        nodes.forEach(node => {
          if (!node.subNodes || node.subNodes.length === 0) return;
          const M = node.subNodes.length;
          const accentColor = node.style?.stroke || getAccent(node.category);
          
          node.subNodes.forEach((sub, sidx) => {
            const sx = node.x + (sidx - (M - 1) / 2) * 130;
            const sy = node.y + 110;
            
            const px = node.x;
            const py = node.y + 32;
            const tx = sx;
            const ty = sy - 18;
            
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.bezierCurveTo(px, py + 30, tx, ty - 30, tx, ty);
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 1.2;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
          });
        });

        // Draw links with labels and arrowheads
        links.forEach((link) => {
          const sNode = findNodeOrSubNode(link.source);
          const tNode = findNodeOrSubNode(link.target);
          if (!sNode || !tNode) return;

          const mx = sNode.x + (tNode.x - sNode.x) / 2;
          const my = sNode.y + (tNode.y - sNode.y) / 2;
          const ctrlX = mx + (link.controlPoint?.x || 0);
          const ctrlY = my + (link.controlPoint?.y || 0);

          const startPt = getIntersection(ctrlX, ctrlY, sNode.x, sNode.y, sNode);
          const endPt = getIntersection(ctrlX, ctrlY, tNode.x, tNode.y, tNode);

          ctx.beginPath();
          ctx.moveTo(startPt.x, startPt.y);
          ctx.quadraticCurveTo(ctrlX, ctrlY, endPt.x, endPt.y);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = link.type === 'thick' ? 3.5 : 1.5;
          if (link.type === 'dashed') {
            ctx.setLineDash([5, 5]);
          } else {
            ctx.setLineDash([]);
          }
          ctx.stroke();
          ctx.setLineDash([]);

          const angle = Math.atan2(endPt.y - ctrlY, endPt.x - ctrlX);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.beginPath();
          ctx.moveTo(endPt.x, endPt.y);
          ctx.lineTo(endPt.x - 9 * Math.cos(angle - Math.PI / 6), endPt.y - 9 * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(endPt.x - 9 * Math.cos(angle + Math.PI / 6), endPt.y - 9 * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();

          if (link.label) {
            const bx = 0.25 * startPt.x + 0.5 * ctrlX + 0.25 * endPt.x;
            const by = 0.25 * startPt.y + 0.5 * ctrlY + 0.25 * endPt.y;

            ctx.fillStyle = 'rgba(11, 13, 23, 0.95)';
            ctx.font = 'bold 7px sans-serif';
            const labelText = link.label;
            const textW = ctx.measureText(labelText).width;
            
            ctx.beginPath();
            ctx.roundRect(bx - textW/2 - 4, by - 6, textW + 8, 12, 4);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            ctx.fillStyle = '#94a3b8';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(labelText, bx, by);
          }
        });

        const drawCard = (cx, cy, cw, ch, radius, strokeColor) => {
          ctx.fillStyle = 'rgba(11, 13, 23, 0.92)';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(cx - cw / 2, cy - ch / 2, cw, ch, radius);
          } else {
            const rx = cx - cw / 2;
            const ry = cy - ch / 2;
            ctx.moveTo(rx + radius, ry);
            ctx.lineTo(rx + cw - radius, ry);
            ctx.quadraticCurveTo(rx + cw, ry, rx + cw, ry + radius);
            ctx.lineTo(rx + cw, ry + ch - radius);
            ctx.quadraticCurveTo(rx + cw, ry + ch, rx + cw - radius, ry + ch);
            ctx.lineTo(rx + radius, ry + ch);
            ctx.quadraticCurveTo(rx, ry + ch, rx, ry + ch - radius);
            ctx.lineTo(rx, ry + radius);
            ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
            ctx.closePath();
          }
          ctx.fill();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        };

        // Draw subnodes
        nodes.forEach(node => {
          if (!node.subNodes || node.subNodes.length === 0) return;
          const M = node.subNodes.length;
          const strokeColor = node.style?.stroke || getAccent(node.category);
          
          node.subNodes.forEach((sub, sidx) => {
            const sx = node.x + (sidx - (M - 1) / 2) * 130;
            const sy = node.y + 110;

            drawCard(sx, sy, 116, 36, 12, sub.completed ? 'rgba(16, 185, 129, 0.5)' : `${strokeColor}44`);

            ctx.strokeStyle = sub.completed ? '#10b981' : 'rgba(255, 255, 255, 0.2)';
            ctx.fillStyle = sub.completed ? 'rgba(16, 185, 129, 0.2)' : 'transparent';
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(sx - 48, sy - 7, 14, 14, 3);
            } else {
              ctx.rect(sx - 48, sy - 7, 14, 14);
            }
            ctx.fill();
            ctx.stroke();

            if (sub.completed) {
              ctx.strokeStyle = '#10b981';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(sx - 45, sy - 1);
              ctx.lineTo(sx - 42, sy + 2);
              ctx.lineTo(sx - 38, sy - 4);
              ctx.stroke();
            }

            ctx.fillStyle = sub.completed ? '#64748b' : '#e2e8f0';
            ctx.font = 'bold 8.5px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            
            let txt = sub.text;
            if (txt.length > 18) txt = txt.substring(0, 16) + '...';
            ctx.fillText(txt, sx - 28, sy);
          });
        });

        // Draw main nodes
        nodes.forEach(node => {
          const accentColor = node.style?.stroke || getAccent(node.category);
          
          const hasSub = node.subNodes && node.subNodes.length > 0;
          const hasLinked = !!node.linkedItem;
          const cardH = 64 + (hasSub ? 18 : 0) + (hasLinked ? 18 : 0);
          const cardTop = node.y - cardH / 2;
          
          drawCard(node.x, node.y, 174, cardH, 16, accentColor);

          // Icon container (centered vertically in the top 64px section)
          const iconCenterY = cardTop + 32;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(node.x - 73, iconCenterY - 17, 34, 34, 10);
          } else {
            ctx.rect(node.x - 73, iconCenterY - 17, 34, 34);
          }
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = accentColor;
          ctx.beginPath();
          ctx.arc(node.x - 56, iconCenterY, 4, 0, 2 * Math.PI);
          ctx.fill();

          // Title & Description (centered vertically in the top 64px section)
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10.5px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          
          let title = node.text.replace(/^<b>|<\/b>$/g, '');
          if (title.length > 20) title = title.substring(0, 18) + '...';
          ctx.fillText(title, node.x - 28, iconCenterY - 8);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '500 8px sans-serif';
          let desc = node.description || `ID: ${node.id}`;
          if (desc.length > 25) desc = desc.substring(0, 23) + '...';
          ctx.fillText(desc, node.x - 28, iconCenterY + 8);

          // Sub-nodes checklist summary statistics (at cardTop + 64)
          if (hasSub) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(node.x - 73, cardTop + 64);
            ctx.lineTo(node.x + 73, cardTop + 64);
            ctx.stroke();

            const done = node.subNodes.filter(s => s.completed).length;
            ctx.fillStyle = accentColor;
            ctx.font = '900 6.5px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${node.subNodes.length} SUB-STEPS`, node.x - 28, cardTop + 64 + 9);

            ctx.textAlign = 'right';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(`${done}/${node.subNodes.length} DONE`, node.x + 60, cardTop + 64 + 9);
          }

          // Linked Workspace Item badge
          if (hasLinked) {
            const linkTop = cardTop + 64 + (hasSub ? 18 : 0);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(node.x - 73, linkTop);
            ctx.lineTo(node.x + 73, linkTop);
            ctx.stroke();

            ctx.fillStyle = accentColor;
            ctx.font = '900 6.5px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            
            const typeStr = node.linkedItem.type ? node.linkedItem.type.toUpperCase() : 'LINK';
            let itemTitle = node.linkedItem.title || '';
            if (itemTitle.length > 20) itemTitle = itemTitle.substring(0, 18) + '...';
            ctx.fillText(`${typeStr}: ${itemTitle}`, node.x - 73, linkTop + 9);
          }
        });

        // Export generated canvas directly to native file blob (origin is 100% clean)
        canvas.toBlob((blob) => {
          if (blob) {
            triggerDownload(blob, format, format === 'png' ? 'image/png' : 'image/jpeg');
          } else {
            showAlert('Export Error', 'Your browser was unable to process the canvas data.');
          }
        }, format === 'png' ? 'image/png' : 'image/jpeg', 0.95);
      } catch (canvasErr) {
        console.error("Canvas drawing exception", canvasErr);
        showAlert('Export Error', 'An unexpected error occurred while drawing the canvas.');
      }
    }
  };
  // Sync state on diagram switch
  useEffect(() => {
    if (activeChart) {
      setChartCode(activeChart.code);
      setChartName(activeChart.name);
      setSelectedNodeId(null);
      setSelectedEdge(null);
      setPanOffset({ x: 0, y: 0 });
      setCanvasZoom(1.0);
    }
  }, [activeChartId]);

  // Wheel zoom bindings
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      e.preventDefault();
      // Increase responsiveness and widen zoom limit
      setCanvasZoom(prev => Math.min(4.0, Math.max(0.25, prev + (e.deltaY < 0 ? 0.08 : -0.08))));
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Keyboard keydown handlers (Supports Delete node hotkey)
  useEffect(() => {
    const handleKey = (e) => {
      if (modal.isOpen) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (modal.onConfirm) modal.onConfirm();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          if (modal.onCancel) modal.onCancel();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (connectMode) { setConnectMode(false); setConnectSourceId(null); }
        else if (selectedNodeId) setSelectedNodeId(null);
        else if (selectedEdge) setSelectedEdge(null);
      }

      // Delete Node or Link on Delete/Backspace click
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Stop key event if typing inside properties inputs or contentEditables
        const isTyping = document.activeElement.tagName === 'INPUT' || 
                         document.activeElement.tagName === 'TEXTAREA' || 
                         document.activeElement.isContentEditable;
        if (!isTyping) {
          if (selectedNodeId) {
            e.preventDefault();
            handleDeleteNode(selectedNodeId);
          } else if (selectedEdge) {
            e.preventDefault();
            handleDeleteEdge(selectedEdge.source, selectedEdge.target);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [connectMode, selectedNodeId, selectedEdge, modal, nodes, links]);

  // Mouse Move & Up global bindings for robust dragging
  useEffect(() => {
    const onGlobalMouseMove = (e) => {
      const container = previewRef.current;
      if (!container) return;

      // Card bounding box card math helper for 60fps shortening (with 10px offset for clean arrowhead tip)
      const getIntersection = (fromX, fromY, toX, toY, targetNode) => {
        const idx = toX - fromX;
        const idy = toY - fromY;
        if (idx === 0 && idy === 0) return { x: toX, y: toY };
        const isSub = targetNode && targetNode.isSubNode;
        const halfW = (isSub ? (116 / 2) : (174 / 2)) + 10;
        let cardH = 64;
        if (targetNode && !isSub) {
          if (targetNode.subNodes && targetNode.subNodes.length > 0) cardH += 18;
          if (targetNode.linkedItem) cardH += 18;
        }
        const halfH = (isSub ? (36 / 2) : (cardH / 2)) + 10;
        const scaleX = idx !== 0 ? Math.abs(halfW / idx) : Infinity;
        const scaleY = idy !== 0 ? Math.abs(halfH / idy) : Infinity;
        const scale = Math.min(scaleX, scaleY);
        if (scale < 1) return { x: toX - idx * scale, y: toY - idy * scale };
        return { x: toX, y: toY };
      };

      // A. Dragging Node
      if (draggedNodeIdRef.current) {
        const dx = (e.clientX - dragStartPos.current.x) / canvasZoom;
        const dy = (e.clientY - dragStartPos.current.y) / canvasZoom;
        
        hasDraggedRef.current = true;
        const nodeId = draggedNodeIdRef.current;
        const initial = nodeInitialOffsetRef.current;
        const newX = Math.round(initial.x + dx);
        const newY = Math.round(initial.y + dy);

        // Mutate node DOM card directly (60fps)
        const nodeEl = container.querySelector(`[data-node-id="${nodeId}"]`);
        if (nodeEl) {
          nodeEl.style.left = `${newX}px`;
          nodeEl.style.top = `${newY}px`;
        }

        // Find the node object in standard list to update its subnodes and branches in real-time
        const node = nodes.find(n => n.id === nodeId);
        if (node && node.subNodes) {
          const M = node.subNodes.length;
          node.subNodes.forEach((sub, subIdx) => {
            const subEl = container.querySelector(`[data-sub-node-id="${sub.id}"]`);
            if (subEl) {
              const sx = newX + (subIdx - (M - 1) / 2) * 130;
              const sy = newY + 110;
              subEl.style.left = `${sx}px`;
              subEl.style.top = `${sy}px`;
            }

            // Update parent-sub branch S-curves directly in real-time
            const branchPathEl = container.querySelector(`[data-branch-id="branch-${nodeId}-${sub.id}"]`);
            if (branchPathEl) {
              const px = newX;
              const py = newY + 32;
              const tx = newX + (subIdx - (M - 1) / 2) * 130;
              const ty = newY + 110 - 18;
              const branchD = `M ${px} ${py} C ${px} ${py + 30}, ${tx} ${ty - 30}, ${tx} ${ty}`;
              branchPathEl.setAttribute('d', branchD);
            }
          });
        }

        // Helper to check if a source/target matches node or is sub-node of node
        const isLinkedToNodeOrSub = (id, targetNodeId) => {
          return id === targetNodeId || id.startsWith(targetNodeId + '_sub_');
        };

        // Helper to resolve real-time dragging coordinate of node or subnode
        const getDraggedPos = (id) => {
          if (id === nodeId) {
            return { x: newX, y: newY };
          }
          if (id.startsWith(nodeId + '_sub_')) {
            if (node && node.subNodes) {
              const subIdx = node.subNodes.findIndex(s => s.id === id);
              if (subIdx !== -1) {
                const M = node.subNodes.length;
                return {
                  x: newX + (subIdx - (M - 1) / 2) * 130,
                  y: newY + 110,
                  isSubNode: true
                };
              }
            }
          }
          return findNodeOrSubNode(id);
        };

        // Mutate SVG connection curves directly (60fps)
        links.forEach((link, idx) => {
          if (isLinkedToNodeOrSub(link.source, nodeId) || isLinkedToNodeOrSub(link.target, nodeId)) {
            const pathEl = container.querySelector(`[data-link-id="${link.source}-${link.target}-${idx}"]`);
            const overlayEl = container.querySelector(`[data-link-overlay-id="${link.source}-${link.target}-${idx}"]`);

            const sNode = getDraggedPos(link.source);
            const tNode = getDraggedPos(link.target);

            if (sNode && tNode) {
              const mx = sNode.x + (tNode.x - sNode.x) / 2;
              const my = sNode.y + (tNode.y - sNode.y) / 2;
              const ctrlX = mx + (link.controlPoint?.x || 0);
              const ctrlY = my + (link.controlPoint?.y || 0);

              const startPt = getIntersection(ctrlX, ctrlY, sNode.x, sNode.y, sNode);
              const endPt = getIntersection(ctrlX, ctrlY, tNode.x, tNode.y, tNode);

              const d = `M ${startPt.x} ${startPt.y} Q ${ctrlX} ${ctrlY} ${endPt.x} ${endPt.y}`;
              if (pathEl) pathEl.setAttribute('d', d);
              if (overlayEl) overlayEl.setAttribute('d', d);
            }
          }
        });
        return;
      }

      // B. Dragging Connection Bend
      if (draggedEdgeRef.current) {
        const dx = (e.clientX - dragStartPos.current.x) / canvasZoom;
        const dy = (e.clientY - dragStartPos.current.y) / canvasZoom;

        hasDraggedRef.current = true;
        const { link, index } = draggedEdgeRef.current;
        const initial = edgeInitialOffsetRef.current;
        const newCPX = Math.round(initial.x + dx);
        const newCPY = Math.round(initial.y + dy);

        const pathEl = container.querySelector(`[data-link-id="${link.source}-${link.target}-${index}"]`);
        const overlayEl = container.querySelector(`[data-link-overlay-id="${link.source}-${link.target}-${index}"]`);

        const sNode = findNodeOrSubNode(link.source);
        const tNode = findNodeOrSubNode(link.target);

        if (sNode && tNode) {
          const mx = sNode.x + (tNode.x - sNode.x) / 2;
          const my = sNode.y + (tNode.y - sNode.y) / 2;
          const ctrlX = mx + newCPX;
          const ctrlY = my + newCPY;

          const startPt = getIntersection(ctrlX, ctrlY, sNode.x, sNode.y, sNode);
          const endPt = getIntersection(ctrlX, ctrlY, tNode.x, tNode.y, tNode);

          const d = `M ${startPt.x} ${startPt.y} Q ${ctrlX} ${ctrlY} ${endPt.x} ${endPt.y}`;
          if (pathEl) pathEl.setAttribute('d', d);
          if (overlayEl) overlayEl.setAttribute('d', d);
        }
        return;
      }

      // C. Panning Grid
      if (isPanning) {
        const dx = e.clientX - clickStartRef.current.x;
        const dy = e.clientY - clickStartRef.current.y;
        if (Math.sqrt(dx*dx + dy*dy) > 4) {
          hasDraggedRef.current = true;
        }
        setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      }
    };

    const onGlobalMouseUp = (e) => {
      // 1. Save Node coordinates
      if (draggedNodeIdRef.current && hasDraggedRef.current) {
        const nodeId = draggedNodeIdRef.current;
        const dx = (e.clientX - dragStartPos.current.x) / canvasZoom;
        const dy = (e.clientY - dragStartPos.current.y) / canvasZoom;
        const initial = nodeInitialOffsetRef.current;
        const x = Math.round(initial.x + dx);
        const y = Math.round(initial.y + dy);

        const updatedNodes = nodes.map(n => n.id === nodeId ? { ...n, x, y } : n);
        updateDiagramData(updatedNodes, links);
      }

      // 2. Save Connection bend coordinates
      if (draggedEdgeRef.current && hasDraggedRef.current) {
        const { link, index } = draggedEdgeRef.current;
        const dx = (e.clientX - dragStartPos.current.x) / canvasZoom;
        const dy = (e.clientY - dragStartPos.current.y) / canvasZoom;
        const initial = edgeInitialOffsetRef.current;
        const finalCPX = Math.round(initial.x + dx);
        const finalCPY = Math.round(initial.y + dy);

        const updatedLinks = links.map((l, lidx) => lidx === index ? { ...l, controlPoint: { x: finalCPX, y: finalCPY } } : l);
        updateDiagramData(nodes, updatedLinks);
      }

      draggedNodeIdRef.current = null;
      draggedEdgeRef.current = null;
      setIsPanning(false);
    };

    const blockSelect = (e) => {
      if (draggedNodeIdRef.current || draggedEdgeRef.current) e.preventDefault();
    };

    window.addEventListener('selectstart', blockSelect, { capture: true });
    window.addEventListener('dragstart', blockSelect, { capture: true });
    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);

    return () => {
      window.removeEventListener('selectstart', blockSelect, { capture: true });
      window.removeEventListener('dragstart', blockSelect, { capture: true });
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
    };
  }, [canvasZoom, isPanning, panStart, nodes, links, updateDiagramData]);

  // Canvas MouseDown Panning & Drag Initiation
  const handleCanvasMouseDown = (e) => {
    if (e.button !== 0) return;
    
    // Skip form inputs, interactive triggers
    if (e.target.closest('button, input, textarea, select')) return;

    // Return focus to window/document so keyboard hotkeys work perfectly
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }

    const nodeCard = e.target.closest('[data-node-id]');
    const edgeOverlay = e.target.closest('[data-link-overlay-id]');

    // If clicking a floating tray panel, cancel canvas drag actions
    if (e.target.closest('.pointer-events-auto') && !nodeCard && !edgeOverlay) {
      return;
    }

    hasDraggedRef.current = false;

    // 1. Detect Node Drag Click
    if (nodeCard) {
      const nodeId = nodeCard.getAttribute('data-node-id');
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        e.preventDefault();
        draggedNodeIdRef.current = nodeId;
        nodeInitialOffsetRef.current = { x: node.x, y: node.y };
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        return;
      }
    }

    // 2. Detect Connection Bend Drag Click
    if (edgeOverlay) {
      const parts = edgeOverlay.getAttribute('data-link-overlay-id').split('-');
      const index = parseInt(parts[2]);
      const link = links[index];
      if (link) {
        e.preventDefault();
        draggedEdgeRef.current = { link, index };
        edgeInitialOffsetRef.current = link.controlPoint || { x: 0, y: 0 };
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        return;
      }
    }

    // 3. Initiate Background Panning
    clickStartRef.current = { x: e.clientX, y: e.clientY };
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  // Canvas Clicking Selection
  const handleCanvasClick = (e) => {
    if (hasDraggedRef.current) return;

    // A. Detect Sub-node Card Click (Connect Target or Select Parent)
    const subNodeCard = e.target.closest('[data-sub-node-id]');
    if (subNodeCard) {
      const subId = subNodeCard.getAttribute('data-sub-node-id');
      const parentId = subNodeCard.getAttribute('data-parent-node-id');
      
      if (connectMode) {
        if (!connectSourceId) {
          setConnectSourceId(subId);
        } else if (connectSourceId !== subId) {
          if (links.some(l => l.source === connectSourceId && l.target === subId)) {
            showAlert('Exists', 'Connection already active between these items.');
          } else {
            const newLink = { source: connectSourceId, target: subId, label: '', type: 'arrow', controlPoint: { x: 0, y: 0 } };
            updateDiagramData(nodes, [...links, newLink]);
          }
          if (!multiConnect) {
            setConnectSourceId(null);
            setConnectMode(false);
          }
        }
      } else {
        setSelectedNodeId(parentId);
        setSelectedEdge(null);
        setRightOpen(true);
        setRightView('inspector');
      }
      return;
    }

    // B. Detect Main Node Card Click
    const nodeCard = e.target.closest('[data-node-id]');
    if (nodeCard) {
      const nodeId = nodeCard.getAttribute('data-node-id');
      if (connectMode) {
        if (!connectSourceId) {
          setConnectSourceId(nodeId);
        } else if (connectSourceId !== nodeId) {
          // Verify link existence
          if (links.some(l => l.source === connectSourceId && l.target === nodeId)) {
            showAlert('Exists', 'Connection already active between these stages.');
          } else {
            const newLink = { source: connectSourceId, target: nodeId, label: '', type: 'arrow', controlPoint: { x: 0, y: 0 } };
            updateDiagramData(nodes, [...links, newLink]);
          }
          if (!multiConnect) {
            setConnectSourceId(null);
            setConnectMode(false);
          }
        }
      } else {
        setSelectedNodeId(nodeId);
        setSelectedEdge(null);
        setRightOpen(true);
        setRightView('inspector');
      }
      return;
    }

    // C. Select Connection line
    const edgeOverlay = e.target.closest('[data-link-overlay-id]');
    if (edgeOverlay) {
      const attr = edgeOverlay.getAttribute('data-link-overlay-id');
      const parts = attr.split('-');
      const index = parseInt(parts[2]);
      if (links[index]) {
        setSelectedEdge(links[index]);
        setSelectedNodeId(null);
        setRightOpen(true);
        setRightView('inspector');
      }
      return;
    }

    // D. Clear selection on background click
    if (!e.target.closest('[data-node-id], [data-sub-node-id], [data-link-overlay-id], .pointer-events-auto')) {
      setSelectedNodeId(null);
      setSelectedEdge(null);
      if (connectMode) { 
        setConnectSourceId(null); 
        setConnectMode(false); 
      }
    }
  };

  /* ─── Workflow CRUD Operations ─── */
  const handleCreateDiagram = () => {
    const newId = String(Date.now());
    const newDiag = { id: newId, name: `Workflow ${charts.length + 1}`, code: DEFAULT_CODE, lastModified: new Date().toISOString() };
    const updated = [...charts, newDiag];
    saveCharts(updated);
    setActiveChartId(newId);
    setChartCode(DEFAULT_CODE);
    setChartName(newDiag.name);
    setSelectedNodeId(null);
    setSelectedEdge(null);
    setIsEditingName(true);
  };

  const handleDeleteDiagram = (id) => {
    if (charts.length <= 1) { showAlert('Cannot Delete', 'At least one flowchart is required.'); return; }
    const target = charts.find(c => c.id === id);
    showConfirm('Delete Workflow', `Delete "${target?.name || 'this workflow'}" permanently?`, () => {
      const updated = charts.filter(c => c.id !== id);
      saveCharts(updated);
      if (activeChartId === id) {
        setActiveChartId(updated[0].id);
        setChartCode(updated[0].code);
        setChartName(updated[0].name);
      }
    });
  };

  const handleSpawnNode = (category) => {
    const id = `${category.charAt(0).toUpperCase()}${category.slice(1)}_${Date.now().toString().slice(-4)}`;
    
    // Center node exactly inside current canvas viewport coordinates
    const newX = Math.round(1000 - panOffset.x / canvasZoom);
    const newY = Math.round(1000 - panOffset.y / canvasZoom);

    const presetCat = NODE_CATEGORIES.find(c => c.type === category) || NODE_CATEGORIES[0];
    const newNode = {
      id,
      text: `${presetCat.label} Stage`,
      category,
      description: presetCat.desc,
      x: newX,
      y: newY
    };

    updateDiagramData([...nodes, newNode], links);
    setSelectedNodeId(id);
    setSelectedEdge(null);
    setRightOpen(true);
    setRightView('inspector');
  };

  const handleDeleteNode = (nodeId) => {
    const updatedNodes = nodes.filter(n => n.id !== nodeId);
    const updatedLinks = links.filter(l => l.source !== nodeId && l.target !== nodeId);
    updateDiagramData(updatedNodes, updatedLinks);
    setSelectedNodeId(null);
  };

  const handleDuplicateNode = () => {
    if (!selectedNode) return;
    const cloneId = `${selectedNode.id}_Copy`;
    if (nodes.some(n => n.id === cloneId)) return;

    const newNode = {
      ...selectedNode,
      id: cloneId,
      text: `${selectedNode.text.replace(/^<b>|<\/b>$/g, '')} (Copy)`,
      x: selectedNode.x + 80,
      y: selectedNode.y + 60
    };

    updateDiagramData([...nodes, newNode], links);
    setSelectedNodeId(cloneId);
  };

  const handleStyleNodeColor = (nodeId, colorHex) => {
    const updated = nodes.map(n => {
      if (n.id === nodeId) {
        return {
          ...n,
          style: {
            ...n.style,
            stroke: colorHex
          }
        };
      }
      return n;
    });
    updateDiagramData(updated, links);
  };

  const handleRenameNodeTitle = (nodeId, titleText) => {
    const updated = nodes.map(n => n.id === nodeId ? { ...n, text: titleText } : n);
    updateDiagramData(updated, links);
  };

  const handleRenameNodeDesc = (nodeId, descText) => {
    const updated = nodes.map(n => n.id === nodeId ? { ...n, description: descText } : n);
    updateDiagramData(updated, links);
  };

  // Add / Toggle / Link / Delete nested checklist sub-actions
  const handleAddSubNode = (nodeId, text) => {
    if (!text.trim()) return;
    const target = nodes.find(n => n.id === nodeId);
    if (!target) return;
    const subNodes = [...(target.subNodes || []), {
      id: `${nodeId}_sub_${Date.now().toString().slice(-4)}`,
      text: text.trim(),
      completed: false,
      linkedItem: null
    }];
    const updated = nodes.map(n => n.id === nodeId ? { ...n, subNodes } : n);
    updateDiagramData(updated, links);
  };

  const handleToggleSubNode = (nodeId, subId) => {
    const target = nodes.find(n => n.id === nodeId);
    if (!target) return;
    const subNodes = (target.subNodes || []).map(sub => 
      sub.id === subId ? { ...sub, completed: !sub.completed } : sub
    );
    const updated = nodes.map(n => n.id === nodeId ? { ...n, subNodes } : n);
    updateDiagramData(updated, links);
  };

  const handleLinkSubNodeItem = (nodeId, subId, itemObj) => {
    const target = nodes.find(n => n.id === nodeId);
    if (!target) return;
    const subNodes = (target.subNodes || []).map(sub => 
      sub.id === subId ? { ...sub, linkedItem: itemObj } : sub
    );
    const updated = nodes.map(n => n.id === nodeId ? { ...n, subNodes } : n);
    updateDiagramData(updated, links);
  };

  const handleDeleteSubNode = (nodeId, subId) => {
    const target = nodes.find(n => n.id === nodeId);
    if (!target) return;
    const subNodes = (target.subNodes || []).filter(sub => sub.id !== subId);
    const updated = nodes.map(n => n.id === nodeId ? { ...n, subNodes } : n);
    updateDiagramData(updated, links);
  };

  // Link note/task/bookmark to node
  const handleLinkWorkspaceItem = (nodeId, itemObj) => {
    const updated = nodes.map(n => n.id === nodeId ? { ...n, linkedItem: itemObj } : n);
    updateDiagramData(updated, links);
  };

  const handleRenameEdge = (edge, label) => {
    const updated = links.map(l => (l.source === edge.source && l.target === edge.target) ? { ...l, label } : l);
    updateDiagramData(nodes, updated);
    setSelectedEdge(prev => prev ? { ...prev, label } : null);
  };

  const handleChangeEdgeType = (edge, type) => {
    const updated = links.map(l => (l.source === edge.source && l.target === edge.target) ? { ...l, type } : l);
    updateDiagramData(nodes, updated);
    setSelectedEdge(prev => prev ? { ...prev, type } : null);
  };

  const handleDeleteEdge = (source, target) => {
    const updated = links.filter(l => !(l.source === source && l.target === target));
    updateDiagramData(nodes, updated);
    setSelectedEdge(null);
  };

  const handleLoadTemplate = (tmpl) => {
    showConfirm('Load Template', `Load visual starter "${tmpl.name}"? This replaces the current canvas.`, () => {
      applyCodeChange(tmpl.code);
      setSelectedNodeId(null);
      setSelectedEdge(null);
    });
  };

  /* ─── Render: Dynamic glassmorphic Workflow Node ─── */
  const renderWorkflowNode = (node) => {
    const isSelected = selectedNodeId && normalizeForMatch(selectedNodeId) === normalizeForMatch(node.id);
    const cat = NODE_CATEGORIES.find(c => c.type === node.category) || {
      type: 'action',
      label: 'Stage',
      accent: '#3b82f6',
      color: 'text-blue-400',
      icon: Sliders
    };

    const currentAccent = activeTheme === 'plasma' ? '#a855f7' : activeTheme === 'matrix' ? '#10b981' : '#3b82f6';
    const strokeColor = isSelected ? currentAccent : (node.style?.stroke || cat.accent);
    const fillColor = 'rgba(11, 13, 23, 0.82)';

    const cardStyle = {
      backgroundColor: fillColor,
      borderColor: strokeColor,
      borderWidth: isSelected ? '2px' : '1.2px',
      boxShadow: isSelected 
        ? `0 0 20px ${strokeColor}55` 
        : '0 8px 32px -4px rgba(0, 0, 0, 0.65)',
    };

    const IconComponent = cat.icon;

    return (
      <div 
        style={cardStyle}
        className="w-[174px] min-h-[64px] h-auto rounded-2xl flex flex-col justify-center px-3.5 py-3 relative border backdrop-blur-xl transition-all duration-200 select-none hover:border-white/20 active:scale-98"
      >
        {/* Top Header Row */}
        <div className="flex items-center gap-2.5 w-full">
          {/* Modern category-colored icon container */}
          <div className="flex items-center justify-center shrink-0">
            <div 
              className="w-8.5 h-8.5 rounded-xl flex items-center justify-center bg-white/[0.02] border transition-all"
              style={{ 
                borderColor: node.style?.stroke || cat.accent,
                boxShadow: `0 0 12px ${(node.style?.stroke || cat.accent)}22, inset 0 0 8px ${(node.style?.stroke || cat.accent)}11` 
              }}
            >
              <IconComponent className="w-4 h-4" style={{ color: node.style?.stroke || cat.accent }} />
            </div>
          </div>

          {/* Label and descriptive text */}
          <div className="flex flex-col min-w-0 flex-1 leading-normal select-none pointer-events-none">
            <span className="text-[10.5px] font-bold text-white truncate pr-1">
              {node.text.replace(/^<b>|<\/b>$/g, '')}
            </span>
            <span className="text-[8px] text-slate-400 font-medium truncate mt-0.5 pr-1">
              {node.description || `ID: ${node.id}`}
            </span>
          </div>
        </div>

        {/* Sub-nodes checklist summary statistics */}
        {node.subNodes && node.subNodes.length > 0 && (
          <div className="w-full mt-1.5 pt-1.5 border-t border-white/5 flex items-center justify-between text-[7px] text-slate-400 font-black uppercase tracking-wider select-none pointer-events-none">
            <span className="flex items-center gap-1">
              <Workflow className="w-2.5 h-2.5" style={{ color: node.style?.stroke || cat.accent }} />
              <span>{node.subNodes.length} Sub-steps</span>
            </span>
            <span>
              {node.subNodes.filter(s => s.completed).length}/{node.subNodes.length} Done
            </span>
          </div>
        )}

        {/* Linked Workspace Item badge */}
        {node.linkedItem && (
          <div 
            className="w-full mt-2 pt-2 border-t border-white/5 flex items-center gap-1.5 text-[7px] font-black uppercase tracking-wider select-none pointer-events-none"
            style={{ color: node.style?.stroke || cat.accent }}
          >
            {node.linkedItem.type === 'note' ? (
              <FileText className="w-3 h-3 shrink-0" />
            ) : node.linkedItem.type === 'task' ? (
              <Check className="w-3 h-3 shrink-0" />
            ) : (
              <Link2 className="w-3 h-3 shrink-0" />
            )}
            <span className="truncate flex-1 font-bold">{node.linkedItem.title}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="-mt-[1.75rem] -mr-[2.5rem] -mb-[1.75rem] -ml-[2.5rem] w-[calc(100%+5rem)] h-[calc(100%+3.5rem)] relative overflow-hidden bg-[var(--color-background)] text-slate-100 premium-page-entrance select-none">
      
      {/* Panning Grid & Node Canvas area */}
      <div 
        ref={canvasRef} 
        onMouseDown={handleCanvasMouseDown}
        onClick={handleCanvasClick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const category = e.dataTransfer.getData('text/plain');
          if (!category) return;

          const rect = canvasRef.current.getBoundingClientRect();
          const xFromCenter = e.clientX - (rect.left + rect.width / 2);
          const yFromCenter = e.clientY - (rect.top + rect.height / 2);

          // Reverse panning & zoom scales to identify drop coordinate in grid space (offset by 1000px canvas center)
          const dropX = 1000 + Math.round((xFromCenter - panOffset.x) / canvasZoom);
          const dropY = 1000 + Math.round((yFromCenter - panOffset.y) / canvasZoom);

          const id = `${category.charAt(0).toUpperCase()}${category.slice(1)}_${Date.now().toString().slice(-4)}`;
          const presetCat = NODE_CATEGORIES.find(c => c.type === category) || NODE_CATEGORIES[0];
          const newNode = {
            id,
            text: `${presetCat.label} Stage`,
            category,
            description: presetCat.desc,
            x: dropX,
            y: dropY
          };

          updateDiagramData([...nodes, newNode], links);
          setSelectedNodeId(id);
          setSelectedEdge(null);
          setRightOpen(true);
          setRightView('inspector');
        }}
        style={{
          backgroundImage: showGrid ? `radial-gradient(rgba(255, 255, 255, 0.07) ${1.1 * canvasZoom}px, transparent ${1.1 * canvasZoom}px)` : 'none',
          backgroundSize: `${24 * canvasZoom}px ${24 * canvasZoom}px`,
          backgroundPosition: `calc(50% + ${panOffset.x}px) calc(50% + ${panOffset.y}px)`
        }}
        className="absolute inset-0 w-full h-full z-0 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
      >
        {/* Panning Viewport Container */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${panOffset.x}px), calc(-50% + ${panOffset.y}px))`,
            width: '2000px',
            height: '2000px',
            pointerEvents: 'none'
          }}
          className="overflow-visible flex items-center justify-center relative"
        >
          {/* Scaling Viewport Wrapper */}
          <div 
            ref={previewRef}
            style={{
              width: '100%',
              height: '100%',
              transform: `scale(${canvasZoom})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.15s cubic-bezier(0.1, 0.8, 0.25, 1)',
              pointerEvents: 'none'
            }}
            className="overflow-visible flex items-center justify-center relative"
          >
            {/* SVG Connection Layer */}
            <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="0" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#94a3b8" />
                </marker>
                <marker id="arrow-selected" viewBox="0 0 10 10" refX="0" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={activeTheme === 'plasma' ? '#a855f7' : activeTheme === 'matrix' ? '#10b981' : '#3b82f6'} />
                </marker>
              </defs>

              {/* Visual Branch Sub-node Connections */}
              {nodes.map(node => {
                if (!node.subNodes || node.subNodes.length === 0) return null;
                const M = node.subNodes.length;
                const cat = NODE_CATEGORIES.find(c => c.type === node.category) || NODE_CATEGORIES[0];
                const accentColor = node.style?.stroke || cat.accent;
                
                return node.subNodes.map((sub, sidx) => {
                  const sx = node.x + (sidx - (M - 1) / 2) * 130;
                  const sy = node.y + 110;
                  
                  // Curved branch S-curves
                  const px = node.x;
                  const py = node.y + 32;
                  const tx = sx;
                  const ty = sy - 18;
                  
                  const d = `M ${px} ${py} C ${px} ${py + 30}, ${tx} ${ty - 30}, ${tx} ${ty}`;
                  
                  return (
                    <path 
                      key={`branch-${node.id}-${sub.id}`}
                      data-branch-id={`branch-${node.id}-${sub.id}`}
                      d={d}
                      fill="none"
                      stroke={accentColor}
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      className="opacity-40"
                    />
                  );
                });
              })}

              {/* Connection Lines & Flowing Particles */}
              {links.map((link, idx) => {
                const sNode = findNodeOrSubNode(link.source);
                const tNode = findNodeOrSubNode(link.target);
                if (!sNode || !tNode) return null;

                const isEdgeSelected = selectedEdge && 
                  (selectedEdge.source === link.source && selectedEdge.target === link.target);

                // Calculate dynamic Bezier curve variables
                const mx = sNode.x + (tNode.x - sNode.x) / 2;
                const my = sNode.y + (tNode.y - sNode.y) / 2;
                const ctrlX = mx + (link.controlPoint?.x || 0);
                const ctrlY = my + (link.controlPoint?.y || 0);

                // Card boundary intersection math (with 6px offset for perfect arrowhead alignment)
                const getIntersection = (fromX, fromY, toX, toY, targetNode) => {
                  const dx = toX - fromX;
                  const dy = toY - fromY;
                  if (dx === 0 && dy === 0) return { x: toX, y: toY };
                  
                  const isSub = targetNode && targetNode.isSubNode;
                  const halfW = (isSub ? (116 / 2) : (174 / 2)) + 6;
                  let cardH = 64;
                  if (targetNode && !isSub) {
                    if (targetNode.subNodes && targetNode.subNodes.length > 0) cardH += 18;
                    if (targetNode.linkedItem) cardH += 18;
                  }
                  const halfH = (isSub ? (36 / 2) : (cardH / 2)) + 6;
                  
                  const scaleX = dx !== 0 ? Math.abs(halfW / dx) : Infinity;
                  const scaleY = dy !== 0 ? Math.abs(halfH / dy) : Infinity;
                  const scale = Math.min(scaleX, scaleY);
                  
                  if (scale < 1) {
                    return {
                      x: toX - dx * scale,
                      y: toY - dy * scale
                    };
                  }
                  return { x: toX, y: toY };
                };

                const startPt = getIntersection(ctrlX, ctrlY, sNode.x, sNode.y, sNode);
                const endPt = getIntersection(ctrlX, ctrlY, tNode.x, tNode.y, tNode);

                const d = `M ${startPt.x} ${startPt.y} Q ${ctrlX} ${ctrlY} ${endPt.x} ${endPt.y}`;

                const currentAccent = activeTheme === 'plasma' ? '#a855f7' : activeTheme === 'matrix' ? '#10b981' : '#3b82f6';
                const strokeStyle = {
                  stroke: isEdgeSelected ? currentAccent : 'rgba(255, 255, 255, 0.22)',
                  strokeWidth: link.type === 'thick' ? '4.5px' : '1.5px',
                  strokeDasharray: link.type === 'dashed' ? '5 5' : 'none',
                  filter: isEdgeSelected ? `drop-shadow(0 0 8px ${currentAccent}8c)` : 'none',
                };

                return (
                  <g key={`flow-${link.source}-${link.target}-${idx}`} className="overflow-visible font-mono" style={{ pointerEvents: 'none' }}>
                    {/* Mouse hit container overlay */}
                    <path 
                      d={d} 
                      fill="none" 
                      style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                      data-link-overlay-id={`${link.source}-${link.target}-${idx}`}
                      stroke="transparent" 
                      strokeWidth="16"
                    />
                    {/* Visually curved path */}
                    <path 
                      d={d} 
                      fill="none" 
                      data-link-id={`${link.source}-${link.target}-${idx}`}
                      style={{ ...strokeStyle, pointerEvents: 'stroke', cursor: 'pointer' }}
                      markerEnd={`url(#${isEdgeSelected ? 'arrow-selected' : 'arrow'})`}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Draggable Node Cards */}
            {nodes.map(node => (
              <div 
                key={node.id}
                data-node-id={node.id}
                style={{
                  position: 'absolute',
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  transform: 'translate(-50%, -50%)',
                  transition: 'none'
                }}
                className="absolute z-10 cursor-grab active:cursor-grabbing pointer-events-auto"
              >
                {renderWorkflowNode(node)}
              </div>
            ))}

            {/* Visual Branch Sub-node Cards */}
            {nodes.map(node => {
              if (!node.subNodes || node.subNodes.length === 0) return null;
              const M = node.subNodes.length;
              const cat = NODE_CATEGORIES.find(c => c.type === node.category) || NODE_CATEGORIES[0];
              const strokeColor = node.style?.stroke || cat.accent;
              
              return node.subNodes.map((sub, sidx) => {
                const sx = node.x + (sidx - (M - 1) / 2) * 130;
                const sy = node.y + 110;
                const isSubSelected = selectedNodeId === node.id;
                
                const subCardStyle = {
                  backgroundColor: 'rgba(11, 13, 23, 0.88)',
                  borderColor: sub.completed ? 'rgba(16, 185, 129, 0.5)' : `${strokeColor}33`,
                  borderWidth: '1.2px',
                  boxShadow: isSubSelected ? `0 0 10px ${strokeColor}22` : '0 4px 16px -2px rgba(0, 0, 0, 0.5)',
                  transition: 'border-color 0.2s, background-color 0.2s, transform 0.2s, box-shadow 0.2s'
                };
                
                return (
                  <div
                    key={sub.id}
                    data-sub-node-id={sub.id}
                    data-parent-node-id={node.id}
                    style={{
                      position: 'absolute',
                      left: `${sx}px`,
                      top: `${sy}px`,
                      transform: 'translate(-50%, -50%)',
                      ...subCardStyle
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(node.id);
                      setSelectedEdge(null);
                      setRightOpen(true);
                      setRightView('inspector');
                    }}
                    className={`w-[116px] min-h-[36px] rounded-xl flex flex-col justify-center px-2 py-1.5 border backdrop-blur-xl transition-all duration-200 select-none hover:border-white/20 active:scale-98 cursor-pointer pointer-events-auto ${sub.completed ? 'bg-emerald-950/20' : ''}`}
                  >
                    <div className="flex items-center gap-1.5 w-full leading-normal">
                      <div className="shrink-0 flex items-center justify-center">
                        <div 
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                            sub.completed ? 'border-emerald-500 bg-emerald-500/20' : 'border-white/10'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSubNode(node.id, sub.id);
                          }}
                        >
                          {sub.completed && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                        </div>
                      </div>
                      <span className={`text-[8.5px] font-bold truncate flex-1 ${sub.completed ? 'text-slate-500 line-through font-medium' : 'text-slate-200'}`}>
                        {sub.text}
                      </span>
                    </div>

                    {sub.linkedItem && (
                      <div className="flex items-center gap-1 mt-1 text-[6.5px] font-black uppercase text-slate-500 truncate pointer-events-none">
                        {sub.linkedItem.type === 'note' ? (
                          <FileText className="w-2.5 h-2.5 shrink-0" />
                        ) : sub.linkedItem.type === 'task' ? (
                          <Check className="w-2.5 h-2.5 shrink-0" />
                        ) : (
                          <Link2 className="w-2.5 h-2.5 shrink-0" />
                        )}
                        <span className="truncate">{sub.linkedItem.title}</span>
                      </div>
                    )}
                  </div>
                );
              });
            })}

          </div>
        </div>
      </div>

      {/* Top Banner (Connecting source indicator) */}
      <AnimatePresence>
        {connectMode && (
          <motion.div initial={{ opacity: 0, y: -25 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -25 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-2xl text-emerald-400 text-[10px] font-bold flex items-center gap-3 shadow-2xl backdrop-blur-md pointer-events-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            {connectSourceId
              ? <span>Source: <strong className="text-white font-mono text-[9px]">{connectSourceId}</strong> — Click target stage/sub-step</span>
              : <span>Click any stage or sub-step to connect</span>
            }
            <div 
              onClick={() => setMultiConnect(!multiConnect)}
              className="flex items-center gap-2 ml-2 border-l border-emerald-500/20 pl-3 select-none cursor-pointer text-slate-300 hover:text-white transition-colors"
            >
              <div 
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                  multiConnect 
                    ? 'border-emerald-500 bg-emerald-500/25 text-emerald-400 font-bold shadow-[0_0_8px_rgba(16,185,129,0.25)]' 
                    : 'border-white/15 hover:border-white/30 bg-[var(--color-background)]'
                }`}
              >
                {multiConnect && <Check className="w-2.5 h-2.5 text-emerald-400 font-bold" />}
              </div>
              <label className="text-[9px] uppercase tracking-wider cursor-pointer">Multi-Connect</label>
            </div>
            <button onClick={() => { setConnectMode(false); setConnectSourceId(null); }} className="p-1 hover:bg-emerald-500/20 rounded-md cursor-pointer ml-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Floating Dashboard Header (Placed right below title bar) */}
      <header className="absolute left-1/2 -translate-x-1/2 top-3 z-20 h-11 px-4 bg-[var(--color-card)] backdrop-blur-xl rounded-2xl flex items-center gap-4 shadow-2xl pointer-events-auto">
        <div className="flex items-center gap-2">
          <Workflow className="w-4 h-4 text-[var(--color-accent-blue-bright)] animate-pulse" />
          {isEditingName ? (
            <div className="flex items-center gap-1">
              <input 
                type="text" 
                value={chartName} 
                onChange={e => {
                  const val = e.target.value;
                  setChartName(val);
                  saveCharts(charts.map(c => c.id === activeChartId ? { ...c, name: val } : c));
                }}
                onBlur={() => setIsEditingName(false)} 
                onKeyDown={e => e.key === 'Enter' && setIsEditingName(false)}
                className="bg-white/[0.04] border border-white/10 rounded-lg px-2 py-0.5 text-xxs text-white font-bold focus:outline-none focus:border-blue-500/50 w-36" 
                autoFocus 
              />
              <button onClick={() => setIsEditingName(false)} className="p-0.5 text-emerald-400 cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => setIsEditingName(true)}>
              <span className="text-xxs font-black uppercase tracking-wider text-slate-200">{chartName}</span>
              <FileEdit className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
            </div>
          )}
        </div>
        
        <div className="w-[1px] h-4 bg-white/10" />

        <div className="flex gap-1.5">
          <button 
            onClick={() => setLeftOpen(!leftOpen)} 
            className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer ${leftOpen ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-white'}`}
          >
            Palette
          </button>
          <button 
            onClick={() => setRightOpen(!rightOpen)} 
            className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer ${rightOpen ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-white'}`}
          >
            Inspector
          </button>
        </div>
      </header>

      {/* Floating Canvas Controls (Top-Right, aligned right below title bar) */}
      <div className="absolute top-3 right-4 z-20 flex items-center gap-2 bg-[var(--color-card)] backdrop-blur-xl px-3 py-1 rounded-full text-slate-300 shadow-xl pointer-events-auto">
        <button onClick={() => setCanvasZoom(z => Math.max(0.25, z - 0.1))} className="p-1 hover:text-white cursor-pointer"><ZoomOut className="w-3.5 h-3.5" /></button>
        <span onClick={() => { setCanvasZoom(1); setPanOffset({x:0,y:0}); }} className="text-[9px] font-mono font-bold w-10 text-center cursor-pointer hover:text-white">{Math.round(canvasZoom * 100)}%</span>
        <button onClick={() => setCanvasZoom(z => Math.min(4, z + 0.1))} className="p-1 hover:text-white cursor-pointer"><ZoomIn className="w-3.5 h-3.5" /></button>
        <div className="w-[1px] h-3 bg-white/10" />
        <button onClick={() => setShowGrid(!showGrid)} className="p-1 hover:text-white cursor-pointer text-[8px] font-black uppercase">
          Grid {showGrid ? '✓' : '✗'}
        </button>
        <div className="w-[1px] h-3 bg-white/10" />
        <div ref={exportRef} className="relative flex items-center">
          <button 
            onClick={() => setExportOpen(!exportOpen)} 
            className={`p-1 hover:text-white cursor-pointer text-[8px] font-black uppercase flex items-center gap-1 transition-colors ${exportOpen ? 'text-blue-400' : ''}`}
            title="Export Diagram"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
          
          {exportOpen && (
            <div className="absolute right-0 top-7 w-28 bg-[var(--color-card)] border border-white/15 rounded-xl shadow-2xl backdrop-blur-2xl p-1.5 flex flex-col gap-1 z-50">
              <button 
                onClick={() => { handleExport('svg'); setExportOpen(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-[9px] font-bold text-slate-300 hover:bg-white/[0.03] hover:text-white cursor-pointer transition-colors"
              >
                SVG Vector
              </button>
              <button 
                onClick={() => { handleExport('png'); setExportOpen(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-[9px] font-bold text-slate-300 hover:bg-white/[0.03] hover:text-white cursor-pointer transition-colors"
              >
                PNG Image (2x)
              </button>
              <button 
                onClick={() => { handleExport('jpg'); setExportOpen(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-[9px] font-bold text-slate-300 hover:bg-white/[0.03] hover:text-white cursor-pointer transition-colors"
              >
                JPG Image (2x)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* LEFT SIDEBAR: Spawner Palette & Library */}
      <AnimatePresence>
        {leftOpen && (
          <motion.div 
            initial={{ opacity: 0, x: -200 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -200 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            style={{ top: '3rem' }}
            className="absolute left-4 bottom-4 w-72 z-10 bg-[var(--color-background)]/90 border border-white/10 rounded-2xl p-4.5 flex flex-col gap-4 backdrop-blur-xl shadow-2xl pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xxs font-black uppercase tracking-wider text-white">Tool Palette</h3>
              </div>
              <button onClick={() => setLeftOpen(false)} className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/5 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
            </div>

            {/* Spawn list */}
            <div className="space-y-2">
              <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Spawn Stages</span>
              <div className="grid grid-cols-2 gap-1.5">
                {NODE_CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button 
                      key={cat.type} 
                      onClick={() => handleSpawnNode(cat.type)}
                      draggable={true}
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', cat.type); }}
                      className="flex flex-col items-start p-2 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/10 text-left transition-all cursor-grab active:cursor-grabbing select-none active:scale-95"
                    >
                      <Icon className={`w-3.5 h-3.5 ${cat.color} mb-1`} />
                      <span className="text-[9px] font-bold text-white">{cat.label}</span>
                      <span className="text-[6.5px] text-slate-500 font-medium truncate w-full mt-0.5">{cat.desc.slice(0, 24)}...</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Connection Control</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setConnectMode(!connectMode); if (connectMode) setConnectSourceId(null); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                    connectMode 
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                      : 'bg-white/[0.02] border border-white/5 text-slate-300 hover:bg-white/[0.06] hover:border-white/15'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>{connectMode ? 'Connecting...' : 'Connect Stages'}</span>
                </button>
              </div>
            </div>

            {/* Library list of all diagrams */}
            <div className="flex-1 min-h-0 flex flex-col gap-2">
              <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Saved Pipelines ({charts.length})</span>
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-1 pr-0.5">
                {charts.map(chart => (
                  <div 
                    key={chart.id} 
                    onClick={() => { setActiveChartId(chart.id); setChartCode(chart.code); setChartName(chart.name); setSelectedNodeId(null); setSelectedEdge(null); }}
                    className={`group flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                      chart.id === activeChartId 
                        ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' 
                        : 'bg-white/[0.005] border-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileText className={`w-3.5 h-3.5 shrink-0 ${chart.id === activeChartId ? 'text-blue-400' : 'text-slate-600'}`} />
                      <span className="text-[9px] font-bold truncate pr-1">{chart.name}</span>
                    </div>
                    {charts.length > 1 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteDiagram(chart.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-rose-400 rounded hover:bg-rose-500/10 cursor-pointer transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <button 
                onClick={handleCreateDiagram} 
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-[8.5px] font-black uppercase tracking-wider text-white shadow-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 mt-1 active:scale-96"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Workflow</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIGHT SIDEBAR: Context Inspector / Dashboard */}
      <AnimatePresence>
        {rightOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 200 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: 200 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            style={{ top: '3rem' }}
            className="absolute right-4 bottom-4 w-88 z-10 bg-[var(--color-background)]/90 border border-white/10 rounded-2xl p-4.5 flex flex-col backdrop-blur-xl shadow-2xl pointer-events-auto"
          >
            {/* Tab select header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5 shrink-0">
              <div className="flex gap-6">
                <button 
                  onClick={() => setRightView('inspector')}
                  className={`text-[9px] font-black uppercase tracking-wider pb-1.5 border-b-2 cursor-pointer transition-colors ${rightView === 'inspector' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-white'}`}
                >
                  Properties
                </button>
                <button 
                  onClick={() => setRightView('json')}
                  className={`text-[9px] font-black uppercase tracking-wider pb-1.5 border-b-2 cursor-pointer transition-colors ${rightView === 'json' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-white'}`}
                >
                  JSON Console
                </button>
              </div>
              <button onClick={() => setRightOpen(false)} className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/5 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
            </div>

            {/* Inner view container */}
            <div className="flex-1 overflow-y-auto no-scrollbar pt-3 min-h-0 select-text">
              {rightView === 'inspector' ? (
                <div className="space-y-4">
                  
                  {/* A. If Node Selected */}
                  {selectedNode ? (
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-3 rounded-2xl">
                        <div className="flex items-center gap-2 min-w-0">
                          <Eye className="w-4 h-4 text-purple-400" />
                          <div className="min-w-0">
                            <span className="text-[7px] font-black uppercase tracking-widest text-slate-500">Stage Properties</span>
                            <span className="text-[9.5px] font-bold text-white block truncate pr-1">{selectedNode.id}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={handleDuplicateNode} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white" title="Duplicate Node"><Copy className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteNode(selectedNode.id)} className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-400" title="Delete Node"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>

                      {/* Editing Title & Desc */}
                      <div className="space-y-2.5">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Stage Title</span>
                          <input 
                            type="text" 
                            value={selectedNode.text} 
                            onChange={e => handleRenameNodeTitle(selectedNode.id, e.target.value)}
                            className="bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-2 text-xxs text-white font-bold focus:outline-none focus:border-blue-500/50" 
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Description Subtitle</span>
                          <textarea 
                            rows={2} 
                            value={selectedNode.description || ''} 
                            onChange={e => handleRenameNodeDesc(selectedNode.id, e.target.value)}
                            className="bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-1.5 text-xxs text-white font-medium resize-none focus:outline-none focus:border-blue-500/50" 
                          />
                        </div>
                      </div>

                      {/* Sub-stages checklist builder */}
                      <div className="pt-2.5 border-t border-white/5 space-y-2 select-none">
                        <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Sub-actions checklist</span>
                        <div className="flex gap-1.5">
                          <input 
                            type="text" 
                            placeholder="Add sub-step (press Enter)..."
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSubNode(selectedNode.id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="flex-1 bg-[var(--color-background)]/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-xxs text-white focus:outline-none focus:border-blue-500/50 placeholder:text-slate-600" 
                          />
                        </div>
                        {selectedNode.subNodes && selectedNode.subNodes.length > 0 && (
                          <div className="space-y-2">
                            {selectedNode.subNodes.map((sub) => (
                              <div key={sub.id} className="flex flex-col gap-1.5 p-2 rounded-xl bg-white/[0.01] border border-white/5 text-xxs">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {/* Premium Custom Checkbox */}
                                    <div 
                                      onClick={() => handleToggleSubNode(selectedNode.id, sub.id)}
                                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                        sub.completed 
                                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 font-bold' 
                                          : 'border-white/10 hover:border-white/30 bg-[var(--color-background)]/85'
                                      }`}
                                    >
                                      {sub.completed && <Check className="w-2.5 h-2.5 text-emerald-400 font-bold" />}
                                    </div>
                                    <input 
                                      type="text"
                                      value={sub.text}
                                      onChange={e => {
                                        const val = e.target.value;
                                        const updatedSubNodes = selectedNode.subNodes.map(s => s.id === sub.id ? { ...s, text: val } : s);
                                        updateDiagramData(nodes.map(n => n.id === selectedNode.id ? { ...n, subNodes: updatedSubNodes } : n), links);
                                      }}
                                      className="bg-transparent border-none p-0 text-white font-bold focus:ring-0 text-xxs flex-1 truncate"
                                    />
                                  </div>
                                  <button 
                                    onClick={() => handleDeleteSubNode(selectedNode.id, sub.id)}
                                    className="text-slate-500 hover:text-rose-400 cursor-pointer shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Link item menu for sub-node */}
                                <div className="mt-1 ml-5 select-none">
                                  {sub.linkedItem ? (
                                    <div className={`flex items-center justify-between p-1 px-2 rounded-lg border text-[7.5px] font-black uppercase tracking-wider select-none ${
                                      sub.linkedItem.type === 'note' ? 'bg-blue-950/20 border-blue-500/20 text-blue-400' :
                                      sub.linkedItem.type === 'task' ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' :
                                      'bg-purple-950/20 border-purple-500/20 text-purple-400'
                                    }`}>
                                      <div className="flex items-center gap-1 min-w-0">
                                        {sub.linkedItem.type === 'note' ? <FileText className="w-2.5 h-2.5 shrink-0" /> :
                                         sub.linkedItem.type === 'task' ? <Check className="w-2.5 h-2.5 shrink-0" /> :
                                         <Link2 className="w-2.5 h-2.5 shrink-0" />}
                                        <span className="truncate max-w-[130px] font-bold">{sub.linkedItem.title}</span>
                                      </div>
                                      <button 
                                        onClick={() => handleLinkSubNodeItem(selectedNode.id, sub.id, null)}
                                        className="p-0.5 hover:text-rose-400 text-slate-500 transition-colors cursor-pointer"
                                      >
                                        <Unlink className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-0.5">
                                      <CustomCombobox
                                        value=""
                                        options={[
                                          ...userNotes.map(n => ({ value: `note-${n.id}`, label: `📝 ${n.title || 'Untitled Note'}` })),
                                          ...userTasks.map(t => ({ value: `task-${t.id}`, label: `✅ ${t.text}` })),
                                          ...userBookmarks.map(b => ({ value: `bookmark-${b.id}`, label: `🔖 ${b.title || b.url}` }))
                                        ]}
                                        onChange={(val) => {
                                          if (!val) {
                                            handleLinkSubNodeItem(selectedNode.id, sub.id, null);
                                          } else {
                                            const parts = val.split('-');
                                            const type = parts[0];
                                            const id = parts.slice(1).join('-');
                                            const title = type === 'note' ? (userNotes.find(n => n.id === id)?.title || 'Untitled') :
                                                          type === 'task' ? (userTasks.find(t => t.id === id)?.text || 'Untitled') :
                                                          (userBookmarks.find(b => b.id === id)?.title || userBookmarks.find(b => b.id === id)?.url || 'Untitled');
                                            handleLinkSubNodeItem(selectedNode.id, sub.id, { type, id, title });
                                          }
                                        }}
                                        placeholder="🔗 Link Notes/Tasks/Bookmarks..."
                                        icon={Link2}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Modern Workspace Link Card / Selector */}
                      <div className="pt-3 border-t border-white/5 space-y-2.5 select-none">
                        <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider block">Link Workspace Item</span>
                        
                        {selectedNode.linkedItem ? (
                          /* High-visibility Linked Card */
                          <div className={`p-3 rounded-2xl border flex items-center justify-between transition-all shadow-lg ${
                            selectedNode.linkedItem.type === 'note' ? 'bg-blue-950/10 border-blue-500/20 shadow-blue-500/5' :
                            selectedNode.linkedItem.type === 'task' ? 'bg-emerald-950/10 border-emerald-500/20 shadow-emerald-500/5' :
                            'bg-purple-950/10 border-purple-500/20 shadow-purple-500/5'
                          }`}>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                selectedNode.linkedItem.type === 'note' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                selectedNode.linkedItem.type === 'task' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                'bg-purple-500/10 border-purple-500/20 text-purple-400'
                              }`}>
                                {selectedNode.linkedItem.type === 'note' ? <FileText className="w-4 h-4" /> :
                                 selectedNode.linkedItem.type === 'task' ? <Check className="w-4 h-4" /> :
                                 <Link2 className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <span className={`text-[6.5px] font-black uppercase tracking-widest block ${
                                  selectedNode.linkedItem.type === 'note' ? 'text-blue-400' :
                                  selectedNode.linkedItem.type === 'task' ? 'text-emerald-400' :
                                  'text-purple-400'
                                }`}>
                                  Linked {selectedNode.linkedItem.type}
                                </span>
                                <span className="text-[10px] font-black text-white block truncate mt-0.5">
                                  {selectedNode.linkedItem.title}
                                </span>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleLinkWorkspaceItem(selectedNode.id, null)}
                              className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 text-slate-400 transition-all cursor-pointer"
                              title="Remove Link"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          /* Interactive category linking selector */
                          <div className="space-y-2">
                            {/* Pill Type Selector */}
                            <div className="flex bg-[var(--color-background)]/90 border border-white/5 p-1 rounded-xl gap-1">
                              {[
                                { type: 'note', label: 'Note', icon: FileText, color: 'text-blue-400', activeBg: 'bg-blue-600/15 text-blue-400 border border-blue-500/10' },
                                { type: 'task', label: 'Task', icon: Check, color: 'text-emerald-400', activeBg: 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/10' },
                                { type: 'bookmark', label: 'Bookmark', icon: Link2, color: 'text-purple-400', activeBg: 'bg-purple-600/15 text-purple-400 border border-purple-500/10' }
                              ].map(pill => (
                                <button
                                  key={pill.type}
                                  onClick={() => {
                                    setNodeLinkCategory(pill.type);
                                  }}
                                  className={`flex-1 py-1.5 rounded-lg text-[8.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 ${
                                    nodeLinkCategory === pill.type 
                                      ? pill.activeBg 
                                      : 'text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  <pill.icon className="w-3.5 h-3.5" />
                                  <span>{pill.label}</span>
                                </button>
                              ))}
                            </div>

                            {/* Dynamic Searchable Custom Combobox */}
                            {nodeLinkCategory === 'note' && (
                              <CustomCombobox
                                value=""
                                options={userNotes.map(n => ({ value: n.id, label: n.title || 'Untitled Note' }))}
                                onChange={(noteId) => {
                                  const note = userNotes.find(n => n.id === noteId);
                                  if (note) handleLinkWorkspaceItem(selectedNode.id, { type: 'note', id: noteId, title: note.title });
                                }}
                                placeholder="🔍 Select Note to link..."
                                icon={FileText}
                              />
                            )}
                            {nodeLinkCategory === 'task' && (
                              <CustomCombobox
                                value=""
                                options={userTasks.map(t => ({ value: t.id, label: t.text }))}
                                onChange={(taskId) => {
                                  const task = userTasks.find(t => t.id === taskId);
                                  if (task) handleLinkWorkspaceItem(selectedNode.id, { type: 'task', id: taskId, title: task.text });
                                }}
                                placeholder="🔍 Select Task to link..."
                                icon={Check}
                              />
                            )}
                            {nodeLinkCategory === 'bookmark' && (
                              <CustomCombobox
                                value=""
                                options={userBookmarks.map(b => ({ value: b.id, label: b.title || b.url }))}
                                onChange={(bmId) => {
                                  const bm = userBookmarks.find(b => b.id === bmId);
                                  if (bm) handleLinkWorkspaceItem(selectedNode.id, { type: 'bookmark', id: bmId, title: bm.title || bm.url });
                                }}
                                placeholder="🔍 Select Bookmark to link..."
                                icon={Link2}
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Styling presets */}
                      <div className="space-y-2 pt-1 border-t border-white/5">
                        <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Accent Theme</span>
                        <div className="flex gap-2 bg-white/[0.01] border border-white/5 rounded-2xl p-2 h-11 items-center justify-between">
                          {NODE_CATEGORIES.map(preset => {
                            const isSel = (selectedNode.style?.stroke || NODE_CATEGORIES.find(c => c.type === selectedNode.category)?.accent) === preset.accent;
                            return (
                              <button 
                                key={preset.type} 
                                onClick={() => handleStyleNodeColor(selectedNode.id, preset.accent)}
                                className={`w-6 h-6 rounded-full border transition-all flex items-center justify-center hover:scale-105 cursor-pointer relative ${isSel ? 'border-white ring-1 ring-blue-500/50' : 'border-transparent opacity-60'}`}
                                style={{ backgroundColor: preset.accent }}
                                title={preset.label}
                              >
                                {isSel && <span className="text-[6.5px] text-white">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5 space-y-1">
                        <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Connector Nodes</span>
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => { setConnectMode(true); setConnectSourceId(selectedNode.id); }}
                            className="flex-1 py-2 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-wider hover:bg-emerald-600/20 active:scale-95 transition-all"
                          >
                            Flow connection from
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : selectedEdge ? (
                    /* B. If Connection Selected */
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-3 rounded-2xl">
                        <div className="flex items-center gap-2 min-w-0">
                          <Link2 className="w-4 h-4 text-violet-400" />
                          <div className="min-w-0">
                            <span className="text-[7px] font-black uppercase tracking-widest text-slate-500">Pipeline Link</span>
                            <div className="flex items-center gap-1 text-[8.5px] font-mono text-white mt-0.5">
                              <span className="bg-white/5 px-1 py-0.5 rounded truncate max-w-[50px]">{selectedEdge.source}</span>
                              <span className="text-slate-600">→</span>
                              <span className="bg-white/5 px-1 py-0.5 rounded truncate max-w-[50px]">{selectedEdge.target}</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteEdge(selectedEdge.source, selectedEdge.target)}
                          className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer" 
                          title="Unlink Connection"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Editing label */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Link Label</span>
                        <input 
                          type="text" 
                          value={selectedEdge.label || ''} 
                          onChange={e => handleRenameEdge(selectedEdge, e.target.value)}
                          placeholder="e.g. Yes / Async"
                          className="bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-2 text-xxs text-white font-bold focus:outline-none focus:border-violet-500/50" 
                        />
                      </div>

                      {/* Styling presets */}
                      <div className="space-y-2">
                        <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Line Thickness</span>
                        <div className="flex gap-1.5">
                          {EDGE_STYLES.map(style => {
                            const isSel = (selectedEdge.type || 'arrow') === style.type;
                            return (
                              <button 
                                key={style.type} 
                                onClick={() => handleChangeEdgeType(selectedEdge, style.type)}
                                className={`flex-1 py-2 border rounded-xl text-[8.5px] font-black uppercase transition-all cursor-pointer ${
                                  isSel 
                                    ? 'bg-violet-600/15 border-violet-500/40 text-violet-400' 
                                    : 'bg-white/[0.01] border-white/5 text-slate-500 hover:text-slate-300'
                                }`}
                              >
                                {style.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* C. Global Dashboard when canvas clicked */
                    <div className="space-y-4">
                      {/* Diagram Stats */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/[0.005] border border-white/5 p-2.5 rounded-xl flex flex-col items-center">
                          <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Active Stages</span>
                          <span className="text-lg font-black text-white mt-1 leading-none">{nodes.length}</span>
                        </div>
                        <div className="bg-white/[0.005] border border-white/5 p-2.5 rounded-xl flex flex-col items-center">
                          <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Active Flows</span>
                          <span className="text-lg font-black text-white mt-1 leading-none">{links.length}</span>
                        </div>
                      </div>

                      {/* Premium Redesigned Templates Console */}
                      <div className="space-y-3.5">
                        <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider block">Starter Pipelines</span>
                        <div className="space-y-2">
                          {/* Render Personal Workspace Automations first if available */}
                          {userTemplates && userTemplates.length > 0 && userTemplates.map(tmpl => (
                            <div 
                              key={tmpl.name} 
                              onClick={() => handleLoadTemplate(tmpl)}
                              style={{
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, rgba(11, 13, 23, 0.7) 100%)',
                              }}
                              className="group p-3 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-300 cursor-pointer relative overflow-hidden active:scale-98 flex items-center gap-3.5"
                            >
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 group-hover:scale-105 transition-all">
                                <span className="text-lg">{tmpl.icon}</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 justify-between">
                                  <span className="text-[7.5px] font-black uppercase text-emerald-400 tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                    Personal
                                  </span>
                                </div>
                                <h5 className="text-[10px] font-bold text-white block mt-1 truncate">
                                  {tmpl.name.replace(/^[^a-zA-Z]+/g, '')}
                                </h5>
                                <p className="text-[8.5px] text-slate-400 mt-1 leading-normal font-medium line-clamp-2">
                                  {tmpl.description}
                                </p>
                              </div>
                            </div>
                          ))}

                          {/* Render Standard Templates */}
                          {STARTER_TEMPLATES.map(tmpl => (
                            <div 
                              key={tmpl.name} 
                              onClick={() => handleLoadTemplate(tmpl)}
                              style={{
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(11, 13, 23, 0.7) 100%)',
                              }}
                              className="group p-3 rounded-2xl border border-white/5 hover:border-blue-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all duration-300 cursor-pointer relative overflow-hidden active:scale-98 flex items-center gap-3.5"
                            >
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10 bg-white/[0.02] text-slate-300 group-hover:scale-105 transition-all group-hover:text-blue-400 group-hover:border-blue-500/20">
                                <span className="text-lg">{tmpl.icon}</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 justify-between">
                                  <span className="text-[7.5px] font-black uppercase text-slate-500 tracking-widest bg-white/[0.04] px-1.5 py-0.5 rounded-md">
                                    System
                                  </span>
                                </div>
                                <h5 className="text-[10px] font-bold text-white block mt-1 truncate">
                                  {tmpl.name}
                                </h5>
                                <p className="text-[8.5px] text-slate-400 mt-1 leading-normal font-medium line-clamp-2">
                                  {tmpl.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Premium Styled Help Card */}
                      <div className="p-4 bg-blue-600/[0.01] border border-blue-500/10 rounded-2xl space-y-2.5 text-slate-300 leading-relaxed text-xs">
                        <h5 className="font-bold text-white flex items-center gap-1.5 leading-none uppercase text-[10px] tracking-widest text-blue-400">
                          <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />
                          <span>Designer Help Guide</span>
                        </h5>
                        <ul className="list-disc pl-4 space-y-1.5 mt-1 font-medium text-slate-400">
                          <li><strong>Spawn</strong>: Click stages inside the Left Palette library.</li>
                          <li><strong>Move</strong>: Click and drag any stage freely.</li>
                          <li><strong>Canvas</strong>: Drag canvas background to pan, use wheel to zoom.</li>
                          <li><strong>Delete stage</strong>: Click a stage and press the <kbd className="px-1 py-0.5 rounded bg-white/10 text-[9px] border border-white/5 font-mono">Delete</kbd> key.</li>
                          <li><strong>Workspace link</strong>: Connect real Notes, Tasks, or Bookmarks to stages.</li>
                        </ul>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                /* JSON Console tab */
                <div className="w-full h-full flex flex-col gap-3">
                  <div className="bg-white/[0.005] border border-white/5 p-2 rounded-2xl shrink-0 flex items-center justify-between">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider pl-1">Copy or Paste JSON text</span>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(chartCode); showAlert('Copied', 'JSON diagram code copied to clipboard.'); }}
                      className="p-1 px-2 bg-white/[0.02] border border-white/5 rounded-lg text-[8px] font-black text-slate-300 hover:text-white uppercase flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Copy className="w-3 h-3 text-blue-400" />
                      <span>Copy Code</span>
                    </button>
                  </div>
                  <div className="flex-1 min-h-[300px] rounded-2xl border border-white/10 bg-[var(--color-background)]/60 p-3 shadow-inner">
                    <textarea 
                      value={chartCode} 
                      onChange={e => applyCodeChange(e.target.value)}
                      className="w-full h-full bg-transparent border-none outline-none font-mono text-[9px] text-blue-300/85 leading-relaxed resize-none focus:ring-0 focus:outline-none no-scrollbar"
                      placeholder="Paste diagram JSON coordinates block..." 
                      spellCheck={false} 
                    />
                  </div>
                  <div className="text-[7.5px] text-slate-500 leading-normal border-t border-white/5 pt-2">
                    💡 <strong>Quick Sync</strong>: Modify coordinates properties <code>x</code> and <code>y</code> directly in the JSON block to rearrange cards instantly! Paste external diagram coordinates to import others.
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating spawn button to quickly open Left Drawer if closed */}
      {!leftOpen && (
        <button 
          onClick={() => setLeftOpen(true)} 
          style={{ top: '12px' }} 
          className="absolute left-4 z-20 p-2.5 rounded-xl bg-[var(--color-card)] border border-white/10 hover:border-blue-500/50 backdrop-blur-xl text-slate-200 hover:text-white shadow-2xl cursor-pointer active:scale-95 flex items-center gap-1.5 pointer-events-auto"
        >
          <PenTool className="w-4 h-4 text-blue-400" />
          <span className="text-[8.5px] font-black uppercase tracking-wider">Palette</span>
        </button>
      )}

      {/* Custom Modal overlay */}
      <AnimatePresence>
        {modal.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md pointer-events-auto"
            onClick={modal.onCancel}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--color-card)] shadow-2xl text-slate-200 border-t-[1.5px] border-t-blue-500/40"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5.5">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-white flex items-center gap-2 mb-2">
                  <Workflow className="w-4 h-4 text-blue-400" />
                  {modal.title}
                </h3>
                <p className="text-[9.5px] text-slate-400 leading-relaxed mb-5 select-text">{modal.message}</p>
                <div className="flex items-center justify-end gap-2 shrink-0">
                  {modal.type === 'confirm' && (
                    <button 
                      onClick={modal.onCancel} 
                      className="w-24 h-8 flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] text-[8.5px] font-black uppercase text-slate-400 hover:text-white cursor-pointer transition-colors select-none"
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    onClick={modal.onConfirm} 
                    className="w-24 h-8 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 text-[8.5px] font-black uppercase text-white shadow-md cursor-pointer transition-colors active:scale-95 select-none"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Charts;
