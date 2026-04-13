interface PdfPageFixture {
  height?: number;
  texts: readonly PdfTextFixture[];
  width?: number;
}

interface PdfTextFixture {
  fontSize: number;
  text: string;
  x: number;
  y: number;
}

export function createTutoringPdfFixture(): Buffer {
  return createPdfFixture([
    {
      texts: [
        { fontSize: 24, text: 'Lesson 1: Photosynthesis', x: 72, y: 760 },
        { fontSize: 12, text: 'Chlorophyll captures light energy', x: 72, y: 724 },
        { fontSize: 12, text: 'and powers the light reactions', x: 72, y: 706 },
        { fontSize: 12, text: 'ATP = ADP + Pi', x: 72, y: 674 },
        {
          fontSize: 12,
          text: 'Figure 1: Chloroplast cross-section',
          x: 72,
          y: 646,
        },
        { fontSize: 12, text: 'Stage', x: 72, y: 604 },
        { fontSize: 12, text: 'Input', x: 240, y: 604 },
        { fontSize: 12, text: 'Output', x: 380, y: 604 },
        { fontSize: 12, text: 'Light reactions', x: 72, y: 584 },
        { fontSize: 12, text: 'Light', x: 240, y: 584 },
        { fontSize: 12, text: 'ATP', x: 380, y: 584 },
        { fontSize: 12, text: 'Calvin cycle', x: 72, y: 564 },
        { fontSize: 12, text: 'CO2', x: 240, y: 564 },
        { fontSize: 12, text: 'Glucose', x: 380, y: 564 },
      ],
    },
    {
      texts: [
        { fontSize: 18, text: 'Review', x: 72, y: 760 },
        {
          fontSize: 12,
          text: 'Photosynthesis stores solar energy in glucose.',
          x: 72,
          y: 724,
        },
      ],
    },
  ]);
}

export function createPdfWithBlankSecondPageFixture(): Buffer {
  return createPdfFixture([
    {
      texts: [{ fontSize: 18, text: 'Diagram page', x: 72, y: 760 }],
    },
    {
      texts: [],
    },
  ]);
}

export function createMalformedPdfFixture(): Buffer {
  return Buffer.from('not-a-valid-pdf', 'utf8');
}

function createPdfFixture(pages: readonly PdfPageFixture[]): Buffer {
  const fontObjectId = 3;
  const pageObjectIds = pages.map((_, index) => 4 + index * 2);
  const contentObjectIds = pages.map((_, index) => 5 + index * 2);
  const objects = new Map<number, string>();

  objects.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
  objects.set(
    2,
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  );
  objects.set(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index]!;
    const contentStream = buildPageContentStream(page.texts);
    const pageObjectId = pageObjectIds[index]!;
    const contentObjectId = contentObjectIds[index]!;
    const height = page.height ?? 842;
    const width = page.width ?? 595;

    objects.set(
      pageObjectId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    );
    objects.set(
      contentObjectId,
      `<< /Length ${Buffer.byteLength(contentStream, 'utf8')} >>\nstream\n${contentStream}\nendstream`,
    );
  }

  return serializePdf(objects);
}

function buildPageContentStream(texts: readonly PdfTextFixture[]): string {
  const commands = ['BT'];

  for (const text of texts) {
    commands.push(`/F1 ${text.fontSize} Tf`);
    commands.push(`1 0 0 1 ${text.x} ${text.y} Tm`);
    commands.push(`(${escapePdfText(text.text)}) Tj`);
  }

  commands.push('ET');
  return commands.join('\n');
}

function serializePdf(objects: ReadonlyMap<number, string>): Buffer {
  const sortedObjectIds = [...objects.keys()].sort((left, right) => left - right);
  let document = '%PDF-1.4\n';
  const offsets = new Map<number, number>();

  for (const objectId of sortedObjectIds) {
    offsets.set(objectId, Buffer.byteLength(document, 'utf8'));
    document += `${objectId} 0 obj\n${objects.get(objectId)!}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(document, 'utf8');
  document += `xref\n0 ${sortedObjectIds.length + 1}\n0000000000 65535 f \n`;

  for (const objectId of sortedObjectIds) {
    document += `${String(offsets.get(objectId) ?? 0).padStart(10, '0')} 00000 n \n`;
  }

  document += `trailer\n<< /Size ${sortedObjectIds.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(document, 'utf8');
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
