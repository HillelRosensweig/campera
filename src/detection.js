import { FilesetResolver, ImageSegmenter }
  from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import { createCanvas } from "./canvas.js";
import { softenMask } from "./maskSoften.js";

const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_BASE = "https://storage.googleapis.com/mediapipe-models";
const SEGMENTER_MODEL = `${MODEL_BASE}/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite`;

// CPU avoids float GPU textures, which some browsers (e.g. Samsung Internet) don't expose.
function createSegmenter(fileset) {
  return ImageSegmenter.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: SEGMENTER_MODEL, delegate: "CPU" },
    runningMode: "IMAGE",
    outputConfidenceMasks: true,
    outputCategoryMask: false,
  });
}

function maskToCanvas(mask, invert) {
  const { width, height } = mask;
  const confidences = mask.getAsFloat32Array();
  const canvas = createCanvas({ width, height });
  const context = canvas.getContext("2d");
  const pixels = context.createImageData(width, height);
  for (let i = 0; i < confidences.length; i++) {
    pixels.data[4 * i + 3] = (invert ? 1 - confidences[i] : confidences[i]) * 255;
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

export async function createDetector({ invertMask = false } = {}) {
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
  const segmenter = await createSegmenter(fileset);

  function segment(image) {
    let mask;
    segmenter.segment(image, (result) => { mask = maskToCanvas(result.confidenceMasks.at(-1), invertMask); });
    return mask;
  }

  function analyze(image) {
    return { image, mask: softenMask(image, segment(image)) };
  }

  return { analyze };
}
