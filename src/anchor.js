const KNOT_BELOW_CHIN_PER_FACE_HEIGHT = 0.25;
const TIE_WIDTH_PER_FACE_WIDTH = 0.9;

const blend = (previous, current, alpha) => (typeof current === "number"
  ? previous + alpha * (current - previous)
  : Object.fromEntries(Object.keys(current).map((key) => [key, blend(previous[key], current[key], alpha)])));

export function smoothFace(previous, current, alpha = 0.4) {
  return previous ? blend(previous, current, alpha) : current;
}

export function estimateTiePlacement(face, toCanvas) {
  if (!face) return null;

  const chin = toCanvas({ x: face.x, y: face.y + face.height / 2 });
  const forehead = toCanvas({ x: face.x, y: face.y - face.height / 2 });
  const faceLeft = toCanvas({ x: face.x - face.width / 2, y: face.y });
  const faceRight = toCanvas({ x: face.x + face.width / 2, y: face.y });
  const [leftEye, rightEye] = [face.eyeA, face.eyeB].map(toCanvas).sort((a, b) => a.x - b.x);

  return {
    x: chin.x,
    y: chin.y + Math.abs(chin.y - forehead.y) * KNOT_BELOW_CHIN_PER_FACE_HEIGHT,
    width: Math.abs(faceRight.x - faceLeft.x) * TIE_WIDTH_PER_FACE_WIDTH,
    angle: Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x),
  };
}
