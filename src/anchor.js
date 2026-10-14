const difference = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const lengthOf = (v) => Math.hypot(v.x, v.y);
const angleOf = (v) => Math.atan2(v.y, v.x);

export function fitOutfit(anchor, outfit, toCanvas) {
  if (!anchor) return null;

  const imagePoint = (p) => ({ x: p.x * outfit.image.width, y: p.y * outfit.image.height });
  const [left, right] = [anchor.left, anchor.right].map(toCanvas).sort((a, b) => a.x - b.x);
  const [imageLeft, imageRight] = [outfit.leftShoulder, outfit.rightShoulder].map(imagePoint);
  const bodySpan = difference(right, left);
  const imageSpan = difference(imageRight, imageLeft);
  const bodyCenter = midpoint(left, right);

  return {
    x: bodyCenter.x,
    y: bodyCenter.y,
    scale: lengthOf(bodySpan) / lengthOf(imageSpan),
    angle: angleOf(bodySpan) - angleOf(imageSpan),
    origin: midpoint(imageLeft, imageRight),
  };
}
