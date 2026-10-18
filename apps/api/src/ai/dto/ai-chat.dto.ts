import { IsString, IsNotEmpty, MaxLength, IsOptional, IsUUID, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AIChatDto {
  @ApiProperty({
    description: 'User healthcare inquiry message (1-2000 characters, non-empty)',
    example: 'What foods should I avoid with high blood pressure?',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Message must be a string' })
  @IsNotEmpty({ message: 'Message cannot be empty or whitespace-only' })
  @MaxLength(2000, { message: 'Message cannot exceed 2000 characters' })
  message: string;

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
}
