const blend = (previous, current, alpha) => (typeof current === "number"
  ? previous + alpha * (current - previous)
  : Object.fromEntries(Object.keys(current).map((key) => [key, blend(previous[key], current[key], alpha)])));

export function smoothAnchor(previous, current, alpha = 0.4) {
  return previous ? blend(previous, current, alpha) : current;
}

const difference = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const lengthOf = (v) => Math.hypot(v.x, v.y);
const angleOf = (v) => Math.atan2(v.y, v.x);

export function fitOutfit(anchor, outfit, toCanvas) {
  if (!anchor) return null;

  const imagePoint = (p) => ({ x: p.x * outfit.image.width, y: p.y * outfit.image.height });
  const collar = toCanvas(anchor.collar);
  const [left, right] = [anchor.left, anchor.right].map(toCanvas).sort((a, b) => a.x - b.x);
  const bodySpan = difference(right, left);
  const imageSpan = difference(imagePoint(outfit.rightShoulder), imagePoint(outfit.leftShoulder));

  return {
    x: collar.x,
    y: collar.y,
    scale: lengthOf(bodySpan) / lengthOf(imageSpan),
    angle: angleOf(bodySpan) - angleOf(imageSpan),
    origin: imagePoint(outfit.collar),
  };
}
