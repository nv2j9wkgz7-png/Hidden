// Account-scoped local recovery. Files stay on this device until uploaded.
export type StoredFile = {
  key: string;
  name: string;
  size: number;
  mime: string;
  id?: string;
  ready: boolean;
  file?: File;
};
export type StoredDraft = {
  id?: string;
  creationId: string;
  title: string;
  description: string;
  price: string;
  items: StoredFile[];
};
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('hidn-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readDraft(key: string): Promise<StoredDraft | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readonly');
      const request = tx.objectStore('drafts').get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
export async function writeDraft(
  key: string,
  value: StoredDraft,
  removeKey?: string,
) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      tx.objectStore('drafts').put(value, key);
      if (removeKey && removeKey !== key) {
        const previous = tx.objectStore('drafts').get(removeKey);
        previous.onsuccess = () => {
          if (previous.result?.creationId === value.creationId)
            tx.objectStore('drafts').delete(removeKey);
        };
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export async function deleteDraft(key: string, creationId?: string) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      if (creationId) {
        const previous = tx.objectStore('drafts').get(key);
        previous.onsuccess = () => {
          if (previous.result?.creationId === creationId)
            tx.objectStore('drafts').delete(key);
        };
      } else tx.objectStore('drafts').delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
