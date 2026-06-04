/** File picker accept list and light client-side validation. */
export const MEDIA_FILE_ACCEPT =
  'audio/*,video/*,.wav,.mp3,.mpeg,.ogg,.oga,.flac,.m4a,.aac,.webm,.mp4,.mov,.mkv';

const SUPPORTED_EXTENSIONS = new Set([
  'wav',
  'wave',
  'mp3',
  'mpeg',
  'mpga',
  'ogg',
  'oga',
  'opus',
  'flac',
  'm4a',
  'aac',
  'webm',
  'mp4',
  'mov',
  'mkv',
  'avi',
  'wmv',
  '3gp',
]);

/**
 * @param {File} file
 * @returns {boolean}
 */
export function isSupportedMediaFile(file) {
  if (!file) return false;
  const ext = file.name.includes('.')
    ? file.name.split('.').pop().toLowerCase()
    : '';
  if (ext && SUPPORTED_EXTENSIONS.has(ext)) return true;
  const type = (file.type || '').toLowerCase();
  return type.startsWith('audio/') || type.startsWith('video/');
}
