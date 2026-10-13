import { estimateTiePlacement } from "./anchor.js";
import { sizeOf } from "./canvas.js";
import { drawDebugOverlay } from "./overlay.js";

function coverRect(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return { x: (targetWidth - width) / 2, y: (targetHeight - height) / 2, width, height };
}

function drawCover(ctx, image, sourceWidth, sourceHeight) {
  const { x, y, width, height } = coverRect(sourceWidth, sourceHeight, ctx.canvas.width, ctx.canvas.height);
  ctx.drawImage(image, x, y, width, height);
}

function drawMirrored(ctx, mirror, draw) {
  ctx.save();
  if (mirror) {
    ctx.translate(ctx.canvas.width, 0);
    ctx.scale(-1, 1);
  }
  draw();
  ctx.restore();
}

export function createCompositor({ backdrop, tie, debug = false }) {
  const personLayer = document.createElement("canvas");

  function imageFit(ctx, image) {
    const { width, height } = sizeOf(image);
    return coverRect(width, height, ctx.canvas.width, ctx.canvas.height);
  }

  function drawBackdrop(ctx) {
    drawCover(ctx, backdrop, backdrop.width, backdrop.height);
  }

  function drawPerson(ctx, { image, mask }, mirror) {
    if (sizeOf(mask).width === 0) return;

    personLayer.width = ctx.canvas.width;
    personLayer.height = ctx.canvas.height;
    const layer = personLayer.getContext("2d");
    const fit = imageFit(ctx, image);
    drawMirrored(layer, mirror, () => {
      layer.drawImage(image, fit.x, fit.y, fit.width, fit.height);
      layer.globalCompositeOperation = "destination-in";
      layer.drawImage(mask, fit.x, fit.y, fit.width, fit.height);
    });
    ctx.drawImage(personLayer, 0, 0);
  }

  function imageToCanvas(ctx, image, mirror) {
    const fit = imageFit(ctx, image);
    return (point) => {
      const x = fit.x + point.x * fit.width;
      return { x: mirror ? ctx.canvas.width - x : x, y: fit.y + point.y * fit.height };
    };
  }

  function drawTie(ctx, { image, anchor }, mirror) {
    const placement = estimateTiePlacement(anchor, imageToCanvas(ctx, image, mirror));
    if (!placement) return;

    const height = placement.width * (tie.image.height / tie.image.width);
    ctx.save();
    ctx.translate(placement.x, placement.y);
    ctx.rotate(placement.angle);
    ctx.drawImage(tie.image, -tie.knot.x * placement.width, -tie.knot.y * height, placement.width, height);
    ctx.restore();
  }

  function drawFrame(ctx, scene, mirror) {
    drawBackdrop(ctx);
    drawPerson(ctx, scene, mirror);
    drawTie(ctx, scene, mirror);
    if (debug && mirror) drawDebugOverlay(ctx, scene, imageToCanvas(ctx, scene.image, mirror));
  }

  return { drawFrame };
}
