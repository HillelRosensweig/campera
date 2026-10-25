import { createCanvas } from "./canvas.js";
import { createCompositor } from "./compositor.js";
import { createDetector } from "./detection.js";

const PHOTO_SIZE = { width: 1080, height: 1920 };
const MAX_PHOTO_SIDE = 1920;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function loadAssets() {
  const config = await (await fetch("config.json")).json();
  return { backdrop: await loadImage(config.backdrop), slogans: config.slogans };
}

async function decodePhoto(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height);
  if (scale >= 1) return bitmap;

  const resized = await createImageBitmap(bitmap, {
    resizeWidth: Math.round(bitmap.width * scale),
    resizeHeight: Math.round(bitmap.height * scale),
    resizeQuality: "high",
  });
  bitmap.close();
  return resized;
}

const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];

const captionFor = (name, slogan) => ({ title: name.trim() ? `מפלגת ${name.trim()}` : "", slogan });

function render(compositor, scene) {
  const canvas = createCanvas(PHOTO_SIZE);
  compositor.drawFrame(canvas.getContext("2d"), scene);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export async function createProcessor(detectorOptions) {
  const [{ slogans, ...assets }, detector] = await Promise.all([loadAssets(), createDetector(detectorOptions)]);
  const compositor = createCompositor(assets);

  return async (file, name) => {
    const scene = detector.analyze(await decodePhoto(file));
    return render(compositor, { ...scene, caption: captionFor(name, pickRandom(slogans)) });
  };
}
