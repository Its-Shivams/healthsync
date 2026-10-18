import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private readonly bucket: string;
  private readonly localUploadDir: string;
  private useS3 = false;

  constructor() {
    this.bucket = process.env.S3_BUCKET || 'healthsync-documents';
    this.localUploadDir = path.resolve(process.cwd(), 'private_storage', 'documents');

    // Ensure local private storage folder exists
    if (!fs.existsSync(this.localUploadDir)) {
      fs.mkdirSync(this.localUploadDir, { recursive: true });
    }

    if (process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY) {
      try {
        this.s3Client = new S3Client({
          endpoint: process.env.S3_ENDPOINT,
          region: process.env.S3_REGION || 'us-east-1',
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY,
            secretAccessKey: process.env.S3_SECRET_KEY,
          },
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
        });
        this.useS3 = true;
        this.logger.log(`Initialized S3/MinIO storage client pointing to ${process.env.S3_ENDPOINT}`);
      } catch (err: any) {
        this.logger.warn(`Could not initialize S3 client: ${err.message}. Using local private disk storage.`);
      }
    } else {
      this.logger.log('Using local private disk storage for documents');
    }
  }

  computeSha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    if (this.useS3 && this.s3Client) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
          }),
        );
        return key;
      } catch (err: any) {
        this.logger.warn(`S3 upload failed: ${err.message}. Falling back to local private storage.`);
      }
    }

    // Local private storage fallback
    const filePath = path.join(this.localUploadDir, path.basename(key));
    fs.writeFileSync(filePath, buffer);
    return key;
  }

  async getSignedDownloadUrl(key: string, originalFileName: string, expiresInSeconds = 300): Promise<string> {
    if (this.useS3 && this.s3Client) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ResponseContentDisposition: `inline; filename="${originalFileName}"`,
        });
        return await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
      } catch (err: any) {
        this.logger.warn(`Failed to generate S3 pre-signed URL: ${err.message}. Using direct stream.`);
      }
    }

    // Fallback: local signed token path
    const token = crypto.randomBytes(16).toString('hex');
    return `/api/documents/stream/${encodeURIComponent(path.basename(key))}?token=${token}`;
  }

  getLocalFileBuffer(key: string): Buffer | null {
    const filePath = path.join(this.localUploadDir, path.basename(key));
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
    return null;
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.localUploadDir, path.basename(key));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch (err: any) {
      this.logger.warn(`Could not delete storage file ${key}: ${err.message}`);
      return false;
    }
  }
}
