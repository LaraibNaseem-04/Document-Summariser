# Document Summary Assistant (PrecisAI)

**Live Demo**: https://document-summariser-x9bu.vercel.app/

##  What It Does

Document Summary Assistant is a sleek web app that lets you summarize PDFs, images, or plain-text documents using AI. Just drag and drop or upload a file, choose the summary length, and get a concise summary with key points — powered entirely by React, Tailwind, and Gemini AI.

##  Features

- **Multi-format input**: Supports PDFs, images (OCR), and text files.
- **Drag & Drop + File Picker**: Intuitive file upload experience.
- **Summary Length Options**: Choose between *short*, *medium*, or *long* summaries.
- **Key Points Extraction**: Every summary is delivered alongside bullet-pointed highlights.
- **Instant Feedback**: Loading spinner and error handling ensure a smooth UX.
- **Client-side Processing**: PDF parsing and OCR happen in the browser; only the summary API call goes to Gemini.

---

##  Live Example

Open the [live demo](https://document-summariser-x9bu.vercel.app/) to try it out! Simply upload a document and watch the summary appear in seconds.

---

##  Installation & Setup

```bash
# 1. Clone the repo
git clone <YOUR_REPO_URL>
cd DocumentSummaryAssistant

# 2. Install dependencies
npm install

# 3. Add your Gemini API key
echo "VITE_GEMINI_API_KEY=your_actual_key_here" > .env.local

# 4. Start the dev server
npm run dev
