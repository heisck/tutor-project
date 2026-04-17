import { createHash } from 'node:crypto';

import type { NormalizedDocumentStructure, NormalizedExtractionWarning } from '@ai-tutor-pwa/shared';

import { mapWithConcurrency } from '../lib/concurrency.js';
import type { UploadStorageClient } from '../upload/storage/r2.js';
import { mimeTypeToExtension, type ExtractedDocumentAsset, type DocumentExtractionResult } from './asset-extraction.js';
import type { NormalizedAssetDraft } from './normalized-structure.js';
import { finalizeNormalizedDocumentStructure } from './normalized-structure.js';
import type { VisionDescriptionClient } from './vision-client.js';

export interface AssetPipelineContext {
  documentId: string;
  storageClient: UploadStorageClient;
  userId: string;
  visionClient: VisionDescriptionClient | null;
}

interface AssetProcessingOutcome {
  draft: NormalizedAssetDraft | null;
  warning: NormalizedExtractionWarning | null;
}

const ASSET_PROCESSING_CONCURRENCY = 1;

export async function processExtractionResult(
  extraction: DocumentExtractionResult,
  context: AssetPipelineContext,
): Promise<NormalizedDocumentStructure> {
  const warnings = [...extraction.warnings];

  // Per-document vision cache — identical image bytes get one vision call, reused for every occurrence.
  const descriptionCache = new Map<string, Promise<string | null>>();

  const outcomes = await mapWithConcurrency(
    extraction.assets,
    ASSET_PROCESSING_CONCURRENCY,
    (asset, index) => processExtractedAsset(asset, index, context, descriptionCache),
  );

  const assetDrafts: NormalizedAssetDraft[] = [];
  for (const outcome of outcomes) {
    if (outcome.draft !== null) {
      assetDrafts.push(outcome.draft);
    }
    if (outcome.warning !== null) {
      warnings.push(outcome.warning);
    }
  }

  return finalizeNormalizedDocumentStructure({
    assets: assetDrafts,
    sections: extraction.sections,
    warnings,
  });
}

async function processExtractedAsset(
  asset: ExtractedDocumentAsset,
  index: number,
  context: AssetPipelineContext,
  descriptionCache: Map<string, Promise<string | null>>,
): Promise<AssetProcessingOutcome> {
  const storageKey = buildAssetStorageKey(context, asset, index);

  try {
    await context.storageClient.putObject({
      body: asset.buffer,
      contentLength: asset.buffer.length,
      contentType: asset.mimeType,
      key: storageKey,
      metadata: {
        documentId: context.documentId,
        userId: context.userId,
      },
    });
  } catch {
    return {
      draft: null,
      warning: {
        code: 'asset_storage_failed',
        message: `Failed to store asset ${asset.sourceTrace.sourceId ?? index} to storage.`,
        sourceId: asset.sourceTrace.sourceId,
      },
    };
  }

  let description: string | undefined;

  if (context.visionClient !== null) {
    const result = await describeWithCache(asset, context.visionClient, descriptionCache);
    description = result ?? undefined;
  }

  return {
    draft: {
      ...(description !== undefined ? { description } : {}),
      ...(asset.height !== undefined ? { height: asset.height } : {}),
      kind: asset.kind,
      mimeType: asset.mimeType,
      ...(asset.sectionOrdinal !== undefined ? { sectionOrdinal: asset.sectionOrdinal } : {}),
      sourceTrace: {
        ...asset.sourceTrace,
        order: 0,
      },
      storageKey,
      ...(asset.title !== undefined ? { title: asset.title } : {}),
      ...(asset.width !== undefined ? { width: asset.width } : {}),
    },
    warning: null,
  };
}

async function describeWithCache(
  asset: ExtractedDocumentAsset,
  visionClient: VisionDescriptionClient,
  cache: Map<string, Promise<string | null>>,
): Promise<string | null> {
  const hash = createHash('sha256').update(asset.buffer).digest('hex');
  const cached = cache.get(hash);
  if (cached !== undefined) {
    return cached;
  }

  const promise = visionClient.describeAsset(asset);
  cache.set(hash, promise);
  return promise;
}

function buildAssetStorageKey(
  context: AssetPipelineContext,
  asset: ExtractedDocumentAsset,
  index: number,
): string {
  const extension = mimeTypeToExtension(asset.mimeType);
  return `users/${context.userId}/documents/${context.documentId}/assets/${index}.${extension}`;
}
