import type { NormalizedDocumentStructure, NormalizedExtractionWarning } from '@ai-tutor-pwa/shared';

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

export async function processExtractionResult(
  extraction: DocumentExtractionResult,
  context: AssetPipelineContext,
): Promise<NormalizedDocumentStructure> {
  const assetDrafts: NormalizedAssetDraft[] = [];
  const warnings = [...extraction.warnings];

  for (let i = 0; i < extraction.assets.length; i++) {
    const asset = extraction.assets[i]!;
    const outcome = await processExtractedAsset(asset, i, context);

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
    const result = await context.visionClient.describeAsset(asset);
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

function buildAssetStorageKey(
  context: AssetPipelineContext,
  asset: ExtractedDocumentAsset,
  index: number,
): string {
  const extension = mimeTypeToExtension(asset.mimeType);
  return `users/${context.userId}/documents/${context.documentId}/assets/${index}.${extension}`;
}
