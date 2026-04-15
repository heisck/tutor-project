'use client';

import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';

const supportedTypes = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const formatFileSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const totalSize = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files]
  );

  const ingestFiles = (fileList: FileList) => {
    const valid = Array.from(fileList).filter((file) => supportedTypes.includes(file.type));
    setFiles((prev) => [...prev, ...valid]);
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragActive(false);
    ingestFiles(event.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (files.length === 0 || uploading) return;

    setUploading(true);
    for (let value = 0; value <= 100; value += 10) {
      setProgress(value);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    setUploading(false);
    setFiles([]);
    setProgress(0);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Content ingestion</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Upload your learning material</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          Add source files and TutorAI will map concepts into your adaptive tutoring workflow.
        </p>
      </section>

      <motion.label
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        animate={dragActive ? { scale: 1.01 } : { scale: 1 }}
        className={`block cursor-pointer rounded-3xl border border-dashed p-10 text-center transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-border bg-muted/20 hover:border-primary/60'
        }`}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.ppt,.pptx,.doc,.docx"
          className="hidden"
          onChange={(event) => {
            if (event.target.files) ingestFiles(event.target.files);
          }}
        />

        <p className="text-sm font-semibold">Drag and drop files here</p>
        <p className="mt-2 text-sm text-muted-foreground">
          or click to browse · PDF, PPT/PPTX, DOC/DOCX · max 50MB per file
        </p>
      </motion.label>

      <section className="rounded-2xl border border-border/70 bg-background p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Selected files</h3>
          <p className="text-xs text-muted-foreground">
            {files.length} file{files.length === 1 ? '' : 's'} · {formatFileSize(totalSize)}
          </p>
        </div>

        {files.length === 0 ? (
          <p className="rounded-xl border border-border/70 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            No files selected yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                  className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {uploading && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Uploading and indexing…</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-primary" />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className="mt-5 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : 'Upload and process files'}
        </button>
      </section>
    </div>
  );
}
