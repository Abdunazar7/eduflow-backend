import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { unlink } from 'fs/promises';
import { resolve, sep } from 'path';
import { STORED_FILE_NAME, UPLOAD_DIR } from '../commons/multer.config';
import { AuthUser } from '../commons/types';

@Injectable()
export class FilesService {
  describe(file: Express.Multer.File) {
    return {
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  async deleteFile(filename: string, user: AuthUser) {
    // The strict name pattern is the path-traversal defence: it cannot
    // contain a slash or "..". Resolving and re-checking the directory is a
    // second, independent guard.
    const match = STORED_FILE_NAME.exec(filename);
    const path = resolve(UPLOAD_DIR, filename);

    if (!match || !path.startsWith(UPLOAD_DIR + sep)) {
      throw new BadRequestException('Invalid file name');
    }

    const tenantId = Number(match[1]);
    const ownerId = Number(match[2]);

    const isOwner = ownerId === user.sub;
    const isPlatformAdmin = user.role === UserRole.PLATFORM_ADMIN;
    const isTenantStaff =
      (user.role === UserRole.MANAGER || user.role === UserRole.ADMIN) &&
      tenantId === user.tenantId;

    if (!isOwner && !isPlatformAdmin && !isTenantStaff) {
      throw new ForbiddenException('You can only delete files you uploaded');
    }

    try {
      await unlink(path);
    } catch (err: any) {
      if (err?.code === 'ENOENT') {
        throw new NotFoundException('File not found');
      }
      throw err;
    }

    return { success: true };
  }
}
