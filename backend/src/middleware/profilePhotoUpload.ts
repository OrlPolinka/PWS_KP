import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

export const uploadDirectory = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const imageExtensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const profilePhotoUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_req, file, callback) => callback(null, `${randomUUID()}${imageExtensions[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!imageExtensions[file.mimetype]) {
      const error = new Error('Фото должно быть в формате JPEG, PNG или WebP.');
      error.name = 'ValidationError';
      callback(error);
      return;
    }
    callback(null, true);
  },
});

export const removeUploadedProfilePhoto = (filename: string): void => {
  const resolvedPath = path.resolve(uploadDirectory, filename);
  if (path.dirname(resolvedPath) !== uploadDirectory) return;
  if (fs.existsSync(resolvedPath)) fs.unlinkSync(resolvedPath);
};

export const removePreviousProfilePhoto = (photoUrl: string | undefined, requestHost: string): void => {
  if (!photoUrl) return;

  try {
    const url = new URL(photoUrl);
    if (url.host !== requestHost || !url.pathname.startsWith('/uploads/')) return;
    const filename = path.basename(url.pathname);
    if (filename) removeUploadedProfilePhoto(filename);
  } catch {
    return;
  }
};
