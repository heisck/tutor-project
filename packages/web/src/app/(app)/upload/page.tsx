'use client';

import type {
  AuthenticatedUser,
  DocumentListItemResponse,
  DocumentProcessingStatus,
} from '@ai-tutor-pwa/shared';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  LoaderCircle,
  RefreshCw,
  Trash2,
  Upload as UploadIcon,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Navbar,
  Progress,
  useToast,
} from '@/components';
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

const preparationMessages = [
  'Checking the file.',
  'Pulling out the teachable parts.',
  'Getting the lesson ready.',
];

function toUploadItemStatus(
  processingStatus: DocumentProcessingStatus | undefined,
  currentStatus: UploadItemStatus,
): UploadItemStatus {
  if (processingStatus === undefined) return currentStatus;
  if (processingStatus === 'complete') return 'complete';
  if (processingStatus === 'failed') return 'error';
  return 'processing';
}

function getDocumentBadgeVariant(status: DocumentProcessingStatus) {
  switch (status) {
    case 'complete':
      return 'success';
    case 'failed':
      return 'error';
    case 'pending':
      return 'info';
    default:
      return 'warning';
  }
}

function formatDocumentStatus(status: DocumentProcessingStatus): string {
  switch (status) {
    case 'complete':
      return 'Ready';
    case 'failed':
      return 'Needs attention';
    default:
      return 'Preparing';
  }
}

function getPreparationCopy(status: DocumentProcessingStatus | undefined): string {
  switch (status) {
    case 'queued':
    case 'pending':
      return 'Your file is in line.';
    case 'extracting':
      return 'We are pulling the useful parts out now.';
    case 'indexing':
    case 'processing':
      return 'We are turning it into a lesson.';
    case 'retrying':
      return 'We are trying that step again.';
    case 'failed':
      return 'This one needs another try.';
    case 'complete':
      return 'Ready to open.';
    default:
      return 'Preparing your lesson.';
  }
}

function getQueueHeadline(item: UploadQueueItem): string {
  switch (item.status) {
    case 'preparing':
      return 'Checking file';
    case 'uploading':
      return 'Uploading';
    case 'processing':
      return 'Preparing lesson';
    case 'complete':
      return 'Ready';
    case 'error':
      return 'Needs another try';
  }
}

function getQueueMessage(item: UploadQueueItem): string {
  if (item.error) return item.error;
  if (item.processingStatus !== undefined) return getPreparationCopy(item.processingStatus);

  switch (item.status) {
    case 'preparing':
      return 'Checking the file before upload.';
    case 'uploading':
      return 'Sending the file now.';
    case 'processing':
      return 'Turning it into a lesson.';
    case 'complete':
      return 'Ready to study.';
    case 'error':
      return 'This one needs another try.';
  }
}

function getQueueProgressValue(item: UploadQueueItem): number {
  if (item.status === 'complete') return 100;
  if (item.status === 'error') return item.progress > 0 ? item.progress : 100;
  if (item.processingStatus === 'queued' || item.processingStatus === 'pending') return Math.max(item.progress, 65);
  if (item.processingStatus === 'extracting') return Math.max(item.progress, 76);
  if (item.processingStatus === 'processing' || item.processingStatus === 'indexing' || item.processingStatus === 'retrying') {
    return Math.max(item.progress, 88);
  }

  return item.progress;
}

function isDocumentPreparing(status: DocumentProcessingStatus): boolean {
  return status !== 'complete' && status !== 'failed';
}

export default function UploadPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [documents, setDocuments] = useState<DocumentListItemResponse[]>([]);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [preparationMessageIndex, setPreparationMessageIndex] = useState(0);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [replacingDocumentId, setReplacingDocumentId] = useState<string | null>(null);
  const [retryingQueueId, setRetryingQueueId] = useState<string | null>(null);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const hasPreparingDocuments = documents.some((document) => isDocumentPreparing(document.processingStatus));
  const hasActiveQueueItems = queue.some(
    (item) =>
      item.status === 'preparing' ||
      item.status === 'uploading' ||
      item.status === 'processing',
  );

  const pageSummary = useMemo(() => {
    const readyDocument = documents.find((document) => document.processingStatus === 'complete');
    const preparingDocument = documents.find((document) => isDocumentPreparing(document.processingStatus));
    if (readyDocument !== undefined) return 'A lesson is ready to open.';
    if (preparingDocument !== undefined) return 'Your latest file is still preparing.';
    if (documents.length > 0) return 'Upload another file or open a ready lesson.';
    return 'Upload a file and we will prepare the lesson.';
  }, [documents]);

  useEffect(() => {
    async function initialize() {
      try {
        setPageError(null);
        const [session, nextDocuments] = await Promise.all([api.getSession(), api.listDocuments()]);
        setUser(session.user);
        setDocuments(nextDocuments);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          router.push('/signin');
          return;
        }

        setPageError(error instanceof Error ? error.message : 'Failed to load your upload workspace.');
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
      showToast({ title: 'Signed out', description: 'Your session ended safely.', variant: 'success' });
      router.push('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign out cleanly.';
      setPageError(message);
      showToast({ title: 'Could not sign out', description: message, variant: 'error' });
    } finally {
      setLoggingOut(false);
    }
  }

  async function refreshDocuments(silent = false) {
    try {
      if (!silent) setRefreshing(true);
      const nextDocuments = await api.listDocuments();
      setDocuments(nextDocuments);
      syncQueueWithDocuments(nextDocuments);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh document status.';
      if (!silent) {
        setPageError(message);
        showToast({ title: 'Could not refresh yet', description: message, variant: 'error' });
      }
    } finally {
      if (!silent) setRefreshing(false);
    }
  }

  function syncQueueWithDocuments(nextDocuments: DocumentListItemResponse[]) {
    const statusByDocumentId = new Map(nextDocuments.map((document) => [document.documentId, document.processingStatus]));

    setQueue((currentQueue) =>
      currentQueue.map((item) => {
        if (item.documentId === undefined) return item;
        const processingStatus = statusByDocumentId.get(item.documentId) ?? item.processingStatus;
        if (processingStatus === undefined) return item;
        const nextStatus = toUploadItemStatus(processingStatus, item.status);

        return {
          ...item,
          error: processingStatus === 'failed' ? item.error ?? 'This file could not be prepared yet.' : undefined,
          processingStatus,
          progress: nextStatus === 'complete' ? 100 : item.progress,
          status: nextStatus,
        };
      }),
    );
  }

  function updateQueueItem(itemId: string, updates: Partial<Omit<UploadQueueItem, 'file' | 'id'>>) {
    setQueue((currentQueue) =>
      currentQueue.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
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
    if (event.dataTransfer.files.length > 0) handleFiles(event.dataTransfer.files);
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files !== null) handleFiles(event.target.files);
    event.target.value = '';
  }

  async function handleReplacementChange(event: React.ChangeEvent<HTMLInputElement>) {
    const targetDocumentId = replacingDocumentId;
    const files = event.target.files;
    event.target.value = '';
    if (targetDocumentId === null || files === null || files.length === 0) return;

    try {
      setDeletingDocumentId(targetDocumentId);
      await api.deleteDocument(targetDocumentId);
      showToast({ title: 'Old file removed', description: 'Uploading the replacement now.', variant: 'info' });
      setDocuments((currentDocuments) => currentDocuments.filter((document) => document.documentId !== targetDocumentId));
      handleFiles(files);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not replace this file.';
      setPageError(message);
      showToast({ title: 'Could not replace file', description: message, variant: 'error' });
    } finally {
      setDeletingDocumentId(null);
      setReplacingDocumentId(null);
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
    for (const item of nextItems) void uploadFile(item.id, item.file);
  }

  async function uploadFile(itemId: string, file: File) {
    try {
      updateQueueItem(itemId, { error: undefined, progress: 10, status: 'preparing' });
      await api.validateUpload(file.name, file.size, file.type);
      updateQueueItem(itemId, { progress: 28, status: 'uploading' });
      const uploadSession = await api.createUpload(file.name, file.size, file.type);
      updateQueueItem(itemId, { progress: 55, status: 'uploading', uploadId: uploadSession.uploadId });
      const finishResponse = await api.finishUpload(uploadSession.uploadId, file);
      const nextStatus = toUploadItemStatus(finishResponse.document.processingStatus, 'processing');

      updateQueueItem(itemId, {
        documentId: finishResponse.document.id,
        processingStatus: finishResponse.document.processingStatus,
        progress: nextStatus === 'complete' ? 100 : 72,
        status: nextStatus,
        uploadId: finishResponse.uploadId,
      });

      showToast({ title: 'Upload started', description: `${file.name} is being prepared now.`, variant: 'success' });
      await refreshDocuments(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed unexpectedly.';
      updateQueueItem(itemId, { error: message, status: 'error' });
      showToast({ title: 'Upload failed', description: message, variant: 'error' });
    }
  }

  async function retryQueueItem(item: UploadQueueItem) {
    try {
      setRetryingQueueId(item.id);
      await uploadFile(item.id, item.file);
      showToast({ title: 'Retry started', description: `${item.file.name} is being uploaded again.`, variant: 'info' });
    } finally {
      setRetryingQueueId(null);
    }
  }

  function removeQueueItem(itemId: string) {
    setQueue((currentQueue) => currentQueue.filter((item) => item.id !== itemId));
  }

  async function removeDocument(document: DocumentListItemResponse) {
    try {
      setDeletingDocumentId(document.documentId);
      await api.deleteDocument(document.documentId);
      setDocuments((currentDocuments) => currentDocuments.filter((currentDocument) => currentDocument.documentId !== document.documentId));
      setQueue((currentQueue) => currentQueue.filter((item) => item.documentId !== document.documentId));
      showToast({ title: 'File removed', description: `${document.fileName} was cleared out.`, variant: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not remove this file.';
      setPageError(message);
      showToast({ title: 'Could not remove file', description: message, variant: 'error' });
    } finally {
      setDeletingDocumentId(null);
    }
  }

  function promptReplacement(documentId: string) {
    setReplacingDocumentId(documentId);
    const input = globalThis.document.getElementById('replacement-file-input') as HTMLInputElement | null;
    input?.click();
  }

  function openPrimaryFilePicker() {
    const input = globalThis.document.getElementById('file-input') as HTMLInputElement | null;
    input?.click();
  }

  function openReadyDocument(documentId: string) {
    setOpeningDocumentId(documentId);
    router.push(`/session?documentId=${documentId}`);
  }

  async function removeQueueDocument(item: UploadQueueItem) {
    if (item.documentId === undefined) {
      removeQueueItem(item.id);
      return;
    }

    const matchedDocument = documents.find((document) => document.documentId === item.documentId);
    if (matchedDocument === undefined) {
      removeQueueItem(item.id);
      return;
    }

    await removeDocument(matchedDocument);
  }

  useEffect(() => {
    if (!hasPreparingDocuments && !hasActiveQueueItems) return;

    const intervalId = window.setInterval(() => {
      if (globalThis.document.visibilityState !== 'visible') return;
      void refreshDocuments(true);
    }, 8000);

    return () => window.clearInterval(intervalId);
  }, [hasPreparingDocuments, hasActiveQueueItems]);

  useEffect(() => {
    if (!hasPreparingDocuments && !hasActiveQueueItems) return;
    const intervalId = window.setInterval(() => {
      setPreparationMessageIndex((currentIndex) => (currentIndex + 1) % preparationMessages.length);
    }, 3200);
    return () => window.clearInterval(intervalId);
  }, [hasPreparingDocuments, hasActiveQueueItems]);

  if (initializing) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="flex items-center gap-3 text-cream-300">
          <LoaderCircle className="animate-spin" size={18} />
          Loading your upload space...
        </div>
      </div>
    );
  }

  if (user === null) return null;

  const readyDocuments = documents.filter((document) => document.processingStatus === 'complete');
  const preparingDocuments = documents.filter((document) => isDocumentPreparing(document.processingStatus));
  const failedDocuments = documents.filter((document) => document.processingStatus === 'failed');
  const activeQueueItems = queue.filter((item) => item.status === 'preparing' || item.status === 'uploading' || item.status === 'processing');
  const completedQueueItems = queue.filter((item) => item.status === 'complete' || item.status === 'error');
  const primaryReadyDocument = readyDocuments[0] ?? null;
  const primaryPreparingDocument = preparingDocuments[0] ?? null;

  return (
    <div className="min-h-screen bg-ink">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/3 h-96 w-96 rounded-full bg-amber-600/5 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 h-80 w-80 rounded-full bg-ai-blue-600/5 blur-3xl" />
      </div>

      <Navbar user={user} onLogout={loggingOut ? undefined : handleLogout} />

      <div className="relative mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
        <div className="max-w-3xl space-y-3">
          <Badge variant="info" size="sm">Upload</Badge>
          <h1 className="font-fraunces text-4xl font-bold text-cream-50">Upload a file</h1>
          <p className="text-lg text-cream-300">{pageSummary}</p>
        </div>

        {pageError && (
          <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300">
            <AlertCircle className="mt-0.5 flex-shrink-0" size={18} />
            <span>{pageError}</span>
          </div>
        )}

        <Card variant="gradient" className="overflow-hidden">
          <CardContent>
            <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-center">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="font-fraunces text-3xl font-semibold text-cream-50">
                    Drop it in once
                  </h2>
                  <p className="max-w-xl text-base leading-7 text-cream-300">
                    We upload it, prepare it, and keep this page updated while it works.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm text-cream-400">
                  {['PDF', 'DOCX', 'TXT', 'MP3', 'MP4', 'WebM'].map((type) => (
                    <span
                      key={type}
                      className="rounded-full border border-ink-600 bg-ink-900/40 px-3 py-1"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`rounded-2xl border-2 border-dashed p-8 transition-all duration-300 ${
                  dragActive
                    ? 'border-amber-400 bg-amber-500/10'
                    : 'border-ink-500 bg-ink-900/60 hover:border-amber-500/50'
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
                <input
                  accept="video/*,audio/*,.pdf,.txt,.doc,.docx"
                  className="hidden"
                  id="replacement-file-input"
                  onChange={(event) => void handleReplacementChange(event)}
                  type="file"
                />

                <label className="block cursor-pointer" htmlFor="file-input">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-ai-blue-500/20 text-amber-300">
                      <UploadIcon size={32} />
                    </div>
                    <h3 className="font-fraunces text-2xl font-semibold text-cream-50">
                      Drop files here
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-cream-300">
                      Or click to browse.
                    </p>
                    <div className="mt-6">
                      <span className="inline-flex rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-ink shadow-sm transition-transform group-active:scale-[0.98]">
                        Choose files
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {primaryReadyDocument !== null && (
          <Card variant="elevated">
            <CardHeader
              title="Ready to start"
              description={primaryReadyDocument.fileName}
              icon={<CheckCircle2 className="text-mastery-400" size={22} />}
            />
            <CardContent>
              <div className="flex flex-col gap-5 rounded-xl border border-ink-600 bg-ink-900/40 p-5 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 space-y-2">
                  <p className="text-sm text-cream-400">
                    {formatFileSize(primaryReadyDocument.fileSize)} • ready{' '}
                    {formatRelativeTime(primaryReadyDocument.updatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="ghost"
                    size="lg"
                    icon={<Trash2 size={18} />}
                    loading={deletingDocumentId === primaryReadyDocument.documentId}
                    loadingText="Deleting..."
                    onClick={() => void removeDocument(primaryReadyDocument)}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    icon={<ArrowRight size={18} />}
                    loading={openingDocumentId === primaryReadyDocument.documentId}
                    loadingText="Opening..."
                    onClick={() => openReadyDocument(primaryReadyDocument.documentId)}
                  >
                    Start learning
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {(primaryPreparingDocument !== null || activeQueueItems.length > 0) && (
          <Card variant="glass">
            <CardHeader
              title="Preparing now"
              description="This page keeps checking for you."
              icon={<LoaderCircle className="animate-spin text-ai-blue-300" size={22} />}
            />
            <CardContent>
              <div className="space-y-5">
                <div className="rounded-xl border border-ai-blue-500/20 bg-ai-blue-500/10 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <h3 className="font-fraunces text-2xl text-cream-50">
                        {primaryPreparingDocument?.fileName ?? activeQueueItems[0]?.file.name ?? 'Latest upload'}
                      </h3>
                      <p className="max-w-2xl text-sm leading-6 text-cream-300">
                        {primaryPreparingDocument !== null
                          ? getPreparationCopy(primaryPreparingDocument.processingStatus)
                          : getQueueMessage(activeQueueItems[0])}
                      </p>
                    </div>
                    <Badge variant="warning" size="sm">In progress</Badge>
                  </div>
                  <div className="mt-5 rounded-lg border border-ink-700/70 bg-ink-950/40 p-4">
                    <div className="flex items-center gap-3 text-sm text-cream-300">
                      <LoaderCircle className="animate-spin text-amber-300" size={16} />
                      <span>{preparationMessages[preparationMessageIndex]}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {activeQueueItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-ink-700 bg-ink-900/40 p-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ink-700 to-ink-800 text-amber-300">
                          <FileText size={22} />
                        </div>
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-1">
                              <p className="truncate text-sm font-medium text-cream-50">{item.file.name}</p>
                              <p className="text-xs text-cream-500">{formatFileSize(item.file.size)}</p>
                            </div>
                            <Badge size="sm" variant={item.status === 'processing' ? 'warning' : 'info'}>
                              {getQueueHeadline(item)}
                            </Badge>
                          </div>

                          <Progress
                            max={100}
                            size="sm"
                            value={getQueueProgressValue(item)}
                            variant="default"
                          />

                          <p className="text-sm leading-6 text-cream-300">{getQueueMessage(item)}</p>
                        </div>

                        <button
                          className="rounded-lg p-2 text-cream-400 transition-colors hover:bg-ink-700 hover:text-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                          disabled={deletingDocumentId === item.documentId}
                          onClick={() => void removeQueueDocument(item)}
                          type="button"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    icon={<RefreshCw size={16} />}
                    loading={refreshing}
                    loadingText="Checking..."
                    onClick={() => void refreshDocuments()}
                  >
                    Check progress
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {completedQueueItems.length > 0 && (
          <Card>
            <CardHeader
              title="Recent uploads"
              description="Recent results stay here briefly so nothing feels lost."
            />
            <CardContent>
              <div className="space-y-3">
                {completedQueueItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 rounded-xl border border-ink-700 bg-ink-900/40 p-4"
                  >
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-ink-800 text-cream-300">
                      {item.status === 'complete' ? (
                        <CheckCircle2 className="text-mastery-400" size={20} />
                      ) : (
                        <AlertCircle className="text-red-300" size={20} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-medium text-cream-50">{item.file.name}</p>
                      <p className="text-sm text-cream-300">{getQueueMessage(item)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.status === 'error' && (
                        <Button
                          loading={retryingQueueId === item.id}
                          loadingText="Retrying..."
                          onClick={() => void retryQueueItem(item)}
                          size="sm"
                          variant="outline"
                        >
                          Retry
                        </Button>
                      )}
                        <button
                          className="rounded-lg p-2 text-cream-400 transition-colors hover:bg-ink-700 hover:text-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                          disabled={deletingDocumentId === item.documentId}
                          onClick={() => void removeQueueDocument(item)}
                          type="button"
                        >
                          <X size={18} />
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader
            title="Your files"
            description="Ready files open immediately. Preparing files update on their own."
          />
          <CardContent>
            {documents.length === 0 ? (
              <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-6 text-cream-400">
                No files yet.
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => {
                  const isReady = doc.processingStatus === 'complete';
                  const isFailed = doc.processingStatus === 'failed';
                  const removing = deletingDocumentId === doc.documentId;
                  const replacing = replacingDocumentId === doc.documentId;
                  const opening = openingDocumentId === doc.documentId;

                  return (
                    <div
                      key={doc.documentId}
                      className="w-full rounded-xl border border-ink-700 bg-ink-900/40 p-4 transition-colors hover:bg-ink-800"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="truncate text-sm font-semibold text-cream-50">{doc.fileName}</h3>
                            <Badge size="sm" variant={getDocumentBadgeVariant(doc.processingStatus)}>
                              {formatDocumentStatus(doc.processingStatus)}
                            </Badge>
                          </div>
                          <p className="text-xs text-cream-500">
                            {formatFileSize(doc.fileSize)} • updated {formatRelativeTime(doc.updatedAt)}
                          </p>
                          <p className="text-sm leading-6 text-cream-300">
                            {getPreparationCopy(doc.processingStatus)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {isReady ? (
                            <>
                              <Button
                                icon={<Trash2 size={16} />}
                                loading={removing}
                                loadingText="Deleting..."
                                onClick={() => void removeDocument(doc)}
                                variant="ghost"
                              >
                                Delete
                              </Button>
                              <Button
                                loading={opening}
                                loadingText="Opening..."
                                onClick={() => openReadyDocument(doc.documentId)}
                                variant="primary"
                              >
                                Start lesson
                              </Button>
                            </>
                          ) : null}

                          {isFailed ? (
                            <>
                              <Button
                                loading={replacing}
                                loadingText="Replacing..."
                                onClick={() => promptReplacement(doc.documentId)}
                                variant="outline"
                              >
                                Re-upload
                              </Button>
                              <Button
                                loading={removing}
                                loadingText="Removing..."
                                onClick={() => void removeDocument(doc)}
                                variant="ghost"
                              >
                                Remove
                              </Button>
                            </>
                          ) : null}

                          {!isReady && !isFailed ? (
                            <>
                              <Button
                                icon={<Trash2 size={16} />}
                                loading={removing}
                                loadingText="Deleting..."
                                onClick={() => void removeDocument(doc)}
                                variant="ghost"
                              >
                                Delete
                              </Button>
                              <Button variant="outline" disabled>Preparing</Button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {failedDocuments.length > 0 && (
          <Card>
            <CardHeader
              title="Needs another try"
              description="Re-upload a replacement, or remove the file completely."
              icon={<AlertCircle className="text-red-300" size={22} />}
            />
            <CardContent>
              <div className="space-y-3">
                {failedDocuments.map((doc) => (
                  <div
                    key={doc.documentId}
                    className="rounded-xl border border-red-500/20 bg-red-500/5 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-medium text-cream-50">{doc.fileName}</p>
                        <p className="mt-1 text-sm text-red-200">This file did not finish preparing.</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          loading={replacingDocumentId === doc.documentId}
                          loadingText="Replacing..."
                          onClick={() => promptReplacement(doc.documentId)}
                          variant="outline"
                        >
                          Re-upload file
                        </Button>
                        <Button
                          icon={<Trash2 size={16} />}
                          loading={deletingDocumentId === doc.documentId}
                          loadingText="Removing..."
                          onClick={() => void removeDocument(doc)}
                          variant="ghost"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between text-sm text-cream-400">
          <span>
            {readyDocuments.length} ready • {preparingDocuments.length} preparing • {failedDocuments.length} need attention
          </span>
          <Button onClick={openPrimaryFilePicker} size="sm" variant="ghost">
            Upload another file
          </Button>
        </div>
      </div>
    </div>
  );
}
