import { DrawingUtils, FilesetResolver, ImageSegmenter }
  from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import { smoothAnchor } from "./anchor.js";
import { anchorFromMask } from "./neck.js";
import { createPoseLocator } from "./pose.js";

const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_BASE = "https://storage.googleapis.com/mediapipe-models";
const SEGMENTER_MODEL = `${MODEL_BASE}/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite`;

const GRID_WIDTH = 64;

const TRANSPARENT = [0, 0, 0, 0];
const OPAQUE = [0, 0, 0, 255];

function createSegmenter(fileset, canvas) {
  return ImageSegmenter.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: SEGMENTER_MODEL, delegate: "GPU" },
    canvas,
    runningMode: "VIDEO",
    outputConfidenceMasks: true,
    outputCategoryMask: false,
  });
}

function resizeIfNeeded(canvas, width, height) {
  if (canvas.width === width && canvas.height === height) return;
  canvas.width = width;
  canvas.height = height;
}

function createMaskPainter(segmenterCanvas, maskCanvas, invert) {
  const drawing = new DrawingUtils(segmenterCanvas.getContext("webgl2"));
  const [outside, inside] = invert ? [OPAQUE, TRANSPARENT] : [TRANSPARENT, OPAQUE];
  const context = maskCanvas.getContext("2d");

  return (mask) => {
    drawing.drawConfidenceMask(mask, outside, inside);
    resizeIfNeeded(maskCanvas, segmenterCanvas.width, segmenterCanvas.height);
    context.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    context.drawImage(segmenterCanvas, 0, 0);
  };
}

function createGridSampler() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  return (maskCanvas, video) => {
    resizeIfNeeded(canvas, GRID_WIDTH, Math.round(GRID_WIDTH * video.videoHeight / video.videoWidth));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  };
}

function firstFound(locators, video, timestamp) {
  for (const { name, locate } of locators) {
    const anchor = locate(video, timestamp);
    if (anchor) return { name, anchor };
  }
  return null;
}

export async function createDetector({ invertMask = false } = {}) {
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
  const segmenterCanvas = document.createElement("canvas");
  const segmenter = await createSegmenter(fileset, segmenterCanvas);
  const maskCanvas = document.createElement("canvas");
  const paintMask = createMaskPainter(segmenterCanvas, maskCanvas, invertMask);
  const sampleGrid = createGridSampler();
  const state = { anchor: null, locator: null, maskCanvas, timings: { segmentMs: 0, locateMs: 0 } };
  const locators = [
    { name: "pose", locate: await createPoseLocator(fileset) },
    { name: "mask", locate: (video) => (maskCanvas.width > 0 ? anchorFromMask(sampleGrid(maskCanvas, video)) : null) },
  ];

  function segment(video, timestamp) {
    const start = performance.now();
    segmenter.segmentForVideo(video, timestamp, (result) => paintMask(result.confidenceMasks.at(-1)));
    state.timings.segmentMs = performance.now() - start;
  }

  function locateTie(video, timestamp) {
    const start = performance.now();
    const found = firstFound(locators, video, timestamp);
    state.anchor = found ? smoothAnchor(state.anchor, found.anchor) : null;
    state.locator = found?.name ?? null;
    state.timings.locateMs = performance.now() - start;
  }

  function detect(video) {
    const timestamp = performance.now();
    segment(video, timestamp);
    locateTie(video, timestamp);
  }

  return { state, detect };
}
