import { describe, expect, it } from 'vitest';

import {
  createPdfDocumentParserAdapter,
  parsePdfDocument,
} from '../src/documents/pdf-parser.js';
import { UnrecoverableDocumentParserError } from '../src/documents/parsers.js';
import {
  createMalformedPdfFixture,
  createPdfWithBlankSecondPageFixture,
  createTutoringPdfFixture,
} from './fixtures/pdf-fixtures.js';

describe('pdf normalized extraction', () => {
  it('extracts ordered tutoring sections from a stable PDF fixture', async () => {
    const parser = createPdfDocumentParserAdapter();
    const structure = await parser.parse({
      documentId: 'doc-1',
      fileBuffer: createTutoringPdfFixture(),
      fileType: 'application/pdf',
      storageKey: 'users/user-1/uploads/upload-1/lesson.pdf',
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
        content: 'Lesson 1: Photosynthesis',
        kind: 'heading',
      },
      {
        content: 'Chlorophyll captures light energy and powers the light reactions',
        kind: 'text',
      },
      {
        content: 'ATP = ADP + Pi',
        kind: 'formula',
      },
      {
        content: 'Figure 1: Chloroplast cross-section',
        kind: 'caption',
      },
      {
        content: 'Stage\tInput\tOutput\nLight reactions\tLight\tATP\nCalvin cycle\tCO2\tGlucose',
        kind: 'table',
      },
      {
        content: 'Review',
        kind: 'heading',
      },
      {
        content: 'Photosynthesis stores solar energy in glucose.',
        kind: 'text',
      },
    ]);
    expect(structure.sections[1]?.sourceTrace.headingPath).toEqual([
      'Lesson 1: Photosynthesis',
    ]);
    expect(structure.sections[4]?.title).toBe('Figure 1: Chloroplast cross-section');
    expect(structure.sections[6]?.sourceTrace.pageNumber).toBe(2);
  });

  it('marks pages with no extractable text instead of silently dropping them', async () => {
    const structure = await parsePdfDocument(createPdfWithBlankSecondPageFixture());

    expect(structure.sections).toHaveLength(1);
    expect(structure.warnings).toEqual([
      {
        code: 'missing_extractable_text',
        message: 'No extractable text was found on this PDF page.',
        pageNumber: 2,
        sourceId: 'pdf:2:missing-text',
      },
    ]);
  });

  it('fails safely for malformed pdf input', async () => {
    await expect(
      parsePdfDocument(createMalformedPdfFixture()),
    ).rejects.toBeInstanceOf(UnrecoverableDocumentParserError);
  });
});
