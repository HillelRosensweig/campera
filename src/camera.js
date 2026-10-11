export async function startCamera(video) {
  video.srcObject = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } },
    audio: false,
  });
  await video.play();
}

export function isVideoReady(video) {
  return video.readyState >= 2 && video.videoWidth > 0;
}
