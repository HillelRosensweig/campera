import { DrawingUtils, FilesetResolver, ImageSegmenter }
  from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import { smoothAnchor } from "./anchor.js";
import { copyImage, resizeIfNeeded, resizeToAspect, sizeOf } from "./canvas.js";
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

  return (maskCanvas) => {
    resizeToAspect(canvas, GRID_WIDTH, maskCanvas);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  };
}

function firstFound(locators, scene, timings) {
  locators.forEach(({ name }) => { timings[name] = 0; });
  for (const { name, locate } of locators) {
    const start = performance.now();
    const found = locate(scene);
    timings[name] = performance.now() - start;
    if (found) return { name, ...found };
  }
  return null;
}

const withoutLandmarks = (anchor) => anchor && { anchor, landmarks: {} };

export async function createDetector({ invertMask = false, poseDelegate = "CPU" } = {}) {
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
  const segmenterCanvas = document.createElement("canvas");
  const segmenter = await createSegmenter(fileset, segmenterCanvas);
  const maskCanvas = document.createElement("canvas");
  const paintMask = createMaskPainter(segmenterCanvas, maskCanvas, invertMask);
  const sampleGrid = createGridSampler();
  const state = { anchor: null, landmarks: {}, locator: null, timings: { segmentMs: 0, live: {}, still: {} } };

  const maskLocator = {
    name: "mask",
    locate: ({ mask }) => (sizeOf(mask).width > 0 ? withoutLandmarks(anchorFromMask(sampleGrid(mask))) : null),
  };
  const poseLocator = { name: "pose", locate: await createPoseLocator(fileset, poseDelegate) };
  const liveLocators = [maskLocator];
  const stillLocators = [poseLocator, maskLocator];

  function segment(image, timestamp) {
    const start = performance.now();
    segmenter.segmentForVideo(image, timestamp, (result) => paintMask(result.confidenceMasks.at(-1)));
    state.timings.segmentMs = performance.now() - start;
  }

  function locateLive(video) {
    const found = firstFound(liveLocators, { image: video, mask: maskCanvas }, state.timings.live);
    state.anchor = found ? smoothAnchor(state.anchor, found.anchor) : null;
    state.landmarks = found?.landmarks ?? {};
    state.locator = found?.name ?? null;
  }

  function detect(video) {
    segment(video, performance.now());
    locateLive(video);
  }

  const liveScene = (video) => ({ image: video, mask: maskCanvas, anchor: state.anchor, landmarks: state.landmarks });

  function snapshot(video) {
    const image = copyImage(video);
    segment(image, performance.now());
    return { image, mask: copyImage(maskCanvas) };
  }

  function locateStill(scene) {
    const found = firstFound(stillLocators, scene, state.timings.still);
    return { ...scene, anchor: found?.anchor ?? null, landmarks: found?.landmarks ?? {} };
  }

  return { state, detect, liveScene, snapshot, locateStill };
}
