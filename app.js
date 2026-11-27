/**
 * CLIPFORGE AI — Modern In-Browser Gaming Highlight & Shorts SaaS MVP
 * 100% Client-Side Processing • Web Audio Peak Detection • Canvas 9:16 Shorts • FFmpeg.wasm & Native MediaRecorder
 * Zero Cost • Zero Server Uploads • Android & Desktop Optimized
 */

'use strict';

// ============================================================================
// Application State
// ============================================================================
const state = {
  file: null,
  videoUrl: null,
  fileName: '',
  fileSize: 0,
  duration: 0,
  videoWidth: 0,
  videoHeight: 0,
  
  // Audio & Peak Detection
  audioContext: null,
  audioBuffer: null,
  rmsData: [],          // Normalized decibel / energy curve (0.0 to 1.0)
  detectedPeaks: [],    // Array of peak points { time, score, reason }
  suggestedClips: [],   // Array of { id, start, end, duration, score, title, reason }
  selectedClipId: null,

  // Trimming & Framing
  aspectRatio: '9:16',  // '9:16', '16:9', '1:1'
  framingMode: 'blur',  // 'blur', 'crop', 'fit'
  clipDuration: 30,     // Target duration in seconds
  clipCount: 3,         // Target number of suggested highlights
  trimStart: 0,         // Current start time (seconds)
  trimEnd: 30,          // Current end time (seconds)

  // Captions & Punchline Studio
  captions: {
    enabled: true,
    text: 'INSANE 1v4 CLUTCH!! 🔥',
    style: 'neon-yellow', // 'neon-yellow', 'cyber-cyan', 'danger-red', 'clean-white'
    pos: 'center',        // 'top', 'center', 'bottom'
    size: 'large'         // 'medium', 'large', 'xlarge'
  },

  // Export Settings
  exportEngine: 'native', // 'native' or 'wasm'
  isExporting: false,
  abortExport: false,
  exportedClips: [],

  // FFmpeg WebAssembly instance (lazy-loaded)
  ffmpegInstance: null,
  ffmpegLoaded: false
};

// ============================================================================
// DOM Elements
// ============================================================================
const dom = {
  // Navigation & Reset
  resetAllBtn: document.getElementById('resetAllBtn'),
  heroDemoBtn: document.getElementById('heroDemoBtn'),

  // Dropzone & Ingestion
  dropzoneCard: document.getElementById('dropzoneCard'),
  dropzone: document.getElementById('dropzone'),
  videoFileInput: document.getElementById('videoFileInput'),
  loadDemoSampleBtn: document.getElementById('loadDemoSampleBtn'),
  videoMetaStrip: document.getElementById('videoMetaStrip'),
  metaFileName: document.getElementById('metaFileName'),
  metaFileSize: document.getElementById('metaFileSize'),
  metaDuration: document.getElementById('metaDuration'),
  metaResolution: document.getElementById('metaResolution'),
  metaSafetyBadge: document.getElementById('metaSafetyBadge'),
  metaSafetyText: document.getElementById('metaSafetyText'),

  // Studio Workspace
  studioWorkspace: document.getElementById('studioWorkspace'),
  aspectRatioSelector: document.getElementById('aspectRatioSelector'),
  framingSelector: document.getElementById('framingSelector'),
  framingModeGroup: document.getElementById('framingModeGroup'),
  clipDurationSelect: document.getElementById('clipDurationSelect'),
  clipCountSelect: document.getElementById('clipCountSelect'),
  scanHighlightsBtn: document.getElementById('scanHighlightsBtn'),

  // Waveform
  waveformContainer: document.getElementById('waveformContainer'),
  waveformCanvas: document.getElementById('waveformCanvas'),
  waveformPlayhead: document.getElementById('waveformPlayhead'),
  waveformHighlightOverlay: document.getElementById('waveformHighlightOverlay'),
  playbackTimeBadge: document.getElementById('playbackTimeBadge'),
  highlightsGrid: document.getElementById('highlightsGrid'),

  // Source Player & Trimmer
  sourceVideo: document.getElementById('sourceVideo'),
  clipDurationBadge: document.getElementById('clipDurationBadge'),
  startTimeInput: document.getElementById('startTimeInput'),
  endTimeInput: document.getElementById('endTimeInput'),
  startMinus1: document.getElementById('startMinus1'),
  startMinus01: document.getElementById('startMinus01'),
  startPlus01: document.getElementById('startPlus01'),
  startPlus1: document.getElementById('startPlus1'),
  endMinus1: document.getElementById('endMinus1'),
  endMinus01: document.getElementById('endMinus01'),
  endPlus01: document.getElementById('endPlus01'),
  endPlus1: document.getElementById('endPlus1'),
  previewClipBtn: document.getElementById('previewClipBtn'),
  setStartCurrentBtn: document.getElementById('setStartCurrentBtn'),
  setEndCurrentBtn: document.getElementById('setEndCurrentBtn'),

  // Live Preview Canvas
  canvasPreviewBox: document.getElementById('canvasPreviewBox'),
  previewCanvas: document.getElementById('previewCanvas'),
  aspectIndicatorBadge: document.getElementById('aspectIndicatorBadge'),

  // Captions Studio
  enableCaptionsToggle: document.getElementById('enableCaptionsToggle'),
  captionControlsBody: document.getElementById('captionControlsBody'),
  captionTextInput: document.getElementById('captionTextInput'),
  presetChips: document.querySelectorAll('.preset-chip'),
  captionThemeSelector: document.getElementById('captionThemeSelector'),
  captionPosSelector: document.getElementById('captionPosSelector'),
  captionSizeSelector: document.getElementById('captionSizeSelector'),

  // Export Deck
  engineRadioLabels: document.querySelectorAll('.engine-radio-label'),
  engineRadios: document.querySelectorAll('input[name="exportEngine"]'),
  startExportBtn: document.getElementById('startExportBtn'),
  exportClipLenSpan: document.getElementById('exportClipLenSpan'),
  exportSpecFormat: document.getElementById('exportSpecFormat'),
  exportSpecFraming: document.getElementById('exportSpecFraming'),
  exportSpecCaptions: document.getElementById('exportSpecCaptions'),
  exportProgressBox: document.getElementById('exportProgressBox'),
  progressStatusText: document.getElementById('progressStatusText'),
  progressPctText: document.getElementById('progressPctText'),
  exportProgressBar: document.getElementById('exportProgressBar'),
  progressDetailsText: document.getElementById('progressDetailsText'),
  cancelExportBtn: document.getElementById('cancelExportBtn'),
  exportedClipsSection: document.getElementById('exportedClipsSection'),
  exportedClipsGrid: document.getElementById('exportedClipsGrid'),
  clearExportsBtn: document.getElementById('clearExportsBtn')
};

// Canvas 2D contexts
const previewCtx = dom.previewCanvas.getContext('2d');
const waveformCtx = dom.waveformCanvas.getContext('2d');

let isRenderingPreview = false;
let previewLoopReqId = null;

// ============================================================================
// Initialization & Event Binding
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  updateSpecSummary();
});

function initEventListeners() {
  // File Upload & Drag-and-Drop
  dom.videoFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      loadVideoFile(e.target.files[0]);
    }
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dom.dropzoneCard.addEventListener(eventName, (e) => {
      e.preventDefault();
      dom.dropzoneCard.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dom.dropzoneCard.addEventListener(eventName, (e) => {
      e.preventDefault();
      dom.dropzoneCard.classList.remove('drag-over');
    });
  });

  dom.dropzoneCard.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadVideoFile(e.dataTransfer.files[0]);
    }
  });

  // Demo Sample Generators
  dom.loadDemoSampleBtn.addEventListener('click', generateDemoGameplaySample);
  dom.heroDemoBtn.addEventListener('click', () => {
    document.getElementById('studio').scrollIntoView({ behavior: 'smooth' });
    generateDemoGameplaySample();
  });

  // Reset Studio
  dom.resetAllBtn.addEventListener('click', resetStudio);

  // Aspect Ratio & Framing Selectors
  dom.aspectRatioSelector.querySelectorAll('.pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dom.aspectRatioSelector.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.aspectRatio = btn.getAttribute('data-aspect');
      
      // Toggle framing selector visibility (framing is only relevant for 9:16 vertical shorts)
      if (state.aspectRatio === '9:16') {
        dom.framingModeGroup.style.display = 'flex';
      } else {
        dom.framingModeGroup.style.display = 'none';
      }

      dom.aspectIndicatorBadge.textContent = state.aspectRatio === '9:16' ? '9:16 Vertical Shorts' : 
                                            (state.aspectRatio === '16:9' ? '16:9 Landscape' : '1:1 Square');
      adjustCanvasDimensions();
      updateSpecSummary();
      renderSinglePreviewFrame();
    });
  });

  dom.framingSelector.querySelectorAll('.pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dom.framingSelector.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.framingMode = btn.getAttribute('data-framing');
      updateSpecSummary();
      renderSinglePreviewFrame();
    });
  });

  // Duration & Count Selectors
  dom.clipDurationSelect.addEventListener('change', (e) => {
    state.clipDuration = parseFloat(e.target.value);
    applyClipDurationToCurrent(state.clipDuration);
  });

  dom.clipCountSelect.addEventListener('change', (e) => {
    state.clipCount = parseInt(e.target.value, 10);
  });

  // Scan Highlights
  dom.scanHighlightsBtn.addEventListener('click', runActionHighlightScan);

  // Waveform Interactions (Seek & Scrubber)
  dom.waveformContainer.addEventListener('click', onWaveformClick);

  // Source Video Events
  dom.sourceVideo.addEventListener('timeupdate', onSourceVideoTimeUpdate);
  dom.sourceVideo.addEventListener('play', startPreviewLoop);
  dom.sourceVideo.addEventListener('pause', stopPreviewLoop);
  dom.sourceVideo.addEventListener('seeked', renderSinglePreviewFrame);

  // Trimmer Nudge Buttons
  setupTrimmerControls();

  // Caption Studio Events
  dom.enableCaptionsToggle.addEventListener('change', (e) => {
    state.captions.enabled = e.target.checked;
    dom.captionControlsBody.style.opacity = e.target.checked ? '1' : '0.4';
    dom.captionControlsBody.style.pointerEvents = e.target.checked ? 'auto' : 'none';
    updateSpecSummary();
    renderSinglePreviewFrame();
  });

  dom.captionTextInput.addEventListener('input', (e) => {
    state.captions.text = e.target.value;
    renderSinglePreviewFrame();
  });

  dom.presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.getAttribute('data-preset');
      dom.captionTextInput.value = text;
      state.captions.text = text;
      renderSinglePreviewFrame();
    });
  });

  dom.captionThemeSelector.querySelectorAll('.pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dom.captionThemeSelector.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.captions.style = btn.getAttribute('data-style');
      renderSinglePreviewFrame();
    });
  });

  dom.captionPosSelector.querySelectorAll('.pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dom.captionPosSelector.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.captions.pos = btn.getAttribute('data-pos');
      renderSinglePreviewFrame();
    });
  });

  dom.captionSizeSelector.querySelectorAll('.pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dom.captionSizeSelector.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.captions.size = btn.getAttribute('data-size');
      renderSinglePreviewFrame();
    });
  });

  // Export Engine Radio Selection
  dom.engineRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.exportEngine = e.target.value;
      dom.engineRadioLabels.forEach(lbl => lbl.classList.remove('active'));
      e.target.closest('.engine-radio-label').classList.add('active');
    });
  });

  // Export Actions
  dom.startExportBtn.addEventListener('click', handleExportStart);
  dom.cancelExportBtn.addEventListener('click', cancelExportProcess);
  dom.clearExportsBtn.addEventListener('click', () => {
    state.exportedClips = [];
    dom.exportedClipsGrid.innerHTML = '';
    dom.exportedClipsSection.style.display = 'none';
  });
}

// ============================================================================
// File Loading & Ingestion
// ============================================================================
async function loadVideoFile(file) {
  if (!file) return;

  state.file = file;
  state.fileName = file.name || 'gameplay_recording.mp4';
  state.fileSize = file.size;

  if (state.videoUrl) {
    URL.revokeObjectURL(state.videoUrl);
  }
  state.videoUrl = URL.createObjectURL(file);
  dom.sourceVideo.src = state.videoUrl;

  // Show status indicator during metadata retrieval
  dom.metaFileName.textContent = state.fileName;
  dom.metaFileSize.textContent = formatBytes(state.fileSize);
  dom.metaDuration.textContent = 'Analyzing...';
  dom.metaResolution.textContent = 'Detecting...';
  dom.videoMetaStrip.style.display = 'flex';
  dom.resetAllBtn.style.display = 'inline-flex';

  // Device & memory safety rating
  evaluateDeviceMemorySafety(state.fileSize);

  // Wait for video metadata to populate dimensions and duration
  dom.sourceVideo.onloadedmetadata = () => {
    state.duration = dom.sourceVideo.duration;
    state.videoWidth = dom.sourceVideo.videoWidth || 1920;
    state.videoHeight = dom.sourceVideo.videoHeight || 1080;

    dom.metaDuration.textContent = formatSecondsToTime(state.duration);
    dom.metaResolution.textContent = `${state.videoWidth} x ${state.videoHeight}`;

    // Set initial trim window
    state.trimStart = 0;
    state.trimEnd = Math.min(state.clipDuration, state.duration);
    updateTrimmerDisplay();

    // Setup canvas resolution according to selected aspect ratio
    adjustCanvasDimensions();

    // Reveal workspace
    dom.studioWorkspace.style.display = 'block';

    // Draw initial waveform placeholder and initial preview frame
    drawWaveformPlaceholder();
    renderSinglePreviewFrame();

    // Scroll to workspace on mobile
    if (window.innerWidth < 768) {
      dom.studioWorkspace.scrollIntoView({ behavior: 'smooth' });
    }
  };
}

function evaluateDeviceMemorySafety(bytes) {
  const mb = bytes / (1024 * 1024);
  const badge = dom.metaSafetyBadge;
  const text = dom.metaSafetyText;

  badge.className = 'meta-item meta-safety';

  if (mb < 120) {
    badge.innerHTML = '<span class="safety-indicator dot-safe"></span><span>Mobile Safe (&lt;120MB)</span>';
  } else if (mb <= 300) {
    badge.innerHTML = '<span class="safety-indicator dot-warning"></span><span>Good. Native Engine Preferred</span>';
  } else {
    badge.innerHTML = '<span class="safety-indicator dot-danger"></span><span>Large File. Keep phone awake</span>';
  }
}

// ============================================================================
// Synthetic Gameplay Demo Generator (For instant Android testing)
// ============================================================================
async function generateDemoGameplaySample() {
  const originalBtnText = dom.loadDemoSampleBtn.innerHTML;
  dom.loadDemoSampleBtn.innerHTML = `<span>⚡ Generating 12s Gameplay...</span>`;
  dom.loadDemoSampleBtn.disabled = true;

  try {
    const demoCanvas = document.createElement('canvas');
    demoCanvas.width = 1280;
    demoCanvas.height = 720;
    const ctx = demoCanvas.getContext('2d');

    // Audio synthesis setup
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    const synthAudioCtx = new AudioCtxClass();
    const dest = synthAudioCtx.createMediaStreamDestination();

    // Synthesize gaming sound effects (ambient drone + gunshots + explosion)
    // 1. Ambient Synth Drone
    const osc = synthAudioCtx.createOscillator();
    const oscGain = synthAudioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, synthAudioCtx.currentTime);
    oscGain.gain.setValueAtTime(0.08, synthAudioCtx.currentTime);
    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start();

    // Helper: Gunshot sound burst
    function scheduleGunshot(time) {
      const bufferSize = synthAudioCtx.sampleRate * 0.15;
      const noiseBuffer = synthAudioCtx.createBuffer(1, bufferSize, synthAudioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = synthAudioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = synthAudioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000;

      const gain = synthAudioCtx.createGain();
      gain.gain.setValueAtTime(0.7, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      whiteNoise.start(time);
    }

    // Schedule gunshots and explosion
    const t0 = synthAudioCtx.currentTime;
    [1.5, 2.0, 2.5, 3.2, 5.0, 5.3, 7.8, 8.1, 8.4].forEach(offset => scheduleGunshot(t0 + offset));

    // Big Explosion at 8.8s
    const expTime = t0 + 8.8;
    const expOsc = synthAudioCtx.createOscillator();
    const expGain = synthAudioCtx.createGain();
    expOsc.type = 'triangle';
    expOsc.frequency.setValueAtTime(150, expTime);
    expOsc.frequency.exponentialRampToValueAtTime(30, expTime + 0.8);
    expGain.gain.setValueAtTime(0.9, expTime);
    expGain.gain.exponentialRampToValueAtTime(0.01, expTime + 0.9);
    expOsc.connect(expGain);
    expGain.connect(dest);
    expOsc.start(expTime);
    expOsc.stop(expTime + 1.0);

    // Combine Video & Audio streams
    const canvasStream = demoCanvas.captureStream(30);
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
    ]);

    let mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : '';
    }

    const recorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : undefined);
    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.start(100);

    // Render 12 seconds of synthetic retro FPS gaming animation
    const startTime = performance.now();
    const totalDurationMs = 12000;

    let animFrame;
    function renderFrame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / totalDurationMs);
      const sec = elapsed / 1000;

      // Dark futuristic gaming background
      ctx.fillStyle = '#060A14';
      ctx.fillRect(0, 0, 1280, 720);

      // Sci-Fi Wireframe Grid
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.lineWidth = 1.5;
      const horizon = 420;
      for (let y = horizon; y <= 720; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1280, y);
        ctx.stroke();
      }
      for (let x = -200; x <= 1480; x += 100) {
        ctx.beginPath();
        ctx.moveTo(640, horizon - 50);
        ctx.lineTo(x, 720);
        ctx.stroke();
      }

      // Cyberpunk floating targets / enemies
      const targetX = 640 + Math.sin(sec * 3) * 180;
      const targetY = 320 + Math.cos(sec * 2) * 50;

      // Health bar & Gamer HUD
      ctx.fillStyle = 'rgba(15, 20, 34, 0.85)';
      ctx.fillRect(40, 40, 280, 65);
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
      ctx.strokeRect(40, 40, 280, 65);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('CLUTCH GAMER // LIVE', 55, 65);

      ctx.fillStyle = '#10B981';
      ctx.fillRect(55, 78, Math.max(20, 250 - (sec * 15)), 14);

      // Target Enemy
      ctx.fillStyle = (sec >= 8.5 && sec <= 9.5) ? '#EF4444' : '#8B5CF6';
      ctx.beginPath();
      ctx.arc(targetX, targetY, 32, 0, Math.PI * 2);
      ctx.fill();

      // Sniper Crosshair
      ctx.strokeStyle = (sec >= 8.5 && sec <= 9.5) ? '#EF4444' : '#06B6D4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(640, 360, 40, 0, Math.PI * 2);
      ctx.moveTo(640, 300); ctx.lineTo(640, 420);
      ctx.moveTo(580, 360); ctx.lineTo(700, 360);
      ctx.stroke();

      // Gunshot Muzzle flashes
      if ((sec > 1.5 && sec < 1.7) || (sec > 5.0 && sec < 5.2) || (sec > 8.0 && sec < 8.2)) {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
        ctx.fillRect(0, 0, 1280, 720);
      }

      // Kill Feed / Hype Event Banner at 8.8s
      if (sec >= 8.8) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.fillRect(440, 180, 400, 60);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💥 ELIMINATED! 💥', 640, 222);
        ctx.textAlign = 'start';
      }

      // Timestamp & FPS Counter
      ctx.fillStyle = '#94A3B8';
      ctx.font = '14px monospace';
      ctx.fillText(`SESSION TIME: 00:${Math.floor(sec).toString().padStart(2, '0')}.${Math.floor((sec % 1) * 10)} | 60 FPS`, 920, 680);

      if (progress < 1) {
        animFrame = requestAnimationFrame(renderFrame);
      } else {
        recorder.stop();
        osc.stop();
      }
    }

    renderFrame(performance.now());

    await new Promise(resolve => {
      recorder.onstop = () => {
        const demoBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
        const demoFile = new File([demoBlob], 'sample_gaming_clutch.webm', { type: mimeType || 'video/webm' });
        loadVideoFile(demoFile);
        resolve();
      };
    });

  } catch (err) {
    console.error('Error generating demo video:', err);
    alert('Could not synthesize demo gameplay clip in this browser. Please select a local MP4/WebM file instead.');
  } finally {
    dom.loadDemoSampleBtn.innerHTML = originalBtnText;
    dom.loadDemoSampleBtn.disabled = false;
  }
}

// ============================================================================
// Transparent Audio-Peak & Action Highlight Detection Engine
// ============================================================================
async function runActionHighlightScan() {
  if (!state.file) {
    alert('Please upload or generate a gaming video first!');
    return;
  }

  const btn = dom.scanHighlightsBtn;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = `<span>⚡ Scanning Decibels &amp; Frames (0%)...</span>`;
  btn.disabled = true;

  try {
    // 1. Audio RMS Scan using Web Audio API
    btn.innerHTML = `<span>⚡ Reading Audio Waveform...</span>`;
    await scanAudioPeaks((pct) => {
      btn.innerHTML = `<span>⚡ Analyzing Audio Decibels (${Math.round(pct)}%)...</span>`;
    });

    // 2. Motion sampling heuristic (sample frame differences)
    btn.innerHTML = `<span>⚡ Analyzing Visual Action Spikes...</span>`;
    const motionPeaks = await scanMotionHeuristics();

    // 3. Cluster peaks and generate top candidate clips
    clusterAndSuggestHighlights(motionPeaks);

    // 4. Render updated Waveform with glowing peak markers
    drawInteractiveWaveform();

    // 5. Populate Highlight Cards
    renderHighlightCards();

    // Automatically select the top highlight
    if (state.suggestedClips.length > 0) {
      selectHighlightClip(state.suggestedClips[0].id);
    }

  } catch (err) {
    console.error('Highlight scan error:', err);
    // Graceful fallback: synthesize peak approximations from duration
    fallbackPeakDetection();
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }
}

async function scanAudioPeaks(onProgress) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  state.audioContext = new AudioContextClass();

  // Read array buffer from the local file
  const arrayBuffer = await state.file.arrayBuffer();
  onProgress(40);

  // Decode audio data
  state.audioBuffer = await state.audioContext.decodeAudioData(arrayBuffer);
  onProgress(75);

  const rawData = state.audioBuffer.getChannelData(0);
  const sampleRate = state.audioBuffer.sampleRate;
  const totalSeconds = state.audioBuffer.duration;

  // Window size: 0.5s chunks
  const windowSize = Math.floor(sampleRate * 0.5);
  const totalWindows = Math.floor(rawData.length / windowSize);

  state.rmsData = [];
  let maxRms = 0.001;

  for (let i = 0; i < totalWindows; i++) {
    const startIdx = i * windowSize;
    let sumSquares = 0;
    // Step by 4 for high-speed sampling
    for (let j = 0; j < windowSize; j += 4) {
      const val = rawData[startIdx + j];
      sumSquares += val * val;
    }
    const rms = Math.sqrt(sumSquares / (windowSize / 4));
    if (rms > maxRms) maxRms = rms;
    state.rmsData.push({
      time: (i * 0.5),
      rms: rms
    });
  }

  // Normalize RMS energy 0.0 to 1.0
  state.rmsData.forEach(item => {
    item.normalized = item.rms / maxRms;
  });

  onProgress(100);
}

// Visual motion difference heuristic sampler
async function scanMotionHeuristics() {
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = 64;
  offscreenCanvas.height = 36;
  const offCtx = offscreenCanvas.getContext('2d');

  const video = document.createElement('video');
  video.src = state.videoUrl;
  video.muted = true;
  video.preload = 'auto';

  await new Promise(resolve => {
    video.onloadedmetadata = () => resolve();
  });

  const duration = video.duration || state.duration;
  const motionScores = [];

  // Sample every 2 seconds (safe for mobile memory)
  const step = 2.0;
  let prevFrameData = null;

  for (let t = 0; t < duration; t += step) {
    await seekVideoTo(video, t);
    offCtx.drawImage(video, 0, 0, 64, 36);
    const frameData = offCtx.getImageData(0, 0, 64, 36).data;

    let diff = 0;
    if (prevFrameData) {
      for (let i = 0; i < frameData.length; i += 8) {
        diff += Math.abs(frameData[i] - prevFrameData[i]);
      }
    }
    prevFrameData = frameData;

    motionScores.push({
      time: t,
      diff: diff
    });
  }

  // Normalize motion diffs
  const maxDiff = Math.max(1, ...motionScores.map(m => m.diff));
  motionScores.forEach(m => {
    m.normalized = m.diff / maxDiff;
  });

  return motionScores;
}

function seekVideoTo(videoElement, time) {
  return new Promise(resolve => {
    const onSeeked = () => {
      videoElement.removeEventListener('seeked', onSeeked);
      resolve();
    };
    videoElement.addEventListener('seeked', onSeeked);
    videoElement.currentTime = time;
  });
}

function clusterAndSuggestHighlights(motionScores) {
  const combinedPeaks = [];

  // Combine audio peaks and motion diffs
  state.rmsData.forEach(audioItem => {
    // Find closest motion score
    const motion = motionScores ? motionScores.find(m => Math.abs(m.time - audioItem.time) < 1.5) : null;
    const motionScore = motion ? motion.normalized : 0.5;

    // Weighted excitement formula: 65% audio volume bursts + 35% motion/scene shifts
    const combinedScore = (audioItem.normalized * 0.65) + (motionScore * 0.35);

    combinedPeaks.push({
      time: audioItem.time,
      score: combinedScore,
      audioRms: audioItem.normalized
    });
  });

  // Sort by highest excitement score
  combinedPeaks.sort((a, b) => b.score - a.score);

  // Filter peaks by minimum distance (at least 75% of clip duration apart)
  const minSeparation = Math.max(8, state.clipDuration * 0.75);
  const selectedPeaks = [];

  for (const candidate of combinedPeaks) {
    const tooClose = selectedPeaks.some(p => Math.abs(p.time - candidate.time) < minSeparation);
    if (!tooClose) {
      selectedPeaks.push(candidate);
      if (selectedPeaks.length >= state.clipCount) break;
    }
  }

  // Construct suggested clip boundaries
  state.suggestedClips = selectedPeaks.map((peak, idx) => {
    // Center the peak slightly in the second half of the clip for maximum dramatic build-up
    const leadTime = state.clipDuration * 0.45;
    let start = Math.max(0, peak.time - leadTime);
    let end = Math.min(state.duration, start + state.clipDuration);

    // Re-adjust if end hit duration boundary
    if (end - start < state.clipDuration && start > 0) {
      start = Math.max(0, end - state.clipDuration);
    }

    const excitementPct = Math.min(99, Math.round(75 + (peak.score * 24)));

    let reason = 'High Audio & Action Energy';
    if (peak.audioRms > 0.8) reason = 'Loudest Scream / Gunfire Burst';
    else if (peak.score > 0.75) reason = 'Explosive Action & Rapid Movement';

    return {
      id: `clip-${idx + 1}`,
      title: `Action Highlight #${idx + 1}`,
      start: start,
      end: end,
      duration: end - start,
      score: excitementPct,
      reason: reason,
      peakTime: peak.time
    };
  });
}

function fallbackPeakDetection() {
  // If browser audio decode fails, generate clean algorithmic windows based on duration
  const total = state.duration || 60;
  const count = state.clipCount;
  const step = total / (count + 1);

  state.suggestedClips = [];
  for (let i = 1; i <= count; i++) {
    const center = i * step;
    const start = Math.max(0, center - (state.clipDuration / 2));
    const end = Math.min(total, start + state.clipDuration);

    state.suggestedClips.push({
      id: `clip-${i}`,
      title: `Action Highlight #${i}`,
      start: start,
      end: end,
      duration: end - start,
      score: 85 - (i * 3),
      reason: 'Estimated High-Action Window',
      peakTime: center
    });
  }

  drawWaveformPlaceholder();
  renderHighlightCards();
  if (state.suggestedClips.length > 0) {
    selectHighlightClip(state.suggestedClips[0].id);
  }
}

// ============================================================================
// Interactive Waveform Visualizer
// ============================================================================
function drawWaveformPlaceholder() {
  const canvas = dom.waveformCanvas;
  const ctx = waveformCtx;
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#0F1523';
  ctx.fillRect(0, 0, w, h);

  // Draw subtle center line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  // Subtle decorative frequency bars
  ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
  const barCount = 120;
  const barWidth = w / barCount;
  for (let i = 0; i < barCount; i++) {
    const barH = 10 + Math.sin(i * 0.2) * 15;
    ctx.fillRect(i * barWidth, (h - barH) / 2, barWidth - 1, barH);
  }
}

function drawInteractiveWaveform() {
  const canvas = dom.waveformCanvas;
  const ctx = waveformCtx;
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#0C111D';
  ctx.fillRect(0, 0, w, h);

  if (!state.rmsData || state.rmsData.length === 0) {
    drawWaveformPlaceholder();
    return;
  }

  const barCount = state.rmsData.length;
  const barWidth = Math.max(1.5, w / barCount);

  // 1. Draw RMS audio bars
  for (let i = 0; i < barCount; i++) {
    const item = state.rmsData[i];
    const energy = item.normalized || 0.1;
    const barHeight = Math.max(4, energy * (h - 16));
    const x = (i / barCount) * w;
    const y = (h - barHeight) / 2;

    if (energy > 0.75) {
      ctx.fillStyle = '#06B6D4'; // Loud action cyan
    } else if (energy > 0.45) {
      ctx.fillStyle = '#8B5CF6'; // Medium purple
    } else {
      ctx.fillStyle = '#334155'; // Background ambient
    }

    ctx.fillRect(x, y, barWidth - 0.5, barHeight);
  }

  // 2. Mark detected peak timestamps with glowing markers
  state.suggestedClips.forEach(clip => {
    const peakX = (clip.peakTime / state.duration) * w;

    // Glowing vertical line
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(peakX, 0);
    ctx.lineTo(peakX, h);
    ctx.stroke();

    // Diamond marker at top
    ctx.fillStyle = '#22D3EE';
    ctx.beginPath();
    ctx.moveTo(peakX, 2);
    ctx.lineTo(peakX + 5, 8);
    ctx.lineTo(peakX, 14);
    ctx.lineTo(peakX - 5, 8);
    ctx.closePath();
    ctx.fill();
  });

  updateWaveformOverlay();
}

function updateWaveformOverlay() {
  if (!state.duration) return;

  // Update selection overlay band
  const startPct = (state.trimStart / state.duration) * 100;
  const endPct = (state.trimEnd / state.duration) * 100;
  const widthPct = Math.max(0.5, endPct - startPct);

  dom.waveformHighlightOverlay.style.left = `${startPct}%`;
  dom.waveformHighlightOverlay.style.width = `${widthPct}%`;

  // Update playhead position
  const currentPct = (dom.sourceVideo.currentTime / state.duration) * 100;
  dom.waveformPlayhead.style.left = `${Math.min(100, Math.max(0, currentPct))}%`;
}

function onWaveformClick(e) {
  if (!state.duration) return;
  const rect = dom.waveformContainer.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const pct = Math.max(0, Math.min(1, clickX / rect.width));
  const targetTime = pct * state.duration;

  dom.sourceVideo.currentTime = targetTime;
  renderSinglePreviewFrame();
  updateWaveformOverlay();
}

// ============================================================================
// Highlight Suggestions Deck UI
// ============================================================================
function renderHighlightCards() {
  const container = dom.highlightsGrid;
  container.innerHTML = '';

  if (state.suggestedClips.length === 0) {
    container.innerHTML = `
      <div class="empty-highlights-state">
        <p>No action peaks found. Try adjusting duration or scan again.</p>
      </div>`;
    return;
  }

  state.suggestedClips.forEach(clip => {
    const card = document.createElement('div');
    card.className = `highlight-card-item ${clip.id === state.selectedClipId ? 'selected' : ''}`;
    card.id = `card-${clip.id}`;

    let scoreClass = 'score-mid';
    if (clip.score >= 90) scoreClass = 'score-ultra';
    else if (clip.score >= 80) scoreClass = 'score-high';

    card.innerHTML = `
      <div class="highlight-header-row">
        <span class="highlight-title">${clip.title}</span>
        <span class="score-badge ${scoreClass}">⚡ ${clip.score}% Hype</span>
      </div>
      <div class="highlight-time-range">
        <span>⏱️ ${formatSecondsToTime(clip.start)} &rarr; ${formatSecondsToTime(clip.end)} (${clip.duration.toFixed(1)}s)</span>
      </div>
      <div class="highlight-reason">${clip.reason}</div>
      <div class="highlight-action-btns">
        <button type="button" class="btn btn-secondary btn-xs select-clip-btn" data-id="${clip.id}">
          Select &amp; Preview
        </button>
      </div>
    `;

    card.addEventListener('click', () => selectHighlightClip(clip.id));
    container.appendChild(card);
  });
}

function selectHighlightClip(clipId) {
  state.selectedClipId = clipId;
  const clip = state.suggestedClips.find(c => c.id === clipId);
  if (!clip) return;

  // Highlight card visual
  document.querySelectorAll('.highlight-card-item').forEach(c => c.classList.remove('selected'));
  const activeCard = document.getElementById(`card-${clipId}`);
  if (activeCard) activeCard.classList.add('selected');

  // Update state trimmer
  state.trimStart = clip.start;
  state.trimEnd = clip.end;
  updateTrimmerDisplay();

  // Seek video to start and play
  dom.sourceVideo.currentTime = clip.start;
  renderSinglePreviewFrame();
  updateWaveformOverlay();
}

// ============================================================================
// Interactive Video Trimmer Controls
// ============================================================================
function setupTrimmerControls() {
  dom.startMinus1.addEventListener('click', () => adjustTrimStart(-1.0));
  dom.startMinus01.addEventListener('click', () => adjustTrimStart(-0.1));
  dom.startPlus01.addEventListener('click', () => adjustTrimStart(0.1));
  dom.startPlus1.addEventListener('click', () => adjustTrimStart(1.0));

  dom.endMinus1.addEventListener('click', () => adjustTrimEnd(-1.0));
  dom.endMinus01.addEventListener('click', () => adjustTrimEnd(-0.1));
  dom.endPlus01.addEventListener('click', () => adjustTrimEnd(0.1));
  dom.endPlus1.addEventListener('click', () => adjustTrimEnd(1.0));

  dom.setStartCurrentBtn.addEventListener('click', () => {
    state.trimStart = Math.min(dom.sourceVideo.currentTime, state.trimEnd - 0.5);
    updateTrimmerDisplay();
    updateWaveformOverlay();
  });

  dom.setEndCurrentBtn.addEventListener('click', () => {
    state.trimEnd = Math.max(dom.sourceVideo.currentTime, state.trimStart + 0.5);
    updateTrimmerDisplay();
    updateWaveformOverlay();
  });

  dom.previewClipBtn.addEventListener('click', () => {
    dom.sourceVideo.currentTime = state.trimStart;
    dom.sourceVideo.play();
  });

  dom.startTimeInput.addEventListener('change', () => {
    const sec = parseTimeToSeconds(dom.startTimeInput.value);
    if (!isNaN(sec)) {
      state.trimStart = Math.max(0, Math.min(sec, state.trimEnd - 0.5));
      updateTrimmerDisplay();
      updateWaveformOverlay();
    }
  });

  dom.endTimeInput.addEventListener('change', () => {
    const sec = parseTimeToSeconds(dom.endTimeInput.value);
    if (!isNaN(sec)) {
      state.trimEnd = Math.min(state.duration, Math.max(sec, state.trimStart + 0.5));
      updateTrimmerDisplay();
      updateWaveformOverlay();
    }
  });
}

function adjustTrimStart(delta) {
  state.trimStart = Math.max(0, Math.min(state.trimStart + delta, state.trimEnd - 0.5));
  dom.sourceVideo.currentTime = state.trimStart;
  updateTrimmerDisplay();
  updateWaveformOverlay();
  renderSinglePreviewFrame();
}

function adjustTrimEnd(delta) {
  state.trimEnd = Math.min(state.duration, Math.max(state.trimEnd + delta, state.trimStart + 0.5));
  updateTrimmerDisplay();
  updateWaveformOverlay();
  renderSinglePreviewFrame();
}

function applyClipDurationToCurrent(duration) {
  state.trimEnd = Math.min(state.duration, state.trimStart + duration);
  if (state.trimEnd - state.trimStart < duration && state.trimStart > 0) {
    state.trimStart = Math.max(0, state.trimEnd - duration);
  }
  updateTrimmerDisplay();
  updateWaveformOverlay();
}

function updateTrimmerDisplay() {
  dom.startTimeInput.value = formatSecondsToTime(state.trimStart);
  dom.endTimeInput.value = formatSecondsToTime(state.trimEnd);

  const len = Math.max(0, state.trimEnd - state.trimStart);
  dom.clipDurationBadge.textContent = `Selected: ${len.toFixed(1)}s`;
  dom.exportClipLenSpan.textContent = `${len.toFixed(1)}s`;
}

function onSourceVideoTimeUpdate() {
  const cur = dom.sourceVideo.currentTime;
  const total = state.duration || 0;
  dom.playbackTimeBadge.textContent = `${formatSecondsToTime(cur)} / ${formatSecondsToTime(total)}`;
  updateWaveformOverlay();

  // If video reached clip end while previewing, loop or stop
  if (cur >= state.trimEnd && !dom.sourceVideo.paused && !state.isExporting) {
    dom.sourceVideo.currentTime = state.trimStart;
  }
}

// ============================================================================
// Live Canvas Render Preview & Caption Overlay
// ============================================================================
function adjustCanvasDimensions() {
  const canvas = dom.previewCanvas;
  if (state.aspectRatio === '9:16') {
    canvas.width = 720;
    canvas.height = 1280;
  } else if (state.aspectRatio === '16:9') {
    canvas.width = 1280;
    canvas.height = 720;
  } else if (state.aspectRatio === '1:1') {
    canvas.width = 720;
    canvas.height = 720;
  }
}

function startPreviewLoop() {
  if (isRenderingPreview) return;
  isRenderingPreview = true;

  function loop() {
    if (!isRenderingPreview) return;
    renderSinglePreviewFrame();
    previewLoopReqId = requestAnimationFrame(loop);
  }
  previewLoopReqId = requestAnimationFrame(loop);
}

function stopPreviewLoop() {
  isRenderingPreview = false;
  if (previewLoopReqId) {
    cancelAnimationFrame(previewLoopReqId);
  }
  renderSinglePreviewFrame();
}

function renderSinglePreviewFrame() {
  const canvas = dom.previewCanvas;
  const ctx = previewCtx;
  const video = dom.sourceVideo;

  if (!video || !video.videoWidth) return;

  const cw = canvas.width;
  const ch = canvas.height;
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  ctx.clearRect(0, 0, cw, ch);

  if (state.aspectRatio === '9:16') {
    renderVertical9x16(ctx, video, cw, ch, vw, vh);
  } else if (state.aspectRatio === '1:1') {
    renderSquare1x1(ctx, video, cw, ch, vw, vh);
  } else {
    // 16:9 Native horizontal
    ctx.drawImage(video, 0, 0, cw, ch);
  }

  // Draw Burned Gaming Captions & Punchline
  if (state.captions.enabled && state.captions.text.trim()) {
    drawCaptionOverlay(ctx, cw, ch);
  }
}

function renderVertical9x16(ctx, video, cw, ch, vw, vh) {
  if (state.framingMode === 'blur') {
    // 1. Draw atmospheric blurred background wings
    ctx.save();
    ctx.filter = 'blur(24px) brightness(0.38)';
    // Scale up to fill the whole 9:16 frame
    const bgScale = Math.max(cw / vw, ch / vh);
    const bgW = vw * bgScale;
    const bgH = vh * bgScale;
    const bgX = (cw - bgW) / 2;
    const bgY = (ch - bgH) / 2;
    ctx.drawImage(video, bgX, bgY, bgW, bgH);
    ctx.restore();

    // 2. Draw centered crisp 16:9 gameplay footage
    const fgScale = cw / vw;
    const fgW = cw;
    const fgH = vh * fgScale;
    const fgY = (ch - fgH) / 2;

    // Drop shadow under gameplay window
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 25;
    ctx.drawImage(video, 0, fgY, fgW, fgH);
    ctx.shadowBlur = 0;

    // Subtle edge borders around the center gameplay
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, fgY, fgW, fgH);

  } else if (state.framingMode === 'crop') {
    // Direct center zoom crop
    const scale = Math.max(cw / vw, ch / vh);
    const w = vw * scale;
    const h = vh * scale;
    const x = (cw - w) / 2;
    const y = (ch - h) / 2;
    ctx.drawImage(video, x, y, w, h);

  } else {
    // Fit Letterbox
    ctx.fillStyle = '#06080F';
    ctx.fillRect(0, 0, cw, ch);
    const scale = Math.min(cw / vw, ch / vh);
    const w = vw * scale;
    const h = vh * scale;
    const x = (cw - w) / 2;
    const y = (ch - h) / 2;
    ctx.drawImage(video, x, y, w, h);
  }
}

function renderSquare1x1(ctx, video, cw, ch, vw, vh) {
  // Center crop for 1:1
  const scale = Math.max(cw / vw, ch / vh);
  const w = vw * scale;
  const h = vh * scale;
  const x = (cw - w) / 2;
  const y = (ch - h) / 2;
  ctx.drawImage(video, x, y, w, h);
}

function drawCaptionOverlay(ctx, cw, ch) {
  const text = state.captions.text.toUpperCase();
  ctx.save();

  // Font sizing
  let fontSize = 42;
  if (state.captions.size === 'medium') fontSize = 34;
  else if (state.captions.size === 'xlarge') fontSize = 54;

  ctx.font = `bold ${fontSize}px "Chakra Petch", "Impact", -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Vertical placement
  let posY = ch * 0.5; // center
  if (state.captions.pos === 'top') {
    posY = ch * 0.18; // safe from TikTok top UI
  } else if (state.captions.pos === 'bottom') {
    posY = ch * 0.82; // safe from TikTok bottom UI
  }

  const posX = cw / 2;

  // Theming & Styles
  let fillColor = '#FACC15';
  let strokeColor = '#000000';
  let strokeWidth = 8;
  let shadowColor = 'rgba(0, 0, 0, 0.9)';

  if (state.captions.style === 'cyber-cyan') {
    fillColor = '#22D3EE';
    strokeColor = '#0F172A';
    strokeWidth = 8;
  } else if (state.captions.style === 'danger-red') {
    fillColor = '#EF4444';
    strokeColor = '#FFFFFF';
    strokeWidth = 4;
  } else if (state.captions.style === 'clean-white') {
    fillColor = '#FFFFFF';
    strokeColor = '#000000';
    strokeWidth = 7;
  }

  // Draw heavy outer stroke
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;
  ctx.strokeText(text, posX, posY);

  // Draw vibrant fill
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = fillColor;
  ctx.fillText(text, posX, posY);

  ctx.restore();
}

function updateSpecSummary() {
  dom.exportSpecFormat.textContent = `${state.aspectRatio} ${state.aspectRatio === '9:16' ? 'Vertical Shorts' : ''}`;
  dom.exportSpecFraming.textContent = state.aspectRatio === '9:16' ? 
    (state.framingMode === 'blur' ? 'Blurred Wings' : (state.framingMode === 'crop' ? 'Center Crop' : 'Letterbox')) : 'Native';
  dom.exportSpecCaptions.textContent = state.captions.enabled ? 'Active' : 'Disabled';
}

// ============================================================================
// Export Pipeline (Native Canvas MediaRecorder & FFmpeg.wasm)
// ============================================================================
async function handleExportStart() {
  if (!state.file) {
    alert('Please upload a video before exporting!');
    return;
  }

  if (state.isExporting) return;

  state.isExporting = true;
  state.abortExport = false;
  dom.exportProgressBox.style.display = 'block';
  dom.startExportBtn.disabled = true;
  dom.progressProgressBar = dom.exportProgressBar;

  try {
    if (state.exportEngine === 'wasm') {
      await exportWithFFmpegWasm();
    } else {
      await exportWithNativePipeline();
    }
  } catch (err) {
    console.error('Export failed:', err);
    alert(`Export encountered an issue: ${err.message || err}. Tip: Switching to the Native Browser Pipeline usually resolves browser memory limits!`);
  } finally {
    state.isExporting = false;
    dom.exportProgressBox.style.display = 'none';
    dom.startExportBtn.disabled = false;
  }
}

function cancelExportProcess() {
  state.abortExport = true;
  state.isExporting = false;
  dom.exportProgressBox.style.display = 'none';
  dom.startExportBtn.disabled = false;
  dom.sourceVideo.pause();
}

// Engine 1: Native Canvas + Web Audio + MediaRecorder Pipeline
async function exportWithNativePipeline() {
  dom.progressStatusText.textContent = 'Preparing browser encoder...';
  dom.progressPctText.textContent = '0%';
  dom.exportProgressBar.style.width = '0%';
  dom.progressDetailsText.textContent = 'Binding canvas stream & audio tracks...';

  const video = dom.sourceVideo;
  video.pause();
  video.currentTime = state.trimStart;

  await new Promise(r => setTimeout(r, 150));

  // Capture canvas video stream
  const canvasStream = dom.previewCanvas.captureStream(30);

  // Capture audio stream via Web Audio routing
  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  const exportAudioCtx = new AudioCtxClass();
  const mediaSource = exportAudioCtx.createMediaElementSource(video);
  const audioDest = exportAudioCtx.createMediaStreamDestination();
  mediaSource.connect(audioDest);
  // Also keep it audible during rendering
  mediaSource.connect(exportAudioCtx.destination);

  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks()
  ]);

  // Determine supported container
  let mimeType = 'video/mp4';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
  }

  const recorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : undefined);
  const chunks = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const clipDuration = state.trimEnd - state.trimStart;

  recorder.start(100);
  video.play();

  dom.progressStatusText.textContent = 'Encoding clip frames & audio...';

  // Progress monitoring loop
  await new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      if (state.abortExport) {
        clearInterval(checkInterval);
        recorder.stop();
        video.pause();
        reject(new Error('Export cancelled by user'));
        return;
      }

      const elapsed = video.currentTime - state.trimStart;
      const pct = Math.min(99, Math.max(0, (elapsed / clipDuration) * 100));

      dom.progressPctText.textContent = `${Math.round(pct)}%`;
      dom.exportProgressBar.style.width = `${pct}%`;
      dom.progressDetailsText.textContent = `Rendering frame: ${formatSecondsToTime(video.currentTime)} / ${formatSecondsToTime(state.trimEnd)}`;

      if (video.currentTime >= state.trimEnd || video.ended) {
        clearInterval(checkInterval);
        video.pause();
        dom.progressStatusText.textContent = 'Finalizing file packaging...';
        dom.progressPctText.textContent = '100%';
        dom.exportProgressBar.style.width = '100%';

        recorder.onstop = () => {
          const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const blob = new Blob(chunks, { type: mimeType });
          saveCompletedClip(blob, extension);
          resolve();
        };

        recorder.stop();
      }
    }, 50);
  });
}

// Engine 2: FFmpeg.wasm Transcoder
async function exportWithFFmpegWasm() {
  dom.progressStatusText.textContent = 'Checking WebAssembly Core...';
  dom.progressPctText.textContent = '5%';
  dom.exportProgressBar.style.width = '5%';

  // Pre-flight memory safety notice
  if (state.fileSize > 180 * 1024 * 1024 && /Android|iPhone/i.test(navigator.userAgent)) {
    const proceed = confirm('Warning: Running FFmpeg WebAssembly on files larger than 180MB on a mobile phone may cause browser tab out-of-memory crashes. The Native Pipeline is strongly recommended for Android. Proceed anyway?');
    if (!proceed) {
      throw new Error('User switched away from WASM on mobile');
    }
  }

  // Load FFmpeg.wasm if not already initialized
  if (!state.ffmpegLoaded) {
    if (typeof FFmpeg === 'undefined' || !FFmpeg.createFFmpeg) {
      throw new Error('FFmpeg.wasm library failed to load from CDN. Please use the Native Browser Pipeline.');
    }

    dom.progressDetailsText.textContent = 'Downloading FFmpeg WebAssembly core (~25MB one-time)...';
    state.ffmpegInstance = FFmpeg.createFFmpeg({
      log: true,
      corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
    });

    state.ffmpegInstance.setProgress(({ ratio }) => {
      const pct = Math.min(99, Math.max(10, Math.round(ratio * 100)));
      dom.progressPctText.textContent = `${pct}%`;
      dom.exportProgressBar.style.width = `${pct}%`;
    });

    await state.ffmpegInstance.load();
    state.ffmpegLoaded = true;
  }

  dom.progressStatusText.textContent = 'Writing input stream to virtual RAM...';
  dom.progressDetailsText.textContent = 'Transferring video bytes...';

  const { fetchFile } = FFmpeg;
  state.ffmpegInstance.FS('writeFile', 'input_raw.mp4', await fetchFile(state.file));

  dom.progressStatusText.textContent = 'Trimming and packaging MP4...';
  dom.progressDetailsText.textContent = `Clipping from ${state.trimStart.toFixed(2)}s to ${state.trimEnd.toFixed(2)}s`;

  // Stream-copy trimming with accurate timestamp seek
  const startStr = state.trimStart.toFixed(2);
  const durStr = (state.trimEnd - state.trimStart).toFixed(2);

  await state.ffmpegInstance.run(
    '-ss', startStr,
    '-i', 'input_raw.mp4',
    '-t', durStr,
    '-c', 'copy',
    'output_clip.mp4'
  );

  const data = state.ffmpegInstance.FS('readFile', 'output_clip.mp4');
  const blob = new Blob([data.buffer], { type: 'video/mp4' });

  // Clean virtual filesystem
  try {
    state.ffmpegInstance.FS('unlink', 'input_raw.mp4');
    state.ffmpegInstance.FS('unlink', 'output_clip.mp4');
  } catch (e) {}

  saveCompletedClip(blob, 'mp4');
}

function saveCompletedClip(blob, extension) {
  const url = URL.createObjectURL(blob);
  const clipIndex = state.exportedClips.length + 1;
  const safeBaseName = state.fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const aspectTag = state.aspectRatio.replace(':', 'x');
  const downloadFileName = `clipforge_${safeBaseName}_highlight_${clipIndex}_${aspectTag}.${extension}`;

  const clipObj = {
    id: `export-${Date.now()}`,
    url: url,
    fileName: downloadFileName,
    size: blob.size,
    duration: state.trimEnd - state.trimStart,
    extension: extension
  };

  state.exportedClips.unshift(clipObj);
  renderExportedClips();

  // Scroll to exported section
  dom.exportedClipsSection.style.display = 'block';
  dom.exportedClipsSection.scrollIntoView({ behavior: 'smooth' });
}

function renderExportedClips() {
  const container = dom.exportedClipsGrid;
  container.innerHTML = '';

  state.exportedClips.forEach(clip => {
    const card = document.createElement('div');
    card.className = 'exported-clip-item';
    card.innerHTML = `
      <video src="${clip.url}" controls playsinline preload="metadata"></video>
      <div class="exported-clip-body">
        <div class="exported-title" title="${clip.fileName}">${clip.fileName}</div>
        <div class="exported-meta">
          <span>📦 ${formatBytes(clip.size)}</span>
          <span>⏱️ ${clip.duration.toFixed(1)}s</span>
        </div>
        <a href="${clip.url}" download="${clip.fileName}" class="btn btn-primary btn-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Download Clip (.${clip.extension})
        </a>
      </div>
    `;
    container.appendChild(card);
  });
}

// ============================================================================
// Reset & Cleanup
// ============================================================================
function resetStudio() {
  const confirmReset = confirm('Reset current gaming studio session? This will clear loaded video and detected highlights.');
  if (!confirmReset) return;

  if (state.videoUrl) {
    URL.revokeObjectURL(state.videoUrl);
  }

  dom.sourceVideo.src = '';
  dom.sourceVideo.removeAttribute('src');
  dom.videoFileInput.value = '';

  state.file = null;
  state.videoUrl = null;
  state.fileName = '';
  state.fileSize = 0;
  state.duration = 0;
  state.audioBuffer = null;
  state.rmsData = [];
  state.suggestedClips = [];
  state.selectedClipId = null;

  dom.studioWorkspace.style.display = 'none';
  dom.videoMetaStrip.style.display = 'none';
  dom.resetAllBtn.style.display = 'none';
  dom.highlightsGrid.innerHTML = `
    <div class="empty-highlights-state">
      <p>Click "Scan Audio Peaks &amp; Action Highlights" above to auto-detect the most intense moments in your gameplay.</p>
    </div>`;

  drawWaveformPlaceholder();
}

// ============================================================================
// Utilities (Time, Format & Math)
// ============================================================================
function formatSecondsToTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
}

function parseTimeToSeconds(timeStr) {
  if (!timeStr || !timeStr.includes(':')) return NaN;
  const parts = timeStr.split(':');
  const mins = parseFloat(parts[0]);
  const secs = parseFloat(parts[1]);
  return (mins * 60) + secs;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
