# 3DUX — Spatial Computing Web Engine

**3DUX** turns your browser into a “window into a 3D box.” Your head and hands are tracked with the camera; the 3D view updates in real time so the scene feels like it sits behind the screen. It works with or without a camera: if the camera is unavailable or you deny access, the app still loads and you can use the **mouse** to explore the effect.

---

## What It Is (In Plain Terms)

- You see an **inward-facing 3D box** (wireframe walls) drawn with Three.js.
- **Head tracking** (MediaPipe face landmarks) moves the virtual “camera” with your head, so moving left/right or closer/farther creates **motion parallax** — like looking through a real window.
- **Hand tracking** (MediaPipe hand landmarks) measures how open or closed your hand is (“tension”). That controls how **deep** the box is: open hand = shallow, fist = deep.
- **Off-axis projection** is used so the screen stays the focal plane and the 3D scene stays aligned with the edges of the monitor.
- You can **calibrate** a neutral pose (Reset Baseline) and toggle parallax or hand depth on/off. The app is **usable without a camera**: it will load and run with a mouse-based fallback if the camera is denied or missing.

---

## Requirements

- **Node.js** 18+ (for `npm` and running the setup script).
- A **modern browser** (Chrome, Edge, Firefox, Safari) with WebGL.
- **Optional:** Webcam for head and hand tracking. If you skip or deny the camera, the app still runs with mouse fallback.

---

## Step-by-Step Setup (Live Preview)

Follow these steps to run the app locally and see the live preview.

### 1. Open the project

Open the project folder in your terminal (e.g. `cd` into the 3dux directory).

### 2. Install dependencies

```bash
npm install
```

This installs React, Three.js, MediaPipe, Vite, Tailwind, and the rest of the dependencies.

### 3. Prepare MediaPipe for offline/camera use

The app needs MediaPipe WASM and model files in `public/mediapipe/`. Run:

```bash
npm run setup-mediapipe
```

This will:

- Copy the WASM runtime from `node_modules` into `public/mediapipe/wasm/`.
- Download the face and hand landmark models (`.task` files) into `public/mediapipe/`.

If the download fails (e.g. no network), the script will warn you; you can run it again later when online.

### 4. Start the dev server (live preview)

```bash
npm run dev
```

Vite will start and print a local URL, for example:

- **Local:** `http://localhost:3000/`
- If port 3000 is in use, it may use another (e.g. `http://localhost:3001/`).

### 5. Open in your browser

- Open the URL from step 4 in a **normal browser** (Chrome, Edge, Firefox, etc.).
- The app will either:
  - Ask for **camera permission** — allow it for head/hand tracking, or deny/skip to use **mouse fallback**.
  - If the camera isn’t available or you deny it, the app will still load (after a short wait or timeout) and you can use the 3D view with the mouse.
- You should see the 3D box and the UI; moving your head (or mouse) and hand will drive the effect as described above.

### 6. (Optional) Production build

To build for production (e.g. to deploy or to package for the Live ISO):

```bash
npm run setup-mediapipe
npm run build
```

Output is in the `dist/` folder. To preview the built app locally:

```bash
npm run preview
```

Then open the URL shown (e.g. `http://localhost:4173/`) in your browser.

---

## If the App Stays on the Loading Screen

The app is designed to **always** finish loading:

- If the **camera is denied** or unavailable, it switches to mouse fallback and hides the loading screen.
- If **MediaPipe or camera init hangs** (e.g. permission prompt left open), a **timeout (about 6 seconds)** will still show the app so you’re not stuck.

If you still see a loading screen in a normal browser:

1. **Check the console** (F12 → Console) for errors (e.g. missing files, CORS, or security errors).
2. **Use HTTPS or localhost** — some browsers restrict camera access on plain `http` (except `localhost`).
3. **Reload** and, if asked, allow or deny the camera explicitly; the app should then proceed.

---

## Quick Reference

| Command | Purpose |
|--------|--------|
| `npm install` | Install dependencies |
| `npm run setup-mediapipe` | Copy WASM + download models to `public/mediapipe/` |
| `npm run dev` | Start dev server → **live preview** in browser |
| `npm run build` | Build for production → `dist/` |
| `npm run preview` | Serve `dist/` locally to test the build |

---

## How to Use (Once Loaded)

1. **Camera (optional):** Allow when prompted for head and hand tracking.
2. **Head:** Move your head left/right and forward/back; the 3D perspective follows (parallax).
3. **Hand:** Open hand = shallower box, fist = deeper box (if Hand Depth Control is on).
4. **Reset Baseline:** Click to set your current head position as neutral (do this in your normal sitting pose).
5. **Toggles:** Use “Parallax Effect” and “Hand Depth Control” to turn head and hand features on or off.
6. **No camera:** The app loads anyway; you can still use the interface and see the 3D scene (mouse fallback).

---

## Tech Stack (Summary)

- **Frontend:** React 19, TypeScript
- **3D:** Three.js
- **Vision:** MediaPipe Tasks-Vision (face + hand landmarks)
- **Build:** Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React

---

## More Detail (Architecture)

### Computer vision (MediaPipe)

- **Face:** Nose position for X/Y; inter-eye distance for Z. Smoothed with EMA.
- **Hand:** “Tension” = average distance from wrist to fingertips (open vs closed). Drives depth of the box.

### Rendering (Three.js)

- **Scene:** Inward-facing box (back, left, right, top, bottom planes + front frame). Hand tension changes depth and wall positions.
- **Projection:** Off-axis (asymmetric) frustum so the screen stays the focal plane and the box stays aligned with the physical display.

### Offline / ISO build

- The app can run fully **offline** (no CDN). Run `npm run setup-mediapipe` then `npm run build`; `dist/` and `public/mediapipe/` contain everything needed.
- For building a **bootable Ubuntu Live ISO** that launches this app in kiosk mode, see the **`iso/`** folder and **`iso/README_ISO.md`**.
