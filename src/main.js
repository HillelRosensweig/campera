import { startCamera, isVideoReady } from "./camera.js";
import { createDetector } from "./detection.js";
import { createCompositor } from "./compositor.js";

const PREVIEW_SIZE = { width: 720, height: 1280 };
const CAPTURE_SIZE = { width: 1080, height: 1920 };
const DETECTION_INTERVAL_MS = 66;
const STATS_INTERVAL_MS = 500;

const video = document.getElementById("camera");
const view = document.getElementById("view");
const startButton = document.getElementById("start");
const shutter = document.getElementById("shutter");
const debug = document.getElementById("debug");
const result = document.getElementById("result");
const photo = document.getElementById("photo");
const retake = document.getElementById("retake");

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function loadAssets() {
  const config = await (await fetch("config.json")).json();
  const [backdrop, tieImage] = await Promise.all([loadImage(config.backdrop), loadImage(config.tie.file)]);
  return { backdrop, tie: { image: tieImage, knot: config.tie.knot } };
}

function sizedContext(canvas, { width, height }) {
  canvas.width = width;
  canvas.height = height;
  return canvas.getContext("2d");
}

function capturePhoto(compositor) {
  const canvas = document.createElement("canvas");
  compositor.drawFrame(sizedContext(canvas, CAPTURE_SIZE), false);
  photo.src = canvas.toDataURL("image/jpeg", 0.9);
  result.style.display = "flex";
}

function showStats(stats, { locator, timings }) {
  debug.textContent = `detect ${stats.detectionMs.toFixed(0)} ms (segment ${timings.segmentMs.toFixed(0)}, locate ${timings.locateMs.toFixed(0)}) | ${stats.fps.toFixed(0)} fps | tie ${locator ?? "none"}${stats.error}`;
}

function updateFps(stats, now) {
  stats.frames++;
  if (now - stats.windowStart < STATS_INTERVAL_MS) return false;
  stats.fps = (stats.frames * 1000) / (now - stats.windowStart);
  stats.frames = 0;
  stats.windowStart = now;
  return true;
}

function runDetection(detector, stats) {
  const start = performance.now();
  try {
    detector.detect(video);
    stats.error = "";
  } catch (error) {
    stats.error = ` | ERROR ${error.message}`;
  }
  stats.detectionMs = performance.now() - start;
}

function runLoop(detector, compositor) {
  const ctx = sizedContext(view, PREVIEW_SIZE);
  const stats = { detectionMs: 0, fps: 0, frames: 0, windowStart: performance.now(), error: "" };
  let lastDetection = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    if (isVideoReady(video)) {
      if (now - lastDetection >= DETECTION_INTERVAL_MS) {
        runDetection(detector, stats);
        lastDetection = now;
      }
      compositor.drawFrame(ctx, true);
    }
    if (updateFps(stats, now)) showStats(stats, detector.state);
  }
  requestAnimationFrame(frame);
}

async function start() {
  startButton.disabled = true;
  startButton.textContent = "Loading…";
  const assets = await loadAssets();
  await startCamera(video);
  const detector = await createDetector({ invertMask: new URLSearchParams(location.search).has("invert") });
  const compositor = createCompositor({ video, detectorState: detector.state, ...assets });

  startButton.style.display = "none";
  shutter.style.display = "block";
  shutter.onclick = () => capturePhoto(compositor);
  retake.onclick = () => { result.style.display = "none"; };
  runLoop(detector, compositor);
}

startButton.onclick = () => start().catch((error) => {
  startButton.textContent = `Error: ${error.message}`;
  console.error(error);
});
