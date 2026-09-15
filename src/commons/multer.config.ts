import { BadRequestException } from '@nestjs/common';
import type { MulterModuleOptions } from '@nestjs/platform-express';
import { randomBytes } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import type { AuthUser } from './types';

export const UPLOAD_DIR = join(process.cwd(), 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_FILES_PER_REQUEST = 10;

/**
 * Extension → the MIME types allowed for it. Both must agree.
 *
 * /uploads is served publicly, so this list is also what stops someone
 * uploading an .html or .svg file that runs script in a visitor's browser.
 */
const ALLOWED_TYPES: Record<string, string[]> = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.webp': ['image/webp'],
  '.pdf': ['application/pdf'],
  '.txt': ['text/plain'],
  '.doc': ['application/msword'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  '.xlsx': [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  '.pptx': [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
};

/**
 * Stored names are `<tenantId>-<userId>-<128 random bits>.<ext>`.
 *
 * The random part makes a file URL unguessable; the ids let delete decide who
 * owns a file without a database table. Anything that does not match this
 * pattern exactly (a slash, "..", a different shape) is rejected outright.
 */
export const STORED_FILE_NAME = /^(\d+)-(\d+)-[a-f0-9]{32}\.[a-z0-9]{2,5}$/;

export const uploadOptions: MulterModuleOptions = {
  storage: diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const user = (req as unknown as { user: AuthUser }).user;
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `${user.tenantId}-${user.sub}-${randomBytes(16).toString('hex')}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_TYPES[ext]?.includes(file.mimetype)) {
      return cb(
        new BadRequestException(
          `This file type is not allowed. Upload one of: ${Object.keys(ALLOWED_TYPES).join(', ')}`,
        ),
        false,
      );
    }
    cb(null, true);
  },
  limits: { fileSize: MAX_UPLOAD_BYTES, files: MAX_FILES_PER_REQUEST },
};
