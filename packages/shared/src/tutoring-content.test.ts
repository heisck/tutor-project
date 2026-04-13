import { describe, expect, it } from 'vitest';

import {
  normalizedDocumentStructureSchema,
  sourceTraceSchema,
} from './tutoring-content.js';

describe('tutoring content contracts', () => {
  it('parses normalized tutoring structure', () => {
    const structure = normalizedDocumentStructureSchema.parse({
      assets: [
        {
          kind: 'diagram',
          mimeType: 'image/png',
          ordinal: 0,
          sourceTrace: {
            format: 'pdf',
            order: 1,
            pageNumber: 1,
          },
          storageKey: 'documents/doc-1/assets/diagram-1.png',
          title: 'Incline diagram',
        },
      ],
      sections: [
        {
          content: 'Momentum is the product of mass and velocity.',
          kind: 'text',
          ordinal: 0,
          sourceTrace: {
            format: 'pdf',
            headingPath: ['Mechanics'],
            order: 0,
            pageNumber: 1,
          },
          title: 'Momentum',
        },
      ],
    });

    expect(structure.sections[0]?.sourceTrace.headingPath).toEqual(['Mechanics']);
    expect(structure.assets[0]?.kind).toBe('diagram');
  });

  it('rejects invalid source trace payloads', () => {
    const parsed = sourceTraceSchema.safeParse({
      format: 'pdf',
      order: -1,
      pageNumber: 0,
    });

    expect(parsed.success).toBe(false);
  });
});
