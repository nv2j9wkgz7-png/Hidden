export function uploadWithProgress(
  url: string,
  file: File,
  mime: string,
  onProgress: (percent: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', mime);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.timeout = 180000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error('Connection lost. Retry this file.'));
    xhr.ontimeout = () =>
      reject(new Error('Upload timed out. Retry this file.'));
    xhr.onabort = () => reject(new Error('Upload paused. Retry this file.'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let response: { statusCode?: string; message?: string; error?: string } =
        {};
      try {
        response = JSON.parse(xhr.responseText);
      } catch {}
      if (
        ['409', '400'].includes(String(response.statusCode)) &&
        /exist|duplicate/i.test(response.message || response.error || '')
      )
        return resolve();
      reject(new Error('Upload failed. Retry this file.'));
    };
    xhr.send(file);
  });
}
