import { describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';

import { extractPptxDocument } from '../src/documents/pptx-parser.js';
import { extractDocxDocument } from '../src/documents/docx-parser.js';
import { processExtractionResult, type AssetPipelineContext } from '../src/documents/asset-pipeline.js';
import type { VisionDescriptionClient } from '../src/documents/vision-client.js';
import type { UploadStorageClient } from '../src/upload/storage/r2.js';
import type { DocumentExtractionResult } from '../src/documents/asset-extraction.js';

function createOnePxPng(): Buffer {
  // Minimal valid 1x1 PNG
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
}

async function createPptxWithImage(): Promise<Buffer> {
  const archive = new JSZip();
  archive.file(
    'ppt/slides/slide1.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <p:cSld>
        <p:spTree>
          <p:nvGrpSpPr />
          <p:grpSpPr />
          <p:sp>
            <p:nvSpPr>
              <p:nvPr><p:ph type="title" /></p:nvPr>
            </p:nvSpPr>
            <p:txBody>
              <a:p><a:r><a:t>Slide with Image</a:t></a:r></a:p>
            </p:txBody>
          </p:sp>
        </p:spTree>
      </p:cSld>
    </p:sld>`,
  );
  archive.file('ppt/media/image1.png', createOnePxPng());
  archive.file('ppt/media/image2.jpeg', createOnePxPng());
  return archive.generateAsync({ type: 'nodebuffer' });
}

async function createDocxWithImage(): Promise<Buffer> {
  const archive = new JSZip();
  archive.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p>
          <w:pPr><w:pStyle w:val="Heading1" /></w:pPr>
          <w:r><w:t>Document with Image</w:t></w:r>
        </w:p>
      </w:body>
    </w:document>`,
  );
  archive.file('word/media/image1.png', createOnePxPng());
  return archive.generateAsync({ type: 'nodebuffer' });
}

async function createPptxWithNoImages(): Promise<Buffer> {
  const archive = new JSZip();
  archive.file(
    'ppt/slides/slide1.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <p:cSld>
        <p:spTree>
          <p:nvGrpSpPr />
          <p:grpSpPr />
          <p:sp>
            <p:txBody>
              <a:p><a:r><a:t>Text only</a:t></a:r></a:p>
            </p:txBody>
          </p:sp>
        </p:spTree>
      </p:cSld>
    </p:sld>`,
  );
  return archive.generateAsync({ type: 'nodebuffer' });
}

function createMockStorageClient(): UploadStorageClient {
  return {
    putObject: vi.fn().mockResolvedValue({ bucket: 'test', key: 'test-key' }),
  };
}

function createMockVisionClient(description: string | null = 'A diagram showing cellular respiration.'): VisionDescriptionClient {
  return {
    describeAsset: vi.fn().mockResolvedValue(description),
  };
}

function createFailingVisionClient(): VisionDescriptionClient {
  return {
    describeAsset: vi.fn().mockResolvedValue(null),
  };
}

function createFailingStorageClient(): UploadStorageClient {
  return {
    putObject: vi.fn().mockRejectedValue(new Error('Storage unavailable')),
  };
}

describe('asset extraction from OOXML', () => {
  it('extracts images from PPTX media folder', async () => {
    const result = await extractPptxDocument(await createPptxWithImage());

    expect(result.assets).toHaveLength(2);
    expect(result.assets[0]!.mimeType).toBe('image/png');
    expect(result.assets[0]!.kind).toBe('image');
    expect(result.assets[0]!.buffer).toBeInstanceOf(Buffer);
    expect(result.assets[0]!.buffer.length).toBeGreaterThan(0);
    expect(result.assets[1]!.mimeType).toBe('image/jpeg');
  });

  it('extracts images from DOCX media folder', async () => {
    const result = await extractDocxDocument(await createDocxWithImage());

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]!.mimeType).toBe('image/png');
    expect(result.assets[0]!.sourceTrace.format).toBe('docx');
  });

  it('returns empty assets when no images exist', async () => {
    const result = await extractPptxDocument(await createPptxWithNoImages());

    expect(result.assets).toEqual([]);
    expect(result.sections.length).toBeGreaterThan(0);
  });

  it('preserves sections alongside extracted assets', async () => {
    const result = await extractPptxDocument(await createPptxWithImage());

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]!.content).toBe('Slide with Image');
    expect(result.assets).toHaveLength(2);
  });

  it('sets sourceTrace format and sourceId on extracted assets', async () => {
    const result = await extractPptxDocument(await createPptxWithImage());
    const asset = result.assets[0]!;

    expect(asset.sourceTrace.format).toBe('pptx');
    expect(asset.sourceTrace.sourceId).toMatch(/^pptx:media:/);
  });
});

describe('asset processing pipeline', () => {
  function createContext(overrides: Partial<AssetPipelineContext> = {}): AssetPipelineContext {
    return {
      documentId: 'doc-1',
      storageClient: createMockStorageClient(),
      userId: 'user-1',
      visionClient: createMockVisionClient(),
      ...overrides,
    };
  }

  function createExtractionWithAssets(): DocumentExtractionResult {
    return {
      assets: [
        {
          buffer: createOnePxPng(),
          kind: 'image',
          mimeType: 'image/png',
          sourceTrace: {
            format: 'pptx',
            headingPath: [],
            sourceId: 'pptx:media:ppt/media/image1.png',
          },
        },
      ],
      sections: [
        {
          content: 'Test slide',
          kind: 'text',
          sourceTrace: {
            format: 'pptx',
            headingPath: [],
            order: 0,
            slideNumber: 1,
            sourceId: 'pptx:slide:1:shape:0:paragraph:0',
          },
        },
      ],
      warnings: [],
    };
  }

  it('stores assets to R2 and produces normalized structure with descriptions', async () => {
    const storageClient = createMockStorageClient();
    const visionClient = createMockVisionClient('A cell diagram showing mitosis.');
    const context = createContext({ storageClient, visionClient });
    const extraction = createExtractionWithAssets();

    const structure = await processExtractionResult(extraction, context);

    expect(structure.assets).toHaveLength(1);
    expect(structure.assets[0]!.storageKey).toMatch(/^users\/user-1\/documents\/doc-1\/assets\//);
    expect(structure.assets[0]!.description).toBe('A cell diagram showing mitosis.');
    expect(structure.assets[0]!.kind).toBe('image');
    expect(structure.assets[0]!.mimeType).toBe('image/png');
    expect(storageClient.putObject).toHaveBeenCalledOnce();
    expect(visionClient.describeAsset).toHaveBeenCalledOnce();
  });

  it('produces assets without descriptions when vision client is null', async () => {
    const context = createContext({ visionClient: null });
    const extraction = createExtractionWithAssets();

    const structure = await processExtractionResult(extraction, context);

    expect(structure.assets).toHaveLength(1);
    expect(structure.assets[0]!.description).toBeUndefined();
  });

  it('produces assets without descriptions when vision fails', async () => {
    const context = createContext({ visionClient: createFailingVisionClient() });
    const extraction = createExtractionWithAssets();

    const structure = await processExtractionResult(extraction, context);

    expect(structure.assets).toHaveLength(1);
    expect(structure.assets[0]!.description).toBeUndefined();
  });

  it('skips assets when storage upload fails', async () => {
    const context = createContext({ storageClient: createFailingStorageClient() });
    const extraction = createExtractionWithAssets();

    const structure = await processExtractionResult(extraction, context);

    expect(structure.assets).toEqual([]);
    expect(structure.sections).toHaveLength(1);
  });

  it('preserves sections and warnings in the finalized structure', async () => {
    const context = createContext();
    const extraction: DocumentExtractionResult = {
      assets: [],
      sections: [
        {
          content: 'Hello',
          kind: 'text',
          sourceTrace: { format: 'docx', headingPath: [], order: 0, sourceId: 'docx:block:0' },
        },
      ],
      warnings: [
        { code: 'missing_extractable_text', message: 'No text found', sourceId: 'docx:page:1' },
      ],
    };

    const structure = await processExtractionResult(extraction, context);

    expect(structure.sections).toHaveLength(1);
    expect(structure.warnings).toHaveLength(1);
    expect(structure.assets).toEqual([]);
  });

  it('assigns correct ordinals to multiple assets', async () => {
    const context = createContext();
    const extraction: DocumentExtractionResult = {
      assets: [
        {
          buffer: createOnePxPng(),
          kind: 'image',
          mimeType: 'image/png',
          sourceTrace: { format: 'pptx', headingPath: [], sourceId: 'pptx:media:a.png' },
        },
        {
          buffer: createOnePxPng(),
          kind: 'image',
          mimeType: 'image/jpeg',
          sourceTrace: { format: 'pptx', headingPath: [], sourceId: 'pptx:media:b.jpeg' },
        },
      ],
      sections: [],
      warnings: [],
    };

    const structure = await processExtractionResult(extraction, context);

    expect(structure.assets).toHaveLength(2);
    expect(structure.assets[0]!.ordinal).toBe(0);
    expect(structure.assets[1]!.ordinal).toBe(1);
  });
});
