export function resizeIfNeeded(canvas, width, height) {
  if (canvas.width === width && canvas.height === height) return;
  canvas.width = width;
  canvas.height = height;
}

export const sizeOf = (image) => ({ width: image.videoWidth ?? image.width, height: image.videoHeight ?? image.height });

export function resizeToAspect(canvas, width, source) {
  const size = sizeOf(source);
  resizeIfNeeded(canvas, width, Math.round(width * size.height / size.width));
}

export function copyImage(image) {
  const { width, height } = sizeOf(image);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  if (width > 0) canvas.getContext("2d").drawImage(image, 0, 0);
  return canvas;
}
