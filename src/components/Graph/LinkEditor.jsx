import React, { useState } from 'react';
import { 
  X, Trash2, Link2, ArrowRight, FileText, CheckSquare, Lightbulb, Bookmark, ExternalLink, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { deleteLink } from '../../api';

// Premium category color mappings matching the global aesthetics
const COLORS = {
  custom: { text: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/10', icon: Lightbulb },
  note: { text: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/10', icon: FileText },
  task: { text: 'text-rose-400', border: 'border-rose-500/20', bg: 'bg-rose-500/10', icon: CheckSquare },
  idea: { text: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10', icon: Lightbulb },
  bookmark: { text: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/10', icon: Bookmark }
};

const LinkEditor = ({ link, nodes, onClose, onNodeSelect, onDataChanged }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!link) return null;

  // Resolve source and target nodes from the list
  const sId = String(link.source?.id || link.source);
  const tId = String(link.target?.id || link.target);
  const sourceNode = nodes.find(n => String(n.id) === sId);
  const targetNode = nodes.find(n => String(n.id) === tId);

  if (!sourceNode || !targetNode) return null;

  // Dynamic helper to identify link types
  const getLinkCategory = () => {
    if (sourceNode.type === 'task' && targetNode.type === 'task') return 'Task Dependency';
    if (sourceNode.type === 'task' || targetNode.type === 'task') return 'Action Connection';
    return 'Regular Reference';
  };

  const linkCategory = getLinkCategory();

  // Execute deletion callback
  const handleSeverConnection = async () => {
    setLoading(true);
    setError(null);
    try {
      await deleteLink(link.id);
      onDataChanged(); // Force graph view reload
      onClose();       // Close sidebar drawer
    } catch (err) {
      console.error(err);
      setError('Could not sever connection.');
    } finally {
      setLoading(false);
    }
  };

  const renderNodeCard = (node, label) => {
    const theme = COLORS[node.type] || COLORS.custom;
    const Icon = theme.icon;

    return (
      <div className="space-y-1.5">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label} Node</span>
        <div 
          onClick={() => onNodeSelect(node)}
          className="group relative p-4 rounded-xl border border-white/5 bg-[#0a0a0d] hover:bg-[#111116] hover:border-white/10 transition-all cursor-pointer shadow-lg active:scale-[0.98] overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
          </div>
          
          <div className="flex items-start gap-3 pr-6">
            <div className={`p-2 rounded-lg ${theme.bg} ${theme.text} border ${theme.border} mt-0.5`}>
              <Icon className="w-4 h-4" />
            </div>
            
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                {node.title || 'Untitled Node'}
              </span>
              <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider capitalize">
                {node.type}
              </span>
              {node.category && (
                <span className="text-[10px] text-slate-400 mt-1 truncate">
                  Tag: <span className="text-slate-300 font-semibold">{node.category}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="absolute top-0 right-0 z-50 h-full w-[400px] border-l border-white/10 bg-[#07070a]/90 backdrop-blur-2xl p-6 flex flex-col justify-between shadow-2xl overflow-y-auto no-scrollbar"
    >
      {/* Upper Content */}
      <div className="space-y-6">
        {/* Title Block */}
        <div className="flex items-start justify-between border-b border-white/5 pb-4">
          <div className="flex flex-col gap-1.5 w-4/5">
            <span className="px-2 py-0.5 self-start text-[9px] font-black uppercase tracking-widest rounded-md border border-blue-500/20 bg-blue-500/10 text-blue-400">
              Relationship
            </span>
            <h3 className="text-md font-bold text-white tracking-tight flex items-center gap-2">
              <Link2 className="w-4 h-4 text-slate-400" />
              <span>Link Connection</span>
            </h3>
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
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Connection Type Indicator Card */}
        <div className="p-4 rounded-xl border border-white/5 bg-[#09090c] flex items-center justify-between shadow-md">
          <div className="space-y-0.5">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Connection Type</span>
            <div className="text-xs font-bold text-white">{linkCategory}</div>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 text-slate-400">
            <Link2 className="w-4 h-4" />
          </div>
        </div>

        {/* Source Node Card */}
        {renderNodeCard(sourceNode, 'Source')}

        {/* Path Flow Indicator */}
        <div className="flex justify-center py-1">
          <div className="w-8 h-8 rounded-full border border-white/5 bg-[#09090c] flex items-center justify-center text-slate-400 shadow-md">
            <ArrowRight className="w-4 h-4 animate-pulse text-blue-400" />
          </div>
        </div>

        {/* Target Node Card */}
        {renderNodeCard(targetNode, 'Target')}
      </div>

      {/* Bottom Footer Actions */}
      <div className="border-t border-white/5 pt-4 mt-6">
        <AnimatePresence mode="wait">
          {!showDeleteConfirm ? (
            <motion.button
              key="delete-btn"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/35 text-rose-400 hover:text-rose-300 text-xxs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Trash2 className="w-4 h-4" />
              <span>Sever Connection</span>
            </motion.button>
          ) : (
            <motion.div
              key="confirm-block"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.02] space-y-3"
            >
              <div className="text-center text-xxs text-rose-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Confirm Severing Link?</span>
              </div>
              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                This will delete the connection link on the canvas. The underlying items themselves will remain completely intact.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white text-xxs font-bold uppercase tracking-wider bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={loading}
                  onClick={handleSeverConnection}
                  className="flex-1 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xxs font-bold uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Severing...' : 'Sever Link'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default LinkEditor;
