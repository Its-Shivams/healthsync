import { IsString, IsNotEmpty, MaxLength, IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AIChatDto {
  @ApiProperty({
    description: 'User healthcare inquiry message (optional if attachment is uploaded)',
    example: 'What does this prescription say and what are the medications for?',
    required: false,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf((o) => !o.attachmentBase64)
  @IsString({ message: 'Message must be a string' })
  @IsNotEmpty({ message: 'Message cannot be empty when no document attachment is uploaded' })
  @MaxLength(4000, { message: 'Message cannot exceed 4000 characters' })
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({
    description: 'Conversation UUID thread identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'conversationId must be a valid UUID v4' })
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'Preferred response language (en, hi, hinglish)',
    example: 'en',
    default: 'en',
  })
  @IsOptional()
  @IsString({ message: 'Language must be a string' })
  language?: string;

  @ApiPropertyOptional({
    description: 'Base64-encoded string of the uploaded prescription or lab report (PDF, PNG, JPG, WEBP)',
  })
  @IsOptional()
  @IsString({ message: 'attachmentBase64 must be a string' })
  attachmentBase64?: string;

  @ApiPropertyOptional({
    description: 'MIME type of the attachment (e.g., application/pdf, image/jpeg, image/png)',
    example: 'application/pdf',
  })
  @IsOptional()
  @IsString({ message: 'attachmentMimeType must be a string' })
  attachmentMimeType?: string;

  @ApiPropertyOptional({
    description: 'Original file name of the prescription or report',
    example: 'prescription_dr_sharma.pdf',
  })
  @IsOptional()
  @IsString({ message: 'attachmentFileName must be a string' })
  attachmentFileName?: string;
}
