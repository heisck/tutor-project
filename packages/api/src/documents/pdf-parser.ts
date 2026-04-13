import {
  type DocumentSectionKind,
  type NormalizedDocumentStructure,
  type NormalizedExtractionWarning,
  type SourceBoundingBox,
} from '@ai-tutor-pwa/shared';
import {
  definePDFJSModule,
  extractTextItems,
  type StructuredTextItem,
} from 'unpdf';

import {
  type DocumentParserAdapter,
  UnrecoverableDocumentParserError,
} from './parsers.js';
import {
  createMissingExtractableTextWarning,
  finalizeNormalizedDocumentStructure,
  isCaptionLikeText,
  isFormulaLikeText,
  isListLikeText,
  type NormalizedSectionDraft,
} from './normalized-structure.js';

const PDF_MIME_TYPE = 'application/pdf';
let pdfJsModuleConfigured: Promise<void> | null = null;

declare global {
  interface PromiseConstructor {
    try?<TResult>(
      callback: () => TResult | PromiseLike<TResult>,
    ): Promise<TResult>;
  }
}

interface PdfLine {
  boundingBox: SourceBoundingBox;
  cells: readonly PdfLineCell[];
  fontSize: number;
  pageNumber: number;
  sourceId: string;
  text: string;
  y: number;
}

interface PdfLineCell {
  text: string;
  x: number;
}

interface PdfTableGroup {
  endIndex: number;
  lines: readonly PdfLine[];
  title?: string;
}

ensurePromiseTryPolyfill();

export function createPdfDocumentParserAdapter(): DocumentParserAdapter {
  return {
    name: 'pdf-parser',
    parse: async (input) => parsePdfDocument(input.fileBuffer),
    supportedMimeTypes: [PDF_MIME_TYPE],
  };
}

export async function parsePdfDocument(
  fileBuffer: Buffer,
): Promise<NormalizedDocumentStructure> {
  const extractedTextItems = await loadPdfTextItems(fileBuffer);
  const sections: NormalizedSectionDraft[] = [];
  const warnings: NormalizedExtractionWarning[] = [];
  let headingPath: string[] = [];

  for (let pageIndex = 0; pageIndex < extractedTextItems.items.length; pageIndex += 1) {
    const pageNumber = pageIndex + 1;
    const lines = groupItemsIntoLines(extractedTextItems.items[pageIndex] ?? [], pageNumber);

    if (lines.length === 0) {
      warnings.push(createMissingTextWarning(pageNumber));
      continue;
    }

    const pageResult = buildPageSections(lines, headingPath);
    sections.push(...pageResult.sections);
    warnings.push(...pageResult.warnings);
    headingPath = pageResult.headingPath;
  }

  return finalizeNormalizedDocumentStructure({
    sections,
    warnings,
  });
}

async function loadPdfTextItems(
  fileBuffer: Buffer,
): Promise<Awaited<ReturnType<typeof extractTextItems>>> {
  try {
    await ensurePdfJsModuleConfigured();
    return await extractTextItems(new Uint8Array(fileBuffer));
  } catch (error) {
    throw new UnrecoverableDocumentParserError(
      'Malformed PDF document',
      error instanceof Error ? { cause: error } : undefined,
    );
  }
}

function buildPageSections(
  lines: readonly PdfLine[],
  initialHeadingPath: readonly string[],
): {
  headingPath: string[];
  sections: NormalizedSectionDraft[];
  warnings: NormalizedExtractionWarning[];
} {
  const medianFontSize = calculateMedianFontSize(lines);
  const tableGroups = detectTableGroups(lines);
  const sections: NormalizedSectionDraft[] = [];
  const warnings = [...tableGroups.warnings];
  let headingPath = [...initialHeadingPath];
  let lineIndex = 0;

  while (lineIndex < lines.length) {
    const tableGroup = tableGroups.groups.get(lineIndex);

    if (tableGroup !== undefined) {
      sections.push(buildTableSection(tableGroup, headingPath));
      lineIndex = tableGroup.endIndex + 1;
      continue;
    }

    const line = lines[lineIndex];
    if (line === undefined) {
      break;
    }
    const lineKind = classifyLineKind(line, medianFontSize);
    warnings.push(...buildConfidenceWarnings(line, lineKind));

    if (lineKind === 'heading') {
      headingPath = [line.text];
      sections.push(createLineSection(line, lineKind, headingPath));
      lineIndex += 1;
      continue;
    }

    if (lineKind === 'text' || lineKind === 'list') {
      const mergedLines = collectMergeableLines(lines, lineIndex, lineKind, tableGroups.groups);
      sections.push(createMergedLineSection(mergedLines, lineKind, headingPath));
      lineIndex += mergedLines.length;
      continue;
    }

    sections.push(createLineSection(line, lineKind, headingPath));
    lineIndex += 1;
  }

  return {
    headingPath,
    sections,
    warnings,
  };
}

function detectTableGroups(lines: readonly PdfLine[]): {
  groups: Map<number, PdfTableGroup>;
  warnings: NormalizedExtractionWarning[];
} {
  const groups = new Map<number, PdfTableGroup>();
  const warnings: NormalizedExtractionWarning[] = [];
  let lineIndex = 0;

  while (lineIndex < lines.length) {
    const group = collectTableGroup(lines, lineIndex);

    if (group === null) {
      lineIndex += 1;
      continue;
    }

    if (group.lines.length < 2) {
      const line = lines[lineIndex];

      if (line !== undefined) {
        warnings.push(
          createWarning(
            'low_confidence_table',
            line,
            'Tabular layout was detected but could not be grouped confidently.',
          ),
        );
      }

      lineIndex += 1;
      continue;
    }

    groups.set(lineIndex, group);
    lineIndex = group.endIndex + 1;
  }

  return {
    groups,
    warnings,
  };
}

function collectTableGroup(
  lines: readonly PdfLine[],
  startIndex: number,
): PdfTableGroup | null {
  const firstLine = lines[startIndex];

  if (firstLine === undefined || !looksLikeTableLine(firstLine)) {
    return null;
  }

  const groupedLines = [firstLine];
  let lineIndex = startIndex + 1;

  while (lineIndex < lines.length) {
    const nextLine = lines[lineIndex];

    if (nextLine === undefined || !looksLikeTableLine(nextLine)) {
      break;
    }

    if (!columnsAreAligned(groupedLines[0]!, nextLine)) {
      break;
    }

    groupedLines.push(nextLine);
    lineIndex += 1;
  }

  return {
    endIndex: startIndex + groupedLines.length - 1,
    lines: groupedLines,
    ...(resolveTableTitle(lines, startIndex) === undefined
      ? {}
      : { title: resolveTableTitle(lines, startIndex)! }),
  };
}

function looksLikeTableLine(line: PdfLine): boolean {
  return line.cells.length >= 3 && !isCaptionLikeText(line.text);
}

function columnsAreAligned(referenceLine: PdfLine, candidateLine: PdfLine): boolean {
  if (referenceLine.cells.length !== candidateLine.cells.length) {
    return false;
  }

  return referenceLine.cells.every((cell, index) => {
    const candidateCell = candidateLine.cells[index];
    return candidateCell !== undefined && Math.abs(cell.x - candidateCell.x) <= 28;
  });
}

function resolveTableTitle(
  lines: readonly PdfLine[],
  startIndex: number,
): string | undefined {
  const previousLine = lines[startIndex - 1];
  return previousLine !== undefined && isCaptionLikeText(previousLine.text)
    ? previousLine.text
    : undefined;
}

function classifyLineKind(
  line: PdfLine,
  medianFontSize: number,
): DocumentSectionKind {
  if (isCaptionLikeText(line.text)) {
    return 'caption';
  }

  if (looksLikeFormula(line.text)) {
    return 'formula';
  }

  if (isListLikeText(line.text)) {
    return 'list';
  }

  if (line.fontSize >= medianFontSize + 2 && !line.text.endsWith('.')) {
    return 'heading';
  }

  return 'text';
}

function looksLikeFormula(text: string): boolean {
  return isFormulaLikeText(text);
}

function buildConfidenceWarnings(
  line: PdfLine,
  kind: DocumentSectionKind,
): NormalizedExtractionWarning[] {
  const warnings: NormalizedExtractionWarning[] = [];

  if (kind === 'caption' && !line.text.includes(':')) {
    warnings.push(
      createWarning(
        'low_confidence_caption',
        line,
        'Caption-like content was extracted without a strong separator.',
      ),
    );
  }

  if (kind === 'formula' && line.text.length > 80) {
    warnings.push(
      createWarning(
        'low_confidence_formula',
        line,
        'Formula-like content was extracted with low confidence.',
      ),
    );
  }

  return warnings;
}

function collectMergeableLines(
  lines: readonly PdfLine[],
  startIndex: number,
  kind: Extract<DocumentSectionKind, 'list' | 'text'>,
  tableGroups: ReadonlyMap<number, PdfTableGroup>,
): readonly PdfLine[] {
  const collectedLines: PdfLine[] = [];
  let lineIndex = startIndex;

  while (lineIndex < lines.length) {
    if (tableGroups.has(lineIndex)) {
      break;
    }

    const line = lines[lineIndex];

    if (line === undefined) {
      break;
    }

    if (classifyLineKind(line, line.fontSize) !== kind) {
      break;
    }

    if (collectedLines.length > 0 && !canMergeLines(collectedLines.at(-1)!, line)) {
      break;
    }

    collectedLines.push(line);
    lineIndex += 1;
  }

  return collectedLines;
}

function canMergeLines(previousLine: PdfLine, nextLine: PdfLine): boolean {
  if (previousLine.pageNumber !== nextLine.pageNumber) {
    return false;
  }

  return Math.abs(previousLine.y - nextLine.y) <= Math.max(previousLine.fontSize * 2.4, 28);
}

function createMergedLineSection(
  lines: readonly PdfLine[],
  kind: Extract<DocumentSectionKind, 'list' | 'text'>,
  headingPath: readonly string[],
): NormalizedSectionDraft {
  const firstLine = lines[0]!;
  const combinedContent = lines.map((line) => line.text).join(kind === 'list' ? '\n' : ' ');

  return {
    content: combinedContent,
    kind,
    sourceTrace: {
      boundingBox: mergeBoundingBoxes(lines.map((line) => line.boundingBox)),
      format: 'pdf',
      headingPath: [...headingPath],
      order: 0,
      pageNumber: firstLine.pageNumber,
      sourceId: firstLine.sourceId,
    },
  };
}

function createLineSection(
  line: PdfLine,
  kind: DocumentSectionKind,
  headingPath: readonly string[],
): NormalizedSectionDraft {
  return {
    content: line.text,
    kind,
    sourceTrace: {
      boundingBox: line.boundingBox,
      format: 'pdf',
      headingPath: [...headingPath],
      order: 0,
      pageNumber: line.pageNumber,
      sourceId: line.sourceId,
    },
    ...(kind === 'heading' || kind === 'caption' ? { title: line.text } : {}),
  };
}

function buildTableSection(
  tableGroup: PdfTableGroup,
  headingPath: readonly string[],
): NormalizedSectionDraft {
  const firstLine = tableGroup.lines[0]!;

  return {
    content: tableGroup.lines
      .map((line) => line.cells.map((cell) => cell.text).join('\t'))
      .join('\n'),
    kind: 'table',
    sourceTrace: {
      boundingBox: mergeBoundingBoxes(tableGroup.lines.map((line) => line.boundingBox)),
      format: 'pdf',
      headingPath: [...headingPath],
      order: 0,
      pageNumber: firstLine.pageNumber,
      sourceId: firstLine.sourceId,
    },
    ...(tableGroup.title === undefined ? {} : { title: tableGroup.title }),
  };
}

function groupItemsIntoLines(
  items: readonly StructuredTextItem[],
  pageNumber: number,
): readonly PdfLine[] {
  const sortedItems = items
    .filter((item) => item.str.trim() !== '')
    .sort(compareStructuredTextItems);
  const rawLines: StructuredTextItem[][] = [];

  for (const item of sortedItems) {
    const previousLine = rawLines.at(-1);

    if (previousLine === undefined || !isSameLine(previousLine[0]!, item)) {
      rawLines.push([item]);
      continue;
    }

    previousLine.push(item);
  }

  return rawLines.map((lineItems, index) => createPdfLine(lineItems, pageNumber, index));
}

function compareStructuredTextItems(
  left: StructuredTextItem,
  right: StructuredTextItem,
): number {
  if (left.y !== right.y) {
    return right.y - left.y;
  }

  return left.x - right.x;
}

function isSameLine(
  previousItem: StructuredTextItem,
  nextItem: StructuredTextItem,
): boolean {
  return Math.abs(previousItem.y - nextItem.y) <= Math.max(previousItem.height * 0.6, 4);
}

function createPdfLine(
  items: readonly StructuredTextItem[],
  pageNumber: number,
  lineIndex: number,
): PdfLine {
  const sortedItems = [...items].sort((left, right) => left.x - right.x);
  const cells = buildLineCells(sortedItems);
  const boundingBox = createBoundingBox(sortedItems);

  return {
    boundingBox,
    cells,
    fontSize: average(sortedItems.map((item) => item.fontSize)),
    pageNumber,
    sourceId: `pdf:${pageNumber}:${lineIndex}`,
    text: cells.map((cell) => cell.text).join(' ').trim(),
    y: average(sortedItems.map((item) => item.y)),
  };
}

function buildLineCells(items: readonly StructuredTextItem[]): readonly PdfLineCell[] {
  const cells: PdfLineCell[] = [];
  let activeText = '';
  let activeX = items[0]?.x ?? 0;
  let previousRightEdge = items[0]?.x ?? 0;

  for (const item of items) {
    const gap = item.x - previousRightEdge;

    if (activeText !== '' && gap >= Math.max(item.fontSize * 1.8, 36)) {
      cells.push({
        text: activeText.trim(),
        x: activeX,
      });
      activeText = '';
      activeX = item.x;
    }

    if (activeText !== '') {
      activeText += gap > 4 ? ` ${item.str}` : item.str;
    } else {
      activeText = item.str;
      activeX = item.x;
    }

    previousRightEdge = item.x + item.width;
  }

  if (activeText !== '') {
    cells.push({
      text: activeText.trim(),
      x: activeX,
    });
  }

  return cells;
}

function createBoundingBox(
  items: readonly StructuredTextItem[],
): SourceBoundingBox {
  const minX = Math.min(...items.map((item) => item.x));
  const minY = Math.min(...items.map((item) => item.y));
  const maxX = Math.max(...items.map((item) => item.x + item.width));
  const maxY = Math.max(...items.map((item) => item.y + item.height));

  return {
    height: maxY - minY,
    width: maxX - minX,
    x: minX,
    y: minY,
  };
}

function mergeBoundingBoxes(
  boundingBoxes: readonly SourceBoundingBox[],
): SourceBoundingBox {
  const minX = Math.min(...boundingBoxes.map((box) => box.x));
  const minY = Math.min(...boundingBoxes.map((box) => box.y));
  const maxX = Math.max(...boundingBoxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boundingBoxes.map((box) => box.y + box.height));

  return {
    height: maxY - minY,
    width: maxX - minX,
    x: minX,
    y: minY,
  };
}

function calculateMedianFontSize(lines: readonly PdfLine[]): number {
  const fontSizes = [...lines.map((line) => line.fontSize)].sort((left, right) => left - right);
  const middleIndex = Math.floor(fontSizes.length / 2);

  if (fontSizes.length % 2 === 0) {
    return average([fontSizes[middleIndex - 1]!, fontSizes[middleIndex]!]);
  }

  return fontSizes[middleIndex] ?? 12;
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createMissingTextWarning(pageNumber: number): NormalizedExtractionWarning {
  return createMissingExtractableTextWarning({
    format: 'pdf',
    message: 'No extractable text was found on this PDF page.',
    pageNumber,
    sourceId: `pdf:${pageNumber}:missing-text`,
  });
}

function createWarning(
  code: NormalizedExtractionWarning['code'],
  line: PdfLine,
  message: string,
): NormalizedExtractionWarning {
  return {
    code,
    message,
    pageNumber: line.pageNumber,
    sourceId: line.sourceId,
  };
}

function ensurePromiseTryPolyfill(): void {
  if (typeof Promise.try === 'function') {
    return;
  }

  Promise.try = function promiseTry<TResult>(
    callback: () => TResult | PromiseLike<TResult>,
  ): Promise<TResult> {
    return new Promise<TResult>((resolve, reject) => {
      try {
        resolve(callback());
      } catch (error) {
        reject(error);
      }
    });
  };
}

async function ensurePdfJsModuleConfigured(): Promise<void> {
  if (pdfJsModuleConfigured === null) {
    pdfJsModuleConfigured = definePDFJSModule(() =>
      import('pdfjs-dist/legacy/build/pdf.mjs')
    );
  }

  await pdfJsModuleConfigured;
}
