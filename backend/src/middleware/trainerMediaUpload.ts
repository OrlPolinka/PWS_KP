import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

export const uploadDirectory = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const mediaExtensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

const profilePhotoExtensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const trainerMediaUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_req, file, callback) => callback(null, `${randomUUID()}${mediaExtensions[file.mimetype] || ''}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 9 },
  fileFilter: (_req, file, callback) => {
    const extension = file.fieldname === 'photo'
      ? profilePhotoExtensions[file.mimetype]
      : mediaExtensions[file.mimetype];
    if (!extension) {
      callback(new Error('Разрешены только изображения JPEG, PNG, WebP, GIF и видео MP4, WebM'));
      return;
    }
    callback(null, true);
  },
});

export const trainerMediaUrl = (filename: string): string => `/uploads/${filename}`;

export const removeTrainerMediaFile = (mediaUrl: string | undefined): void => {
  if (!mediaUrl) return;

  let pathname: string;
  try {
    const url = new URL(mediaUrl, 'http://localhost');
    if (/^https?:\/\//i.test(mediaUrl) && !['localhost', '127.0.0.1', '::1'].includes(url.hostname)) return;
    pathname = url.pathname;
  } catch {
    return;
  }
  const filename = path.basename(pathname);
  if (
    !pathname.startsWith('/uploads/') ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif|mp4|webm)$/i.test(filename)
  ) {
    return;
  }

  const resolvedPath = path.resolve(uploadDirectory, filename);
  if (path.dirname(resolvedPath) === uploadDirectory && fs.existsSync(resolvedPath)) {
    fs.unlinkSync(resolvedPath);
  }
};