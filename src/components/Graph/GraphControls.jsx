import { useState } from 'react';
import { 
  Eye, RefreshCw, Maximize2, Sparkles, SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ClearableSearchInput from '../Shared/ClearableSearchInput';

const GraphControls = ({
  searchQuery,
  setSearchQuery,
  filters,
  setFilters,
  physics,
  setPhysics,
  onResetCamera,
  onRefreshData
}) => {
  const [activePanel, setActivePanel] = useState(null); // null, 'filters', 'physics'

  const togglePanel = (panel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const handleFilterToggle = (type) => {
    setFilters(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handlePhysicsChange = (key, value) => {
    setPhysics(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="absolute top-6 left-6 z-40 flex flex-col gap-3">
      {/* Search and Command Bar */}
      <div className="flex items-center gap-2.5 p-2 bg-[var(--color-card)]/90 backdrop-blur-md border border-[var(--color-border)] rounded-2xl shadow-2xl">
        {/* Search Input */}
        <ClearableSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search graph nodes..."
          inputClassName="search-input-premium w-44 focus:w-60 transition-all pl-10 py-2"
        />

        {/* Quick controls buttons */}
        <div className="flex items-center border-l border-white/5 pl-2 gap-0.5">
          <button
            onClick={() => togglePanel('filters')}
            title="Filter Nodes"
            className={`p-2 rounded-xl transition-all ${
              activePanel === 'filters' ? 'bg-violet-500/15 text-violet-400' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Eye className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => togglePanel('physics')}
            title="Physics Simulation"
            className={`p-2 rounded-xl transition-all ${
              activePanel === 'physics' ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <button
            onClick={onResetCamera}
            title="Center Camera View"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            onClick={onRefreshData}
            title="Recalculate Gravity"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slide-down Overlays */}
      <AnimatePresence mode="wait">
        {activePanel === 'filters' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="w-72 bg-[var(--color-card)]/95 backdrop-blur-xl border border-[var(--color-border)] rounded-2xl shadow-2xl p-4 space-y-4 no-scrollbar"
          >
            <div>
              <h4 className="text-xxs font-black text-slate-500 uppercase tracking-widest">Filter Node Types</h4>
              <p className="text-[10px] text-slate-600 mt-0.5">Toggle what categories are visible on canvas</p>
            </div>

            <div className="space-y-2 border-t border-white/5 pt-3">
              {[
                { id: 'custom', label: 'Custom Notes', color: 'bg-violet-400' },
                { id: 'note', label: 'Docs / Notes', color: 'bg-purple-500' },
                { id: 'task', label: 'Tasks Reference', color: 'bg-rose-400' },
                { id: 'idea', label: 'Ideas Reference', color: 'bg-emerald-400' },
                { id: 'bookmark', label: 'Bookmarks Reference', color: 'bg-blue-400' }
              ].map(item => (
                <label 
                  key={item.id} 
                  className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${item.color} shadow-lg`} />
                    <span className="text-xs text-slate-300 font-medium">{item.label}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={filters[item.id]}
                    onChange={() => handleFilterToggle(item.id)}
                    className="w-4 h-4 rounded border-white/10 bg-zinc-950 text-violet-500 focus:ring-0 cursor-pointer"
                  />
                </label>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <h5 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Display Options</h5>
              <div className="space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-400">Show Node Labels</span>
                  <input
                    type="checkbox"
                    checked={physics.showLabels}
                    onChange={(e) => handlePhysicsChange('showLabels', e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-zinc-950 text-violet-500 focus:ring-0 cursor-pointer"
                  />
                </label>
                
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    Link Particle Glow <Sparkles className="w-3 h-3 text-amber-400" />
                  </span>
                  <input
                    type="checkbox"
                    checked={physics.showParticles}
                    onChange={(e) => handlePhysicsChange('showParticles', e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-zinc-950 text-violet-500 focus:ring-0 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </motion.div>
        )}

        {activePanel === 'physics' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="w-72 bg-[var(--color-card)]/95 backdrop-blur-xl border border-[var(--color-border)] rounded-2xl shadow-2xl p-4 space-y-4 no-scrollbar"
          >
            <div>
              <h4 className="text-xxs font-black text-slate-500 uppercase tracking-widest">D3 Force simulation</h4>
              <p className="text-[10px] text-slate-600 mt-0.5">Control simulation layout and positioning physics</p>
            </div>

            <div className="space-y-3.5 border-t border-white/5 pt-3">
              {/* Repulsion Force */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Repulsion Strength</span>
                  <span className="font-mono text-[10px] text-slate-500">{physics.chargeStrength}</span>
                </div>
                <input
                  type="range"
                  min="-450"
                  max="-50"
                  step="10"
                  value={physics.chargeStrength}
                  onChange={(e) => handlePhysicsChange('chargeStrength', parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
              </div>

              {/* Link Distance */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Link Connection Distance</span>
                  <span className="font-mono text-[10px] text-slate-500">{physics.linkDistance}px</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="180"
                  step="5"
                  value={physics.linkDistance}
                  onChange={(e) => handlePhysicsChange('linkDistance', parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
              </div>

              {/* Node Scale */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Node Visual Scale</span>
                  <span className="font-mono text-[10px] text-slate-500">{physics.nodeScale}x</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  step="0.5"
                  value={physics.nodeScale}
                  onChange={(e) => handlePhysicsChange('nodeScale', parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
              </div>

              {/* Friction / Decay */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Simulation Velocity Decay</span>
                  <span className="font-mono text-[10px] text-slate-500">{physics.velocityDecay}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.95"
                  step="0.05"
                  value={physics.velocityDecay}
                  onChange={(e) => handlePhysicsChange('velocityDecay', parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GraphControls;
