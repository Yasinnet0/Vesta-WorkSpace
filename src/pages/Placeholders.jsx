import React from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Sparkles } from 'lucide-react';

const SettingsSection = ({ title, description, children }) => (
  <div className="minimal-card p-6 space-y-6 bg-white/[0.01]">
    <div>
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      <p className="text-slate-500 text-xs mt-1">{description}</p>
    </div>
    <div className="space-y-3">
      {children}
    </div>
  </div>
);

const SettingItem = ({ icon: Icon, label, value, active = false }) => (
  <div className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
    active ? 'bg-accent-blue/10 border-accent-blue/30' : 'bg-white/[0.01] border-border hover:border-white/10'
  }`}>
    <div className="flex items-center gap-3">
      <div className={`p-1.5 rounded-md ${active ? 'bg-accent-blue text-white' : 'bg-white/5 text-slate-600'}`}>
        <Icon size={16} />
      </div>
      <span className={`text-sm font-medium ${active ? 'text-foreground' : 'text-slate-500'}`}>{label}</span>
    </div>
    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{value}</span>
  </div>
);

export const Settings = () => (
  <div className="max-w-4xl mx-auto space-y-8">
    <header>
      <h2 className="text-2xl font-semibold text-foreground tracking-tight">Settings</h2>
      <p className="text-slate-500 text-sm mt-1">Manage your workspace preferences and security protocols.</p>
    </header>

    <div className="grid gap-6">
      <SettingsSection title="Profile" description="Manage your personal identity and public presence.">
        <SettingItem icon={User} label="Display Name" value="Yasin" active />
        <SettingItem icon={Shield} label="Security Key" value="********" />
      </SettingsSection>

      <SettingsSection title="Appearance" description="Customize the visual experience of your workspace.">
        <SettingItem icon={Palette} label="System Theme" value="Midnight Blue" active />
        <SettingItem icon={Palette} label="Accent Color" value="Blue" />
      </SettingsSection>

      <SettingsSection title="Notifications" description="Configure how you receive system alerts.">
        <SettingItem icon={Bell} label="Push Notifications" value="Enabled" active />
      </SettingsSection>
    </div>
  </div>
);
