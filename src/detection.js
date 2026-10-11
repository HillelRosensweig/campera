import { DrawingUtils, FaceDetector, FilesetResolver, ImageSegmenter }
  from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import { smoothFace } from "./anchor.js";

const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_BASE = "https://storage.googleapis.com/mediapipe-models";
const SEGMENTER_MODEL = `${MODEL_BASE}/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite`;
const FACE_MODEL = `${MODEL_BASE}/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite`;

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

function createFaceDetector(fileset) {
  return FaceDetector.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
    runningMode: "VIDEO",
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

const pointOf = ({ x, y }) => ({ x, y });

function toFace(detection, video) {
  const { originX, originY, width, height } = detection.boundingBox;
  const [eyeA, eyeB] = detection.keypoints;
  return {
    x: (originX + width / 2) / video.videoWidth,
    y: (originY + height / 2) / video.videoHeight,
    width: width / video.videoWidth,
    height: height / video.videoHeight,
    eyeA: pointOf(eyeA),
    eyeB: pointOf(eyeB),
  };
}

export async function createDetector({ invertMask = false } = {}) {
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
  const segmenterCanvas = document.createElement("canvas");
  const segmenter = await createSegmenter(fileset, segmenterCanvas);
  const faceDetector = await createFaceDetector(fileset);
  const maskCanvas = document.createElement("canvas");
  const paintMask = createMaskPainter(segmenterCanvas, maskCanvas, invertMask);
  const state = { face: null, maskCanvas, timings: { segmentMs: 0, faceMs: 0 } };

  function segment(video, timestamp) {
    const start = performance.now();
    segmenter.segmentForVideo(video, timestamp, (result) => paintMask(result.confidenceMasks.at(-1)));
    state.timings.segmentMs = performance.now() - start;
  }

  function locateFace(video, timestamp) {
    const start = performance.now();
    const { detections } = faceDetector.detectForVideo(video, timestamp);
    const found = detections[0]?.boundingBox ? toFace(detections[0], video) : null;
    state.face = found ? smoothFace(state.face, found) : null;
    state.timings.faceMs = performance.now() - start;
  }

  function detect(video) {
    const timestamp = performance.now();
    segment(video, timestamp);
    locateFace(video, timestamp);
  }

  return { state, detect };
}
