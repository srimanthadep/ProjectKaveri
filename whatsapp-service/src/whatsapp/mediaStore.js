import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config.js';

const EXT_BY_TYPE = {
  image: 'jpg',
  video: 'mp4',
  audio: 'ogg',
  document: 'bin',
  sticker: 'webp',
};

/**
 * Local-disk substitute for the reference architecture's Cloudinary upload.
 * Swap the body of this function for a real Cloudinary/S3 call when
 * credentials are available — callers only depend on getting back a URL.
 */
export async function uploadMediaToLocal(buffer, type, mimetype) {
  const ext = mimetype?.split('/')?.[1]?.split(';')?.[0] || EXT_BY_TYPE[type] || 'bin';
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  const dest = path.resolve(config.mediaDir, filename);
  await fs.promises.writeFile(dest, buffer);
  return `/media/${filename}`;
}
