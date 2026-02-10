/**
 * Strip EXIF metadata from image files using canvas redraw.
 * This removes GPS location, device info, timestamps, etc.
 * Only processes image files; non-image files are returned as-is.
 */
export const stripImageMetadata = (file: File): Promise<File> => {
  if (!file.type.startsWith('image/')) {
    return Promise.resolve(file);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0);

      // Determine output format: preserve PNG transparency, else JPEG
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = outputType === 'image/jpeg' ? 0.92 : undefined;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          const cleanFile = new File([blob], file.name, {
            type: outputType,
            lastModified: file.lastModified,
          });
          resolve(cleanFile);
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };

    img.src = url;
  });
};
