import { DrawingUtils, FilesetResolver, ImageSegmenter }
  from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import { copyImage, resizeIfNeeded, resizeToAspect } from "./canvas.js";
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
    runningMode: "IMAGE",
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

function firstFound(locators, scene) {
  for (const locate of locators) {
    const found = locate(scene);
    if (found) return found;
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

  const locateByMask = ({ mask }) => withoutLandmarks(anchorFromMask(sampleGrid(mask)));
  const locateByPose = await createPoseLocator(fileset, poseDelegate);
  const locators = [locateByPose, locateByMask];

  function segment(image) {
    segmenter.segment(image, (result) => paintMask(result.confidenceMasks.at(-1)));
    return copyImage(maskCanvas);
  }

  function analyze(image) {
    const scene = { image, mask: segment(image) };
    const found = firstFound(locators, scene);
    return { ...scene, anchor: found?.anchor ?? null, landmarks: found?.landmarks ?? {} };
  }

  return { analyze };
}
