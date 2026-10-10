import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const uploadDirectory = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const extensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

export const trainerMediaUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_req, file, callback) => callback(null, `${randomUUID()}${extensions[file.mimetype] || ''}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, callback) => {
    if (!extensions[file.mimetype]) {
      callback(new Error('Разрешены только изображения JPEG, PNG, WebP, GIF и видео MP4, WebM'));
      return;
    }
    callback(null, true);
  },
});