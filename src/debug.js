const STACK_LINES = 5;

export function attachPhotoInfo(error, file, image) {
  if (error instanceof Error) error.photo = `${file.type || "unknown type"}, ${file.size} bytes, ${image.width}x${image.height}`;
  return error;
}

export function debugDetails(error) {
  return [
    `photo: ${error?.photo ?? "not decoded"}`,
    `browser: ${navigator.userAgent}`,
    ...(error?.stack ?? "").split("\n").slice(0, STACK_LINES),
  ];
}
