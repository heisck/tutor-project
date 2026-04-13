import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import {
  AcademicLevel,
  AuthProvider,
  ExplanationStartPreference,
  StudyGoalPreference,
  createPrismaClient,
  disconnectDatabase,
} from '../src/index.js';

const client = createPrismaClient({
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5433/ai_tutor_pwa?schema=public',
});
const testPrefix = `db-learning-profile-${randomUUID()}`;

describe('learning profile model', () => {
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

  it('stores reusable mini-calibration preferences for a user', async () => {
    const user = await client.user.create({
      data: {
        authProvider: AuthProvider.EMAIL,
        email: `${testPrefix}@example.com`,
        passwordHash: 'hashed-password',
      },
    });

    const learningProfile = await client.learningProfile.create({
      data: {
        academicLevel: AcademicLevel.UNDERGRADUATE,
        explanationStartPreference: ExplanationStartPreference.EXAMPLE_FIRST,
        lastCalibratedAt: new Date(),
        studyGoalPreference: StudyGoalPreference.DEEP_UNDERSTANDING,
        userId: user.id,
      },
      include: {
        user: true,
      },
    });

    expect(learningProfile.user.id).toBe(user.id);
    expect(learningProfile.academicLevel).toBe(AcademicLevel.UNDERGRADUATE);
    expect(learningProfile.studyGoalPreference).toBe(
      StudyGoalPreference.DEEP_UNDERSTANDING,
    );
    expect(learningProfile.explanationStartPreference).toBe(
      ExplanationStartPreference.EXAMPLE_FIRST,
    );
  });
});
