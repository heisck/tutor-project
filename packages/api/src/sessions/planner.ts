import {
  CoverageStatus,
  ExplanationStartPreference as PrismaExplanationStartPreference,
  LessonSegmentExplanationStrategy as PrismaLessonSegmentExplanationStrategy,
  StudyGoalPreference as PrismaStudyGoalPreference,
  type DatabaseClient,
  type LearningProfile,
  type LessonSegment,
  type Prisma,
} from '@ai-tutor-pwa/db';
import {
  lessonSegmentCoverageSummarySchema,
  lessonExplanationStrategySchema,
  masteryGateSchema,
  teachingPlanSchema,
  type LessonSegmentCoverageSummary,
  type LessonSegmentRecord,
  type MasteryGate,
  type MasteryQuestionType,
  type TeachingPlanRecord,
} from '@ai-tutor-pwa/shared';

import { validateKnowledgeGraphIntegrity } from '../knowledge/coverage-ledger.js';

export class StudySessionPlanningError extends Error {
  public readonly violations: readonly string[];

  public constructor(violations: readonly string[]) {
    super(`Cannot generate teaching plan: ${violations.join('; ')}`);
    this.name = 'StudySessionPlanningError';
    this.violations = violations;
  }
}

type SessionPlanningClient = Pick<
  DatabaseClient,
  | 'concept'
  | 'coverageLedger'
  | 'lessonSegment'
  | 'studySession'
  | 'atomicTeachableUnit'
  | 'conceptPrerequisite'
  | 'sourceUnit'
>;

type SessionPlanningConcept = Prisma.ConceptGetPayload<{
  include: {
    atus: {
      include: {
        sourceUnit: {
          include: {
            chunks: true;
          };
        };
      };
      orderBy: {
        ordinal: 'asc';
      };
    };
    dependsOn: {
      include: {
        prerequisite: true;
      };
    };
  };
}>;

interface PlannedSegment {
  analogyPrompt: string;
  atuIds: string[];
  checkPrompt: string;
  chunkIds: string[];
  conceptDescription: string;
  conceptId: string;
  conceptTitle: string;
  coverageSummary: LessonSegmentCoverageSummary;
  explanationStrategy: PrismaLessonSegmentExplanationStrategy;
  masteryGate: MasteryGate;
  ordinal: number;
  prerequisiteConceptIds: string[];
  sectionId: string | null;
  sourceOrdinal: number;
  sourceUnitIds: string[];
}

export async function persistTeachingPlanForSession(
  prisma: SessionPlanningClient,
  input: {
    documentId: string;
    learningProfile: LearningProfile;
    sessionId: string;
    userId: string;
  },
): Promise<TeachingPlanRecord> {
  await validateKnowledgeGraphIntegrity(prisma, {
    documentId: input.documentId,
    userId: input.userId,
  });

  const [concepts, coverageEntries] = await Promise.all([
    prisma.concept.findMany({
      include: {
        atus: {
          include: {
            sourceUnit: {
              include: {
                chunks: {
                  orderBy: {
                    ordinal: 'asc',
                  },
                },
              },
            },
          },
          orderBy: {
            ordinal: 'asc',
          },
        },
        dependsOn: {
          include: {
            prerequisite: true,
          },
        },
      },
      orderBy: {
        ordinal: 'asc',
      },
      where: {
        documentId: input.documentId,
        userId: input.userId,
      },
    }),
    prisma.coverageLedger.findMany({
      where: {
        documentId: input.documentId,
        userId: input.userId,
      },
    }),
  ]);

  const violations: string[] = [];

  if (concepts.length === 0) {
    violations.push('No concepts are available for lesson planning');
  }

  if (coverageEntries.length === 0) {
    violations.push('Coverage ledger has not been initialized for this document');
  }

  if (violations.length > 0) {
    throw new StudySessionPlanningError(violations);
  }

  const coverageByAtuId = new Map(
    coverageEntries.map((entry) => [entry.atuId, entry.status]),
  );
  const orderedConcepts = orderConceptsForTeaching(concepts);
  const plannedSegments = orderedConcepts.map((concept, ordinal) =>
    buildPlannedSegment(concept, ordinal, coverageByAtuId, input.learningProfile),
  );

  await prisma.lessonSegment.deleteMany({
    where: {
      studySessionId: input.sessionId,
      userId: input.userId,
    },
  });

  const persistedSegments: LessonSegmentRecord[] = [];

  for (const segment of plannedSegments) {
    const createdSegment = await prisma.lessonSegment.create({
      data: {
        analogyPrompt: segment.analogyPrompt,
        atuIds: segment.atuIds,
        checkPrompt: segment.checkPrompt,
        chunkIds: segment.chunkIds,
        conceptDescription: segment.conceptDescription,
        conceptId: segment.conceptId,
        conceptTitle: segment.conceptTitle,
        coverageSummary: toCoverageSummaryJson(segment.coverageSummary),
        documentId: input.documentId,
        explanationStrategy: segment.explanationStrategy,
        masteryGate: toMasteryGateJson(segment.masteryGate),
        ordinal: segment.ordinal,
        prerequisiteConceptIds: segment.prerequisiteConceptIds,
        sectionId: segment.sectionId,
        sourceOrdinal: segment.sourceOrdinal,
        sourceUnitIds: segment.sourceUnitIds,
        studySessionId: input.sessionId,
        userId: input.userId,
      },
    });

    persistedSegments.push(toLessonSegmentRecord(createdSegment));
  }

  return teachingPlanSchema.parse({
    currentSegmentId: persistedSegments[0]?.id ?? null,
    segments: persistedSegments,
    sessionId: input.sessionId,
  });
}

export async function getTeachingPlanForOwnedSession(
  prisma: Pick<DatabaseClient, 'lessonSegment' | 'studySession'>,
  input: {
    sessionId: string;
    userId: string;
  },
): Promise<TeachingPlanRecord | null> {
  const session = await prisma.studySession.findFirst({
    select: {
      currentSegmentId: true,
      id: true,
    },
    where: {
      id: input.sessionId,
      userId: input.userId,
    },
  });

  if (session === null) {
    return null;
  }

  const segments = await prisma.lessonSegment.findMany({
    orderBy: {
      ordinal: 'asc',
    },
    where: {
      studySessionId: session.id,
      userId: input.userId,
    },
  });

  return teachingPlanSchema.parse({
    currentSegmentId: session.currentSegmentId,
    segments: segments.map((segment) => toLessonSegmentRecord(segment)),
    sessionId: session.id,
  });
}

function orderConceptsForTeaching(
  concepts: readonly SessionPlanningConcept[],
): SessionPlanningConcept[] {
  const conceptsById = new Map(concepts.map((concept) => [concept.id, concept]));
  const sourceOrderByConceptId = new Map(
    concepts.map((concept) => [
      concept.id,
      Math.min(...concept.atus.map((atu) => atu.ordinal)),
    ]),
  );
  const inDegreeByConceptId = new Map(
    concepts.map((concept) => [concept.id, concept.dependsOn.length]),
  );
  const dependentsByConceptId = new Map<string, string[]>();

  for (const concept of concepts) {
    for (const dependency of concept.dependsOn) {
      const dependents = dependentsByConceptId.get(dependency.prerequisiteId) ?? [];
      dependents.push(concept.id);
      dependentsByConceptId.set(dependency.prerequisiteId, dependents);
    }
  }

  const ready: SessionPlanningConcept[] = concepts
    .filter((concept) => (inDegreeByConceptId.get(concept.id) ?? 0) === 0)
    .sort((left, right) => compareConceptOrder(left, right, sourceOrderByConceptId));
  const ordered: SessionPlanningConcept[] = [];

  while (ready.length > 0) {
    const nextConcept = ready.shift();

    if (nextConcept === undefined) {
      break;
    }

    ordered.push(nextConcept);

    for (const dependentId of dependentsByConceptId.get(nextConcept.id) ?? []) {
      const nextInDegree = (inDegreeByConceptId.get(dependentId) ?? 1) - 1;
      inDegreeByConceptId.set(dependentId, nextInDegree);

      if (nextInDegree === 0) {
        const dependentConcept = conceptsById.get(dependentId);

        if (dependentConcept !== undefined) {
          ready.push(dependentConcept);
          ready.sort((left, right) =>
            compareConceptOrder(left, right, sourceOrderByConceptId),
          );
        }
      }
    }
  }

  if (ordered.length !== concepts.length) {
    throw new StudySessionPlanningError([
      'Concept prerequisites contain a cycle and cannot be ordered',
    ]);
  }

  return ordered;
}

function buildPlannedSegment(
  concept: SessionPlanningConcept,
  ordinal: number,
  coverageByAtuId: ReadonlyMap<string, CoverageStatus>,
  learningProfile: LearningProfile,
): PlannedSegment {
  if (concept.atus.length === 0) {
    throw new StudySessionPlanningError([
      `Concept "${concept.title}" does not contain any ATUs`,
    ]);
  }

  const coverageSummary = createEmptyCoverageSummary();
  const chunkIds: string[] = [];
  const chunkIdSet = new Set<string>();
  const sourceUnitIds: string[] = [];
  const sourceUnitIdSet = new Set<string>();

  for (const atu of concept.atus) {
    const coverageStatus = coverageByAtuId.get(atu.id);

    if (coverageStatus === undefined) {
      throw new StudySessionPlanningError([
        `Coverage ledger entry missing for ATU "${atu.title}"`,
      ]);
    }

    incrementCoverageSummary(coverageSummary, coverageStatus);

    if (!sourceUnitIdSet.has(atu.sourceUnitId)) {
      sourceUnitIdSet.add(atu.sourceUnitId);
      sourceUnitIds.push(atu.sourceUnitId);
    }

    for (const chunk of atu.sourceUnit.chunks) {
      if (!chunkIdSet.has(chunk.id)) {
        chunkIdSet.add(chunk.id);
        chunkIds.push(chunk.id);
      }
    }
  }

  if (chunkIds.length === 0) {
    throw new StudySessionPlanningError([
      `No retrieval chunks are available for concept "${concept.title}"`,
    ]);
  }

  const prerequisiteTitles = concept.dependsOn
    .map((dependency) => dependency.prerequisite.title)
    .sort((left, right) => left.localeCompare(right));

  return {
    analogyPrompt: buildAnalogyPrompt(
      concept.title,
      prerequisiteTitles,
      learningProfile.academicLevel,
    ),
    atuIds: concept.atus.map((atu) => atu.id),
    checkPrompt: buildCheckPrompt(
      concept.title,
      learningProfile.studyGoalPreference,
    ),
    chunkIds,
    conceptDescription: concept.description,
    conceptId: concept.id,
    conceptTitle: concept.title,
    coverageSummary,
    explanationStrategy: toPrismaExplanationStrategy(
      learningProfile.explanationStartPreference,
    ),
    masteryGate: buildMasteryGate(learningProfile.studyGoalPreference),
    ordinal,
    prerequisiteConceptIds: concept.dependsOn
      .map((dependency) => dependency.prerequisiteId)
      .sort(),
    sectionId: concept.atus[0]?.sourceUnit.sectionId ?? null,
    sourceOrdinal: concept.atus[0]?.ordinal ?? concept.ordinal,
    sourceUnitIds,
  };
}

function buildAnalogyPrompt(
  conceptTitle: string,
  prerequisiteTitles: readonly string[],
  academicLevel: LearningProfile['academicLevel'],
): string {
  const audienceReference = (() => {
    switch (academicLevel) {
      case 'HIGH_SCHOOL':
        return 'an everyday situation a newer learner can picture';
      case 'POSTGRADUATE':
        return 'a compact discipline-level scenario';
      case 'PROFESSIONAL':
        return 'a practical work-style situation';
      case 'UNDERGRADUATE':
        return 'a concrete class-friendly example';
    }
  })();

  if (prerequisiteTitles.length === 0) {
    return `Ground ${conceptTitle} in ${audienceReference} before introducing the formal idea.`;
  }

  return `Bridge ${conceptTitle} back to ${prerequisiteTitles.join(', ')} using ${audienceReference} before formalizing the concept.`;
}

function buildCheckPrompt(
  conceptTitle: string,
  studyGoal: LearningProfile['studyGoalPreference'],
): string {
  switch (studyGoal) {
    case PrismaStudyGoalPreference.BUILD_PROJECT:
      return `Describe how you would apply ${conceptTitle} while building something real.`;
    case PrismaStudyGoalPreference.DEEP_UNDERSTANDING:
      return `Explain ${conceptTitle} in your own words and connect it to a fresh example.`;
    case PrismaStudyGoalPreference.PASS_EXAM:
      return `Work through an exam-style case that relies on ${conceptTitle} and explain your reasoning.`;
    case PrismaStudyGoalPreference.QUICK_OVERVIEW:
      return `Summarize the main idea behind ${conceptTitle} in one or two clear sentences.`;
  }
}

function buildMasteryGate(
  studyGoal: LearningProfile['studyGoalPreference'],
): MasteryGate {
  const requiredQuestionTypes: readonly MasteryQuestionType[] = (() => {
    switch (studyGoal) {
      case PrismaStudyGoalPreference.BUILD_PROJECT:
        return ['explanation', 'application'];
      case PrismaStudyGoalPreference.DEEP_UNDERSTANDING:
        return ['explanation', 'transfer'];
      case PrismaStudyGoalPreference.PASS_EXAM:
        return ['explanation', 'error_spotting'];
      case PrismaStudyGoalPreference.QUICK_OVERVIEW:
        return ['explanation', 'transfer'];
    }
  })();

  return {
    confusionThreshold: 0.4,
    minimumChecks: 2,
    requiredQuestionTypes: [...requiredQuestionTypes],
    requiresDistinctQuestionTypes: true,
  };
}

function compareConceptOrder(
  left: SessionPlanningConcept,
  right: SessionPlanningConcept,
  sourceOrderByConceptId: ReadonlyMap<string, number>,
): number {
  const sourceOrderDifference =
    (sourceOrderByConceptId.get(left.id) ?? left.ordinal) -
    (sourceOrderByConceptId.get(right.id) ?? right.ordinal);

  if (sourceOrderDifference !== 0) {
    return sourceOrderDifference;
  }

  const ordinalDifference = left.ordinal - right.ordinal;

  if (ordinalDifference !== 0) {
    return ordinalDifference;
  }

  return left.title.localeCompare(right.title);
}

function createEmptyCoverageSummary(): LessonSegmentCoverageSummary {
  return {
    assessed: 0,
    inProgress: 0,
    notTaught: 0,
    taught: 0,
  };
}

function incrementCoverageSummary(
  summary: LessonSegmentCoverageSummary,
  status: CoverageStatus,
): void {
  switch (status) {
    case CoverageStatus.ASSESSED:
      summary.assessed += 1;
      return;
    case CoverageStatus.IN_PROGRESS:
      summary.inProgress += 1;
      return;
    case CoverageStatus.NOT_TAUGHT:
      summary.notTaught += 1;
      return;
    case CoverageStatus.TAUGHT:
      summary.taught += 1;
      return;
  }
}

function toCoverageSummaryJson(
  coverageSummary: LessonSegmentCoverageSummary,
): Prisma.InputJsonObject {
  return {
    assessed: coverageSummary.assessed,
    inProgress: coverageSummary.inProgress,
    notTaught: coverageSummary.notTaught,
    taught: coverageSummary.taught,
  };
}

function toLessonSegmentRecord(segment: LessonSegment): LessonSegmentRecord {
  return {
    analogyPrompt: segment.analogyPrompt,
    atuIds: [...segment.atuIds],
    checkPrompt: segment.checkPrompt,
    chunkIds: [...segment.chunkIds],
    conceptDescription: segment.conceptDescription,
    conceptId: segment.conceptId,
    conceptTitle: segment.conceptTitle,
    coverageSummary: lessonSegmentCoverageSummarySchema.parse(
      segment.coverageSummary,
    ),
    explanationStrategy: toSharedExplanationStrategy(
      segment.explanationStrategy,
    ),
    id: segment.id,
    masteryGate: masteryGateSchema.parse(segment.masteryGate),
    ordinal: segment.ordinal,
    prerequisiteConceptIds: [...segment.prerequisiteConceptIds],
    sectionId: segment.sectionId,
    sourceOrdinal: segment.sourceOrdinal,
    sourceUnitIds: [...segment.sourceUnitIds],
    studySessionId: segment.studySessionId,
  };
}

function toMasteryGateJson(masteryGate: MasteryGate): Prisma.InputJsonObject {
  return {
    confusionThreshold: masteryGate.confusionThreshold,
    minimumChecks: masteryGate.minimumChecks,
    requiredQuestionTypes: [...masteryGate.requiredQuestionTypes],
    requiresDistinctQuestionTypes: masteryGate.requiresDistinctQuestionTypes,
  };
}

function toPrismaExplanationStrategy(
  preference: LearningProfile['explanationStartPreference'],
): PrismaLessonSegmentExplanationStrategy {
  switch (preference) {
    case PrismaExplanationStartPreference.DIRECT:
      return PrismaLessonSegmentExplanationStrategy.DIRECT;
    case PrismaExplanationStartPreference.EXAMPLE_FIRST:
      return PrismaLessonSegmentExplanationStrategy.EXAMPLE_FIRST;
    case PrismaExplanationStartPreference.WHY_FIRST:
      return PrismaLessonSegmentExplanationStrategy.WHY_FIRST;
  }
}

function toSharedExplanationStrategy(
  strategy: PrismaLessonSegmentExplanationStrategy,
): LessonSegmentRecord['explanationStrategy'] {
  switch (strategy) {
    case PrismaLessonSegmentExplanationStrategy.DIRECT:
      return lessonExplanationStrategySchema.parse('direct');
    case PrismaLessonSegmentExplanationStrategy.EXAMPLE_FIRST:
      return lessonExplanationStrategySchema.parse('example_first');
    case PrismaLessonSegmentExplanationStrategy.WHY_FIRST:
      return lessonExplanationStrategySchema.parse('why_first');
  }
}
