const STACK_LINES = 5;
const RECENT_LOG_LIMIT = 8;
const CAPTURED_LEVELS = ["log", "warn", "error"];

const recentLogs = [];

const formatLogArgument = (value) => (value instanceof Error ? value.message : String(value));

function rememberLog(level, args) {
  recentLogs.push(`[${level}] ${args.map(formatLogArgument).join(" ")}`);
  if (recentLogs.length > RECENT_LOG_LIMIT) recentLogs.shift();
}

export function captureConsole() {
  for (const level of CAPTURED_LEVELS) {
    const original = console[level];
    console[level] = (...args) => {
      rememberLog(level, args);
      original.apply(console, args);
    };
  }
}

function webglInfo() {
  const gl = document.createElement("canvas").getContext("webgl2");
  if (!gl) return "webgl2: unavailable";
  const rendererInfo = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = gl.getParameter(rendererInfo ? rendererInfo.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
  const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const floatColor = Boolean(gl.getExtension("EXT_color_buffer_float"));
  return `webgl2: ${renderer}, max texture ${maxTexture}, float color ${floatColor}`;
}

export function attachPhotoInfo(error, file, image) {
  if (error instanceof Error) error.photo = `${file.type || "unknown type"}, ${file.size} bytes, ${image.width}x${image.height}`;
  return error;
}

export function debugDetails(error) {
  return [
    `photo: ${error?.photo ?? "not decoded"}`,
    `browser: ${navigator.userAgent}`,
    webglInfo(),
    ...(error?.stack ?? "").split("\n").slice(0, STACK_LINES),
    "console:",
    ...recentLogs,
  ];
}
