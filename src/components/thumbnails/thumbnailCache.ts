export type ThumbnailModel = 'coffee' | 'tea' | 'sugar' | 'robot';

const thumbnails = new Map<ThumbnailModel, Promise<string>>();
let queue = Promise.resolve();

/** Render each model once; all selectors share the cached image through a serial queue. */
export function cachedThumbnail(model: ThumbnailModel, render: () => Promise<string>): Promise<string> {
  const cached = thumbnails.get(model);
  if (cached) return cached;
  const result = new Promise<string>((resolve, reject) => {
    queue = queue
      .then(async () => {
        resolve(await render());
      })
      .catch(reject);
  });
  thumbnails.set(model, result);
  return result;
}
