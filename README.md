# 🎮 CLIPFORGE AI — 100% Free In-Browser Gaming Shorts Maker

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Hosting: GitHub Pages](https://img.shields.io/badge/Hosting-GitHub%20Pages-blue.svg)](https://pages.github.com/)
[![Cost: $0 Forever](https://img.shields.io/badge/Cost-%240%20Forever-10b981.svg)](#)
[![Privacy: 100% On--Device](https://img.shields.io/badge/Privacy-100%25%20On--Device-06b6d4.svg)](#)

> **Turn raw gameplay sessions into viral 9:16 vertical shorts for TikTok, YouTube Shorts, and Instagram Reels — directly inside your mobile or desktop browser.**
> 
> **Zero subscriptions. Zero server uploads. Zero watermarks. $0 cost forever.**

---

## ⚡ What is CLIPFORGE AI?

Commercial gaming clipping SaaS tools charge **\$20 to \$50 per month** because they upload your gigabytes of heavy video files to remote cloud servers (AWS/GCP) and pay hourly for remote GPU clusters.

**CLIPFORGE AI changes the game** by moving the entire video pipeline into the user's browser using client-side Web Audio decibel scanning, dynamic HTML5 Canvas rendering, and native MediaRecorder encoding.

### Key Value Highlights
* 🛡️ **100% Device-Local Privacy**: Your video recordings never leave your Android phone or PC. No backend servers, no cloud storage, and zero tracking.
* ⚡ **Decibel & Motion Action Detector**: Uses the Web Audio API to calculate RMS decibels (screams, gunshots, hype reactions, explosions) combined with frame difference heuristics to pinpoint candidate highlights.
* 📱 **Smart 9:16 Blurred Wings**: Never post tiny letterboxed clips. ClipForge mirrors your 16:9 gameplay onto atmospheric blurred top and bottom wings, keeping your crosshair and HUD centered.
* 🔥 **Offline Punchline Studio**: Burn energetic gamer titles (*"INSANE 1v4 CLUTCH!! 🔥"*, *"NO WAY HE HIT THAT! 💀"*) directly into your clip frames with customizable neon styles.
* 🚀 **Dual Export Pipelines**:
  1. **Native Browser Pipeline (Default)**: Instant start, 0MB download, minimal RAM usage, 100% reliable on Android phones.
  2. **FFmpeg.wasm Transcoder**: Precision WebAssembly trimming and MP4 remuxing where supported.
* 🎮 **Built-in Sample Gameplay Generator**: Don't have a video file ready on your phone? Click **"Try Sample Gameplay Demo"** to synthesize a retro FPS clutch clip with gunshots and explosions in 2 seconds!

---

## 🏗️ Architecture & Technology Stack

CLIPFORGE AI is built with clean, standards-compliant HTML5, CSS3, and ES6+ JavaScript. It requires **zero frameworks, zero build steps, and zero package installations**.

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **User Interface** | Semantic HTML5 & Dark Mode CSS3 | Gaming SaaS aesthetics with cyan/violet accents, responsive touch controls for mobile screens. |
| **Audio Analysis** | Web Audio API (`AudioContext`, `decodeAudioData`) | Decodes local audio track, computes RMS volume peaks across time slices, and scores excitement levels. |
| **Visual Framing** | Offscreen HTML5 Canvas 2D | Transforms 16:9 horizontal gameplay into 9:16 vertical shorts (blurred wings, center crop, fit). |
| **Caption Burner** | Canvas 2D Text & Shadow Subsystem | Renders high-contrast gaming text with heavy borders and neon fills directly onto exported video frames. |
| **Native Encoding** | `MediaRecorder` & `captureStream()` | Captures composite video + audio stream directly into standard MP4 / WebM containers with 0MB download. |
| **WASM Transcoding** | `@ffmpeg/ffmpeg` 0.11.6 | Client-side WebAssembly video remuxing with `coi-serviceworker` for cross-origin isolation. |
| **Static Hosting** | GitHub Pages | Free static site hosting with global CDN delivery. |

---

## 📱 How to Publish on GitHub Pages from Android (Beginner Guide)

Since this repository is already initialized on your Android device with remote `https://github.com/Asad-j8/clipforge-ai`, you can publish it in a few simple steps.

### Option A: Using the Android Terminal (Termux / AntiGem CLI)

1. **Stage all created files:**
   ```bash
   cd ~/clipforge-ai
   git add .
   ```

2. **Commit the project:**
   ```bash
   git commit -m "feat: complete ClipForge AI in-browser gaming clipper SaaS MVP"
   ```

3. **Push to GitHub:**
   ```bash
   git push -u origin main
   ```
   *(If prompted, enter your GitHub username and your GitHub Personal Access Token as the password.)*

4. **Enable GitHub Pages (One-Time Step):**
   * Open your browser (Chrome or Brave) on your Android phone.
   * Go to: `https://github.com/Asad-j8/clipforge-ai/settings/pages`
   * Under **Build and deployment**:
     * **Source**: Choose `Deploy from a branch`
     * **Branch**: Select `main` and folder `/ (root)`
     * Tap **Save**.
   * Within 1 to 2 minutes, your live site will be active at:
     **`https://asad-j8.github.io/clipforge-ai/`**

---

### Option B: Using GitHub Web in Android Chrome

If you prefer using the browser without terminal commands:

1. Open Chrome on your Android phone and visit: `https://github.com/Asad-j8/clipforge-ai`
2. If any files are missing, tap **Add file &rarr; Upload files** and select `index.html`, `styles.css`, `app.js`, `coi-serviceworker.min.js`, and `README.md`.
3. Tap **Commit changes**.
4. Go to **Settings &rarr; Pages &rarr; Source: Deploy from branch &rarr; main &rarr; Save**.

---

## 📱 Android Phone Performance & Best Practices

Mobile phones have lower RAM limits per browser tab (usually 512MB to 1.5GB) compared to desktop PCs. Follow these best practices for the smoothest experience:

1. **Use the Native Browser Pipeline (Default)**:
   * It starts instantly with **0 MB downloads** and consumes minimal memory.
2. **Recommended File Sizes**:
   * For standard Android devices (4GB–6GB RAM), video files between **10MB and 200MB** (approx 3 to 15 minutes of 1080p/720p gameplay) process smoothly.
   * For very large stream recordings (1 hour+), trim your raw video in your phone's gallery app first before importing.
3. **Keep Your Screen Awake**:
   * Android aggressively suspends background tabs to conserve battery. Keep your browser in the foreground while exporting your clip.
4. **Recommended Browsers**:
   * Google Chrome for Android, Samsung Internet, or Brave Browser.

---

## 🔍 Feature & Limitations Transparency Matrix

We believe in complete honesty about what runs inside a free browser vs. what requires paid cloud infrastructure.

| Feature | Supported in ClipForge? | How it Works / Free Alternative |
| :--- | :---: | :--- |
| **Audio-Peak Highlight Detection** | ✅ **YES** | Browser-local Web Audio RMS volume peak scanner. Pinpoints yells, gunshots, and explosions. |
| **9:16 Shorts with Blurred Wings** | ✅ **YES** | Real-time dual-layer Canvas rendering with blur backdrop filter. |
| **Offline Punchline Captions** | ✅ **YES** | Offline caption studio with gaming presets and customizable neon styles. |
| **Real Video Export** | ✅ **YES** | Real in-browser rendering via Canvas MediaRecorder or FFmpeg WebAssembly. |
| **Automatic AI Speech-to-Text** | ❌ **No (By Design)** | Commercial cloud models (OpenAI Whisper) cost money per minute and require external API keys. ClipForge includes a fast, manual Punchline Studio instead. |
| **4K 60FPS Multi-Hour Batching** | ❌ **No (Browser Limit)** | Browser tabs crash when exceeding 2GB RAM. ClipForge provides clear file size warnings to protect your device. |

---

## 📁 Repository Structure

```
clipforge-ai/
├── index.html                  # Main application structure & landing page
├── styles.css                  # Dark gaming SaaS responsive styling
├── app.js                      # Audio peak detector, canvas renderer & export engine
├── coi-serviceworker.min.js    # Cross-Origin Isolation worker for GitHub Pages WASM
└── README.md                   # Documentation & setup guide
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free for personal and commercial use.
