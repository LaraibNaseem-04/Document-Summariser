import Tesseract from "tesseract.js";

export async function ocrImage(file) {
  const { data } = await Tesseract.recognize(file, "eng");
  return data.text || "";
}
