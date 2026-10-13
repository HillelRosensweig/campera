import { fitOutfit } from "./anchor.js";
import { sizeOf } from "./canvas.js";
import { drawCaption } from "./caption.js";
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

export function createCompositor({ backdrop, outfit, debug = false }) {
  const personLayer = document.createElement("canvas");
  const outfitLayer = document.createElement("canvas");

  function imageFit(ctx, image) {
    const { width, height } = sizeOf(image);
    return coverRect(width, height, ctx.canvas.width, ctx.canvas.height);
  }

  function drawBackdrop(ctx) {
    drawCover(ctx, backdrop, backdrop.width, backdrop.height);
  }

  function drawMaskedLayer(ctx, layerCanvas, { image, mask }, mirror, drawContent) {
    layerCanvas.width = ctx.canvas.width;
    layerCanvas.height = ctx.canvas.height;
    const layer = layerCanvas.getContext("2d");
    const fit = imageFit(ctx, image);
    drawContent(layer, fit);
    layer.globalCompositeOperation = "destination-in";
    drawMirrored(layer, mirror, () => layer.drawImage(mask, fit.x, fit.y, fit.width, fit.height));
    ctx.drawImage(layerCanvas, 0, 0);
  }

  function drawPerson(ctx, scene, mirror) {
    drawMaskedLayer(ctx, personLayer, scene, mirror, (layer, fit) => {
      drawMirrored(layer, mirror, () => layer.drawImage(scene.image, fit.x, fit.y, fit.width, fit.height));
    });
  }

  function imageToCanvas(ctx, image, mirror) {
    const fit = imageFit(ctx, image);
    return (point) => {
      const x = fit.x + point.x * fit.width;
      return { x: mirror ? ctx.canvas.width - x : x, y: fit.y + point.y * fit.height };
    };
  }

  function drawOutfit(ctx, scene, mirror) {
    const placement = fitOutfit(scene.anchor, outfit, imageToCanvas(ctx, scene.image, mirror));
    if (!placement) return;

    drawMaskedLayer(ctx, outfitLayer, scene, mirror, (layer) => {
      layer.translate(placement.x, placement.y);
      layer.rotate(placement.angle);
      layer.scale(placement.scale, placement.scale);
      layer.drawImage(outfit.image, -placement.origin.x, -placement.origin.y);
      layer.setTransform(1, 0, 0, 1, 0, 0);
    });
  }

  function drawFrame(ctx, scene, mirror) {
    drawBackdrop(ctx);
    if (sizeOf(scene.mask).width > 0) {
      drawPerson(ctx, scene, mirror);
      drawOutfit(ctx, scene, mirror);
    }
    if (scene.caption) drawCaption(ctx, scene.caption);
    if (debug && mirror) drawDebugOverlay(ctx, scene, imageToCanvas(ctx, scene.image, mirror));
  }

  return { drawFrame };
}
