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
  hasDescendant,
  loadOoxmlArchive,
  nodeText,
  normalizeText,
  readRequiredArchiveXml,
  type XmlNode,
} from './ooxml.js';

const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function createDocxDocumentParserAdapter(): DocumentParserAdapter {
  return {
    name: 'docx-parser',
    extract: async (input) => extractDocxDocument(input.fileBuffer),
    parse: async (input) => parseDocxDocument(input.fileBuffer),
    supportedMimeTypes: [DOCX_MIME_TYPE],
  };
}

export async function parseDocxDocument(
  fileBuffer: Buffer,
): Promise<NormalizedDocumentStructure> {
  const { sections, warnings } = await parseDocxSectionsAndWarnings(fileBuffer);

  return finalizeNormalizedDocumentStructure({
    sections,
    warnings,
  });
}

export async function extractDocxDocument(
  fileBuffer: Buffer,
): Promise<DocumentExtractionResult> {
  const { archive, sections, warnings } = await parseDocxSectionsAndWarnings(fileBuffer);
  const assets = await extractOoxmlMediaAssets(archive, 'docx');

  return { assets, sections, warnings };
}

async function parseDocxSectionsAndWarnings(fileBuffer: Buffer) {
  const archive = await loadOoxmlArchive(fileBuffer, 'docx');
  const nodes = await readRequiredArchiveXml(archive, 'docx', 'word/document.xml');
  const body = resolveDocxBody(nodes);
  const bodyChildren = body.children.filter((child) => child.name !== '#text');
  const sections: NormalizedSectionDraft[] = [];
  const warnings: NormalizedExtractionWarning[] = [];
  let headingPath: string[] = [];
  let blockIndex = 0;

  for (let childIndex = 0; childIndex < bodyChildren.length; childIndex += 1) {
    const child = bodyChildren[childIndex]!;

    if (child.name === 'tbl') {
      const tableSection = parseDocxTable(child, headingPath, blockIndex);

      if (tableSection !== null) {
        sections.push(tableSection);
        blockIndex += 1;
      }

      continue;
    }

    if (child.name !== 'p') {
      continue;
    }

    const paragraph = parseDocxParagraph(child, headingPath, blockIndex);

    if (paragraph === null) {
      continue;
    }

    if (paragraph.kind === 'list') {
      const listItems = [paragraph];

      while (childIndex + 1 < bodyChildren.length) {
        const nextChild = bodyChildren[childIndex + 1]!;

        if (nextChild.name !== 'p') {
          break;
        }

        const nextParagraph = parseDocxParagraph(nextChild, headingPath, blockIndex + listItems.length);

        if (nextParagraph === null || nextParagraph.kind !== 'list') {
          break;
        }

        listItems.push(nextParagraph);
        childIndex += 1;
      }

      sections.push(mergeListSections(listItems, headingPath));
      blockIndex += listItems.length;
      continue;
    }

    sections.push(paragraph);

    if (paragraph.kind === 'heading') {
      headingPath = [paragraph.content];
    }

    blockIndex += 1;
  }

  if (sections.length === 0) {
    warnings.push(
      createMissingExtractableTextWarning({
        format: 'docx',
        message: 'No extractable text was found in this DOCX document.',
        sourceId: 'docx:document:empty',
      }),
    );
  }

  return { archive, sections, warnings };
}

function resolveDocxBody(nodes: readonly XmlNode[]): XmlNode {
  const documentNode = firstNode(nodes, 'document');
  const body = documentNode === null ? null : firstChild(documentNode, 'body');

  if (body === null) {
    throw new Error('Missing DOCX body');
  }

  return body;
}

function parseDocxParagraph(
  paragraph: XmlNode,
  headingPath: readonly string[],
  blockIndex: number,
): NormalizedSectionDraft | null {
  const content = normalizeText(nodeText(paragraph));

  if (content === '') {
    return null;
  }

  const properties = firstChild(paragraph, 'pPr');
  const style = resolveParagraphStyle(properties);
  const isHeading = style.startsWith('Heading') || style === 'Title';
  const isList = properties !== null && firstChild(properties, 'numPr') !== null;
  const kind = resolveTextSectionKind({
    isExplicitCaption: style === 'Caption',
    isExplicitFormula: hasDescendant(paragraph, 'oMath'),
    isExplicitHeading: isHeading,
    isExplicitList: isList,
    text: content,
  });
  const effectiveHeadingPath = kind === 'heading' ? [content] : [...headingPath];

  return {
    content,
    kind,
    sourceTrace: {
      format: 'docx',
      headingPath: effectiveHeadingPath,
      order: 0,
      sourceId: `docx:block:${blockIndex}`,
      startOffset: blockIndex,
    },
    ...(kind === 'heading' || kind === 'caption' ? { title: content } : {}),
  };
}

function parseDocxTable(
  table: XmlNode,
  headingPath: readonly string[],
  blockIndex: number,
): NormalizedSectionDraft | null {
  const rows = childrenNamed(table, 'tr')
    .map((row) =>
      childrenNamed(row, 'tc').map((cell) => normalizeText(nodeText(cell))),
    )
    .filter((row) => row.some((cell) => cell !== ''));

  if (rows.length === 0) {
    return null;
  }

  return {
    content: rows.map((row) => row.join('\t')).join('\n'),
    kind: 'table',
    sourceTrace: {
      format: 'docx',
      headingPath: [...headingPath],
      order: 0,
      sourceId: `docx:block:${blockIndex}`,
      startOffset: blockIndex,
    },
  };
}

function resolveParagraphStyle(properties: XmlNode | null): string {
  if (properties === null) {
    return '';
  }

  return firstChild(properties, 'pStyle')?.attributes.val ?? '';
}

function mergeListSections(
  listItems: readonly NormalizedSectionDraft[],
  headingPath: readonly string[],
): NormalizedSectionDraft {
  return {
    content: listItems.map((item) => item.content).join('\n'),
    kind: 'list',
    sourceTrace: {
      format: 'docx',
      headingPath: [...headingPath],
      order: 0,
      sourceId: listItems[0]!.sourceTrace.sourceId ?? 'docx:list',
      startOffset: listItems[0]!.sourceTrace.startOffset,
    },
  };
}
