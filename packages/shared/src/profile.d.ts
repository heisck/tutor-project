export declare const PROFILE_PATHS: {
    readonly courses: "/api/v1/courses";
    readonly profile: "/api/v1/profile";
};
export declare const ACADEMIC_LEVELS: readonly ["high school", "undergraduate", "postgraduate", "professional"];
export type AcademicLevel = (typeof ACADEMIC_LEVELS)[number];
export interface InstitutionSummary {
    country: string | null;
    id: string;
    name: string;
    type: string | null;
}
export interface UserProfileResponse {
    authProvider: 'email' | 'google';
    department: string | null;
    email: string;
    emailVerified: boolean;
    id: string;
    institution: InstitutionSummary | null;
    level: AcademicLevel | null;
    role: 'student' | 'admin';
    username: string | null;
}
export interface CourseResponse {
    code: string | null;
    createdAt: string;
    id: string;
    level: string | null;
    name: string;
    updatedAt: string;
}
//# sourceMappingURL=profile.d.ts.map