# <img src="https://github.com/user-attachments/assets/df2dc306-66c8-4106-8790-110ae1696cba" width="40" height="40" align="center" style="margin-right: 10px;" /> Vesta Workspace

> **Vesta** is a high-fidelity visual workspace and workflow designer that merges graphical stages with integrated personal notes, tasks, ideas, and bookmarks into a unified, desktop-class interactive canvas. Built as an Electron desktop suite using React and Tailwind CSS, it offers a glassmorphic productivity environment.

---

## 💎 Primary Feature Showcases

![Vesta Workspace Showcase](src/assets/hero.png)

### 🎨 Visual Workflow Designer
* **Dynamic Canvas Positioning**: Nodes are placed on an infinite canvas with zero positional drag latency, updating at a smooth 60fps.
* **Curved Directed Connections**: Connect your stages using beautiful, glowing quadratic Bezier paths with opaque arrowheads that align flush to node borders.
* **Hierarchical Sub-Node Branching**: Elevate checklist steps into visual child cards that automatically branch directly below parent nodes with curved dashed branch lines.
* **Predefined Database-Driven Templates**: Jumpstart your thoughts with multi-source templates like the *Research Pipeline Router* or *Deep Knowledge Mindmap*, combining notes, tasks, and bookmarks into logical pre-linked structures.

### ⚡ Infinite Canvas Zoom & Panning
* **Nested Coordinate Spaces**: Separate panning and scaling viewports keep mouse tracking at 1:1, avoiding snapping bugs during canvas operations.
* **Mathematical Vector Dot Grid**: Sharp, scalable grid backgrounds rendered using dynamic `radial-gradient` backgrounds that pan and scale with the zoom level (`0.2x` to `4.0x`).

### 📥 HD Canvas Vector & Image Exporter
* **Clean Origin Rasterization**: Direct 2D canvas drawing renders shapes locally at `2x` Retina density, bypassing standard sandboxing CORS limits to allow downloads.
* **Automatic Bounding Box Cropping**: Auto-calculates active node coordinates to wrap connection curves and dynamic-height cards without clipping edge borders.
* **Vector Vector Graphics**: Supports exporting high-fidelity SVG paths or rasterized PNG/JPG file structures.

### 📝 Integrated Personal Database
* **Grouped Workspace Comboboxes**: Dropdowns combine Notes, Tasks, and Bookmarks into a unified searchable glassmorphic combobox, complete with emojis and title indicators.
* **Dynamic Workspace Badge Linking**: Link active items from your workspace databases to stages or sub-actions. Visual badges render type indicators (`Check`, `FileText`, or `Link2`) with sleek unlinking toggles.

---

## 🛠️ Technology Stack & Architecture

Vesta is engineered to maintain high-density desktop rendering and subpixel readability:

* **Core Runtime**: [Electron](https://www.electronjs.org/) with a lightweight, secure native Express micro-service (`server.js`) backing up file systems and active lock-based storage.
* **Frontend Library**: [React 19](https://react.dev/) + [React Router](https://reactrouter.com/) + [Framer Motion](https://www.framer.com/motion/) for fluid page entries and UI transitions.
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) combined with Custom HSL glassmorphism and subpixel-antialiased readability.
* **Data Visualization**: Custom SVG connection curves + [react-force-graph-2d](https://github.com/vasturiano/react-force-graph-2d) for high-performance visual navigation.

---

## 🚀 Quick Start Guide

### 📦 Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### 1. Installation
Clone the repository and install the development dependencies:
```bash
# Clone the repository
git clone https://github.com/yourusername/vesta.git
cd vesta

# Install dependencies
npm install
```

### 2. Launch Local Development Server
To launch Vesta as a modern web app in your browser:
```bash
npm run dev
# Vite server will start on http://localhost:5173
```

### 3. Launch Native Desktop App (Recommended)
To run Vesta inside its native Chromium-powered desktop environment:
```bash
npm run electron:dev
# Concurrently compiles Vite, spins up Express, and boots up Electron
```

### 4. Pack Production Installer
To pack the application into a distribution-ready Windows installer (`.exe`):
```bash
npm run electron:win
# The installer artifact is written directly to the dist-electron/ directory
```

---

## 📁 Repository Directory Structure

```text
├── src/
│   ├── assets/        # Media and static graphic assets
│   ├── pages/         # Application workspaces (Charts.jsx, Tasks.jsx, Bookmarks.jsx, Notes.jsx)
│   └── index.css      # Core stylesheet containing global glassmorphic style system tokens
├── public/            # System app logo icon and static resource assets
├── electron.cjs       # Native main Electron window process manager
├── server.js          # Express local service handling active locks and data reads/writes
├── package.json       # Build scripts and dependencies
└── .gitignore         # Configured ignore exclusions
```

---

## 🛡️ License

Copyright © 2026 Stride Dev. All rights reserved. Distributed under the **MIT License**.
