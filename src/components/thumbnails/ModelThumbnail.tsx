import { useEffect, useState } from 'react';
import { cachedThumbnail, type ThumbnailModel } from './thumbnailCache';
import { renderThumbnail } from './thumbnailRenderer';

export type { ThumbnailModel };

export function ModelThumbnail({ model }: { model: ThumbnailModel }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (typeof WebGLRenderingContext === 'undefined') return;
    let active = true;
    void cachedThumbnail(model, () => renderThumbnail(model))
      .then((image) => {
        if (active) setUrl(image);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [model]);
  return (
    <span className={'model-thumbnail model-' + model} aria-hidden="true">
      {url && <img src={url} alt="" />}
    </span>
  );
}
