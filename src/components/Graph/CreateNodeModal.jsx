import { useState, useEffect } from 'react';
import { X, FileText, Lightbulb, CheckSquare, Bookmark, AlertTriangle, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { addNode, getTasks, getIdeas, getBookmarks, getNotes, getCategories } from '../../api';
import CategoryCombobox from '../Shared/CategoryCombobox';
import ClearableSearchInput from '../Shared/ClearableSearchInput';

const CreateNodeModal = ({ onClose, onSuccess, initialCoordinates }) => {
  const [nodeType, setNodeType] = useState('custom'); // 'custom', 'note', 'task', 'idea', 'bookmark'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Standalone fields
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('General');

  // Search/selection for referencing existing entities
  const [suggestedCategories, setSuggestedCategories] = useState([]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await getCategories();
        const allCats = [
          ...(res.data.bookmarks || []),
          ...(res.data.tasks || []),
          ...(res.data.notes || []),
          ...(res.data.ideas || [])
        ];
        setSuggestedCategories(['General', ...new Set(allCats)].filter(Boolean));
      } catch (err) {
        console.warn('Failed to load suggested categories:', err);
      }
    };
    loadCategories();
  }, []);
  const [entities, setEntities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState(null);

  // Load existing entities based on selected link type
  useEffect(() => {
    if (nodeType === 'custom') {
      setSelectedEntity(null);
      return;
    }

    const loadEntities = async () => {
      setLoading(true);
      setError(null);
      try {
        let res;
        if (nodeType === 'note') {
          res = await getNotes();
          setEntities((res.data || []).map(n => ({ id: n.id, title: n.title || 'Untitled Note', details: n.content?.substring(0, 45) || 'No content', raw: n })));
        } else if (nodeType === 'task') {
          res = await getTasks();
          // Filter to only display text
          setEntities((res.data || []).map(t => ({ id: t.id, title: t.text, details: `Priority: ${t.priority} | Completed: ${t.completed ? 'Yes' : 'No'}`, raw: t })));
        } else if (nodeType === 'idea') {
          res = await getIdeas();
          setEntities((res.data || []).map(i => ({ id: i.id, title: i.title, details: i.content?.substring(0, 45) || 'No content', raw: i })));
        } else if (nodeType === 'bookmark') {
          res = await getBookmarks();
          setEntities((res.data || []).map(b => ({ id: b.id, title: b.title || b.domain, details: b.url, raw: b })));
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load referenceable entities.');
      } finally {
        setLoading(false);
      }
    };

    loadEntities();
    setSelectedEntity(null);
    setSearchQuery('');
  }, [nodeType]);

  const filteredEntities = entities.filter(e =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.details.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (nodeType === 'custom' && !title.trim()) {
      setError('Title is required for custom nodes.');
      return;
    }

    if (nodeType !== 'custom' && !selectedEntity) {
      setError(`Please select an existing ${nodeType} to reference.`);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title: nodeType === 'custom' ? title.trim() : selectedEntity.title,
        notes: nodeType === 'custom' ? notes.trim() : `Referenced ${nodeType}: ${selectedEntity.title}`,
        type: nodeType,
        linkedEntityId: nodeType === 'custom' ? null : selectedEntity.id,
        category: category.trim() || 'General',
        x: initialCoordinates ? initialCoordinates.x : null,
        y: initialCoordinates ? initialCoordinates.y : null,
        pinned: !!initialCoordinates
      };

      const res = await addNode(payload);
      onSuccess(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Failed to create node.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-lg bg-[var(--color-card)]/95 border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.01]">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Create Graph Node</h3>
            <p className="text-xxs text-slate-500 mt-0.5">
              {initialCoordinates 
                ? `Placing at canvas position: ${Math.round(initialCoordinates.x)}, ${Math.round(initialCoordinates.y)}` 
                : 'Adding new node to knowledge graph'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Type Picker Tabs */}
        <div className="grid grid-cols-5 p-1.5 bg-white/[0.01] border-b border-white/5 gap-1">
          {[
            { id: 'custom', label: 'Free Node', icon: Plus, activeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
            { id: 'note', label: 'Link Note', icon: FileText, activeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
            { id: 'task', label: 'Link Task', icon: CheckSquare, activeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
            { id: 'idea', label: 'Link Idea', icon: Lightbulb, activeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
            { id: 'bookmark', label: 'Link Web', icon: Bookmark, activeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = nodeType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setNodeType(tab.id)}
                className={`py-2 px-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex flex-col items-center gap-1 border border-transparent ${
                  isActive ? tab.activeBg : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {tab.label.split(' ')[1] || tab.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {nodeType === 'custom' ? (
            // Custom Node Fields
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Node Title</label>
                <input
                  type="text"
                  required
                  placeholder="Neural Network Research, Book recommendations, etc..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-all font-semibold"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Notes / Body</label>
                <textarea
                  rows={4}
                  placeholder="Add high-end details, links, or bullet points here..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-all resize-none no-scrollbar font-semibold"
                />
              </div>
            </div>
          ) : (
            // Reference Selection Fields
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Search & Select {nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}
                </label>
                <ClearableSearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={`Type to search existing ${nodeType}s...`}
                  iconClassName="left-3 w-4 h-4"
                  inputClassName="w-full bg-white/[0.02] border border-white/10 rounded-xl pl-9 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Scrollable Entity List */}
              <div className="max-h-48 overflow-y-auto border border-white/5 bg-[var(--color-background)] rounded-xl no-scrollbar divide-y divide-white/5">
                {loading ? (
                  <div className="p-4 text-center text-xs text-slate-500">Loading elements...</div>
                ) : filteredEntities.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">No matching items found</div>
                ) : (
                  filteredEntities.map((e) => {
                    const isSelected = selectedEntity?.id === e.id;
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setSelectedEntity(e)}
                        className={`w-full text-left p-3 flex flex-col transition-all gap-0.5 hover:bg-white/[0.02] ${
                          isSelected ? 'bg-white/[0.04] border-l-2 border-accent-blue' : ''
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-200">{e.title}</span>
                        <span className="text-[10px] text-slate-500 truncate">{e.details}</span>
                      </button>
                    );
                  })
                )}
              </div>

              {selectedEntity && (
                <div className="p-3 bg-white/[0.01] border border-emerald-500/20 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Selected Item</span>
                    <span className="text-xs text-white font-medium">{selectedEntity.title}</span>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              )}
            </div>
          )}

          {/* Common Category Field */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category / Tag</label>
            <CategoryCombobox
              value={category}
              onChange={(val) => setCategory(val)}
              suggestions={suggestedCategories.filter(c => !['All', 'Today', 'Priority', 'Stale', 'General', 'Main'].includes(c))}
              placeholder="Select or type a category..."
              accentColor={nodeType === 'custom' ? 'amber' : nodeType === 'task' ? 'rose' : nodeType === 'idea' ? 'emerald' : nodeType === 'bookmark' ? 'blue' : 'violet'}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5 bg-white/[0.01] -mx-6 -mb-6 p-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-all hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="premium-btn px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              {loading ? 'Creating...' : 'Create Node'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateNodeModal;
