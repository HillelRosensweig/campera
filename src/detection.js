import { DrawingUtils, FilesetResolver, ImageSegmenter }
  from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import { copyImage, resizeIfNeeded } from "./canvas.js";
import { softenMask } from "./maskSoften.js";

const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_BASE = "https://storage.googleapis.com/mediapipe-models";
const SEGMENTER_MODEL = `${MODEL_BASE}/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite`;

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

export async function createDetector({ invertMask = false } = {}) {
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
  const segmenterCanvas = document.createElement("canvas");
  const segmenter = await createSegmenter(fileset, segmenterCanvas);
  const maskCanvas = document.createElement("canvas");
  const paintMask = createMaskPainter(segmenterCanvas, maskCanvas, invertMask);

  function segment(image) {
    segmenter.segment(image, (result) => paintMask(result.confidenceMasks.at(-1)));
    return copyImage(maskCanvas);
  }

  function analyze(image) {
    return { image, mask: softenMask(image, segment(image)) };
  }

  return { analyze };
}
