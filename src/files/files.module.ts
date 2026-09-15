import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { uploadOptions } from '../commons/multer.config';

@Module({
  // The type allow-list and size limit live in uploadOptions. The previous
  // module registered its own storage here and bypassed both.
  imports: [MulterModule.register(uploadOptions)],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
