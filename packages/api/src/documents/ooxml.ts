import { XMLParser } from 'fast-xml-parser';
import JSZip from 'jszip';

import { resolveImageMimeType, type ExtractedDocumentAsset } from './asset-extraction.js';
import { UnrecoverableDocumentParserError } from './parsers.js';

const xmlParser = new XMLParser({
  attributeNamePrefix: '',
  ignoreAttributes: false,
  preserveOrder: true,
  removeNSPrefix: true,
  trimValues: false,
});

type OoxmlFormat = 'docx' | 'pptx';
type OrderedXmlEntry = Record<string, unknown>;

export interface XmlNode {
  attributes: Readonly<Record<string, string>>;
  children: readonly XmlNode[];
  name: string;
  text: string;
}

export async function loadOoxmlArchive(
  fileBuffer: Buffer,
  format: OoxmlFormat,
): Promise<JSZip> {
  try {
    return await JSZip.loadAsync(fileBuffer);
  } catch (error) {
    throw createMalformedDocumentError(format, error);
  }
}

export async function readRequiredArchiveXml(
  archive: JSZip,
  format: OoxmlFormat,
  filePath: string,
): Promise<readonly XmlNode[]> {
  const file = archive.file(filePath);

  if (file === null) {
    throw new UnrecoverableDocumentParserError(
      `Malformed ${format.toUpperCase()} document`,
    );
  }

  return parseArchiveXml(await file.async('string'), format);
}

export async function readArchiveXmlEntries(
  archive: JSZip,
  format: OoxmlFormat,
  pattern: RegExp,
): Promise<ReadonlyArray<{ name: string; nodes: readonly XmlNode[] }>> {
  const matchingPaths = Object.keys(archive.files)
    .filter((filePath) => pattern.test(filePath))
    .sort(compareArchiveEntryNames);

  if (matchingPaths.length === 0) {
    throw new UnrecoverableDocumentParserError(
      `Malformed ${format.toUpperCase()} document`,
    );
  }

  return Promise.all(
    matchingPaths.map(async (name) => ({
      name,
      nodes: await readRequiredArchiveXml(archive, format, name),
    })),
  );
}

export function firstChild(node: XmlNode, name: string): XmlNode | null {
  return node.children.find((child) => child.name === name) ?? null;
}

export function childrenNamed(node: XmlNode, name: string): readonly XmlNode[] {
  return node.children.filter((child) => child.name === name);
}

export function firstNode(nodes: readonly XmlNode[], name: string): XmlNode | null {
  return nodes.find((node) => node.name === name) ?? null;
}

export function hasDescendant(node: XmlNode, name: string): boolean {
  return node.children.some(
    (child) => child.name === name || hasDescendant(child, name),
  );
}

export function nodeText(node: XmlNode): string {
  if (node.name === '#text') {
    return node.text;
  }

  return node.children.map((child) => nodeText(child)).join('');
}

export function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function parseArchiveXml(
  xml: string,
  format: OoxmlFormat,
): readonly XmlNode[] {
  try {
    const parsed = xmlParser.parse(xml);

    if (!Array.isArray(parsed)) {
      throw new Error('Expected preserved-order XML output');
    }

    return toXmlNodes(parsed);
  } catch (error) {
    throw createMalformedDocumentError(format, error);
  }
}

function toXmlNodes(entries: readonly OrderedXmlEntry[]): readonly XmlNode[] {
  const nodes: XmlNode[] = [];

  for (const entry of entries) {
    nodes.push(...toXmlNodesFromEntry(entry));
  }

  return nodes;
}

function toXmlNodesFromEntry(entry: OrderedXmlEntry): readonly XmlNode[] {
  if (typeof entry['#text'] === 'string') {
    return [
      {
        attributes: {},
        children: [],
        name: '#text',
        text: entry['#text'],
      },
    ];
  }

  const attributes = parseAttributes(entry[':@']);
  const nodes: XmlNode[] = [];

  for (const [name, value] of Object.entries(entry)) {
    if (name === ':@') {
      continue;
    }

    if (name === '#text' && typeof value === 'string') {
      nodes.push({
        attributes: {},
        children: [],
        name,
        text: value,
      });
      continue;
    }

    if (!Array.isArray(value)) {
      continue;
    }

    nodes.push({
      attributes,
      children: toXmlNodes(value as OrderedXmlEntry[]),
      name,
      text: '',
    });
  }

  return nodes;
}

function parseAttributes(value: unknown): Readonly<Record<string, string>> {
  if (!isStringRecord(value)) {
    return {};
  }

  return value;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every((entry) => typeof entry === 'string')
  );
}

function compareArchiveEntryNames(left: string, right: string): number {
  return extractArchiveEntryIndex(left) - extractArchiveEntryIndex(right);
}

function extractArchiveEntryIndex(filePath: string): number {
  const match = filePath.match(/(\d+)(?=\.xml$)/);
  return match === null ? Number.MAX_SAFE_INTEGER : Number.parseInt(match[1]!, 10);
}

export async function extractOoxmlMediaAssets(
  archive: JSZip,
  format: OoxmlFormat,
): Promise<readonly ExtractedDocumentAsset[]> {
  const mediaPrefix = format === 'pptx' ? 'ppt/media/' : 'word/media/';
  const mediaPaths = Object.keys(archive.files)
    .filter((path) => path.startsWith(mediaPrefix))
    .sort();

  const assets: ExtractedDocumentAsset[] = [];

  for (const mediaPath of mediaPaths) {
    const mimeType = resolveImageMimeType(mediaPath);

    if (mimeType === null) {
      continue;
    }

    const file = archive.file(mediaPath);

    if (file === null) {
      continue;
    }

    const buffer = Buffer.from(await file.async('uint8array'));

    assets.push({
      buffer,
      kind: 'image',
      mimeType,
      sourceTrace: {
        format,
        headingPath: [],
        sourceId: `${format}:media:${mediaPath}`,
      },
    });
  }

  return assets;
}

function createMalformedDocumentError(
  format: OoxmlFormat,
  error: unknown,
): UnrecoverableDocumentParserError {
  return new UnrecoverableDocumentParserError(
    `Malformed ${format.toUpperCase()} document`,
    error instanceof Error ? { cause: error } : undefined,
  );
}
