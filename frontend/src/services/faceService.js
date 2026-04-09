import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export const loadModels = async () => {
  if (modelsLoaded) return;
  const MODEL_URL = '/models';
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
};

export const getFaceDescriptor = async (imageElement) => {
  await loadModels();
  const detection = await faceapi
    .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection ? Array.from(detection.descriptor) : null;
};

export const compareFaces = (descriptor1, descriptor2) => {
  if (!descriptor1 || !descriptor2) return { match: false, distance: 1, score: 0 };
  const d1 = new Float32Array(descriptor1);
  const d2 = new Float32Array(descriptor2);
  const distance = faceapi.euclideanDistance(d1, d2);
  // face-api.js standard: distance < 0.6 = same person
  // Lower distance = better match
  // We return both distance and a 0-1 score for display
  const score = Math.max(0, 1 - distance);
  const match = distance < 0.5; // strict threshold — 0.5 is safer than 0.6
  return { match, distance, score };
};

export const startVideoStream = async (videoElement) => {
  let stream;
  try {
    // Try with preferred front camera first
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
  } catch {
    // Fallback: just request any video device without constraints
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
  }
  videoElement.srcObject = stream;
  await new Promise((resolve) => { videoElement.onloadedmetadata = resolve; });
  videoElement.play();
  return stream;
};

export const stopVideoStream = (stream) => {
  if (stream) stream.getTracks().forEach(t => t.stop());
};

export const captureFrame = (videoElement, canvasElement) => {
  const ctx = canvasElement.getContext('2d');
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
  ctx.drawImage(videoElement, 0, 0);
  return canvasElement;
};
