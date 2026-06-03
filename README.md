# <img src="public/logo.ico" width="40" height="40" align="center" style="margin-right: 10px;" /> Vesta

**Vesta** is a local-first, private desktop workspace that unifies your notes, ideas, bookmarks, tasks, and visual charts into a single interactive intelligence hub. 

Rather than jumping between separate apps for notes, todo lists, bookmarks, and mindmaps, Vesta brings them together in a clean, unified dashboard, allowing you to link your local databases directly to visual nodes on a zoomable, infinite canvas.

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
