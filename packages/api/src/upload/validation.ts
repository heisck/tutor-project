import { z } from 'zod';

export const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;

const supportedUploadTypes = [
  {
    extension: '.pdf',
    magicMatchers: [(buffer: Buffer) => buffer.subarray(0, 5).toString() === '%PDF-'],
    mimeTypes: ['application/pdf'],
  },
  {
    extension: '.docx',
    magicMatchers: [isZipFileSignature],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  {
    extension: '.pptx',
    magicMatchers: [isZipFileSignature],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
  },
  {
    extension: '.doc',
    magicMatchers: [isOleCompoundFileSignature],
    mimeTypes: ['application/msword'],
  },
  {
    extension: '.ppt',
    magicMatchers: [isOleCompoundFileSignature],
    mimeTypes: ['application/vnd.ms-powerpoint'],
  },
];

const uploadDescriptorSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileSizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_UPLOAD_SIZE_BYTES, 'File size exceeds the 100MB upload limit'),
  mimeType: z.string().trim().min(1).max(255),
});

export interface UploadDescriptor {
  extension: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  sanitizedFileName: string;
}

export function parseAndValidateUploadDescriptor(
  input: unknown,
): UploadDescriptor {
  const parsed = uploadDescriptorSchema.safeParse(input);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];

    throw new UploadValidationError(
      firstIssue?.message ?? 'Invalid upload metadata',
      firstIssue?.path[0] === 'fileSizeBytes' ? 413 : 400,
    );
  }

  const sanitizedFileName = sanitizeFileName(parsed.data.fileName);
  const extension = getFileExtension(sanitizedFileName);

  if (extension === null) {
    throw new UploadValidationError('File extension is required', 400);
  }

  const supportedType = supportedUploadTypes.find(
    (entry) => entry.extension === extension,
  );

  if (supportedType === undefined) {
    throw new UploadValidationError('Unsupported file type', 400);
  }

  if (!supportedType.mimeTypes.includes(parsed.data.mimeType)) {
    throw new UploadValidationError(
      'File MIME type does not match a supported upload type',
      400,
    );
  }

  return {
    extension,
    fileName: parsed.data.fileName.trim(),
    fileSizeBytes: parsed.data.fileSizeBytes,
    mimeType: parsed.data.mimeType,
    sanitizedFileName,
  };
}

export function validateUploadedFileContent(input: {
  buffer: Buffer;
  extension: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
}): void {
  if (input.fileSizeBytes > MAX_UPLOAD_SIZE_BYTES) {
    throw new UploadValidationError('File size exceeds the 100MB upload limit', 413);
  }

  const descriptor = parseAndValidateUploadDescriptor({
    fileName: input.fileName,
    fileSizeBytes: input.fileSizeBytes,
    mimeType: input.mimeType,
  });
  const supportedType = supportedUploadTypes.find(
    (entry) => entry.extension === descriptor.extension,
  );

  if (
    supportedType === undefined ||
    !supportedType.magicMatchers.some((matcher) => matcher(input.buffer))
  ) {
    throw new UploadValidationError('Uploaded file contents are invalid', 400);
  }
}

export function buildUploadStorageKey(input: {
  sanitizedFileName: string;
  uploadId: string;
  userId: string;
}): string {
  return `users/${input.userId}/uploads/${input.uploadId}/${input.sanitizedFileName}`;
}

export class UploadValidationError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'UploadValidationError';
    this.statusCode = statusCode;
  }
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .trim()
    .replace(/[\\/]/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-');
}

function getFileExtension(fileName: string): string | null {
  const lastDotIndex = fileName.lastIndexOf('.');

  if (lastDotIndex < 0) {
    return null;
  }

  return fileName.slice(lastDotIndex).toLowerCase();
}

function isZipFileSignature(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}

function isOleCompoundFileSignature(buffer: Buffer): boolean {
  const signature = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

  return signature.every((value, index) => buffer[index] === value);
}
