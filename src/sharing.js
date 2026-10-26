const FILE_NAME = "party-photo.jpg";

export async function photoFile(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], FILE_NAME, { type: blob.type });
}

function download(file) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

export async function sharePhoto(file) {
  if (!navigator.canShare?.({ files: [file] })) return download(file);
  try {
    await navigator.share({ files: [file] });
  } catch (error) {
    if (error.name !== "AbortError") throw error;
  }
}
