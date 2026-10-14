export function resizeIfNeeded(canvas, width, height) {
  if (canvas.width === width && canvas.height === height) return;
  canvas.width = width;
  canvas.height = height;
}

export function resizeToAspect(canvas, width, source) {
  resizeIfNeeded(canvas, width, Math.round(width * source.height / source.width));
}

export function createCanvas({ width, height }) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function copyImage(image) {
  const canvas = createCanvas(image);
  if (image.width > 0) canvas.getContext("2d").drawImage(image, 0, 0);
  return canvas;
}
