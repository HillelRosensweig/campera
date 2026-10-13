export function resizeIfNeeded(canvas, width, height) {
  if (canvas.width === width && canvas.height === height) return;
  canvas.width = width;
  canvas.height = height;
}

export function resizeToVideoAspect(canvas, width, video) {
  resizeIfNeeded(canvas, width, Math.round(width * video.videoHeight / video.videoWidth));
}
