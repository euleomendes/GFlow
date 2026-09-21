import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'storage', 'uploads');

export const ALLOWED_MIME_TYPES = [
  // Documentos
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf',
  // Planilhas
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  // Apresentações
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Imagens
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  // Vídeos & Áudios
  'video/mp4',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  // Arquivos compactados
  'application/zip',
  'application/x-rar-compressed',
];

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

export async function ensureStorageDirectory() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error('Erro ao garantir pasta de upload:', err);
  }
}

export async function saveUploadedFile(
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<{ storageKey: string; size: number; checksum: string }> {
  await ensureStorageDirectory();

  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error('O arquivo excede o limite máximo permitido de 100MB.');
  }

  const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const ext = path.extname(originalFilename);
  const uniqueKey = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const filePath = path.join(UPLOAD_DIR, uniqueKey);

  await fs.writeFile(filePath, fileBuffer);

  return {
    storageKey: uniqueKey,
    size: fileBuffer.length,
    checksum,
  };
}

export function getFileStream(storageKey: string) {
  const filePath = path.join(UPLOAD_DIR, storageKey);
  return filePath;
}
