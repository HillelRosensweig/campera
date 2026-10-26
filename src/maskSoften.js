import { createCanvas } from "./canvas.js";

const BLUR_RADIUS_PER_MASK_PIXEL = 1;
const BLUR_PASSES = 2;

function readPixels(image, width, height) {
  const context = createCanvas({ width, height }).getContext("2d", { willReadFrequently: true });
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);
  return context.getImageData(0, 0, width, height).data;
}

function alphaChannel(rgba) {
  const values = new Float32Array(rgba.length / 4);
  for (let i = 0; i < values.length; i++) values[i] = rgba[4 * i + 3] / 255;
  return values;
}

function blurLine(source, target, start, step, length, radius, prefix) {
  for (let i = 0; i < length; i++) prefix[i + 1] = prefix[i] + source[start + i * step];
  for (let i = 0; i < length; i++) {
    const low = Math.max(0, i - radius);
    const high = Math.min(length, i + radius + 1);
    target[start + i * step] = (prefix[high] - prefix[low]) / (high - low);
  }
}

function boxFilter(values, width, height, radius) {
  const rowsBlurred = new Float32Array(values.length);
  const blurred = new Float32Array(values.length);
  const prefix = new Float64Array(Math.max(width, height) + 1);
  for (let y = 0; y < height; y++) blurLine(values, rowsBlurred, y * width, 1, width, radius, prefix);
  for (let x = 0; x < width; x++) blurLine(rowsBlurred, blurred, x, width, height, radius, prefix);
  return blurred;
}

function toMaskCanvas(alpha, width, height) {
  const canvas = createCanvas({ width, height });
  const context = canvas.getContext("2d");
  const pixels = context.createImageData(width, height);
  for (let i = 0; i < alpha.length; i++) pixels.data[4 * i + 3] = alpha[i] * 255;
  context.putImageData(pixels, 0, 0);
  return canvas;
}

export function softenMask(image, mask) {
  const { width, height } = image;
  const radius = Math.ceil(BLUR_RADIUS_PER_MASK_PIXEL * Math.max(width / mask.width, height / mask.height));
  let alpha = alphaChannel(readPixels(mask, width, height));
  for (let pass = 0; pass < BLUR_PASSES; pass++) alpha = boxFilter(alpha, width, height, radius);
  return toMaskCanvas(alpha, width, height);
}
