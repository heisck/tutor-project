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
import { createAllowedOriginPreHandler } from '../lib/request-origin.js';
import { createUserRateLimitPreHandler } from '../lib/rate-limit.js';
import type { RedisClient } from '../lib/redis.js';

const academicLevelSchema = z.enum(ACADEMIC_LEVELS);

function trimmedStringSchema(maxLength: number) {
  return z.string().trim().min(1).max(maxLength);
}

const institutionInputSchema = z.object({
  country: trimmedStringSchema(80).nullable().optional(),
  name: z.string().trim().min(2).max(120),
  type: trimmedStringSchema(80).nullable().optional(),
});

const updateProfileSchema = z
  .object({
    department: trimmedStringSchema(120).nullable().optional(),
    institution: institutionInputSchema.nullable().optional(),
    level: academicLevelSchema.nullable().optional(),
    username: trimmedStringSchema(50).nullable().optional(),
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
  redis: RedisClient;
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
  const requireAllowedOrigin = createAllowedOriginPreHandler(dependencies.env);
  const profileReadRateLimit = createUserRateLimitPreHandler(
    dependencies.redis,
    {
      keyPrefix: 'rate-limit:profile:read',
      limit: 120,
      timeWindowSeconds: 60,
    },
  );
  const profileWriteRateLimit = createUserRateLimitPreHandler(
    dependencies.redis,
    {
      keyPrefix: 'rate-limit:profile:write',
      limit: 60,
      timeWindowSeconds: 60,
    },
  );

  app.get(
    PROFILE_PATHS.profile,
    {
      preHandler: [requireAuth, profileReadRateLimit],
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
      preHandler: [requireAuth, requireAllowedOrigin, profileWriteRateLimit],
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
      const profileUpdateData: Prisma.UserUpdateInput = {};

      if (parsedBody.data.department !== undefined) {
        profileUpdateData.department =
          normalizeOptionalString(parsedBody.data.department) ?? null;
      }

      if (parsedBody.data.username !== undefined) {
        profileUpdateData.username =
          normalizeOptionalString(parsedBody.data.username) ?? null;
      }

      if (parsedBody.data.level !== undefined) {
        profileUpdateData.level = parsedBody.data.level;
      }

      if (parsedBody.data.institution !== undefined) {
        if (institutionId === null) {
          profileUpdateData.institution = {
            disconnect: true,
          };
        } else if (institutionId !== undefined) {
          profileUpdateData.institution = {
            connect: {
              id: institutionId,
            },
          };
        }
      }

      const updatedProfile = await dependencies.prisma.user.update({
        data: profileUpdateData,
        include: {
          institution: true,
        },
        where: {
          id: request.auth!.userId,
        },
      });
      request.log.info(
        {
          auditEvent: 'profile.update',
          userId: request.auth!.userId,
        },
        'Audit event',
      );

      return mapProfileResponse(updatedProfile);
    },
  );

  app.post(
    PROFILE_PATHS.courses,
    {
      preHandler: [requireAuth, requireAllowedOrigin, profileWriteRateLimit],
    },
    async (request, reply): Promise<CourseResponse | void> => {
      const parsedBody = createCourseSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        });
      }

      const courseData: Prisma.CourseUncheckedCreateInput = {
        name: parsedBody.data.name.trim(),
        userId: request.auth!.userId,
      };

      if (parsedBody.data.code !== undefined) {
        courseData.code = normalizeOptionalString(parsedBody.data.code) ?? null;
      }

      if (parsedBody.data.level !== undefined) {
        courseData.level = normalizeOptionalString(parsedBody.data.level) ?? null;
      }

      const course = await dependencies.prisma.course.create({
        data: courseData,
      });

      return reply.status(201).send(mapCourseResponse(course));
    },
  );

  app.get(
    PROFILE_PATHS.courses,
    {
      preHandler: [requireAuth, profileReadRateLimit],
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
        country?: string | null | undefined;
        name: string;
        type?: string | null | undefined;
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
    const institutionUpdateData: Prisma.InstitutionUpdateInput = {};

    if (institution.country !== undefined) {
      institutionUpdateData.country =
        normalizeOptionalString(institution.country) ?? null;
    }

    if (institution.type !== undefined) {
      institutionUpdateData.type = normalizeOptionalString(institution.type) ?? null;
    }

    const updatedInstitution = await prisma.institution.update({
      data: institutionUpdateData,
      where: {
        id: existingInstitution.id,
      },
    });

    return updatedInstitution.id;
  }

  const institutionCreateData: Prisma.InstitutionCreateInput = {
    name: normalizedName,
  };

  if (institution.country !== undefined) {
    institutionCreateData.country =
      normalizeOptionalString(institution.country) ?? null;
  }

  if (institution.type !== undefined) {
    institutionCreateData.type = normalizeOptionalString(institution.type) ?? null;
  }

  const createdInstitution = await prisma.institution.create({
    data: institutionCreateData,
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
