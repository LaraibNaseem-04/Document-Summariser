import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { extractPdfText } from "./lib/extractPdfText";
import { ocrImage } from "./lib/ocrImage";
import { summariseWithGemini } from "./lib/gemini";
import './App.css'
// Helper to format file size for better readability
function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Helper to extract text from different file types
async function extractTextFromFile(fileToProcess) {
  if (fileToProcess.type === "application/pdf") {
    return await extractPdfText(fileToProcess);
  }
  if (fileToProcess.type?.startsWith("image/")) {
    return await ocrImage(fileToProcess);
  }
  return await fileToProcess.text();
}

export default function App() {
  const [file, setFile] = useState(null);
  const [length, setLength] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [rawText, setRawText] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const helper = useMemo(() => {
    if (!file) return "Drop any document to get started, or choose a file.";
    if (file.type === "application/pdf") return "PDF detected — we’ll parse its text.";
    if (file.type?.startsWith("image/")) return "Image detected — we’ll run OCR.";
    return "Text/other file — we’ll read its contents.";
  }, [file]);

  // Create a revocable URL for PDF previews
  const filePreviewUrl = useMemo(() => {
    if (file && (file.type === 'application/pdf' || file.type?.startsWith('image/'))) {
      return URL.createObjectURL(file);
    }
    return null;
  }, [file]);

  // Clean up the object URL when the component unmounts or the file changes
  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  // Handle Escape key for modals
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        if (showPreview) setShowPreview(false);
      }
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [showPreview]);

  async function handleSummarise() {
    if (!file) return;
    try {
      setLoading(true);
      setError("");
      setResult(null);

      const text = await extractTextFromFile(file);
      setRawText(text);

      if (!text.trim()) {
        setError("Could not extract any text from the document. It might be empty or unreadable.");
        return; // Stop further processing
      }

      const out = await summariseWithGemini({ text, length });
      setResult(out);
    } catch (e) {
      console.error(e);
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  function onFilePick(e) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }

  function handleCancel() {
    setFile(null);
    setResult(null);
    setError("");
  }

  async function handleCopy() {
    if (!result) return;
    const textToCopy = `## Summary\n\n${result.summary}\n\n## Key Points\n\n${result.key_points.map(p => `- ${p}`).join('\n')}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy text.');
    }
  }

  async function handleShare() {
    if (!result || !file) return;
    const shareData = {
      title: `Summary of ${file.name}`,
      text: `Summary:\n${result.summary}`,
      url: window.location.href,
    };
    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        handleCopy();
        alert('Web Share is not supported by your browser. Summary copied to clipboard instead!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }

  const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  const appName = "PrecisAI";

  const titleContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.2,
      },
    },
  };

  const titleCharVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
  };

  const subtitleVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.2 + appName.length * 0.06, // After title animation
        duration: 0.4,
      },
    },
  };

  const descriptionVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.3 + appName.length * 0.06, // After subtitle animation
        duration: 0.4,
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 text-gray-100 p-4 sm:p-6">
      <motion.div
        className="max-w-4xl mx-auto"
        initial="initial"
        animate="animate"
        variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
      >
        {/* Header */}
        <motion.header variants={itemVariants} className="mb-12 text-center">
          <motion.h1
            variants={titleContainerVariants}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-3"
          >
            {appName.split("").map((char, index) => (
              <motion.span
                key={index}
                variants={titleCharVariants}
                className="inline-block"
              >
                {char}
              </motion.span>
            ))}
          </motion.h1>
          <motion.p
            variants={subtitleVariants}
            initial="hidden"
            animate="visible"
            className="text-lg text-gray-300 sm:text-xl"
          >
            Your intelligent summary assistant.
          </motion.p>
          <motion.p
            variants={descriptionVariants}
            initial="hidden"
            animate="visible"
            className="text-gray-400 mt-2 max-w-2xl mx-auto"
          >
            Instantly transform lengthy documents, PDFs, and images into clear,
            concise summaries and key takeaways.
          </motion.p>
        </motion.header>

        {/* Dropzone */}
        <motion.section
          variants={itemVariants}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              document.getElementById("fileInput")?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!dragOver) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
            dragOver
              ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500"
              : "border-gray-700 bg-gray-900/40 hover:border-gray-600"
          }`}
          aria-label="File dropzone"
        >
          <div className="mx-auto max-w-xl">
            <div className="text-4xl mb-2">📄</div>
            <p className="font-medium">Drag & drop your file here</p>
            <p className="text-gray-400 text-sm mt-1">{helper}</p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 min-h-[40px]">
              <motion.label
                className={`inline-flex items-center gap-2 ${
                  file ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <input
                  id="fileInput"
                  type="file"
                  accept="application/pdf,image/*,text/plain"
                  hidden
                  onChange={onFilePick}
                  disabled={!!file}
                />
                <motion.span
                  className={`px-4 py-2 rounded-md text-white transition ${
                    file ? "bg-blue-600/60" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                  whileHover={{ scale: file ? 1 : 1.05 }}
                  whileTap={{ scale: file ? 1 : 0.95 }}
                >
                  Choose file
                </motion.span>
              </motion.label>

              <AnimatePresence>
                {file && (
                  <motion.button
                    type="button"
                    onClick={handleCancel}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md text-white"
                    title="Clear selected file"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-4 h-5">
              <AnimatePresence>
                {file && (
                  <motion.p
                    className="text-sm text-gray-300"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    Selected: <span className="font-semibold">{file.name}</span>{" "}
                    <span className="text-gray-500">({formatBytes(file.size)})</span>
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>

        {/* Controls */}
        <motion.section variants={itemVariants} className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="length-select" className="text-sm text-gray-300">Summary length:</label>
            <div className="relative">
              <select
                id="length-select"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="bg-gray-800 border border-gray-700 p-2 rounded-md appearance-none pr-8 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>

        <motion.button
          onClick={handleSummarise}
          disabled={!file || loading}
          className={`px-6 py-2 rounded-md text-white font-semibold ${
            loading || !file ? "bg-blue-600/60 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
          }`}
          whileHover={{ scale: (loading || !file) ? 1 : 1.05 }}
          whileTap={{ scale: (loading || !file) ? 1 : 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          {loading ? "Analyzing Document…" : "Generate Summary"}
        </motion.button>
        </motion.section>

        {/* Divider */}
        {(error || result) && <hr className="my-6 border-gray-800" />}

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {/* Error */}
            {error && (
              <motion.div
                key="error"
                className="bg-red-900/50 text-red-200 border border-red-800 p-4 rounded-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <strong className="font-semibold">⚠️ Error:</strong> {error}
              </motion.div>
            )}

            {/* Result & Preview Layout */}
            {result && (
              <motion.section
                key="result"
                className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleCopy} className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50" disabled={copied}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </motion.button>
                  {navigator.share && (
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleShare} className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-md text-sm font-medium transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
                      <span>Share</span>
                    </motion.button>
                  )}
                  {filePreviewUrl && (
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowPreview(true)} className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-md text-sm font-medium transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      <span>Preview</span>
                    </motion.button>
                  )}
                </div>

                <h2 className="text-xl font-semibold mb-3">Summary</h2>
                <p className="mb-5 leading-relaxed text-gray-200">{result.summary}</p>

                {!!result.key_points?.length && (
                  <>
                    <h3 className="font-semibold mb-2">Key Points</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-300">
                      {result.key_points.map((kp, i) => (
                        <li key={i}>{kp}</li>
                      ))}
                    </ul>
                  </>
                )}

                <details className="mt-6 group">
                  <summary className="cursor-pointer select-none text-sm text-gray-400 hover:text-gray-200 transition-colors">
                    Show extracted text
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap text-sm bg-black/40 border border-gray-800 rounded-lg p-4 max-h-80 overflow-auto">
{rawText.slice(0, 100000)}
                  </pre>
                </details>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Loading overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="flex items-center gap-3 bg-gray-900 border border-gray-800 px-5 py-4 rounded-xl shadow-2xl"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
            >
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"></circle>
                <path d="M4 12a8 8 0 0 1 8-8" fill="none" stroke="currentColor" strokeWidth="4"></path>
              </svg>
              <span>{`Analyzing ${file?.name || 'document'}…`}</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && filePreviewUrl && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowPreview(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-4 max-w-4xl w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-800">
                <h2 className="text-xl font-semibold text-gray-200 truncate pr-4" title={file.name}>{file.name}</h2>
                <motion.button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-500 hover:text-white p-1 rounded-full hover:bg-gray-700 flex-shrink-0"
                  aria-label="Close preview"
                  whileHover={{ scale: 1.2, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </motion.button>
              </div>
              <div className="flex-grow overflow-auto">
                {file.type === 'application/pdf' ? (
                  <iframe src={filePreviewUrl} className="w-full h-[calc(90vh-100px)] rounded-lg border-gray-700 bg-white" title="PDF Preview" />
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <img src={filePreviewUrl} alt="Image Preview" className="max-w-full max-h-full object-contain rounded-lg" />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
