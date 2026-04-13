import type { UploadStorageClient } from '../upload/storage/r2.js';
import type { ExtractedDocumentAsset, DocumentExtractionResult } from './asset-extraction.js';
import type { NormalizedAssetDraft } from './normalized-structure.js';
import { finalizeNormalizedDocumentStructure } from './normalized-structure.js';
import type { NormalizedDocumentStructure } from '@ai-tutor-pwa/shared';
import type { VisionDescriptionClient } from './vision-client.js';

export interface AssetPipelineContext {
  documentId: string;
  storageClient: UploadStorageClient;
  userId: string;
  visionClient: VisionDescriptionClient | null;
}

export async function processExtractionResult(
  extraction: DocumentExtractionResult,
  context: AssetPipelineContext,
): Promise<NormalizedDocumentStructure> {
  const assetDrafts: NormalizedAssetDraft[] = [];

  for (let i = 0; i < extraction.assets.length; i++) {
    const asset = extraction.assets[i]!;
    const draft = await processExtractedAsset(asset, i, context);

    if (draft !== null) {
      assetDrafts.push(draft);
    }
  }

  return finalizeNormalizedDocumentStructure({
    assets: assetDrafts,
    sections: extraction.sections,
    warnings: extraction.warnings,
  });
}

async function processExtractedAsset(
  asset: ExtractedDocumentAsset,
  index: number,
  context: AssetPipelineContext,
): Promise<NormalizedAssetDraft | null> {
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
    return null;
  }

  let description: string | undefined;

  if (context.visionClient !== null) {
    const result = await context.visionClient.describeAsset(asset);
    description = result ?? undefined;
  }

  return {
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
  };
}

function buildAssetStorageKey(
  context: AssetPipelineContext,
  asset: ExtractedDocumentAsset,
  index: number,
): string {
  const extension = asset.mimeType.split('/')[1] ?? 'bin';
  return `users/${context.userId}/documents/${context.documentId}/assets/${index}.${extension}`;
}
