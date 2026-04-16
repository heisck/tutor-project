'use client';

import type {
  AuthenticatedUser,
  DocumentListItemResponse,
  DocumentProcessingStatus,
} from '@ai-tutor-pwa/shared';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  LoaderCircle,
  Upload as UploadIcon,
  X,
} from 'lucide-react';
import { Badge, Button, Card, CardContent, CardFooter, CardHeader, Navbar, Progress } from '@/components';
import { api, ApiError } from '@/lib/api';
import { formatFileSize, formatRelativeTime } from '@/lib/utils';

type UploadItemStatus =
  | 'preparing'
  | 'uploading'
  | 'processing'
  | 'complete'
  | 'error';

interface UploadQueueItem {
  documentId?: string;
  error?: string;
  file: File;
  id: string;
  processingStatus?: DocumentProcessingStatus;
  progress: number;
  status: UploadItemStatus;
  uploadId?: string;
}

function toUploadItemStatus(
  processingStatus: DocumentProcessingStatus | undefined,
  currentStatus: UploadItemStatus,
): UploadItemStatus {
  if (processingStatus === undefined) {
    return currentStatus;
  }

  if (processingStatus === 'complete') {
    return 'complete';
  }

  if (processingStatus === 'failed') {
    return 'error';
  }

  return 'processing';
}

function getDocumentBadgeVariant(status: DocumentProcessingStatus) {
  switch (status) {
    case 'complete':
      return 'success';
    case 'failed':
      return 'error';
    case 'queued':
    case 'processing':
    case 'extracting':
    case 'indexing':
    case 'retrying':
      return 'warning';
    case 'pending':
      return 'info';
  }
}

function formatDocumentStatus(status: DocumentProcessingStatus): string {
  switch (status) {
    case 'complete':
      return 'Ready';
    case 'failed':
      return 'Failed';
    case 'queued':
      return 'Queued';
    case 'processing':
      return 'Processing';
    case 'extracting':
      return 'Extracting';
    case 'indexing':
      return 'Indexing';
    case 'retrying':
      return 'Retrying';
    case 'pending':
      return 'Pending';
  }
}

export default function UploadPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [documents, setDocuments] = useState<DocumentListItemResponse[]>([]);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function initialize() {
      try {
        setPageError(null);
        const [session, nextDocuments] = await Promise.all([
          api.getSession(),
          api.listDocuments(),
        ]);
        setUser(session.user);
        setDocuments(nextDocuments);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          router.push('/signin');
          return;
        }

        setPageError(
          error instanceof Error
            ? error.message
            : 'Failed to load your upload workspace.',
        );
      } finally {
        setInitializing(false);
      }
    }

    void initialize();
  }, [router]);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await api.signOut();
      router.push('/');
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to sign out cleanly.',
      );
    } finally {
      setLoggingOut(false);
    }
  }

  async function refreshDocuments() {
    try {
      setRefreshing(true);
      const nextDocuments = await api.listDocuments();
      setDocuments(nextDocuments);
      syncQueueWithDocuments(nextDocuments);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : 'Failed to refresh document status.',
      );
    } finally {
      setRefreshing(false);
    }
  }

  function syncQueueWithDocuments(nextDocuments: DocumentListItemResponse[]) {
    const statusByDocumentId = new Map(
      nextDocuments.map((document) => [document.documentId, document.processingStatus]),
    );

    setQueue((currentQueue) =>
      currentQueue.map((item) => {
        if (item.documentId === undefined) {
          return item;
        }

        const processingStatus =
          statusByDocumentId.get(item.documentId) ?? item.processingStatus;

        if (processingStatus === undefined) {
          return item;
        }

        const nextStatus = toUploadItemStatus(processingStatus, item.status);
        return {
          ...item,
          error:
            processingStatus === 'failed'
              ? item.error ?? 'Document processing failed.'
              : item.error,
          processingStatus,
          progress: nextStatus === 'complete' ? 100 : item.progress,
          status: nextStatus,
        };
      }),
    );
  }

  function updateQueueItem(
    itemId: string,
    updates: Partial<Omit<UploadQueueItem, 'file' | 'id'>>,
  ) {
    setQueue((currentQueue) =>
      currentQueue.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item,
      ),
    );
  }

  function handleDrag(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(event.type === 'dragenter' || event.type === 'dragover');
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    if (event.dataTransfer.files.length > 0) {
      handleFiles(event.dataTransfer.files);
    }
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files !== null) {
      handleFiles(event.target.files);
    }
  }

  function handleFiles(fileList: FileList) {
    const nextItems = Array.from(fileList).map((file, index) => ({
      file,
      id: `${Date.now()}-${index}-${file.name}`,
      progress: 0,
      status: 'preparing' as const,
    }));

    setQueue((currentQueue) => [...nextItems, ...currentQueue]);
    setPageError(null);

    for (const item of nextItems) {
      void uploadFile(item.id, item.file);
    }
  }

  async function uploadFile(itemId: string, file: File) {
    try {
      updateQueueItem(itemId, { progress: 10, status: 'preparing' });
      await api.validateUpload(file.name, file.size, file.type);

      updateQueueItem(itemId, { progress: 30, status: 'uploading' });
      const uploadSession = await api.createUpload(file.name, file.size, file.type);

      updateQueueItem(itemId, {
        progress: 55,
        status: 'uploading',
        uploadId: uploadSession.uploadId,
      });

      const finishResponse = await api.finishUpload(uploadSession.uploadId, file);
      const nextStatus = toUploadItemStatus(
        finishResponse.document.processingStatus,
        'processing',
      );

      updateQueueItem(itemId, {
        documentId: finishResponse.document.id,
        processingStatus: finishResponse.document.processingStatus,
        progress: nextStatus === 'complete' ? 100 : 75,
        status: nextStatus,
        uploadId: finishResponse.uploadId,
      });

      await refreshDocuments();
    } catch (error) {
      updateQueueItem(itemId, {
        error:
          error instanceof Error ? error.message : 'Upload failed unexpectedly.',
        status: 'error',
      });
    }
  }

  function removeQueueItem(itemId: string) {
    setQueue((currentQueue) => currentQueue.filter((item) => item.id !== itemId));
  }

  async function deleteDocument(documentId: string) {
    try {
      await api.deleteDocument(documentId);
      setDocuments((current) => current.filter((d) => d.documentId !== documentId));
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to delete document.',
      );
    }
  }

  function clearFinishedQueueItems() {
    setQueue((currentQueue) =>
      currentQueue.filter(
        (item) =>
          item.status === 'preparing' ||
          item.status === 'uploading' ||
          item.status === 'processing',
      ),
    );
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="flex items-center gap-3 text-cream-300">
          <LoaderCircle className="animate-spin" size={18} />
          Loading your upload workspace...
        </div>
      </div>
    );
  }

  if (user === null) {
    return null;
  }

  return (
    <div className="min-h-screen bg-ink">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-ai-blue-600/5 rounded-full blur-3xl" />
      </div>

      <Navbar user={user} onLogout={loggingOut ? undefined : handleLogout} />

      <div className="relative max-w-5xl mx-auto px-6 py-12 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-cream-50 font-fraunces mb-2">
              Upload and Process
            </h1>
            <p className="text-lg text-cream-300">
              Files upload immediately, then we keep tracking document processing
              until they are ready for study sessions.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => void refreshDocuments()}
              loading={refreshing}
            >
              Refresh Status
            </Button>
            <Button variant="primary" onClick={() => router.push('/session')}>
              Open Session Launcher
            </Button>
          </div>
        </div>

        {pageError && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <span>{pageError}</span>
          </div>
        )}

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative p-12 rounded-xl border-2 border-dashed transition-all duration-300 ${
            dragActive
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-ink-600 bg-ink-800/50 hover:border-amber-500/50'
          }`}
        >
          <input
            accept="video/*,audio/*,.pdf,.txt,.doc,.docx"
            className="hidden"
            id="file-input"
            multiple
            onChange={handleChange}
            type="file"
          />

          <label className="cursor-pointer block" htmlFor="file-input">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center mb-4">
                <UploadIcon size={32} className="text-amber-400" />
              </div>
              <h2 className="text-2xl font-semibold text-cream-50 font-fraunces mb-2">
                Drop files here or click to browse
              </h2>
              <p className="text-cream-400">
                Supported formats: MP4, WebM, MP3, PDF, TXT, DOCX
              </p>
              <p className="text-sm text-cream-500 mt-2">
                Files are uploaded and queued for processing automatically.
              </p>
            </div>
          </label>
        </div>

        <Card variant="gradient">
          <CardHeader
            description="Each file moves through upload, queueing, and document processing."
            title={`Upload Queue (${queue.length})`}
          />
          <CardContent>
            {queue.length === 0 ? (
              <div className="rounded-lg border border-ink-700 bg-ink-900/40 p-6 text-cream-400">
                Your upload queue is empty. Add files above to begin processing.
              </div>
            ) : (
              <div className="space-y-4">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg bg-ink-800/50 border border-ink-600"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-ink-700 to-ink-800 flex items-center justify-center text-amber-500 flex-shrink-0">
                        <FileText size={22} />
                      </div>

                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-cream-50 truncate">
                              {item.file.name}
                            </p>
                            <p className="text-xs text-cream-500">
                              {formatFileSize(item.file.size)}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              size="sm"
                              variant={
                                item.status === 'complete'
                                  ? 'success'
                                  : item.status === 'error'
                                    ? 'error'
                                    : item.status === 'processing'
                                      ? 'warning'
                                      : 'info'
                              }
                            >
                              {item.status === 'complete'
                                ? 'Ready'
                                : item.status === 'error'
                                  ? 'Error'
                                  : item.status === 'processing'
                                    ? 'Processing'
                                    : item.status === 'uploading'
                                      ? 'Uploading'
                                      : 'Preparing'}
                            </Badge>
                            {item.processingStatus !== undefined && (
                              <Badge
                                size="sm"
                                variant={getDocumentBadgeVariant(item.processingStatus)}
                              >
                                {formatDocumentStatus(item.processingStatus)}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <Progress
                          max={100}
                          size="sm"
                          value={item.progress}
                          variant={
                            item.status === 'error'
                              ? 'warning'
                              : item.status === 'complete'
                                ? 'success'
                                : 'default'
                          }
                        />

                        {item.error && (
                          <p className="text-sm text-red-300">{item.error}</p>
                        )}

                        {item.documentId && (
                          <div className="flex flex-wrap gap-3 text-xs text-cream-500">
                            <span>Document ID: {item.documentId}</span>
                            {item.uploadId && <span>Upload ID: {item.uploadId}</span>}
                          </div>
                        )}
                      </div>

                      <button
                        className="p-2 text-cream-400 hover:text-cream-50 hover:bg-ink-700 rounded-lg transition-colors flex-shrink-0"
                        onClick={() => removeQueueItem(item.id)}
                        type="button"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              onClick={clearFinishedQueueItems}
              disabled={queue.length === 0}
            >
              Clear Finished
            </Button>
            <Button
              variant="primary"
              onClick={() => void refreshDocuments()}
              loading={refreshing}
            >
              Refresh Processing Status
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader
            description="Ready documents can launch new tutoring sessions right away."
            title="Document Library"
          />
          <CardContent>
            {documents.length === 0 ? (
              <div className="rounded-lg border border-ink-700 bg-ink-900/40 p-6 text-cream-400">
                No documents yet. Once a file finishes uploading it will appear here.
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((document) => (
                  <div
                    key={document.documentId}
                    className="rounded-lg border border-ink-700 bg-ink-900/40 p-5"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-cream-50 font-fraunces truncate">
                            {document.fileName}
                          </h3>
                          <Badge
                            size="sm"
                            variant={getDocumentBadgeVariant(document.processingStatus)}
                          >
                            {formatDocumentStatus(document.processingStatus)}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-cream-400">
                          <span>{formatFileSize(document.fileSize)}</span>
                          <span>{document.fileType}</span>
                          <span>Updated {formatRelativeTime(document.updatedAt)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {document.processingStatus !== 'complete' && (
                          <Button
                            variant="outline"
                            onClick={() => void deleteDocument(document.documentId)}
                          >
                            Delete
                          </Button>
                        )}
                        {document.processingStatus === 'complete' && (
                          <>
                            <Button
                              variant="outline"
                              onClick={() =>
                                router.push(`/session?documentId=${document.documentId}`)
                              }
                            >
                              Session Setup
                            </Button>
                            <Button
                              variant="primary"
                              onClick={() =>
                                router.push(`/session?documentId=${document.documentId}`)
                              }
                            >
                              Start Studying
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-ink-700 bg-ink-900/40 p-4">
                <div className="flex items-center gap-2 text-cream-300 mb-2">
                  <Clock3 size={16} />
                  Processing checks
                </div>
                <p className="text-sm text-cream-400">
                  We automatically poll queued documents so the library updates as
                  parsing and indexing progress.
                </p>
              </div>
              <div className="rounded-lg border border-ink-700 bg-ink-900/40 p-4">
                <div className="flex items-center gap-2 text-cream-300 mb-2">
                  <CheckCircle2 size={16} />
                  Session ready
                </div>
                <p className="text-sm text-cream-400">
                  As soon as a document reaches the Ready state, you can launch a
                  study session from this page or the session launcher.
                </p>
              </div>
              <div className="rounded-lg border border-ink-700 bg-ink-900/40 p-4">
                <div className="flex items-center gap-2 text-cream-300 mb-2">
                  <AlertCircle size={16} />
                  Failed processing
                </div>
                <p className="text-sm text-cream-400">
                  If a file fails during processing, keep it in the library for
                  debugging and re-upload a corrected version.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
