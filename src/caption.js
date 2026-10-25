const STRIP_HEIGHT_RATIO = 0.15;
const MAX_TEXT_WIDTH_RATIO = 0.9;
const STRIP_COLOR = "#0038b8";
const TEXT_COLOR = "#fff";

const TITLE_STYLE = { weight: "bold", sizeRatio: 0.33 };
const SLOGAN_STYLE = { weight: "normal", sizeRatio: 0.2 };

const fontOf = (weight, size) => `${weight} ${size}px system-ui, sans-serif`;

function fitFont(ctx, text, maxWidth, weight, maxSize) {
  ctx.font = fontOf(weight, maxSize);
  const width = ctx.measureText(text).width;
  if (width > maxWidth) ctx.font = fontOf(weight, Math.floor(maxSize * maxWidth / width));
}

function drawStrip(ctx, top, height) {
  ctx.fillStyle = STRIP_COLOR;
  ctx.fillRect(0, top, ctx.canvas.width, height);
}

function drawLine(ctx, { text, style }, centerY, stripHeight) {
  const { width } = ctx.canvas;
  fitFont(ctx, text, width * MAX_TEXT_WIDTH_RATIO, style.weight, stripHeight * style.sizeRatio);
  ctx.fillText(text, width / 2, centerY);
}

export function drawCaption(ctx, { title, slogan }) {
  const lines = [{ text: title, style: TITLE_STYLE }, { text: slogan, style: SLOGAN_STYLE }].filter((line) => line.text);
  if (!lines.length) return;

  const stripHeight = ctx.canvas.height * STRIP_HEIGHT_RATIO;
  const stripTop = ctx.canvas.height - stripHeight;
  const lineHeight = stripHeight / lines.length;

  ctx.save();
  drawStrip(ctx, stripTop, stripHeight);
  ctx.fillStyle = TEXT_COLOR;
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => drawLine(ctx, line, stripTop + (i + 0.5) * lineHeight, stripHeight));
  ctx.restore();
}
