export const categoryColors = [
  { name: 'cyan', hsl: 'hsl(187, 92%, 45%)', hex: '#06b6d4', text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', glow: 'rgba(6, 182, 212, 0.4)' },
  { name: 'emerald', hsl: 'hsl(142, 70%, 45%)', hex: '#10b981', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'rgba(16, 185, 129, 0.4)' },
  { name: 'amber', hsl: 'hsl(38, 92%, 55%)', hex: '#f59e0b', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: 'rgba(245, 158, 11, 0.4)' },
  { name: 'violet', hsl: 'hsl(262, 80%, 60%)', hex: '#8b5cf6', text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', glow: 'rgba(139, 92, 246, 0.4)' },
  { name: 'rose', hsl: 'hsl(344, 90%, 65%)', hex: '#f43f5e', text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', glow: 'rgba(244, 63, 94, 0.4)' },
  { name: 'fuchsia', hsl: 'hsl(292, 84%, 60%)', hex: '#d946ef', text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', glow: 'rgba(217, 70, 239, 0.4)' },
  { name: 'indigo', hsl: 'hsl(239, 84%, 65%)', hex: '#6366f1', text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', glow: 'rgba(99, 102, 241, 0.4)' },
  { name: 'slate', hsl: 'hsl(215, 20%, 55%)', hex: '#64748b', text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', glow: 'rgba(100, 116, 139, 0.4)' }
];

export const getCategoryColor = (categoryName) => {
  if (!categoryName) return categoryColors[7]; // slate default
  const name = String(categoryName).trim().toLowerCase();
  
  // Deterministic hash based on character codes
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % (categoryColors.length - 1); // exclude slate for hashing so slate is reserved for general/uncategorized
  
  // Override some defaults for exact feel
  if (name === 'all') return categoryColors[6]; // indigo
  if (name === 'general' || name === 'main') return categoryColors[7]; // slate
  if (name === 'money' || name === 'finance') return categoryColors[1]; // emerald green
  if (name === 'ideas' || name === 'inspiration') return categoryColors[2]; // amber orange
  
  return categoryColors[index];
};

export const evaluateSmartFilter = (filter, item, categoryKey) => {
  if (filter === 'All') return true;
  
  const createdDate = item.created ? new Date(item.created) : new Date();
  const today = new Date();
  
  if (filter === 'Today') {
    // Check if created today OR if tasks have due date today
    const isCreatedToday = createdDate.toDateString() === today.toDateString();
    const isDueToday = item.dueDate && new Date(item.dueDate).toDateString() === today.toDateString();
    return isCreatedToday || isDueToday;
  }
  
  if (filter === 'Priority') {
    if (categoryKey === 'tasks') {
      return item.priority === 'high';
    } else if (categoryKey === 'bookmarks') {
      return item.pinned === true;
    } else {
      // For notes/ideas, treat starred or longer contents as featured/priority
      return item.content && (item.content.includes('★') || item.content.includes('⭐') || item.content.length > 250);
    }
  }
  
  if (filter === 'Stale') {
    // Unchanged for more than 14 days
    const diffTime = Math.abs(today - createdDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 14 && !item.completed;
  }
  
  return true;
};
