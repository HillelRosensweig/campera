import { PoseLandmarker }
  from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import { anchorAround } from "./anchor.js";
import { resizeToAspect } from "./canvas.js";

const POSE_MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

const MOUTH_LEFT = 9;
const MOUTH_RIGHT = 10;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;

const INPUT_WIDTH = 256;

const MIN_SHOULDER_VISIBILITY = 0.5;
const KNOT_RISE = 0.1;
const TIE_WIDTH_PER_SHOULDER_WIDTH = 0.45;

const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const lerp = (from, to, t) => ({ x: from.x + t * (to.x - from.x), y: from.y + t * (to.y - from.y) });
const isVisible = (landmark) => landmark.visibility >= MIN_SHOULDER_VISIBILITY;

function anchorFromLandmarks(landmarks) {
  const shoulders = [landmarks[LEFT_SHOULDER], landmarks[RIGHT_SHOULDER]];
  if (!shoulders.every(isVisible)) return null;

  const shoulderCenter = midpoint(...shoulders);
  const mouthCenter = midpoint(landmarks[MOUTH_LEFT], landmarks[MOUTH_RIGHT]);
  const knot = lerp(shoulderCenter, mouthCenter, KNOT_RISE);
  const scale = TIE_WIDTH_PER_SHOULDER_WIDTH / 2;
  const halfSpan = { x: scale * (shoulders[1].x - shoulders[0].x), y: scale * (shoulders[1].y - shoulders[0].y) };
  return {
    anchor: anchorAround(knot, halfSpan),
    landmarks: { leftShoulder: shoulders[0], rightShoulder: shoulders[1], shoulderCenter, mouthCenter },
  };
}

function createShrinker() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  return (image) => {
    resizeToAspect(canvas, INPUT_WIDTH, image);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  };
}

export async function createPoseLocator(fileset, delegate) {
  const landmarker = await PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: POSE_MODEL, delegate },
    runningMode: "IMAGE",
    numPoses: 1,
  });
  const shrink = createShrinker();

  return ({ image }) => {
    const [landmarks] = landmarker.detect(shrink(image)).landmarks;
    return landmarks ? anchorFromLandmarks(landmarks) : null;
  };
}
