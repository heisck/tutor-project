import JSZip from 'jszip';

export async function createDocxFixture(): Promise<Buffer> {
  const archive = new JSZip();

  archive.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p>
          <w:pPr><w:pStyle w:val="Heading1" /></w:pPr>
          <w:r><w:t>Cell Respiration</w:t></w:r>
        </w:p>
        <w:p>
          <w:r><w:t>Glucose is oxidized to release energy.</w:t></w:r>
        </w:p>
        <w:p>
          <w:pPr><w:numPr><w:ilvl w:val="0" /><w:numId w:val="1" /></w:numPr></w:pPr>
          <w:r><w:t>Step 1: Glycolysis</w:t></w:r>
        </w:p>
        <w:p>
          <w:pPr><w:numPr><w:ilvl w:val="0" /><w:numId w:val="1" /></w:numPr></w:pPr>
          <w:r><w:t>Step 2: Krebs cycle</w:t></w:r>
        </w:p>
        <w:tbl>
          <w:tr>
            <w:tc><w:p><w:r><w:t>Phase</w:t></w:r></w:p></w:tc>
            <w:tc><w:p><w:r><w:t>Output</w:t></w:r></w:p></w:tc>
          </w:tr>
          <w:tr>
            <w:tc><w:p><w:r><w:t>Glycolysis</w:t></w:r></w:p></w:tc>
            <w:tc><w:p><w:r><w:t>Pyruvate</w:t></w:r></w:p></w:tc>
          </w:tr>
        </w:tbl>
      </w:body>
    </w:document>`,
  );

  return archive.generateAsync({ type: 'nodebuffer' });
}

export async function createMalformedDocxFixture(): Promise<Buffer> {
  const archive = new JSZip();
  archive.file('word/other.xml', '<root />');
  return archive.generateAsync({ type: 'nodebuffer' });
}

export async function createPptxFixture(): Promise<Buffer> {
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
              <a:p><a:r><a:t>Newton's Laws</a:t></a:r></a:p>
            </p:txBody>
          </p:sp>
          <p:sp>
            <p:txBody>
              <a:p><a:r><a:t>A force causes acceleration.</a:t></a:r></a:p>
              <a:p><a:pPr lvl="0" /><a:r><a:t>First law</a:t></a:r></a:p>
              <a:p><a:pPr lvl="0" /><a:r><a:t>Second law</a:t></a:r></a:p>
            </p:txBody>
          </p:sp>
          <p:graphicFrame>
            <a:graphic>
              <a:graphicData>
                <a:tbl>
                  <a:tr>
                    <a:tc><a:txBody><a:p><a:r><a:t>Law</a:t></a:r></a:p></a:txBody></a:tc>
                    <a:tc><a:txBody><a:p><a:r><a:t>Meaning</a:t></a:r></a:p></a:txBody></a:tc>
                  </a:tr>
                  <a:tr>
                    <a:tc><a:txBody><a:p><a:r><a:t>Third</a:t></a:r></a:p></a:txBody></a:tc>
                    <a:tc><a:txBody><a:p><a:r><a:t>Equal reaction</a:t></a:r></a:p></a:txBody></a:tc>
                  </a:tr>
                </a:tbl>
              </a:graphicData>
            </a:graphic>
          </p:graphicFrame>
        </p:spTree>
      </p:cSld>
    </p:sld>`,
  );
  archive.file(
    'ppt/slides/slide2.xml',
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
              <a:p><a:r><a:t>Summary</a:t></a:r></a:p>
            </p:txBody>
          </p:sp>
          <p:sp>
            <p:txBody>
              <a:p><a:r><a:t>Balanced forces produce no acceleration.</a:t></a:r></a:p>
            </p:txBody>
          </p:sp>
        </p:spTree>
      </p:cSld>
    </p:sld>`,
  );

  return archive.generateAsync({ type: 'nodebuffer' });
}

export async function createMalformedPptxFixture(): Promise<Buffer> {
  const archive = new JSZip();
  archive.file('ppt/presentation.xml', '<presentation />');
  return archive.generateAsync({ type: 'nodebuffer' });
}
