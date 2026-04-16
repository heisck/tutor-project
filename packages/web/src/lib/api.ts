/**
 * Studium API Client
 *
 * Manages CSRF token lifecycle and wraps fetch with proper auth headers.
 * Browser requests stay same-origin and rely on Next.js rewrites for `/api/*`.
 */

import type {
  AuthSessionResponse,
  CreateCourseRequest,
  CourseResponse,
  CsrfTokenResponse,
  DocumentListItemResponse,
  DocumentStatusResponse,
  ResponseEvaluation,
  SessionMasteryStatus,
  StartStudySessionRequest,
  StudySessionLifecycleResponse,
  StudySessionStateResponse,
  TutorAssistantQuestionResponse,
  TutorVoiceCommandResponse,
  TutorVoiceSynthesisResponse,
  TutorVoiceTranscriptionResponse,
  UpdateCourseRequest,
  UploadCreateResponse,
  UploadFinishResponse,
  UploadValidationResponse,
  UserProfileResponse,
} from '@ai-tutor-pwa/shared';
import {
  AUTH_HEADER_NAMES,
  AUTH_PATHS,
  DOCUMENT_PATHS,
  PROFILE_PATHS,
  SESSION_PATHS,
  TUTOR_PATHS,
  UPLOAD_PATHS,
} from '@ai-tutor-pwa/shared';

const DEFAULT_API_BASE_URL = 'http://localhost:4000';

function stripTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

interface TutorEvaluationResponse {
  evaluation: ResponseEvaluation;
  mastery: {
    conceptId: string;
    confusionScore: number;
    previousStatus: SessionMasteryStatus;
    status: SessionMasteryStatus;
  };
}

class ApiClient {
  private csrfToken: string | null = null;
  private readonly apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = this.resolveApiBaseUrl();
  }

  private resolveApiBaseUrl(): string {
    if (typeof window !== 'undefined') {
      return '';
    }

    return stripTrailingSlash(
      process.env.API_BASE_URL ??
        process.env.NEXT_PUBLIC_API_BASE_URL ??
        DEFAULT_API_BASE_URL,
    );
  }

  private buildUrl(path: string): string {
    if (isAbsoluteUrl(path)) {
      return path;
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiBaseUrl}${normalizedPath}`;
  }

  private async fetchCsrfToken(): Promise<string> {
    const res = await fetch(this.buildUrl(AUTH_PATHS.csrf), {
      credentials: 'include',
    });

    if (!res.ok) {
      throw new ApiError(res.status, 'Failed to fetch CSRF token');
    }

    const data = (await res.json()) as CsrfTokenResponse;
    this.csrfToken = data.csrfToken;
    return this.csrfToken;
  }

  private async ensureCsrfToken(): Promise<string> {
    return this.csrfToken ?? (await this.fetchCsrfToken());
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(this.buildUrl(path), {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return this.handleResponse<T>(res);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const csrf = await this.ensureCsrfToken();
    const headers: Record<string, string> = {
      [AUTH_HEADER_NAMES.csrf]: csrf,
    };

    const bodyString = body !== undefined ? JSON.stringify(body) : undefined;
    if (bodyString !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(this.buildUrl(path), {
      method: 'POST',
      credentials: 'include',
      headers,
      body: bodyString,
    });

    return this.handleResponse<T>(res);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    const csrf = await this.ensureCsrfToken();
    const headers: Record<string, string> = {
      [AUTH_HEADER_NAMES.csrf]: csrf,
    };

    const bodyString = body !== undefined ? JSON.stringify(body) : undefined;
    if (bodyString !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(this.buildUrl(path), {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: bodyString,
    });

    return this.handleResponse<T>(res);
  }

  async delete<T>(path: string): Promise<T> {
    const csrf = await this.ensureCsrfToken();
    const res = await fetch(this.buildUrl(path), {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        [AUTH_HEADER_NAMES.csrf]: csrf,
      },
    });

    return this.handleResponse<T>(res);
  }

  async postMultipart<T>(path: string, formData: FormData): Promise<T> {
    const csrf = await this.ensureCsrfToken();
    const res = await fetch(this.buildUrl(path), {
      method: 'POST',
      credentials: 'include',
      headers: {
        [AUTH_HEADER_NAMES.csrf]: csrf,
      },
      body: formData,
    });

    return this.handleResponse<T>(res);
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (res.status === 401) {
      throw new ApiError(401, 'Authentication required');
    }

    if (res.status === 403) {
      this.csrfToken = null;
      throw new ApiError(403, 'Session expired, please refresh');
    }

    if (!res.ok) {
      let message = 'An error occurred';

      try {
        const body = (await res.json()) as { message?: string };
        message = body.message ?? message;
      } catch {
        // Ignore JSON parse errors from empty or non-JSON responses.
      }

      throw new ApiError(res.status, message);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return res.json() as Promise<T>;
  }

  async getSession(): Promise<AuthSessionResponse> {
    return this.get<AuthSessionResponse>(AUTH_PATHS.session);
  }

  async getProfile(): Promise<UserProfileResponse> {
    return this.get<UserProfileResponse>(PROFILE_PATHS.profile);
  }

  async updateProfile(
    body: Partial<{
      department: string | null;
      institution:
        | {
            country?: string | null;
            name: string;
            type?: string | null;
          }
        | null;
      level: string | null;
      username: string | null;
    }>,
  ): Promise<UserProfileResponse> {
    return this.put<UserProfileResponse>(PROFILE_PATHS.profile, body);
  }

  async listCourses(): Promise<CourseResponse[]> {
    return this.get<CourseResponse[]>(PROFILE_PATHS.courses);
  }

  async createCourse(body: CreateCourseRequest): Promise<CourseResponse> {
    return this.post<CourseResponse>(PROFILE_PATHS.courses, body);
  }

  async updateCourse(
    courseId: string,
    body: UpdateCourseRequest,
  ): Promise<CourseResponse> {
    return this.put<CourseResponse>(PROFILE_PATHS.course(courseId), body);
  }

  async listDocuments(): Promise<DocumentListItemResponse[]> {
    return this.get<DocumentListItemResponse[]>(DOCUMENT_PATHS.list);
  }

  async getDocumentStatus(documentId: string): Promise<DocumentStatusResponse> {
    return this.get<DocumentStatusResponse>(DOCUMENT_PATHS.status(documentId));
  }

  async deleteDocument(documentId: string): Promise<void> {
    return this.delete<void>(DOCUMENT_PATHS.delete(documentId));
  }

  async signUp(email: string, password: string): Promise<AuthSessionResponse> {
    const result = await this.post<AuthSessionResponse>(AUTH_PATHS.signup, {
      email,
      password,
    });

    if (result.csrfToken) {
      this.csrfToken = result.csrfToken;
    }

    return result;
  }

  async signIn(email: string, password: string): Promise<AuthSessionResponse> {
    const result = await this.post<AuthSessionResponse>(AUTH_PATHS.signin, {
      email,
      password,
    });

    if (result.csrfToken) {
      this.csrfToken = result.csrfToken;
    }

    return result;
  }

  async signOut(): Promise<void> {
    await this.post<void>(AUTH_PATHS.signout);
    this.csrfToken = null;
  }

  async logout(): Promise<void> {
    return this.signOut();
  }

  async getGoogleOAuthUrl(): Promise<{ authorizationUrl: string }> {
    return this.get<{ authorizationUrl: string }>(AUTH_PATHS.googleOauthStart);
  }

  async startTutorSession(
    sessionId: string,
  ): Promise<ReadableStream<Uint8Array>> {
    const csrf = await this.ensureCsrfToken();
    const res = await fetch(this.buildUrl(TUTOR_PATHS.next), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        [AUTH_HEADER_NAMES.csrf]: csrf,
      },
      body: JSON.stringify({ sessionId }),
    });

    if (!res.ok) {
      return this.handleResponse<ReadableStream<Uint8Array>>(res);
    }

    if (res.body === null) {
      throw new ApiError(500, 'Tutor stream did not return a readable body');
    }

    return res.body;
  }

  async askTutorQuestion(
    sessionId: string,
    question: string,
  ): Promise<TutorAssistantQuestionResponse> {
    return this.post<TutorAssistantQuestionResponse>(TUTOR_PATHS.question, {
      question,
      sessionId,
    });
  }

  async evaluateTutorResponse(
    sessionId: string,
    segmentId: string,
    response: string,
  ): Promise<TutorEvaluationResponse> {
    return this.post<TutorEvaluationResponse>(TUTOR_PATHS.evaluate, {
      content: response,
      segmentId,
      sessionId,
    });
  }

  async startStudySession(
    documentId: string,
    options?: Omit<StartStudySessionRequest, 'documentId'>,
  ): Promise<StudySessionLifecycleResponse> {
    return this.post<StudySessionLifecycleResponse>(SESSION_PATHS.start, {
      documentId,
      ...options,
    });
  }

  async getSessionState(sessionId: string): Promise<StudySessionStateResponse> {
    return this.get<StudySessionStateResponse>(SESSION_PATHS.state(sessionId));
  }

  async pauseSession(sessionId: string): Promise<StudySessionLifecycleResponse> {
    return this.post<StudySessionLifecycleResponse>(SESSION_PATHS.pause(sessionId));
  }

  async resumeSession(sessionId: string): Promise<StudySessionLifecycleResponse> {
    return this.post<StudySessionLifecycleResponse>(SESSION_PATHS.resume(sessionId));
  }

  async transcribeTutorAudio(
    sessionId: string,
    audioBase64: string,
    mimeType: string,
  ): Promise<TutorVoiceTranscriptionResponse> {
    return this.post<TutorVoiceTranscriptionResponse>(
      TUTOR_PATHS.voiceTranscribe,
      {
        audioBase64,
        mimeType,
        sessionId,
      },
    );
  }

  async synthesizeTutorAudio(
    sessionId: string,
    text: string,
    playbackRate?: number,
  ): Promise<TutorVoiceSynthesisResponse> {
    return this.post<TutorVoiceSynthesisResponse>(TUTOR_PATHS.voiceSynthesize, {
      playbackRate,
      sessionId,
      text,
    });
  }

  async sendTutorVoiceCommand(
    sessionId: string,
    command:
      | 'pause'
      | 'continue'
      | 'slower'
      | 'repeat'
      | 'simpler'
      | 'example'
      | 'go_back'
      | 'test_me',
  ): Promise<TutorVoiceCommandResponse> {
    return this.post<TutorVoiceCommandResponse>(TUTOR_PATHS.voiceCommand, {
      command,
      sessionId,
    });
  }

  async validateUpload(
    fileName: string,
    fileSize: number,
    mimeType: string,
  ): Promise<UploadValidationResponse> {
    return this.post<UploadValidationResponse>(UPLOAD_PATHS.validate, {
      fileName,
      fileSizeBytes: fileSize,
      mimeType,
    });
  }

  async createUpload(
    fileName: string,
    fileSize: number,
    mimeType: string,
  ): Promise<UploadCreateResponse> {
    return this.post<UploadCreateResponse>(UPLOAD_PATHS.create, {
      fileName,
      fileSizeBytes: fileSize,
      mimeType,
    });
  }

  async finishUpload(uploadId: string, file: File): Promise<UploadFinishResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadId', uploadId);

    const csrf = await this.ensureCsrfToken();
    const res = await fetch(this.buildUrl(UPLOAD_PATHS.finish), {
      method: 'POST',
      credentials: 'include',
      headers: {
        [AUTH_HEADER_NAMES.csrf]: csrf,
      },
      body: formData,
    });

    return this.handleResponse(res);
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = new ApiClient();
