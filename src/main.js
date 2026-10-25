import { createProcessor } from "./processing.js";
import { show } from "./screens.js";

const nameForm = document.getElementById("name-form");
const nameInput = document.getElementById("name");
const selfieInput = document.getElementById("selfie");
const errorText = document.getElementById("error");
const photo = document.getElementById("photo");
const retake = document.getElementById("retake");

const params = new URLSearchParams(location.search);
const processorReady = createProcessor({
  invertMask: params.has("invert"),
});
processorReady.catch(console.error);

function takeSelectedFile(input) {
  const [file] = input.files;
  input.value = "";
  return file;
}

function showError(error) {
  console.error(error);
  errorText.textContent = `Error: ${error.message}`;
  show("selfie");
}

async function processSelfie(file) {
  show("waiting");
  const process = await processorReady;
  photo.src = await process(file, nameInput.value);
  errorText.textContent = "";
  show("result");
}

nameForm.onsubmit = (event) => {
  event.preventDefault();
  show("selfie");
};

selfieInput.onchange = () => {
  const file = takeSelectedFile(selfieInput);
  if (file) processSelfie(file).catch(showError);
};

retake.onclick = () => show("selfie");
