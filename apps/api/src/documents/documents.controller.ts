import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Res,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RecordCategory } from '@healthsync/shared-types';

@ApiTags('Medical Documents & Records')
@Controller('api/documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly storageService: StorageService,
  ) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a medical document with automatic SHA-256 hashing and OCR parsing' })
  async upload(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    @Body('category') category: RecordCategory,
    @Body('description') description?: string,
    @Body('patientId') patientId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Document file must be attached');
    }
    if (!title) {
      throw new BadRequestException('Document title is required');
    }
    if (!category) {
      throw new BadRequestException('Document category is required');
    }

    const doc = await this.documentsService.uploadDocument({
      user,
      title,
      category,
      description,
      patientId,
      file,
    });

    return {
      success: true,
      message: 'Medical document uploaded, cryptographically hashed, and queued for OCR extraction',
      data: doc,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List medical documents for the patient' })
  async listDocuments(
    @CurrentUser() user: any,
    @Query('patientId') patientId?: string,
  ) {
    const docs = await this.documentsService.getPatientDocuments(user, patientId);
    return {
      success: true,
      data: docs,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get document details with short-lived pre-signed download URL' })
  async getDocument(@Param('id') id: string, @CurrentUser() user: any) {
    const doc = await this.documentsService.getDocumentById(id, user);
    return {
      success: true,
      data: doc,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id/verify')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Verify document cryptographic hash against ledger anchor' })
  async verifyIntegrity(@Param('id') id: string, @CurrentUser() user: any) {
    const verification = await this.documentsService.verifyDocumentIntegrity(id, user);
    return {
      success: true,
      data: verification,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/verify-draft')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Review and clinically verify OCR extracted values' })
  async verifyDraft(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('approvedMetrics') approvedMetrics?: any[],
  ) {
    const updated = await this.documentsService.verifyDraft(id, user, approvedMetrics);
    return {
      success: true,
      message: 'Draft values clinically verified and recorded in permanent health timeline',
      data: updated,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a medical document and purge its file and associated draft extractions' })
  async deleteDocument(@Param('id') id: string, @CurrentUser() user: any) {
    const res = await this.documentsService.deleteDocument(id, user);
    return {
      success: true,
      message: 'Medical document successfully removed from health record',
      data: res,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('stream/:filename')
  @ApiOperation({ summary: 'Securely stream local private files (local development fallback)' })
  streamFile(@Param('filename') filename: string, @Res() res: Response) {
    const buffer = this.storageService.getLocalFileBuffer(filename);
    if (!buffer) {
      return res.status(404).json({ success: false, message: 'File not found in private storage' });
    }
    const ext = filename.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
    res.setHeader('Content-Type', ext);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    return res.send(buffer);
  }
}
