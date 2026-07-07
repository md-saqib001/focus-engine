# Focus Engine

A productivity-tracking desktop application built with Electron + React + TypeScript, with a computer vision layer powered by Python, OpenCV, and MediaPipe.

---

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

---

## Node / Electron Setup

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

---

## Python / Computer Vision Setup

The CV engine lives in `python/cv_engine/`. It communicates with Node.js via **WebSocket** (continuous streaming) — there is **no HTTP server** anywhere in this stack.

### 1. Create and activate the virtual environment

> **Python 3.12 is required.** MediaPipe does not yet publish wheels for Python 3.13+.
> Check your versions with `py -0` — if 3.12 is listed, use the commands below.

```powershell
# Windows (PowerShell) — uses the py launcher to select 3.12
py -3.12 -m venv python\cv_env
python\cv_env\Scripts\Activate.ps1

# Windows (CMD)
py -3.12 -m venv python\cv_env
python\cv_env\Scripts\activate.bat

# macOS / Linux (assuming python3.12 is installed)
python3.12 -m venv python/cv_env
source python/cv_env/bin/activate
```

> **Tip (Windows):** If PowerShell blocks script execution, run once:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### 2. Install dependencies

```bash
pip install -r python/cv_engine/requirements.txt
```

### 3. Verify the webcam

```bash
python python/cv_engine/webcam_test.py
```

A live preview window opens. Press **Q** to quit.

### 4. Verify MediaPipe Face Mesh

```bash
python python/cv_engine/mediapipe_test.py
```

You should see your face with the full 468-point mesh + iris landmarks drawn. The terminal prints `Face detected` / `No face` per frame.

---

## Privacy Architecture — Computer Vision

> **No raw frames ever leave the Python process.**

| Principle | Implementation |
|-----------|---------------|
| **In-memory only** | Frames captured via `cv2.VideoCapture` are processed as NumPy arrays in RAM and discarded at the end of each tick. |
| **No disk writes** | `cv2.imwrite`, `cv2.VideoWriter`, and all file-write calls are **absent from production code**. `cv2.imshow` is used exclusively in the `*_test.py` scripts (never imported in production modules). |
| **Numeric outputs only** | The only data that leaves Python are derived numeric metrics — e.g., eye aspect ratio, head-pose angles, blink count, presence flag. Raw pixel data is never serialised or sent over the WebSocket. |
| **Local WebSocket** | The WebSocket server binds to `127.0.0.1` only. No external network interface is exposed. |
| **No model telemetry** | MediaPipe runs fully offline; no frames or landmarks are sent to any remote service. |
| **User consent** | The camera is activated only while a Focus session is running and the user has explicitly enabled the CV feature. |

These constraints mean the CV subsystem satisfies a **"numeric output only"** data-minimisation model: even in the event of a bug, no image data can be leaked over the wire or written to the filesystem from production paths.

---

## Project Structure (abbreviated)

```
focus-engine/
├── src/
│   ├── main/          # Electron main process (TypeScript)
│   ├── renderer/      # React UI (TypeScript)
│   └── preload/       # Context bridge
├── python/
│   ├── cv_env/        # Python venv (git-ignored)
│   └── cv_engine/
│       ├── requirements.txt
│       ├── webcam_test.py      # TEST ONLY
│       └── mediapipe_test.py   # TEST ONLY
└── resources/
```
