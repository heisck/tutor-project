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

const formatLabels = ['PDF', 'PPTX', 'DOCX', 'Notes', 'Decks'];

const formatFileSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export default function UploadWorkspace() {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

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
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_340px]">
      <div className="space-y-4">
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
          animate={dragActive ? { scale: 1.01, y: -2 } : { scale: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className={`ui-panel block cursor-pointer overflow-hidden rounded-[34px] p-6 sm:p-8 ${
            dragActive ? 'border-primary/35 bg-primary/10' : ''
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

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="ui-kicker">Dropzone</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Drag in the material you actually want to master.
              </h3>
              <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                Click to browse or drag files into the workspace. The upload pipeline is tuned for study decks,
                class notes, and documents that need prerequisite-aware teaching.
              </p>
            </div>

            <div className="ui-panel-muted rounded-[24px] px-4 py-3">
              <p className="ui-kicker">Capacity</p>
              <p className="mt-2 text-lg font-semibold">Up to 50 MB per file</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2.5">
            {formatLabels.map((label) => (
              <span key={label} className="ui-chip">
                {label}
              </span>
            ))}
          </div>
        </motion.label>

        <section className="ui-panel rounded-[32px] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="ui-kicker">Selected files</p>
              <h3 className="mt-2 text-xl font-semibold">Queued for ingestion</h3>
            </div>
            <span className="ui-chip">
              {files.length} file{files.length === 1 ? '' : 's'} · {formatFileSize(totalSize)}
            </span>
          </div>

          {files.length === 0 ? (
            <div className="ui-panel-muted mt-5 rounded-[24px] px-5 py-10 text-center">
              <p className="text-sm font-semibold">Nothing is queued yet.</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Add files above and the tutor will prepare extraction, graph analysis, and session planning.
              </p>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="ui-panel-muted flex min-w-0 items-center justify-between gap-4 rounded-[22px] p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{file.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                    className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/5"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <section className="ui-panel rounded-[32px] p-5">
          <p className="ui-kicker">Processing signal</p>
          <h3 className="mt-3 text-xl font-semibold">Upload and indexing status</h3>

          <div className="mt-5 rounded-[24px] border border-white/8 bg-black/10 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{uploading ? 'In progress' : 'Waiting for files'}</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/6">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-300 to-secondary"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="mt-5 w-full rounded-[22px] bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_16px_28px_rgb(59_208_221_/_0.28)] transition-transform duration-200 hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload and process files'}
          </button>
        </section>

        <section className="ui-panel rounded-[32px] p-5">
          <p className="ui-kicker">After upload</p>
          <div className="mt-4 space-y-3">
            {[
              'Normalized sections are preserved for retrieval and grounding.',
              'ATUs receive coverage tracking before lesson planning begins.',
              'The tutor can resume from the exact last mastery checkpoint.',
            ].map((item, index) => (
              <div key={item} className="ui-panel-muted flex gap-3 rounded-[22px] p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-secondary/12 text-xs font-semibold text-secondary">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-foreground/92">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}
