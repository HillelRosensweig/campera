const RIGHT_MARGIN_RATIO = 0.06;
const TOP_RATIO = 0.19;
const MAX_TEXT_WIDTH_RATIO = 0.5;
const LINE_SPACING = 1.3;
const TEXT_COLOR = "#fff";
const SHADOW = { color: "rgba(0, 0, 0, 0.5)", blur: 8 };

const TITLE_STYLE = { weight: "bold", sizeRatio: 0.045 };
const SLOGAN_STYLE = { weight: "normal", sizeRatio: 0.028 };

const fontOf = (weight, size) => `${weight} ${size}px system-ui, sans-serif`;

function fitFont(ctx, text, maxWidth, weight, maxSize) {
  ctx.font = fontOf(weight, maxSize);
  const width = ctx.measureText(text).width;
  const size = width > maxWidth ? Math.floor(maxSize * maxWidth / width) : maxSize;
  ctx.font = fontOf(weight, size);
  return size;
}

function applyTextStyle(ctx) {
  ctx.fillStyle = TEXT_COLOR;
  ctx.shadowColor = SHADOW.color;
  ctx.shadowBlur = SHADOW.blur;
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
}

function drawLine(ctx, { text, style }, top) {
  const { width, height } = ctx.canvas;
  const size = fitFont(ctx, text, width * MAX_TEXT_WIDTH_RATIO, style.weight, height * style.sizeRatio);
  ctx.fillText(text, width * (1 - RIGHT_MARGIN_RATIO), top);
  return top + size * LINE_SPACING;
}

export function drawCaption(ctx, { title, slogan }) {
  const lines = [{ text: title, style: TITLE_STYLE }, { text: slogan, style: SLOGAN_STYLE }].filter((line) => line.text);

  ctx.save();
  applyTextStyle(ctx);
  lines.reduce((top, line) => drawLine(ctx, line, top), ctx.canvas.height * TOP_RATIO);
  ctx.restore();
}
