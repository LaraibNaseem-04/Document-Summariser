import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url"; 

GlobalWorkerOptions.workerSrc = workerSrc;

export async function extractPdfText(file) {
  const buf = await file.arrayBuffer();
  const pdf = await getDocument({ data: buf }).promise;

  const chunks = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const text = content.items.map((it) => it.str).join(" ");
    chunks.push(text);
  }
  return chunks.join("\n\n");
}
