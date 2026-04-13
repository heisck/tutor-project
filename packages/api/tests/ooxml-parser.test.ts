import { describe, expect, it } from 'vitest';

import {
  createDocxDocumentParserAdapter,
  parseDocxDocument,
} from '../src/documents/docx-parser.js';
import {
  createPptxDocumentParserAdapter,
  parsePptxDocument,
} from '../src/documents/pptx-parser.js';
import { UnrecoverableDocumentParserError } from '../src/documents/parsers.js';
import {
  createDocxFixture,
  createMalformedDocxFixture,
  createMalformedPptxFixture,
  createPptxFixture,
} from './fixtures/ooxml-fixtures.js';

describe('ooxml normalized extraction', () => {
  it('extracts docx content into the shared normalized structure', async () => {
    const parser = createDocxDocumentParserAdapter();
    const structure = await parser.parse({
      documentId: 'docx-1',
      fileBuffer: await createDocxFixture(),
      fileType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      storageKey: 'users/user-1/uploads/upload-1/notes.docx',
      userId: 'user-1',
    });

    expect(structure.assets).toEqual([]);
    expect(structure.warnings).toEqual([]);
    expect(
      structure.sections.map((section) => ({
        content: section.content,
        kind: section.kind,
      })),
    ).toEqual([
      {
        content: 'Cell Respiration',
        kind: 'heading',
      },
      {
        content: 'Glucose is oxidized to release energy.',
        kind: 'text',
      },
      {
        content: 'Step 1: Glycolysis\nStep 2: Krebs cycle',
        kind: 'list',
      },
      {
        content: 'Phase\tOutput\nGlycolysis\tPyruvate',
        kind: 'table',
      },
    ]);
    expect(structure.sections[1]?.sourceTrace.headingPath).toEqual([
      'Cell Respiration',
    ]);
  });

  it('extracts pptx slides into the shared normalized structure', async () => {
    const parser = createPptxDocumentParserAdapter();
    const structure = await parser.parse({
      documentId: 'pptx-1',
      fileBuffer: await createPptxFixture(),
      fileType:
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      storageKey: 'users/user-1/uploads/upload-1/lecture.pptx',
      userId: 'user-1',
    });

    expect(structure.warnings).toEqual([]);
    expect(
      structure.sections.map((section) => ({
        content: section.content,
        kind: section.kind,
      })),
    ).toEqual([
      {
        content: "Newton's Laws",
        kind: 'heading',
      },
      {
        content: 'A force causes acceleration.',
        kind: 'text',
      },
      {
        content: 'First law\nSecond law',
        kind: 'list',
      },
      {
        content: 'Law\tMeaning\nThird\tEqual reaction',
        kind: 'table',
      },
      {
        content: 'Summary',
        kind: 'heading',
      },
      {
        content: 'Balanced forces produce no acceleration.',
        kind: 'text',
      },
    ]);
    expect(structure.sections[5]?.sourceTrace.slideNumber).toBe(2);
  });

  it('fails safely for malformed docx archives', async () => {
    await expect(
      parseDocxDocument(await createMalformedDocxFixture()),
    ).rejects.toBeInstanceOf(UnrecoverableDocumentParserError);
  });

  it('fails safely for malformed pptx archives', async () => {
    await expect(
      parsePptxDocument(await createMalformedPptxFixture()),
    ).rejects.toBeInstanceOf(UnrecoverableDocumentParserError);
  });
});
