# FYP Photo Arranger

A client-side browser application designed to help university students prepare, crop, arrange, and export official final year project submission photos adhering strictly to the **Final Year Project – Group Photo Submission Guidelines**.

---

## 📋 Adherence to Official Specification

The application enforces and validates all five rules specified in the guidelines:

1. **Photo Requirements**
   - Headshots must show only the face (tight, professional framing).
   - Casual, selfie, or full-body photos are flagged.
   - Built-in intelligent client-side face detector auto-centers and frames the headshot.
   - Interactive manual cropper allows custom adjustments with alignment guides (eye level line, head oval).

2. **Name and Index Number Format**
   - **Index number is placed ABOVE student's name**.
   - **Student's name with initials is placed BELOW index number**.
   - **Zero spaces around index number**: Real-time validation warns and auto-strips spaces (e.g. `214001A`).
   - Initials formatter helper (e.g. `A.B.C. Perera`).

3. **Photo Arrangement**
   - Photos arranged in the exact same order as listed in the Final Year Project Details Form.
   - Easy drag/reorder controls (Move Left / Move Right).
   - **All photos strictly identical in size**: Enforced programmatically by the canvas engine.

4. **Layout and Formatting**
   - Crisp, uniform borders and typography (Times New Roman / Georgia / Arial).
   - Two layout modes matching guideline examples:
     - **Seamless Touching** (as shown on Page 1 of guidelines)
     - **Separated Bordered** (as shown on Page 2 of guidelines)

5. **Final Submission Rules**
   - **Group Project**: Generates **one combined image** containing all group members. Member #1 is designated as the **Group Leader**.
   - **Individual Project**: Generates a single submission image.
   - **Strict JPEG Output**: All downloads are exported strictly as high-resolution `image/jpeg` with `.jpg` extension.

---

## 🚀 Key Features

- **100% Client-Side & Private**: All image processing and face detection occurs in your browser. No photos or student details are sent to external servers.
- **Multi-Format Input Support**: Accepts JPG, PNG, WebP, HEIC/HEIF (Apple iPhone photos), GIF, SVG, BMP, and TIFF.
- **Intelligent Face Cropper**: Uses native browser `FaceDetector` API with an offline fallback to YCbCr skin-tone chrominance clustering to find faces and frame them with standard 3:4 portrait ratios.
- **Manual Crop Override**: Pan, zoom (1x to 2.5x), rotate (90° increments), mirror flip, and drag corner handles with live guideline overlays.
- **Batch Upload**: Upload all group members' photos in a single selection.
- **Live Interactive Preview**: Instant canvas rendering with zoom controls, size estimation, and clipboard copy.
- **Compliance Checklist**: Real-time checklist providing immediate green checkmarks when all guideline rules are satisfied.
- **Sample Demo Data**: Includes 1-click sample data with SVG vector headshots to test the tool instantly.

---

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

The production output will be generated in `dist/`.

---

## 📄 License

MIT
