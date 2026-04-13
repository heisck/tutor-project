import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import {
  AuthProvider,
  DocumentAssetKind,
  DocumentProcessingStatus,
  DocumentSectionKind,
  createDocumentAssets,
  createDocumentSections,
  createPrismaClient,
  disconnectDatabase,
  getOwnedDocumentStructure,
} from '../src/index.js';

const client = createPrismaClient({
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5433/ai_tutor_pwa?schema=public',
});
const testPrefix = `db-tutoring-${randomUUID()}`;

describe('tutoring content models', () => {
  afterAll(async () => {
    await client.user.deleteMany({
      where: {
        email: {
          startsWith: testPrefix,
        },
      },
    });
    await disconnectDatabase(client);
  });

  it('stores owned document sections and assets with source trace data', async () => {
    const user = await client.user.create({
      data: {
        authProvider: AuthProvider.EMAIL,
        email: `${testPrefix}@example.com`,
        passwordHash: 'hashed-password',
      },
    });

    const document = await client.document.create({
      data: {
        fileSize: 2048,
        fileType: 'application/pdf',
        fileUrl: 'r2://bucket/users/user-1/uploads/upload-1/file.pdf',
        processingStatus: DocumentProcessingStatus.PENDING,
        title: 'lecture-notes.pdf',
        userId: user.id,
      },
    });

    const [section] = await createDocumentSections(client, [
      {
        content: 'Newton’s first law states that an object remains at rest...',
        documentId: document.id,
        kind: DocumentSectionKind.TEXT,
        ordinal: 0,
        sourceTrace: {
          headingPath: ['Mechanics', 'Newtonian motion'],
          order: 0,
          pageNumber: 1,
        },
        title: 'Newtonian motion',
        userId: user.id,
      },
    ]);

    expect(section).toBeDefined();

    if (section === undefined) {
      throw new Error('Expected a persisted section for the tutoring content test');
    }

    await createDocumentAssets(client, [
      {
        description: 'Free-body diagram for a block on an incline.',
        documentId: document.id,
        kind: DocumentAssetKind.DIAGRAM,
        mimeType: 'image/png',
        ordinal: 0,
        sectionId: section.id,
        sourceTrace: {
          order: 1,
          pageNumber: 1,
        },
        storageKey: 'documents/doc-1/assets/asset-1.png',
        title: 'Incline diagram',
        userId: user.id,
      },
    ]);

    const structure = await getOwnedDocumentStructure(client, {
      documentId: document.id,
      userId: user.id,
    });

    expect(structure).not.toBeNull();
    expect(structure?.sections).toHaveLength(1);
    expect(structure?.assets).toHaveLength(1);
    expect(structure?.sections[0]?.kind).toBe(DocumentSectionKind.TEXT);
    expect(structure?.assets[0]?.kind).toBe(DocumentAssetKind.DIAGRAM);
    expect(structure?.assets[0]?.sectionId).toBe(section.id);
  });

  it('keeps owned document structure isolated per user', async () => {
    const owner = await client.user.create({
      data: {
        authProvider: AuthProvider.EMAIL,
        email: `${testPrefix}-owner@example.com`,
        passwordHash: 'hashed-password',
      },
    });

    const otherUser = await client.user.create({
      data: {
        authProvider: AuthProvider.EMAIL,
        email: `${testPrefix}-other@example.com`,
        passwordHash: 'hashed-password',
      },
    });

    const document = await client.document.create({
      data: {
        fileSize: 512,
        fileType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        fileUrl: 'r2://bucket/users/user-2/uploads/upload-2/file.pptx',
        processingStatus: DocumentProcessingStatus.PENDING,
        title: 'slides.pptx',
        userId: owner.id,
      },
    });

    await createDocumentSections(client, [
      {
        content: 'Slide summary content',
        documentId: document.id,
        kind: DocumentSectionKind.HEADING,
        ordinal: 0,
        sourceTrace: {
          order: 0,
          slideNumber: 1,
        },
        title: 'Slide 1',
        userId: owner.id,
      },
    ]);

    const visibleToOtherUser = await getOwnedDocumentStructure(client, {
      documentId: document.id,
      userId: otherUser.id,
    });

    expect(visibleToOtherUser).toBeNull();
  });
});
