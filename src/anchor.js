const TIE_WIDTH_PER_HEAD_WIDTH = 0.9;

const blend = (previous, current, alpha) => (typeof current === "number"
  ? previous + alpha * (current - previous)
  : Object.fromEntries(Object.keys(current).map((key) => [key, blend(previous[key], current[key], alpha)])));

export function smoothNeck(previous, current, alpha = 0.4) {
  return previous ? blend(previous, current, alpha) : current;
}

export function estimateTiePlacement(neck, toCanvas) {
  if (!neck) return null;

  const knot = toCanvas({ x: neck.x, y: neck.y });
  const headLeft = toCanvas({ x: neck.x - neck.headWidth / 2, y: neck.y });
  const headRight = toCanvas({ x: neck.x + neck.headWidth / 2, y: neck.y });

  return {
    x: knot.x,
    y: knot.y,
    width: Math.abs(headRight.x - headLeft.x) * TIE_WIDTH_PER_HEAD_WIDTH,
    angle: 0,
  };
}
