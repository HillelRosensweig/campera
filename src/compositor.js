import { estimateTiePlacement } from "./anchor.js";

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

export function createCompositor({ video, detectorState, backdrop, tie }) {
  const personLayer = document.createElement("canvas");

  function videoFit(ctx) {
    return coverRect(video.videoWidth, video.videoHeight, ctx.canvas.width, ctx.canvas.height);
  }

  function drawBackdrop(ctx) {
    drawCover(ctx, backdrop, backdrop.width, backdrop.height);
  }

  function drawPerson(ctx, mirror) {
    const { maskCanvas } = detectorState;
    if (maskCanvas.width === 0) return;

    personLayer.width = ctx.canvas.width;
    personLayer.height = ctx.canvas.height;
    const layer = personLayer.getContext("2d");
    const fit = videoFit(ctx);
    drawMirrored(layer, mirror, () => {
      layer.drawImage(video, fit.x, fit.y, fit.width, fit.height);
      layer.globalCompositeOperation = "destination-in";
      layer.drawImage(maskCanvas, fit.x, fit.y, fit.width, fit.height);
    });
    ctx.drawImage(personLayer, 0, 0);
  }

  function drawTie(ctx, mirror) {
    const fit = videoFit(ctx);
    const toCanvas = (point) => {
      const x = fit.x + point.x * fit.width;
      return { x: mirror ? ctx.canvas.width - x : x, y: fit.y + point.y * fit.height };
    };
    const placement = estimateTiePlacement(detectorState.face, toCanvas);
    if (!placement) return;

    const height = placement.width * (tie.image.height / tie.image.width);
    ctx.save();
    ctx.translate(placement.x, placement.y);
    ctx.rotate(placement.angle);
    ctx.drawImage(tie.image, -tie.knot.x * placement.width, -tie.knot.y * height, placement.width, height);
    ctx.restore();
  }

  function drawFrame(ctx, mirror) {
    drawBackdrop(ctx);
    drawPerson(ctx, mirror);
    drawTie(ctx, mirror);
  }

  return { drawFrame };
}
