const PERSON_ALPHA = 128;
const MIN_ROW_PIXELS = 2;
const NECK_NARROWING = 0.8;
const SHOULDER_WIDENING = 1.25;
const NECKLESS_DROP_PER_HEAD_WIDTH = 1.3;

function measureRow(data, width, y) {
  let count = 0;
  let left = -1;
  let right = -1;
  for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] < PERSON_ALPHA) continue;
    count++;
    if (left < 0) left = x;
    right = x;
  }
  return { count, center: (left + right + 1) / 2 };
}

function measureRows(data, width, height) {
  return Array.from({ length: height }, (_, y) => measureRow(data, width, y));
}

function smoothCounts(rows) {
  return rows.map((row, i) => {
    const neighbors = [rows[i - 1], row, rows[i + 1]].filter(Boolean);
    return { ...row, count: neighbors.reduce((sum, r) => sum + r.count, 0) / neighbors.length };
  });
}

function findHeadEnd(rows, top) {
  let headWidth = 0;
  for (let y = top; y < rows.length; y++) {
    headWidth = Math.max(headWidth, rows[y].count);
    if (rows[y].count < NECK_NARROWING * headWidth) return { row: y, headWidth };
  }
  return { row: rows.length, headWidth };
}

function findShouldersStart(rows, neckTop) {
  let narrowest = neckTop;
  for (let y = neckTop; y < rows.length; y++) {
    if (rows[y].count < rows[narrowest].count) narrowest = y;
    if (rows[y].count > SHOULDER_WIDENING * rows[narrowest].count) return y;
  }
  return -1;
}

function estimateFromHeadWidth(top, headWidth) {
  return Math.round(top + NECKLESS_DROP_PER_HEAD_WIDTH * headWidth);
}

function findNeck(rows) {
  const top = rows.findIndex((row) => row.count >= MIN_ROW_PIXELS);
  if (top < 0) return null;

  const head = findHeadEnd(rows, top);
  const shoulders = head.row < rows.length ? findShouldersStart(rows, head.row) : -1;
  const lastPersonRow = rows.findLastIndex((row) => row.count >= MIN_ROW_PIXELS);
  const row = Math.min(lastPersonRow, shoulders >= 0 ? shoulders : estimateFromHeadWidth(top, head.headWidth));
  return { row, center: rows[row].center, headWidth: head.headWidth };
}

export function neckFromImage({ data, width, height }) {
  const neck = findNeck(smoothCounts(measureRows(data, width, height)));
  if (!neck) return null;
  return { x: neck.center / width, y: neck.row / height, headWidth: neck.headWidth / width };
}
