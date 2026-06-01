import React, { useState } from 'react';
import { User, Sparkles, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const SettingsSection = ({ title, description, children }) => (
  <div className="minimal-card p-6 space-y-6 bg-white/[0.01]">
    <div>
      <h3 className="text-sm font-black uppercase tracking-wider text-foreground">{title}</h3>
      <p className="text-slate-500 text-xxs mt-1 uppercase tracking-wider font-semibold">{description}</p>
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

const Settings = () => {
  const [displayName, setDisplayName] = useState(() => {
    return localStorage.getItem('user-display-name') || 'Yasin';
  });
  const [isSaved, setIsSaved] = useState(false);

  // Trigger state re-render on active theme change
  const [, setForceUpdate] = useState(0);

  const handleChangeName = (val) => {
    setDisplayName(val);
    if (!val.trim()) return;
    localStorage.setItem('user-display-name', val.trim());
    window.dispatchEvent(new Event('display-name-changed'));
    setIsSaved(true);
    
    const timer = setTimeout(() => setIsSaved(false), 1500);
    return () => clearTimeout(timer);
  };

  const handleSelectTheme = (themeId) => {
    localStorage.setItem('vesta-theme', themeId);
    document.body.className = `theme-${themeId}`;
    setForceUpdate(k => k + 1); // Trigger re-render to update selected card highlight
    setIsSaved(true);
    
    const timer = setTimeout(() => setIsSaved(false), 1500);
    return () => clearTimeout(timer);
  };

  const activeTheme = localStorage.getItem('vesta-theme') || 'carbon';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 premium-page-entrance select-none">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight uppercase">Settings</h2>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-1">Manage your Vesta workspace configuration.</p>
        </div>
      </header>

      <div className="grid gap-6">
        {/* Profile Settings */}
        <SettingsSection title="Profile Identity" description="Manage your personal workspace identity.">
          <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-white/10 bg-black/10 hover:border-white/20 transition-all gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <User size={16} />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">Display Name</span>
                <span className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5 block">Your public visual identity</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="text"
                value={displayName}
                onChange={(e) => handleChangeName(e.target.value)}
                placeholder="Yasin"
                maxLength={20}
                required
                className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2 text-xs text-white font-bold outline-none focus:border-blue-500/50 w-48 text-left uppercase transition-all focus:outline-none"
              />
            </div>
          </div>
        </SettingsSection>

        {/* Theme Settings */}
        <SettingsSection title="Workspace Theme" description="Choose a custom visual atmosphere for Vesta.">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { id: 'carbon', name: 'Carbon Space', desc: 'Velvety cosmic carbon dark with bright cyber-blue glowing outlines.', accent: 'bg-[#3b82f6]', bg: 'bg-[#07080d]' },
              { id: 'plasma', name: 'Midnight Plasma', desc: 'Rich violet-black depth with neon ambient purple glowing borders.', accent: 'bg-[#8b5cf6]', bg: 'bg-[#050409]' },
              { id: 'matrix', name: 'Emerald Matrix', desc: 'Hacker forest cyber-green with neon emerald glowing outlines.', accent: 'bg-[#10b981]', bg: 'bg-[#030504]' }
            ].map(t => {
              const isSelected = activeTheme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTheme(t.id)}
                  className={`p-4.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-32 select-none focus:outline-none ${isSelected ? 'border-blue-500 bg-blue-500/[0.04] ring-1 ring-blue-500/20' : 'border-white/10 bg-white/[0.01] hover:border-white/20'}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">{t.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`w-3 h-3 rounded-full ${t.bg} border border-white/10`} />
                      <span className={`w-3 h-3 rounded-full ${t.accent}`} />
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-500 leading-relaxed my-2">{t.desc}</p>
                  {isSelected ? (
                    <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 mt-auto flex items-center gap-1">
                      <Check size={10} /> Active Theme
                    </span>
                  ) : (
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 mt-auto hover:text-slate-400 transition-colors">
                      Select Theme
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </SettingsSection>

        {/* Save feedback banner */}
        <div className="flex items-center justify-end h-6 pr-2">
          {isSaved && (
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 transition-all">
              <Check size={12} /> Workspace Synchronized
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
