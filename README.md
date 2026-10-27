# ✦ Apollonography

> **A high-performance personal creative workspace, lore encyclopedia, character roster manager, and worldbuilding canvas for Windows.**

Built with **React Native Windows (v0.84)**, native **C++ SQLite TurboModule** (with WAL mode), **WebView2 / TipTap WYSIWYG editor**, and a custom **Neo-Brutalist design system**.

---

## 📋 Table of Contents
1. [Prerequisites & System Requirements](#1-prerequisites--system-requirements)
2. [Visual Studio 2022 Installation Guide](#2-visual-studio-2022-installation-guide)
3. [First-Time Repository Setup](#3-first-time-repository-setup)
4. [Running & Building Apollonography](#4-running--building-apollonography)
5. [Standalone Executable & Installer](#5-standalone-executable--installer)
6. [Data Storage & Database Architecture](#6-data-storage--database-architecture)
7. [Reclaiming Disk Space (Safe Cleanup)](#7-reclaiming-disk-space-safe-cleanup)
8. [Troubleshooting Common Issues](#8-troubleshooting-common-issues)

---

## 1. Prerequisites & System Requirements

- **Operating System:** Windows 10 (Version 1903 or higher) or Windows 11 (x64)
- **Windows Developer Mode:** Enabled (*Settings > System / Privacy & Security > For Developers > Developer Mode: **ON***)
- **Node.js:** v18.x or v20.x LTS ([Download Node.js](https://nodejs.org/))
- **Git:** Git for Windows ([Download Git](https://git-scm.com/))
- **Visual Studio 2022:** Community (Free), Professional, or Enterprise ([Download Visual Studio](https://visualstudio.microsoft.com/vs/))

---

## 2. Visual Studio 2022 Installation Guide

When installing or modifying **Visual Studio 2022** via the *Visual Studio Installer*, ensure the following workloads and individual components are checked:

### A. Workloads to Select:
1. **Desktop development with C++**
2. **Universal Windows Platform development**

### B. Individual Components (right-hand panel):
- **MSVC v143 - VS 2022 C++ x64/x86 build tools (Latest)**
- **Windows 10/11 SDK** (e.g., `10.0.19041.0` or `10.0.22621.0` or higher)
- **C++ ATL for latest v143 build tools (x86 & x64)**
- **C++ (v143) Universal Windows Platform tools**

> [!TIP]
> If you already have Visual Studio 2022 installed, open **Visual Studio Installer**, click **Modify**, and verify the checkboxes above.

---

## 3. First-Time Repository Setup

Open PowerShell or Windows Terminal in your projects folder:

```powershell
# 1. Clone the repository (if on a fresh machine)
git clone https://github.com/austindatan/Apollonography.git
cd Apollonography

# 2. Install Node dependencies (runs postinstall patches automatically)
npm install

# 3. Build the embedded WYSIWYG editor bundle
npm run build:editor
```

> [!NOTE]
> The `npm run build:editor` command bundles the TipTap rich-text editor engine and generates `src/assets/editor/editorBundle.js` and `editor.html`. Always run this whenever editor dependencies or extensions are updated.

---

## 4. Running & Building Apollonography

### Development Mode (with Metro Hot Reloading)
```powershell
# Launches Metro server and starts the app in Debug mode
npm run windows
```
* Or start Metro in one terminal (`npm start`) and run `npx @react-native-community/cli run-windows` in another.

### Production / Release Mode (Fastest, Standalone Performance)
```powershell
# Compiles native C++ binaries with optimizations and packages the production bundle
npx @react-native-community/cli run-windows --release
```
* Build outputs are compiled to `windows/x64/Release/`.
* The packaged app is automatically registered in your Windows Start Menu as **Apollonography**.

---

## 5. Standalone Executable & Installer

Pre-compiled production artifacts are located in the `dist/` directory:

### Option A: Portable Standalone Executable
* **Folder:** `dist/Apollonography-Portable/`
* **File:** `apollonography.exe`
* Contains all required WinUI 3 runtime DLLs, native Hermes engine, fonts, and production bundle. You can copy this entire folder to any Windows 10/11 x64 PC and double-click `apollonography.exe` to launch immediately without installing.

### Option B: Windows App Package Installer (`.msix`)
* **Folder:** `dist/Apollonography-Installer/`
* **File:** `apollonography.Package_1.0.0.0_x64.msix`
* Double-click the `.msix` file or right-click `Install.ps1` -> *Run with PowerShell* to register the app in Windows Start Menu.

### Updating the Portable Release Bundle After UI Changes:
If you make JavaScript/TypeScript UI changes and want to update the portable bundle without re-running a full native C++ rebuild:
```powershell
npx react-native bundle --platform windows --entry-file index.js --bundle-output dist/Apollonography-Portable/Bundle/index.windows.bundle --assets-dest dist/Apollonography-Portable/Bundle --dev false
```

---

## 6. Data Storage & Database Architecture

Apollonography stores all user data locally on your machine with zero cloud dependence.

### 1. SQLite Database:
```text
C:\Users\<user>\AppData\Local\Apollonography\Data\apollonography.db
```
- **Engine:** Native SQLite3 TurboModule compiled into C++.
- **Journal Mode:** Write-Ahead Logging (`WAL`).
  - Active transactions are written to `apollonography.db-wal` and periodically flushed to `apollonography.db`.
  - Checkpoints are triggered automatically on saves and deletions (`PRAGMA wal_checkpoint(PASSIVE)`).
- **Inspecting:** You can inspect or query this file directly using *DB Browser for SQLite* or Python.

### 2. Media & Uploaded Artwork:
```text
C:\Users\<user>\AppData\Local\Packages\apollonography_0pgy4g1snxjf6\LocalCache\Local\Apollonography\
```
- Character avatars, project banners, series emblems, and editor media attachments are persisted in this directory.

---

## 7. Reclaiming Disk Space (Safe Cleanup)

After building with Visual Studio, intermediate C++ build caches (`.obj`, debug symbols, compiler caches) can consume **5 to 15+ GB**. You can safely clean them up without harming your source code or database.

### Safe to Delete (Reclaims 5–15 GB):
You can safely delete any of the following folders at any time:
- `windows/x64/` *(intermediate compiler objects)*
- `windows/apollonography/Generated Files/` *(auto-generated C++/WinRT headers)*
- `windows/.vs/` *(Visual Studio temporary cache)*
- `node_modules/` *(recreated anytime with `npm install`)*

### ⚠️ NEVER Delete:
- `src/` *(your source code)*
- `windows/apollonography/` (except `Generated Files/`)
- `package.json`, `tsconfig.json`, `index.js`
- `C:\Users\<user>\AppData\Local\Apollonography\Data\` *(your actual articles, projects, and database!)*

---

## 8. Troubleshooting Common Issues

### 1. `Cannot find module ... or Metro build fails`
Run:
```powershell
npm install
npm run build:editor
npx react-native start --reset-cache
```

### 2. `error MSB8020: The build tools for v143 cannot be found`
Open **Visual Studio Installer** -> Click **Modify** -> Ensure **MSVC v143 - VS 2022 C++ x64/x86 build tools** is checked and installed.

### 3. `Script execution disabled (Execution_Policies)`
If PowerShell blocks scripts like `Install.ps1` or `npm`:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### 4. Database changes not showing in external DB viewer
SQLite operates in WAL mode. Press **F5 (Refresh)** in DB Browser for SQLite to reload uncheckpointed WAL frames from `apollonography.db-wal`.
