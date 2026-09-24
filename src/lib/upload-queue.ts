export type UploadItem = {
  key: string;
  id?: string;
  file?: File;
  name: string;
  mime: string;
  size: number;
  ready: boolean;
  phase?: string;
  percent?: number;
  failure?: string;
};
export async function uploadFiles<T extends UploadItem>(
  working: T[],
  id: string,
  update: (item: T) => void,
  options: { review?: boolean; retryKey?: string },
  dependencies: {
    request: (path: string, body: unknown) => Promise<any>;
    upload: (
      url: string,
      file: File,
      mime: string,
      progress: (percent: number) => void,
    ) => Promise<void>;
  },
) {
  for (const item of working) {
    if (
      item.ready ||
      (options.retryKey && item.key !== options.retryKey) ||
      (item.failure && !options.review && !options.retryKey)
    )
      continue;
    if (!item.file && !item.id) {
      item.failure = 'Reselect this file to resume.';
      update(item);
      continue;
    }
    item.failure = undefined;
    try {
      if (item.id) {
        item.phase = 'Checking upload…';
        update(item);
        try {
          await dependencies.request('/api/creator/finalize', {
            drop_id: id,
            asset_id: item.id,
          });
          item.ready = true;
          item.phase = undefined;
          update(item);
          continue;
        } catch {}
      }
      if (!item.file) throw new Error('Reselect this file to resume.');
      item.phase = 'Preparing upload…';
      update(item);
      const reservation = await dependencies.request('/api/creator/uploads', {
        drop_id: id,
        asset_id: item.id,
        original_filename: item.name,
        mime_type: item.mime,
        size_bytes: item.size,
      });
      item.id = reservation.asset_id;
      item.percent = 0;
      item.phase = 'Uploading';
      update(item);
      await dependencies.upload(
        reservation.upload_url,
        item.file,
        item.mime,
        (percent) => {
          item.percent = percent;
          update(item);
        },
      );
      item.phase = 'Creating preview…';
      update(item);
      await dependencies.request('/api/creator/finalize', {
        drop_id: id,
        asset_id: item.id,
      });
      item.ready = true;
      item.phase = undefined;
      item.percent = undefined;
      update(item);
    } catch (cause) {
      item.phase = undefined;
      item.failure =
        cause instanceof Error
          ? cause.message
          : 'Upload failed. Retry this file.';
      update(item);
    }
  }
}
