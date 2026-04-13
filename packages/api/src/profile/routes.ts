import type { Course, Prisma } from '@ai-tutor-pwa/db';
import { type DatabaseClient } from '@ai-tutor-pwa/db';
import {
  ACADEMIC_LEVELS,
  PROFILE_PATHS,
  type CourseResponse,
  type UserProfileResponse,
} from '@ai-tutor-pwa/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { createRequireAuthPreHandler } from '../auth/session.js';
import type { ApiEnv } from '../config/env.js';

const academicLevelSchema = z.enum(ACADEMIC_LEVELS);

const nullableTrimmedStringSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .transform((value) => value.trim());

const institutionInputSchema = z.object({
  country: nullableTrimmedStringSchema.max(80).nullable().optional(),
  name: z.string().trim().min(2).max(120),
  type: nullableTrimmedStringSchema.max(80).nullable().optional(),
});

const updateProfileSchema = z
  .object({
    department: nullableTrimmedStringSchema.max(120).nullable().optional(),
    institution: institutionInputSchema.nullable().optional(),
    level: academicLevelSchema.nullable().optional(),
    username: nullableTrimmedStringSchema.max(50).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one profile field must be provided',
  });

const createCourseSchema = z
  .object({
    code: z.string().trim().min(2).max(32).nullable().optional(),
    level: z.string().trim().min(1).max(50).nullable().optional(),
    name: z.string().trim().min(2).max(120),
  })
  .strict();

interface ProfileRouteDependencies {
  env: ApiEnv;
  prisma: DatabaseClient;
}

type ProfileRecord = Prisma.UserGetPayload<{
  include: {
    institution: true;
  };
}>;

export async function registerProfileRoutes(
  app: FastifyInstance,
  dependencies: ProfileRouteDependencies,
): Promise<void> {
  const requireAuth = createRequireAuthPreHandler(
    dependencies.prisma,
    dependencies.env,
  );

  app.get(
    PROFILE_PATHS.profile,
    {
      preHandler: [requireAuth],
    },
    async (request): Promise<UserProfileResponse> => {
      const profile = await dependencies.prisma.user.findUniqueOrThrow({
        include: {
          institution: true,
        },
        where: {
          id: request.auth!.userId,
        },
      });

      return mapProfileResponse(profile);
    },
  );

  app.put(
    PROFILE_PATHS.profile,
    {
      preHandler: [requireAuth],
    },
    async (request, reply): Promise<UserProfileResponse | void> => {
      const parsedBody = updateProfileSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        });
      }

      const institutionId = await resolveInstitutionId(
        dependencies.prisma,
        parsedBody.data.institution,
      );
      const updatedProfile = await dependencies.prisma.user.update({
        data: {
          department: normalizeOptionalString(parsedBody.data.department),
          institutionId:
            parsedBody.data.institution === undefined ? undefined : institutionId,
          level:
            parsedBody.data.level === undefined ? undefined : parsedBody.data.level,
          username: normalizeOptionalString(parsedBody.data.username),
        },
        include: {
          institution: true,
        },
        where: {
          id: request.auth!.userId,
        },
      });

      return mapProfileResponse(updatedProfile);
    },
  );

  app.post(
    PROFILE_PATHS.courses,
    {
      preHandler: [requireAuth],
    },
    async (request, reply): Promise<CourseResponse | void> => {
      const parsedBody = createCourseSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        });
      }

      const course = await dependencies.prisma.course.create({
        data: {
          code: normalizeOptionalString(parsedBody.data.code),
          level: normalizeOptionalString(parsedBody.data.level),
          name: parsedBody.data.name.trim(),
          userId: request.auth!.userId,
        },
      });

      return reply.status(201).send(mapCourseResponse(course));
    },
  );

  app.get(
    PROFILE_PATHS.courses,
    {
      preHandler: [requireAuth],
    },
    async (request): Promise<CourseResponse[]> => {
      const courses = await dependencies.prisma.course.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        where: {
          userId: request.auth!.userId,
        },
      });

      return courses.map(mapCourseResponse);
    },
  );
}

async function resolveInstitutionId(
  prisma: DatabaseClient,
  institution:
    | {
        country?: string | null;
        name: string;
        type?: string | null;
      }
    | null
    | undefined,
): Promise<string | null | undefined> {
  if (institution === undefined) {
    return undefined;
  }

  if (institution === null) {
    return null;
  }

  const normalizedName = institution.name.trim();
  const existingInstitution = await prisma.institution.findUnique({
    where: {
      name: normalizedName,
    },
  });

  if (existingInstitution !== null) {
    const updatedInstitution = await prisma.institution.update({
      data: {
        country: normalizeOptionalString(institution.country),
        type: normalizeOptionalString(institution.type),
      },
      where: {
        id: existingInstitution.id,
      },
    });

    return updatedInstitution.id;
  }

  const createdInstitution = await prisma.institution.create({
    data: {
      country: normalizeOptionalString(institution.country),
      name: normalizedName,
      type: normalizeOptionalString(institution.type),
    },
  });

  return createdInstitution.id;
}

function normalizeOptionalString(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return value.trim();
}

function mapProfileResponse(profile: ProfileRecord): UserProfileResponse {
  return {
    authProvider: profile.authProvider === 'GOOGLE' ? 'google' : 'email',
    department: profile.department,
    email: profile.email,
    emailVerified: profile.emailVerified,
    id: profile.id,
    institution:
      profile.institution === null
        ? null
        : {
            country: profile.institution.country,
            id: profile.institution.id,
            name: profile.institution.name,
            type: profile.institution.type,
          },
    level: profile.level as UserProfileResponse['level'],
    role: profile.role === 'ADMIN' ? 'admin' : 'student',
    username: profile.username,
  };
}

function mapCourseResponse(course: Course): CourseResponse {
  return {
    code: course.code,
    createdAt: course.createdAt.toISOString(),
    id: course.id,
    level: course.level,
    name: course.name,
    updatedAt: course.updatedAt.toISOString(),
  };
}
