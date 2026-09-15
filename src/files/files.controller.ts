import {
  BadRequestException,
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FilesService } from './files.service';
import { GetCurrentUser } from '../commons/decorators';
import {
  MAX_FILES_PER_REQUEST,
  MAX_UPLOAD_BYTES,
} from '../commons/multer.config';
import type { AuthUser } from '../commons/types';

const LIMITS = `Images, PDF, Office documents or .txt; up to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB each.`;

@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload one file', description: LIMITS })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Attach the file as multipart field "file".');
    }
    return this.filesService.describe(file);
  }

  @Post('upload-multiple')
  @ApiOperation({
    summary: `Upload up to ${MAX_FILES_PER_REQUEST} files`,
    description: LIMITS,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', MAX_FILES_PER_REQUEST))
  uploadMultiple(@UploadedFiles() files?: Express.Multer.File[]) {
    if (!files?.length) {
      throw new BadRequestException('Attach the files as multipart field "files".');
    }
    return files.map((file) => this.filesService.describe(file));
  }

  @Delete(':filename')
  @ApiOperation({
    summary: 'Delete an uploaded file',
    description:
      'You can delete files you uploaded. Managers and admins can delete any file in their organisation.',
  })
  deleteFile(
    @Param('filename') filename: string,
    @GetCurrentUser() user: AuthUser,
  ) {
    return this.filesService.deleteFile(filename, user);
  }
}
