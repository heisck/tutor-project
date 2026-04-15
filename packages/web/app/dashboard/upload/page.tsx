'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = e.dataTransfer.files;
    handleFiles(droppedFiles);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList).filter((file) => {
      const validTypes = [
        'application/pdf',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      return validTypes.includes(file.type);
    });

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    setUploading(true);
    setUploadProgress(0);

    // Simulate upload
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // TODO: Implement actual upload logic
    console.log('Uploading files:', files);
    setUploading(false);
    setFiles([]);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 max-w-4xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Upload Learning Material</h1>
        <p className="text-muted-foreground text-lg">
          Upload PDFs, presentations, or documents for AI-powered analysis
        </p>
      </motion.div>

      {/* Upload Zone */}
      <motion.div variants={itemVariants}>
        <label
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`block p-12 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
            dragActive
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-primary hover:bg-muted/50'
          }`}
        >
          <input
            type="file"
            multiple
            onChange={handleChange}
            accept=".pdf,.ppt,.pptx,.doc,.docx"
            className="hidden"
            id="file-upload"
          />

          <div className="text-center space-y-4">
            <motion.div
              animate={dragActive ? { scale: 1.1 } : { scale: 1 }}
              className="text-6xl"
            >
              📁
            </motion.div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">
                Drag and drop your files here
              </h3>
              <p className="text-muted-foreground">
                or{' '}
                <label htmlFor="file-upload" className="text-primary hover:underline cursor-pointer">
                  click to browse
                </label>
              </p>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>Supported formats: PDF, PowerPoint, Word</p>
              <p>Max file size: 50MB per file</p>
            </div>
          </div>
        </label>
      </motion.div>

      {/* File List */}
      {files.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Selected Files ({files.length})</h2>

          <div className="space-y-2">
            {files.map((file, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30 hover:border-primary transition-all"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-2xl">
                    {file.type === 'application/pdf'
                      ? '📄'
                      : file.type.includes('presentation')
                        ? '📊'
                        : '📝'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  ✕
                </button>
              </motion.div>
            ))}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <motion.div variants={itemVariants} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">Uploading...</span>
                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                />
              </div>
            </motion.div>
          )}

          {/* Upload Button */}
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {uploading ? 'Uploading...' : 'Upload & Analyze'}
          </motion.button>
        </motion.div>
      )}

      {/* Info Cards */}
      <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-4 pt-8">
        {[
          {
            icon: '🤖',
            title: 'AI Analysis',
            description: 'Our AI extracts and analyzes content automatically',
          },
          {
            icon: '❓',
            title: 'Questions',
            description: 'Generate practice questions from your materials',
          },
          {
            icon: '📚',
            title: 'Summaries',
            description: 'Get concise summaries of complex topics',
          },
        ].map((info, idx) => (
          <div
            key={idx}
            className="p-4 rounded-lg border border-border bg-muted/30 text-center"
          >
            <div className="text-3xl mb-2">{info.icon}</div>
            <h3 className="font-semibold text-foreground text-sm">{info.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
