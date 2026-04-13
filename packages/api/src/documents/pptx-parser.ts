import type {
  NormalizedDocumentStructure,
  NormalizedExtractionWarning,
} from '@ai-tutor-pwa/shared';

import type { DocumentExtractionResult } from './asset-extraction.js';
import type { DocumentParserAdapter } from './parsers.js';
import {
  createMissingExtractableTextWarning,
  finalizeNormalizedDocumentStructure,
  resolveTextSectionKind,
  type NormalizedSectionDraft,
} from './normalized-structure.js';
import {
  childrenNamed,
  extractOoxmlMediaAssets,
  firstChild,
  firstNode,
  loadOoxmlArchive,
  nodeText,
  normalizeText,
  readArchiveXmlEntries,
  type XmlNode,
} from './ooxml.js';

const PPTX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export function createPptxDocumentParserAdapter(): DocumentParserAdapter {
  return {
    name: 'pptx-parser',
    extract: async (input) => extractPptxDocument(input.fileBuffer),
    parse: async (input) => parsePptxDocument(input.fileBuffer),
    supportedMimeTypes: [PPTX_MIME_TYPE],
  };
}

export async function parsePptxDocument(
  fileBuffer: Buffer,
): Promise<NormalizedDocumentStructure> {
  const { sections, warnings } = await parsePptxSectionsAndWarnings(fileBuffer);

  return finalizeNormalizedDocumentStructure({
    sections,
    warnings,
  });
}

export async function extractPptxDocument(
  fileBuffer: Buffer,
): Promise<DocumentExtractionResult> {
  const { archive, sections, warnings } = await parsePptxSectionsAndWarnings(fileBuffer);
  const assets = await extractOoxmlMediaAssets(archive, 'pptx');

  return { assets, sections, warnings };
}

async function parsePptxSectionsAndWarnings(fileBuffer: Buffer) {
  const archive = await loadOoxmlArchive(fileBuffer, 'pptx');
  const slideEntries = await readArchiveXmlEntries(
    archive,
    'pptx',
    /^ppt\/slides\/slide\d+\.xml$/,
  );
  const sections: NormalizedSectionDraft[] = [];
  const warnings: NormalizedExtractionWarning[] = [];

  for (let slideIndex = 0; slideIndex < slideEntries.length; slideIndex += 1) {
    const slideNumber = slideIndex + 1;
    const slideSections = parsePptxSlide(slideEntries[slideIndex]!.nodes, slideNumber);

    if (slideSections.length === 0) {
      warnings.push(
        createMissingExtractableTextWarning({
          format: 'pptx',
          message: 'No extractable text was found on this slide.',
          sourceId: `pptx:slide:${slideNumber}:empty`,
          slideNumber,
        }),
      );
      continue;
    }

    sections.push(...slideSections);
  }

  return { archive, sections, warnings };
}

function parsePptxSlide(
  nodes: readonly XmlNode[],
  slideNumber: number,
): readonly NormalizedSectionDraft[] {
  const spTree = resolveSlideTree(nodes);
  const sections: NormalizedSectionDraft[] = [];
  let headingPath: string[] = [];
  let shapeIndex = 0;

  for (const child of spTree.children) {
    if (child.name === 'sp') {
      const shapeSections = parseTextShape(child, slideNumber, shapeIndex, headingPath);

      for (const section of shapeSections) {
        sections.push(section);

        if (section.kind === 'heading') {
          headingPath = [section.content];
        }
      }

      shapeIndex += 1;
      continue;
    }

    if (child.name === 'graphicFrame') {
      const tableSection = parseSlideTable(child, slideNumber, shapeIndex, headingPath);

      if (tableSection !== null) {
        sections.push(tableSection);
      }

      shapeIndex += 1;
    }
  }

  return sections;
}

function resolveSlideTree(nodes: readonly XmlNode[]): XmlNode {
  const slide = firstNode(nodes, 'sld');
  const commonSlideData = slide === null ? null : firstChild(slide, 'cSld');
  const spTree = commonSlideData === null ? null : firstChild(commonSlideData, 'spTree');

  if (spTree === null) {
    throw new Error('Missing PPTX slide tree');
  }

  return spTree;
}

function parseTextShape(
  shape: XmlNode,
  slideNumber: number,
  shapeIndex: number,
  headingPath: readonly string[],
): readonly NormalizedSectionDraft[] {
  const textBody = firstChild(shape, 'txBody');

  if (textBody === null) {
    return [];
  }

  const isTitleShape = resolveShapePlaceholderType(shape);
  const paragraphs = childrenNamed(textBody, 'p');
  const sections: NormalizedSectionDraft[] = [];
  let paragraphIndex = 0;

  while (paragraphIndex < paragraphs.length) {
    const paragraph = paragraphs[paragraphIndex]!;
    const content = normalizeText(nodeText(paragraph));

    if (content === '') {
      paragraphIndex += 1;
      continue;
    }

    const paragraphProperties = firstChild(paragraph, 'pPr');
    const isList = paragraphProperties?.attributes.lvl !== undefined;
    const kind = resolveTextSectionKind({
      isExplicitHeading: isTitleShape,
      isExplicitList: isList,
      text: content,
    });
    const effectiveHeadingPath = kind === 'heading' ? [content] : [...headingPath];

    if (kind === 'list') {
      const listItems = [content];
      let nextParagraphIndex = paragraphIndex + 1;

      while (nextParagraphIndex < paragraphs.length) {
        const nextParagraph = paragraphs[nextParagraphIndex]!;
        const nextParagraphProperties = firstChild(nextParagraph, 'pPr');
        const nextIsList = nextParagraphProperties?.attributes.lvl !== undefined;
        const nextContent = normalizeText(nodeText(nextParagraph));

        if (!nextIsList || nextContent === '') {
          break;
        }

        listItems.push(nextContent);
        nextParagraphIndex += 1;
      }

      sections.push({
        content: listItems.join('\n'),
        kind,
        sourceTrace: {
          format: 'pptx',
          headingPath: [...headingPath],
          order: 0,
          slideNumber,
          sourceId: `pptx:slide:${slideNumber}:shape:${shapeIndex}:paragraph:${paragraphIndex}`,
        },
      });
      paragraphIndex = nextParagraphIndex;
      continue;
    }

    sections.push({
      content,
      kind,
      sourceTrace: {
        format: 'pptx',
        headingPath: effectiveHeadingPath,
        order: 0,
        slideNumber,
        sourceId: `pptx:slide:${slideNumber}:shape:${shapeIndex}:paragraph:${paragraphIndex}`,
      },
      ...(kind === 'heading' || kind === 'caption' ? { title: content } : {}),
    });
    paragraphIndex += 1;
  }

  return sections;
}

function parseSlideTable(
  graphicFrame: XmlNode,
  slideNumber: number,
  shapeIndex: number,
  headingPath: readonly string[],
): NormalizedSectionDraft | null {
  const graphic = firstChild(graphicFrame, 'graphic');
  const graphicData = graphic === null ? null : firstChild(graphic, 'graphicData');
  const table = graphicData === null ? null : firstChild(graphicData, 'tbl');

  if (table === null) {
    return null;
  }

  const rows = childrenNamed(table, 'tr')
    .map((row) =>
      childrenNamed(row, 'tc')
        .map((cell) => normalizeText(nodeText(cell)))
        .filter((cell) => cell !== ''),
    )
    .filter((row) => row.length > 0);

  if (rows.length === 0) {
    return null;
  }

  return {
    content: rows.map((row) => row.join('\t')).join('\n'),
    kind: 'table',
    sourceTrace: {
      format: 'pptx',
      headingPath: [...headingPath],
      order: 0,
      slideNumber,
      sourceId: `pptx:slide:${slideNumber}:shape:${shapeIndex}:table`,
    },
  };
}

function resolveShapePlaceholderType(shape: XmlNode): boolean {
  const nonVisualShape = firstChild(shape, 'nvSpPr');
  const nonVisualProperties = nonVisualShape === null ? null : firstChild(nonVisualShape, 'nvPr');
  const placeholder = nonVisualProperties === null ? null : firstChild(nonVisualProperties, 'ph');
  const placeholderType = placeholder?.attributes.type;

  return placeholderType === 'title' || placeholderType === 'ctrTitle';
}
