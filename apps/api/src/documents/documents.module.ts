import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { StorageService } from './storage.service';
import { OcrService } from './ocr.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, StorageService, OcrService],
  exports: [DocumentsService, StorageService, OcrService],
})
export class DocumentsModule {}
