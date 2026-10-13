const blend = (previous, current, alpha) => (typeof current === "number"
  ? previous + alpha * (current - previous)
  : Object.fromEntries(Object.keys(current).map((key) => [key, blend(previous[key], current[key], alpha)])));

export function smoothAnchor(previous, current, alpha = 0.4) {
  return previous ? blend(previous, current, alpha) : current;
}

export function anchorAround(knot, halfSpan) {
  return {
    knot,
    left: { x: knot.x - halfSpan.x, y: knot.y - halfSpan.y },
    right: { x: knot.x + halfSpan.x, y: knot.y + halfSpan.y },
  };
}

export function estimateTiePlacement(anchor, toCanvas) {
  if (!anchor) return null;

  const knot = toCanvas(anchor.knot);
  const [left, right] = [anchor.left, anchor.right].map(toCanvas).sort((a, b) => a.x - b.x);

  return {
    x: knot.x,
    y: knot.y,
    width: Math.hypot(right.x - left.x, right.y - left.y),
    angle: Math.atan2(right.y - left.y, right.x - left.x),
  };
}
