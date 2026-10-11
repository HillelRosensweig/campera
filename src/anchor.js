const MOUTH_LEFT = 9;
const MOUTH_RIGHT = 10;
const SHOULDER_LEFT = 11;
const SHOULDER_RIGHT = 12;

const MIN_VISIBILITY = 0.5;
const KNOT_TOWARD_MOUTH = 0.15;
const TIE_WIDTH_PER_SHOULDER_WIDTH = 0.35;

const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function smoothLandmarks(previous, current, alpha = 0.4) {
  if (!previous) return current;
  return current.map((point, i) => ({
    ...point,
    x: previous[i].x + alpha * (point.x - previous[i].x),
    y: previous[i].y + alpha * (point.y - previous[i].y),
  }));
}

function shouldersAreVisible(landmarks) {
  return landmarks[SHOULDER_LEFT].visibility > MIN_VISIBILITY
    && landmarks[SHOULDER_RIGHT].visibility > MIN_VISIBILITY;
}

export function estimateTiePlacement(landmarks, toCanvas) {
  if (!landmarks || !shouldersAreVisible(landmarks)) return null;

  const [left, right] = [landmarks[SHOULDER_LEFT], landmarks[SHOULDER_RIGHT]]
    .map(toCanvas)
    .sort((a, b) => a.x - b.x);
  const mouth = midpoint(toCanvas(landmarks[MOUTH_LEFT]), toCanvas(landmarks[MOUTH_RIGHT]));
  const shoulders = midpoint(left, right);

  return {
    x: shoulders.x + (mouth.x - shoulders.x) * KNOT_TOWARD_MOUTH,
    y: shoulders.y + (mouth.y - shoulders.y) * KNOT_TOWARD_MOUTH,
    width: Math.hypot(right.x - left.x, right.y - left.y) * TIE_WIDTH_PER_SHOULDER_WIDTH,
    angle: Math.atan2(right.y - left.y, right.x - left.x),
  };
}
