import React from 'react';
import { X, Minus, Square } from 'lucide-react';

const TitleBar = () => {
  const handleMinimize = () => {
    window.require('electron').remote.getCurrentWindow().minimize();
  };

  const handleMaximize = () => {
    const win = window.require('electron').remote.getCurrentWindow();
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  };

  const handleClose = () => {
    window.require('electron').remote.getCurrentWindow().close();
  };

  // Alternative if remote is not available (using ipcRenderer)
  const sendAction = (action) => {
    if (window.ipcRenderer) {
      window.ipcRenderer.send('window-action', action);
    } else {
      // Fallback if global isn't set
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('window-action', action);
      } catch (e) {
        console.error("Electron IPC not available", e);
      }
    }
  };

  return (
    <div className="h-10 bg-[#0a0a0b] flex items-center justify-between pl-4 pr-0 select-none drag-region border-b border-border fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center gap-2.5">
        <img 
          src="./logo.ico" 
          alt="Vesta Logo" 
          className="w-5 h-5 object-contain"
        />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Vesta</span>
      </div>
      
      <div className="flex items-center h-full no-drag">
        <button 
          onClick={() => sendAction('minimize')}
          className="w-11 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer"
          title="Minimize"
        >
          <Minus size={15} strokeWidth={2} />
        </button>
        <button 
          onClick={() => sendAction('maximize')}
          className="w-11 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer"
          title="Maximize"
        >
          <Square size={11} strokeWidth={2} />
        </button>
        <button 
          onClick={() => sendAction('close')}
          className="w-12 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#e81123] transition-colors duration-150 cursor-pointer"
          title="Close"
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
