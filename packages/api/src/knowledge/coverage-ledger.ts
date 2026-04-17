import { type DatabaseClient, CoverageStatus } from '@ai-tutor-pwa/db';

export interface CoverageInitializationInput {
  documentId: string;
  userId: string;
}

export interface CoverageInitializationResult {
  atuCount: number;
  ledgerEntries: number;
}

export class KnowledgeGraphIntegrityError extends Error {
  public readonly violations: string[];

  public constructor(violations: string[]) {
    super(`Knowledge graph integrity check failed: ${violations.join('; ')}`);
    this.name = 'KnowledgeGraphIntegrityError';
    this.violations = violations;
  }
}

type KnowledgeGraphIntegrityClient = Pick<
  DatabaseClient,
  'atomicTeachableUnit' | 'concept' | 'conceptPrerequisite' | 'sourceUnit'
>;

/**
 * Validate knowledge graph integrity before initializing coverage.
 * Fails fast if any structural issues are detected.
 */
export async function validateKnowledgeGraphIntegrity(
  prisma: KnowledgeGraphIntegrityClient,
  input: CoverageInitializationInput,
): Promise<void> {
  const violations: string[] = [];

  const concepts = await prisma.concept.findMany({
    include: { _count: { select: { atus: true } } },
    where: { documentId: input.documentId },
  });

  const emptyConcepts = concepts.filter((c) => c._count.atus === 0);
  if (emptyConcepts.length > 0) {
    violations.push(`${emptyConcepts.length} concept(s) with no ATUs`);
  }

  const orphanedAtuCount = await prisma.atomicTeachableUnit.count({
    where: { conceptId: null, documentId: input.documentId },
  });
  if (orphanedAtuCount > 0) {
    violations.push(`${orphanedAtuCount} ATU(s) not assigned to any concept`);
  }

  const sourceUnits = await prisma.sourceUnit.findMany({
    include: { _count: { select: { atus: true } } },
    where: { documentId: input.documentId },
  });
  const uncoveredSourceUnits = sourceUnits.filter((su) => su._count.atus === 0);
  if (uncoveredSourceUnits.length > 0) {
    violations.push(`${uncoveredSourceUnits.length} source unit(s) with no ATUs`);
  }

  const prereqs = await prisma.conceptPrerequisite.findMany({
    where: { documentId: input.documentId },
  });

  const conceptIds = new Set(concepts.map((c) => c.id));
  const brokenPrereqs = prereqs.filter(
    (p) => !conceptIds.has(p.prerequisiteId) || !conceptIds.has(p.dependentId),
  );

  if (brokenPrereqs.length > 0) {
    violations.push(`${brokenPrereqs.length} prerequisite edge(s) reference non-existent concepts`);
  }

  if (violations.length > 0) {
    throw new KnowledgeGraphIntegrityError(violations);
  }
}

/**
 * Initialize coverage ledger entries for all ATUs in a document.
 * Every ATU gets a NOT_TAUGHT status entry.
 */
export async function initializeCoverageLedger(
  prisma: DatabaseClient,
  input: CoverageInitializationInput,
): Promise<CoverageInitializationResult> {
  const atus = await prisma.atomicTeachableUnit.findMany({
    orderBy: { ordinal: 'asc' },
    select: { id: true },
    where: { documentId: input.documentId },
  });

  if (atus.length === 0) {
    return { atuCount: 0, ledgerEntries: 0 };
  }

  await validateKnowledgeGraphIntegrity(prisma, input);

  await prisma.$transaction(async (tx) => {
    // Clean up existing ledger (retry safety)
    await tx.coverageLedger.deleteMany({
      where: { documentId: input.documentId, userId: input.userId },
    });

    await tx.coverageLedger.createMany({
      data: atus.map((atu) => ({
        atuId: atu.id,
        documentId: input.documentId,
        status: CoverageStatus.NOT_TAUGHT,
        userId: input.userId,
      })),
    });
  });

  return { atuCount: atus.length, ledgerEntries: atus.length };
}
