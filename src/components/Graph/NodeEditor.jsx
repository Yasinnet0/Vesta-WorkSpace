import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Trash2, Link2, Tag, Calendar, Check, ExternalLink, AlertCircle, Save, Plus, Search, Sparkles, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  updateNode, deleteNode, addNode,
  getTasks, updateTask, 
  getIdeas, updateIdea,
  getBookmarks, updateBookmark,
  getNotes, updateNote,
  addLink, getLinks, deleteLink,
  getCategories
} from '../../api';
import CategoryCombobox from '../Shared/CategoryCombobox';

const COLORS = {
  custom: { text: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/10' },
  note: { text: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/10' },
  task: { text: 'text-rose-400', border: 'border-rose-500/20', bg: 'bg-rose-500/10' },
  idea: { text: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10' },
  bookmark: { text: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/10' }
};

const NodeEditor = ({ node, nodes, links, onClose, onDataChanged, onDeleteRequest }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState('Saved'); // 'Saved', 'Saving...', 'Unsaved'

  // Primary Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');

  // Linked Entity state
  const [linkedEntity, setLinkedEntity] = useState(null);
  const [entityType, setEntityType] = useState('custom');

  // Suggested categories for combobox
  const [suggestedCategories, setSuggestedCategories] = useState([]);

  // Load suggested categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await getCategories();
        const allCats = [
          ...(res.data.bookmarks || []),
          ...(res.data.tasks || []),
          ...(res.data.notes || []),
          ...(res.data.ideas || []),
          ...(res.data.nodes || [])
        ];
        setSuggestedCategories(['General', ...new Set(allCats)].filter(Boolean));
      } catch (err) {
        console.warn('Failed to load suggested categories:', err);
      }
    };
    loadCategories();
  }, []);

  // Connection management
  const [searchTargetQuery, setSearchTargetQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Auto-save debounce timer
  const autoSaveTimer = useRef(null);

  // Sync state on node select
  useEffect(() => {
    if (!node) return;
    setError(null);
    setSaveStatus('Saved');
    setTitle(node.title || '');
    setCategory(node.category || 'General');
    setNotes(node.notes || '');
    setEntityType(node.type || 'custom');
    setLinkedEntity(null);

    // Fetch entity specific information if node represents a linked task/idea/bookmark
    if (node.type !== 'custom' && node.linkedEntityId) {
      const fetchLinkedEntity = async () => {
        try {
          if (node.type === 'task') {
            const res = await getTasks();
            const found = (res.data || []).find(t => t.id === node.linkedEntityId);
            if (found) setLinkedEntity(found);
          } else if (node.type === 'idea') {
            const res = await getIdeas();
            const found = (res.data || []).find(i => i.id === node.linkedEntityId);
            if (found) setLinkedEntity(found);
          } else if (node.type === 'bookmark') {
            const res = await getBookmarks();
            const found = (res.data || []).find(b => b.id === node.linkedEntityId);
            if (found) setLinkedEntity(found);
          }
        } catch (err) {
          console.warn('Failed to fetch linked entity details:', err);
        }
      };
      fetchLinkedEntity();
    }
  }, [node]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  const handleFieldChange = (field, val) => {
    setSaveStatus('Unsaved');
    if (field === 'title') setTitle(val);
    else if (field === 'category') setCategory(val);
    else if (field === 'notes') setNotes(val);

    // Trigger auto-save
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      triggerSave(val, field);
    }, 1200);
  };

  const triggerSave = async (updatedVal, field) => {
    setSaveStatus('Saving...');
    try {
      const currentTitle = field === 'title' ? updatedVal : title;
      const currentCategory = field === 'category' ? updatedVal : category;
      const currentNotes = field === 'notes' ? updatedVal : notes;

      if (node.type === 'custom') {
        await updateNode(node.id, { title: currentTitle, category: currentCategory, notes: currentNotes });
      } else if (node.type === 'note') {
        await updateNote(node.linkedEntityId || node.id, { title: currentTitle, content: currentNotes, category: currentCategory });
      } else if (node.type === 'idea') {
        await updateIdea(node.linkedEntityId || node.id, { title: currentTitle, content: currentNotes, category: currentCategory });
      } else if (node.type === 'task') {
        if (field === 'title') {
          await updateTask(node.linkedEntityId || node.id, { text: currentTitle });
        }
        if (node.nodeRecordId) {
          await updateNode(node.nodeRecordId, { notes: currentNotes, category: currentCategory });
        } else {
          const res = await addNode({
            title: currentTitle,
            type: 'task',
            notes: currentNotes,
            linkedEntityId: node.id,
            category: currentCategory
          });
          node.nodeRecordId = res.data.id;
        }
      } else if (node.type === 'bookmark') {
        if (field === 'title') {
          await updateBookmark(node.linkedEntityId || node.id, { title: currentTitle });
        }
        if (node.nodeRecordId) {
          await updateNode(node.nodeRecordId, { notes: currentNotes, category: currentCategory });
        } else {
          const res = await addNode({
            title: currentTitle,
            type: 'bookmark',
            notes: currentNotes,
            linkedEntityId: node.id,
            category: currentCategory
          });
          node.nodeRecordId = res.data.id;
        }
      }

      setSaveStatus('Saved');
      onDataChanged({ title: currentTitle, notes: currentNotes, category: currentCategory });
    } catch (err) {
      console.error(err);
      setSaveStatus('Error');
      setError('Auto-save failed.');
    }
  };

  const handleManualSave = async () => {
    setLoading(true);
    setError(null);
    try {
      if (node.type === 'custom') {
        await updateNode(node.id, { title, category, notes });
      } else if (node.type === 'note') {
        await updateNote(node.linkedEntityId || node.id, { title, content: notes, category });
      } else if (node.type === 'idea') {
        await updateIdea(node.linkedEntityId || node.id, { title, content: notes, category });
      } else if (node.type === 'task') {
        await updateTask(node.linkedEntityId || node.id, { text: title });
        if (node.nodeRecordId) {
          await updateNode(node.nodeRecordId, { notes, category });
        } else {
          const res = await addNode({
            title,
            type: 'task',
            notes,
            linkedEntityId: node.id,
            category
          });
          node.nodeRecordId = res.data.id;
        }
      } else if (node.type === 'bookmark') {
        await updateBookmark(node.linkedEntityId || node.id, { title });
        if (node.nodeRecordId) {
          await updateNode(node.nodeRecordId, { notes, category });
        } else {
          const res = await addNode({
            title,
            type: 'bookmark',
            notes,
            linkedEntityId: node.id,
            category
          });
          node.nodeRecordId = res.data.id;
        }
      }

      setSaveStatus('Saved');
      onDataChanged({ title, notes, category });
    } catch (err) {
      console.error(err);
      setError('Failed to update node properties.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle completion if referencing a Task
  const handleToggleTask = async () => {
    if (entityType !== 'task' || !linkedEntity) return;
    try {
      const updatedStatus = !linkedEntity.completed;
      const res = await updateTask(linkedEntity.id, { completed: updatedStatus });
      setLinkedEntity(res.data);
      // Force refresh layout to trigger checkmark render
      onDataChanged({ completed: updatedStatus });
    } catch (err) {
      console.error('Failed to toggle referenced task completion:', err);
      setError('Could not update task status.');
    }
  };

  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);

  // Sever entity linking (making node a custom standalone node)
  const handleUnlinkEntity = () => {
    setShowUnlinkConfirm(true);
  };

  const executeUnlinkEntity = async () => {
    setShowUnlinkConfirm(false);
    setLoading(true);
    try {
      // Create a brand new custom node to replace it
      const res = await addNode({
        title,
        notes,
        type: 'custom',
        category,
        x: node.x,
        y: node.y,
        pinned: !!node.pinned
      });

      // Update links pointing to node.id to point to the new custom node's ID instead
      const associatedLinks = links.filter(l => {
        if (!l) return false;
        const s = l.source?.id || l.source;
        const t = l.target?.id || l.target;
        return s === node.id || t === node.id;
      });

      for (const link of associatedLinks) {
        const s = link.source?.id || link.source;
        const t = link.target?.id || link.target;
        const newSource = s === node.id ? res.data.id : s;
        const newTarget = t === node.id ? res.data.id : t;
        await deleteLink(link.id);
        await addLink({ source: newSource, target: newTarget });
      }

      // If there was coordinate meta in nodes.json, clean it up
      if (node.nodeRecordId && node.type !== 'custom') {
        await deleteNode(node.nodeRecordId);
      }

      onClose();
      onDataChanged();
    } catch (err) {
      console.error(err);
      setError('Failed to unlink entity.');
    } finally {
      setLoading(false);
    }
  };

  // Handle keypresses (Enter to confirm, Escape to cancel) when unlink modal is open
  useEffect(() => {
    if (!showUnlinkConfirm) return;

    const handleConfirmKeyDown = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        executeUnlinkEntity();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setShowUnlinkConfirm(false);
      }
    };

    window.addEventListener('keydown', handleConfirmKeyDown);
    return () => window.removeEventListener('keydown', handleConfirmKeyDown);
  }, [showUnlinkConfirm, node, title, notes, category, links]);

  // Delete node and close editor (without deleting original list item data)
  const handleDeleteNode = () => {
    if (typeof onDeleteRequest === 'function') {
      onDeleteRequest(node);
    }
  };

  // Active Connections List
  const activeConnections = links.filter(l => {
    if (!l) return false;
    const s = l.source?.id || l.source;
    const t = l.target?.id || l.target;
    return s === node.id || t === node.id;
  });

  const handleAddConnection = async (targetId) => {
    if (!targetId || targetId === node.id) return;
    setLoading(true);
    setError(null);

    // Check if link exists
    const linkExists = links.some(l => {
      if (!l) return false;
      const s = l.source?.id || l.source;
      const t = l.target?.id || l.target;
      return (s === node.id && t === targetId) || (s === targetId && t === node.id);
    });

    if (linkExists) {
      setError('Nodes are already connected.');
      setLoading(false);
      return;
    }

    try {
      await addLink({ source: node.id, target: targetId });
      setSearchTargetQuery('');
      setIsDropdownOpen(false);
      onDataChanged();
    } catch (err) {
      console.error(err);
      setError('Could not establish link connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeverConnection = async (linkId) => {
    setLoading(true);
    try {
      await deleteLink(linkId);
      onDataChanged();
    } catch (err) {
      console.error(err);
      setError('Could not sever connection.');
    } finally {
      setLoading(false);
    }
  };

  // Filter possible connection target nodes (excluding current node and already connected nodes)
  const connectedNodeIds = new Set(
    activeConnections.map(l => {
      const s = l.source?.id || l.source;
      const t = l.target?.id || l.target;
      return s === node.id ? t : s;
    })
  );

  const connectableNodes = nodes.filter(n => 
    n.id !== node.id && 
    !connectedNodeIds.has(n.id) &&
    n.title.toLowerCase().includes(searchTargetQuery.toLowerCase())
  );

  const nodeColor = COLORS[entityType] || COLORS.custom;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="absolute top-0 right-0 z-50 h-full w-[400px] border-l border-white/10 bg-[#07070a]/90 backdrop-blur-2xl p-6 flex flex-col justify-between shadow-2xl overflow-y-auto no-scrollbar"
    >
      {/* Upper Section */}
      <div className="space-y-6">
        {/* Title row */}
        <div className="flex items-start justify-between border-b border-white/5 pb-4">
          <div className="flex flex-col gap-1.5 w-4/5">
            <span className={`px-2 py-0.5 self-start text-[9px] font-black uppercase tracking-widest rounded-md border ${nodeColor.bg} ${nodeColor.text} ${nodeColor.border}`}>
              {entityType === 'custom' ? 'Custom Note' : `${entityType} Reference`}
            </span>
            <input 
              type="text"
              value={title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className="bg-transparent border-b border-transparent hover:border-white/10 focus:border-white/20 text-md font-bold text-white focus:outline-none py-0.5 tracking-tight w-full"
              placeholder="Untitled Node"
            />
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xxs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Linked Entity Info Box */}
        {entityType !== 'custom' && linkedEntity && (
          <div className={`p-4 rounded-xl border border-white/5 bg-[#0a0a0d] space-y-2`}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Linked Entity Details</span>
              <button 
                onClick={handleUnlinkEntity}
                className="text-[9px] font-bold text-rose-500 hover:text-rose-400 hover:underline uppercase tracking-wider"
              >
                Sever Binding
              </button>
            </div>

            {entityType === 'task' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleTask}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    linkedEntity.completed 
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400' 
                      : 'border-white/10 hover:border-rose-500/40 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <div className="flex flex-col gap-0.5">
                  <span className={`text-xs font-semibold text-white ${linkedEntity.completed ? 'line-through text-slate-500' : ''}`}>
                    {linkedEntity.text}
                  </span>
                  <span className="text-[10px] text-slate-500 capitalize">Priority: {linkedEntity.priority}</span>
                </div>
              </div>
            )}

            {entityType === 'idea' && (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-white">{linkedEntity.title}</h4>
                <p className="text-[10px] text-slate-500 line-clamp-3 leading-relaxed">{linkedEntity.content}</p>
              </div>
            )}

            {entityType === 'bookmark' && (
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <h4 className="text-xs font-semibold text-white">{linkedEntity.title}</h4>
                  <span className="text-[10px] text-slate-500">{linkedEntity.domain}</span>
                </div>
                <a 
                  href={linkedEntity.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-blue-400 hover:text-white border border-white/5 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Notes Editor (Cyber-Console Style) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <span>Notes</span>
            <div className="flex items-center gap-1.5 font-mono text-[9px] text-slate-500">
              <div className={`w-1.5 h-1.5 rounded-full ${
                saveStatus === 'Saved' ? 'bg-emerald-500' : saveStatus === 'Saving...' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
              }`} />
              <span>{saveStatus}</span>
            </div>
          </div>
          
          <textarea
            value={notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            className="w-full min-h-[160px] bg-white/[0.01] hover:bg-white/[0.02] focus:bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40 transition-all leading-relaxed no-scrollbar resize-y font-sans"
            placeholder="Type your notes or document structure..."
          />
        </div>

        {/* Category Field */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Tag className="w-3 h-3 text-slate-500" /> Category
          </label>
          <CategoryCombobox
            value={category}
            onChange={(val) => handleFieldChange('category', val)}
            suggestions={suggestedCategories.filter(c => !['All', 'Today', 'Priority', 'Stale', 'General', 'Main'].includes(c))}
            placeholder="Select or type category..."
            accentColor={entityType === 'custom' ? 'amber' : entityType === 'task' ? 'rose' : entityType === 'idea' ? 'emerald' : entityType === 'bookmark' ? 'blue' : 'violet'}
          />
        </div>

        {/* Connections Drawer */}
        <div className="space-y-3 pt-3 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> Connections ({activeConnections.length})
            </span>
            
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="text-[9px] font-bold text-violet-400 hover:text-violet-300 hover:underline uppercase tracking-wider flex items-center gap-1 bg-white/[0.02] border border-white/10 px-2 py-1 rounded-lg"
              >
                <Plus className="w-3 h-3" /> Connect Node
              </button>

              {/* Target search dropdown */}
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-[#0a0a0d] border border-white/10 rounded-xl shadow-2xl p-2.5 z-[60] space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Find target node..."
                      value={searchTargetQuery}
                      onChange={(e) => setSearchTargetQuery(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xxs text-white focus:outline-none"
                    />
                  </div>
                  <div className="max-h-36 overflow-y-auto divide-y divide-white/5 no-scrollbar">
                    {connectableNodes.length === 0 ? (
                      <div className="p-2.5 text-center text-slate-600 text-[10px]">No linkable nodes</div>
                    ) : (
                      connectableNodes.map(n => (
                        <button
                          key={n.id}
                          onClick={() => handleAddConnection(n.id)}
                          className="w-full text-left p-2 hover:bg-white/[0.04] transition-all flex flex-col gap-0.5 rounded-lg"
                        >
                          <span className="text-xxs font-bold text-slate-200">{n.title}</span>
                          <span className="text-[9px] text-slate-600 capitalize">Tag: {n.category}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active links lists */}
          <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
            {activeConnections.length === 0 ? (
              <p className="text-[10px] text-slate-600 italic">No node connections yet. Draw links visually or connect nodes above.</p>
            ) : (
              activeConnections.map(l => {
                const s = l.source?.id || l.source;
                const t = l.target?.id || l.target;
                const connectedId = s === node.id ? t : s;
                const connectedNode = nodes.find(n => n.id === connectedId);
                
                if (!connectedNode) return null;
                const connectedColor = COLORS[connectedNode.type] || COLORS.custom;
                
                return (
                  <div 
                    key={l.id}
                    className="flex items-center justify-between p-2.5 bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 rounded-xl text-xxs"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${connectedColor.text.replace('text-', 'bg-')}`} />
                      <span className="font-semibold text-slate-300 truncate max-w-[170px]">{connectedNode.title}</span>
                    </div>
                    <button
                      onClick={() => handleSeverConnection(l.id)}
                      className="text-[9px] font-bold text-slate-600 hover:text-rose-500 uppercase tracking-widest transition-all"
                    >
                      Sever
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer delete */}
      <div className="border-t border-white/5 pt-4 bg-white/[0.01] -mx-6 -mb-6 p-6 flex items-center justify-between gap-3">
        <button
          onClick={handleDeleteNode}
          className="text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-rose-500 transition-all flex items-center gap-1.5"
        >
          <Trash2 className="w-4 h-4" /> Delete Node
        </button>
        <button
          onClick={handleManualSave}
          disabled={loading}
          className="bg-white/[0.03] border border-white/10 hover:border-white/20 text-white rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all"
        >
          Force Save
        </button>
      </div>

      {/* Custom Unlink Entity Confirmation Modal */}
      <AnimatePresence>
        {showUnlinkConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-[#0a0a0d]/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-6 relative text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-violet-400 animate-pulse" />
              </div>
              
              <h3 className="text-md font-bold text-white tracking-tight mb-2">
                Convert to Standalone Note?
              </h3>
              
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Are you sure you want to convert this node into a standalone custom note? The original item will remain completely untouched in your lists.
              </p>
              
              <div className="flex items-center gap-3 justify-center">
                <button
                  onClick={() => setShowUnlinkConfirm(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-slate-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.04] text-xxs font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={executeUnlinkEntity}
                  className="px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white shadow-xl hover:shadow-violet-500/10 border border-violet-400/20 text-xxs font-bold uppercase tracking-wider transition-all"
                >
                  Convert
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default NodeEditor;
