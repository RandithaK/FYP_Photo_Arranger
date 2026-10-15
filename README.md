# FYP Photo Arranger

A private, client-side browser application designed to help university students prepare, crop, arrange, and export official final year project submission photos adhering strictly to official **Final Year Project – Group Photo Submission Guidelines**.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![100% Client-Side](https://img.shields.io/badge/Privacy-100%25%20In--Browser-brightgreen.svg)](#-privacy--security-model)
[![Built with React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript%20%2B%20Vite-61dafb.svg)](https://vitejs.dev/)
[![MediaPipe BlazeFace](https://img.shields.io/badge/AI-MediaPipe%20BlazeFace%20(WASM)-orange.svg)](https://developers.google.com/mediapipe)

---

## 🏗️ System Architecture

The application operates entirely within the user's browser runtime. It integrates modern Web APIs, WebAssembly ML models, client-side transcoding, and an HTML5 2D Canvas rendering engine to eliminate any reliance on backend infrastructure or cloud storage.

```mermaid
flowchart TD
  subgraph InputLayer ["1. Input & Acquisition Layer"]
    A1["Drag & Drop (Files / Folders)"]
    A2["Native File Picker (Multi / Single)"]
    A3["WebRTC Camera Stream (Front / Rear)"]
    A4["Student Metadata Form Inputs"]
  end

  subgraph StateLayer ["2. Application State & Flow (React 19)"]
    S0["Wizard Controller (Step 1 → Step 2 → Step 3)"]
    S1["Theme Engine (Auto / Light / Dark)"]
    S2["Step 1: Student Details & Order Manager"]
    S3["Step 2: Photo Ingestion & Card Grid"]
    S4["Step 3: Canvas Layout & Export Preview"]
    S5["Modal Manager (Camera & Manual Cropper)"]
  end

  subgraph ProcessingLayer ["3. ML, Transcoding & Image Processing"]
    P1["HEIC/HEIF Decoder (heic2any)"]
    P2["MediaPipe BlazeFace WASM Engine"]
    P3["Intelligent 3:4 Headshot Cropper"]
    P4["Manual Cropper Matrix (Zoom / Pan / Rotate)"]
    P5["Specification Validator (Zero-Space Index)"]
  end

  subgraph RenderLayer ["4. Rendering & Export Engine"]
    R1["High-DPI HTML5 2D Canvas Engine"]
    R2["Zero-Gap Layout Generator (1px Thin Line)"]
    R3["Serif Typography Renderer (Times New Roman)"]
    R4["JPEG Blob Generator (image/jpeg, quality: 0.95)"]
  end

  subgraph OutputLayer ["5. Artifact Delivery"]
    O1["Direct .jpg File Download"]
    O2["Clipboard Direct Copy (image/png fallback)"]
    O3["100% In-Browser Privacy (Zero Server Uploads)"]
  end

  A1 --> S3
  A2 --> S3
  A3 --> S5
  A4 --> S2

  S0 --> S2
  S0 --> S3
  S0 --> S4
  S1 -.-> S0

  S3 --> P1
  P1 --> P2
  S3 --> P2
  P2 --> P3
  P3 --> S3
  S5 --> P4
  P4 --> S3

  S2 --> P5
  P5 --> S4

  S3 --> S4
  S4 --> R1
  R1 --> R2
  R1 --> R3
  R2 --> R4
  R3 --> R4

  R4 --> O1
  R4 --> O2
  R4 --> O3
```

### Architectural Highlights

1. **Zero-Cloud Privacy**: Photos, names, and index numbers never leave the user's device. No telemetry, third-party analytics, or external server uploads exist.
2. **Offline-First WASM Face Detection**: Google MediaPipe BlazeFace models run client-side via WebAssembly (`@mediapipe/tasks-vision`) to locate facial landmarks and automatically compute the ideal 3:4 portrait crop box.
3. **Multi-Format Ingestion**: Supports JPG, PNG, WebP, GIF, BMP, TIFF, SVG, and iPhone HEIC/HEIF files (decoded on-the-fly via dynamic `heic2any` import).
4. **Hardware Media Capture**: Directly integrates with device cameras via WebRTC `navigator.mediaDevices.getUserMedia`, allowing instant capture with front/rear switching and framing guides on mobile and desktop.
5. **High-Resolution Canvas Compositor**: Programmatically draws all student photos with uniform dimensions, zero horizontal gaps with a crisp 1px dividing line, and authentic Serif (`Times New Roman`) typography.

---

## 📋 Adherence to Official Specification

The application enforces and validates all guidelines specified in the university requirements:

1. **Photo Requirements**
   - Headshots must show only the face (tight, professional framing).
   - Casual, selfie, or full-body photos are flagged.
   - Built-in intelligent client-side face detector auto-centers and frames the headshot.
   - Interactive manual cropper allows custom adjustments with alignment guides (eye level line, head oval).

2. **Name and Index Number Format**
   - **Index number is placed ABOVE student's name**.
   - **Student's name with initials is placed BELOW index number**.
   - **Zero spaces around index number**: Real-time validation warns and auto-strips spaces (e.g., `214001A`).
   - Initials formatter helper (e.g., `A.B.C. Perera`).

3. **Photo Arrangement**
   - Photos arranged in the exact same order as listed in the Final Year Project Details Form.
   - Reorder controls (Move Left / Move Right) to adjust member sequence.
   - **Identical Photo Sizing**: Enforced programmatically by the canvas engine.

4. **Layout and Formatting**
   - Crisp, uniform borders and locked **Serif Typography** (`Times New Roman`).
   - Standard **Zero-Gap Layout with a 1px Thin Dividing Line** between photos.

5. **Final Submission Rules**
   - **Group Project**: Generates **one combined image** containing all group members. Member #1 is designated as the **Group Leader**.
   - **Individual Project**: Generates a single submission image.
   - **Strict JPEG Output**: All downloads are exported strictly as high-resolution `image/jpeg` with `.jpg` extension.

---

## 🚀 Key Features

- **Guided 3-Step Workflow**: Clean, distraction-free stepped flow (1. Details $\rightarrow$ 2. Photos $\rightarrow$ 3. Arrange & Export).
- **Flexible Photo Ingestion & Professional Photo Reminders**:
  - **Drag and Drop**: Drop photos onto individual student slots or drop multiple photos at once to populate subsequent members sequentially.
  - **Native File Picker**: "Browse File" buttons on each student card with built-in format filtering.
  - **Professional Photo Reminders**: Clear guideline callouts preventing accidental selfie or casual snapshot uploads.
  - **Device Camera with Live Positioning Suggestions**:
    - Real-time in-browser pose analyzer detecting head distance, tilt, centering, eye level line, and lighting.
    - Live guidance prompts: *"Move closer"*, *"Step back"*, *"Keep head upright (level eyes)"*, *"Raise camera to eye level"*, *"Face camera directly"*.
    - Interactive 3:4 portrait guide frame with real-time green alignment states and ready shutter pulse.
    - Front/rear camera switching, freeze review, and instant BlazeFace alignment.
- **Intelligent Face Cropping & Manual Override**:
  - MediaPipe BlazeFace detection frames headshots automatically.
  - Interactive crop modal with zoom (1x to 2.5x), pan, 90° rotation, and horizontal mirror flip.
- **Fully Responsive (Mobile & Desktop)**:
  - Mobile touch targets $\ge 44\text{px}$.
  - iOS-optimized inputs ($16\text{px}$ font to prevent unwanted viewport zooming).
  - Adaptive grid and touch-friendly controls across phones, tablets, and desktops.
- **Automatic Light/Dark Theme**:
  - Automatically matches system OS theme preference (`prefers-color-scheme`).
  - Quick-toggle cycle: **Auto $\rightarrow$ Light $\rightarrow$ Dark** with persistent local state.
- **Strict Compliance Checklist**: Real-time validation providing instant green checkmarks when all guideline rules are satisfied before export.
- **1-Click Sample Demo Data**: Quickly populate realistic student details and SVG vector headshots to verify the workflow immediately.

---

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [npm](https://www.npmjs.com/)

### Installation

```bash
# Clone the repository
git clone https://github.com/RandithaK/FYP_Photo_Arranger.git
cd FYP_Photo_Arranger

# Install dependencies
npm install
```

### Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Production Build & Lint

```bash
# Run linter
npm run lint

# Build production bundle
npm run build
```

The optimized static assets will be output to the `dist/` folder, ready for deployment to GitHub Pages, Netlify, Vercel, or any static host.

---

## 🔒 Privacy & Security Model

- **No Remote Processing**: All image processing, face detection, HEIC transcoding, and canvas rendering happen 100% in the client browser.
- **Zero Server Uploads**: Student photos and academic index numbers are never transmitted over the network.
- **Sandboxed**: No cookies, tracking beacons, or third-party analytic scripts are included.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
