import { drawCaption } from "./caption.js";

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

export function createCompositor({ backdrop }) {
  const personLayer = document.createElement("canvas");

  function drawBackdrop(ctx) {
    drawCover(ctx, backdrop, backdrop.width, backdrop.height);
  }

  function drawPerson(ctx, { image, mask }) {
    personLayer.width = ctx.canvas.width;
    personLayer.height = ctx.canvas.height;
    const layer = personLayer.getContext("2d");
    drawCover(layer, image, image.width, image.height);
    layer.globalCompositeOperation = "destination-in";
    drawCover(layer, mask, image.width, image.height);
    ctx.drawImage(personLayer, 0, 0);
  }

  function drawFrame(ctx, scene) {
    drawBackdrop(ctx);
    drawPerson(ctx, scene);
    if (scene.caption) drawCaption(ctx, scene.caption);
  }

  return { drawFrame };
}
