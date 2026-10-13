const LANDMARK_COLOR = "#00e5ff";
const KNOT_COLOR = "#ff1744";
const SPAN_COLOR = "#ffea00";
const DOT_RADIUS = 6;

function drawDot(ctx, point, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(point.x, point.y, DOT_RADIUS, 0, 2 * Math.PI);
  ctx.fill();
}

function drawLine(ctx, from, to, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

export function drawDebugOverlay(ctx, { anchor, landmarks }, toCanvas) {
  Object.values(landmarks).forEach((point) => drawDot(ctx, toCanvas(point), LANDMARK_COLOR));
  if (!anchor) return;
  drawLine(ctx, toCanvas(anchor.left), toCanvas(anchor.right), SPAN_COLOR);
  drawDot(ctx, toCanvas(anchor.knot), KNOT_COLOR);
}
