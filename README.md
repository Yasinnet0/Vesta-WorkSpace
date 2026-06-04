# <img src="public/logo.ico" width="40" height="40" align="center" style="margin-right: 10px;" /> Vesta

[![Electron](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)

**Vesta** is a local-first, private desktop workspace that unifies your notes, ideas, bookmarks, tasks, and visual charts into a single interactive intelligence hub. 

Rather than jumping between separate apps for notes, todo lists, bookmarks, and mindmaps, Vesta brings them together in a clean, unified dashboard, allowing you to link your local databases directly to visual nodes on a zoomable, infinite canvas.

---

## 🎨 Features Overview

![Vesta Workspace Showcase](https://repository-images.githubusercontent.com/1256480717/dea44532-1295-439b-84c7-cf24a750d841)

---

## 🔑 Key Features

* **Unified Dashboard**: Get a comprehensive, visual overview of your tasks, notes, ideas, and bookmarks in a single interface.
* **Visual Canvas & Mindmaps**: Place stages and cards on an infinite canvas, connect them with curved relationship paths, and build hierarchical checklists.
* **Dynamic Database Linking**: Link any note, task, bookmark, or idea directly to your canvas cards. Click link badges to open related resources instantly.
* **Interactive Relationship Graph**: Visualize the connections between your databases in a dynamic 2D force-directed graph.
* **Local-First & Private**: All data is stored locally on your machine. No external servers, cloud tracking, or account logins required.
* **Cross-Platform Installer**: Packaged cleanly as a native desktop application for Windows, macOS, and Linux.

---

## 🛠️ Technology Stack

Vesta is built using:
* **Electron**: High-performance native desktop shell.
* **React 19 & Vite**: Fluid, modern user interface.
* **Vanilla CSS**: Clean, responsive layout.
* **Express.js**: Lightweight local backend service managing file persistence.

---

## 📥 Download and Run

Vesta is distributed as pre-compiled native installers for all major platforms. You can download the latest version from the **Releases** tab:

* **Windows**: `Vesta Setup Windows x64.exe` (Standard installer for 64-bit Windows)
* **macOS (Apple Silicon)**: `Vesta Setup macOS arm64.dmg` (Optimized for Apple Silicon M1/M2/M3 chips)
* **macOS (Intel)**: `Vesta Setup macOS x64.dmg` (For Intel-based Mac computers)
* **Linux**: `Vesta Setup Linux x64.AppImage` (Universal Linux package)

---

## 💻 Developer Setup

If you want to run Vesta from source or contribute to its development:

### Prerequisites
* [Node.js](https://nodejs.org/) (v20 or higher)

### Setup & Run
```bash
# Clone the repository
git clone https://github.com/yourusername/vesta.git
cd vesta

# Install dependencies
npm install

# Run Vite dev server (web view)
npm run dev

# Run Electron desktop app in development mode
npm run electron:dev
```

### Packaging Installers
```bash
# Build the production installers for your current platform
npm run dist
```

---
MIT License • Stride Dev
