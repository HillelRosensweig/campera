import { FilesetResolver, ImageSegmenter, PoseLandmarker }
  from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import { smoothLandmarks } from "./anchor.js";

const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_BASE = "https://storage.googleapis.com/mediapipe-models";
const SEGMENTER_MODEL = `${MODEL_BASE}/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite`;
const POSE_MODEL = `${MODEL_BASE}/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task`;

function createSegmenter(fileset) {
  return ImageSegmenter.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: SEGMENTER_MODEL, delegate: "CPU" },
    runningMode: "VIDEO",
    outputConfidenceMasks: true,
    outputCategoryMask: false,
  });
}

function createPoseLandmarker(fileset) {
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" },
    runningMode: "VIDEO",
    numPoses: 1,
  });
}

function resizeIfNeeded(canvas, width, height) {
  if (canvas.width === width && canvas.height === height) return;
  canvas.width = width;
  canvas.height = height;
}

function paintMask(mask, canvas) {
  const { width, height } = mask;
  const values = mask.getAsFloat32Array();
  const image = new ImageData(width, height);
  for (let i = 0; i < values.length; i++) image.data[i * 4 + 3] = values[i] * 255;
  resizeIfNeeded(canvas, width, height);
  canvas.getContext("2d").putImageData(image, 0, 0);
}

function personMask(masks) {
  return masks[masks.length - 1];
}

export async function createDetector() {
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
  const segmenter = await createSegmenter(fileset);
  const poseLandmarker = await createPoseLandmarker(fileset);
  const maskCanvas = document.createElement("canvas");
  const state = { landmarks: null, maskCanvas, timings: { segmentMs: 0, poseMs: 0 } };

  function segment(video, timestamp) {
    const start = performance.now();
    segmenter.segmentForVideo(video, timestamp, (result) => {
      paintMask(personMask(result.confidenceMasks), maskCanvas);
    });
    state.timings.segmentMs = performance.now() - start;
  }

  function locatePose(video, timestamp) {
    const start = performance.now();
    const pose = poseLandmarker.detectForVideo(video, timestamp);
    const found = pose.landmarks[0] ?? null;
    state.landmarks = found ? smoothLandmarks(state.landmarks, found) : null;
    state.timings.poseMs = performance.now() - start;
  }

  function detect(video) {
    const timestamp = performance.now();
    segment(video, timestamp);
    locatePose(video, timestamp);
  }

  return { state, detect };
}
