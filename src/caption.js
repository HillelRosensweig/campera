const STRIP_HEIGHT_RATIO = 0.1;
const FONT_SIZE_RATIO = 0.5;
const MAX_TEXT_WIDTH_RATIO = 0.9;
const STRIP_COLOR = "#0038b8";
const TEXT_COLOR = "#fff";

const fontOfSize = (size) => `bold ${size}px system-ui, sans-serif`;

function fitFont(ctx, text, maxWidth, maxSize) {
  ctx.font = fontOfSize(maxSize);
  const width = ctx.measureText(text).width;
  if (width > maxWidth) ctx.font = fontOfSize(Math.floor(maxSize * maxWidth / width));
}

export function drawCaption(ctx, text) {
  const { width, height } = ctx.canvas;
  const stripHeight = height * STRIP_HEIGHT_RATIO;

  ctx.save();
  ctx.fillStyle = STRIP_COLOR;
  ctx.fillRect(0, height - stripHeight, width, stripHeight);
  ctx.fillStyle = TEXT_COLOR;
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fitFont(ctx, text, width * MAX_TEXT_WIDTH_RATIO, stripHeight * FONT_SIZE_RATIO);
  ctx.fillText(text, width / 2, height - stripHeight / 2);
  ctx.restore();
}
