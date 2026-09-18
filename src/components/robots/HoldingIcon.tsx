import { Bean, Droplets, Leaf, ScrollText, CupSoda } from 'lucide-react';
import type { Cargo } from '@/domain';
import { ModelThumbnail } from '../thumbnails/ModelThumbnail';

/** Use the same drink models as the editor, with small badges for paper and preparation. */
export function HoldingIcon({ item, stage }: { item?: string; stage: Cargo['stage'] | 'paper' }) {
  if (stage === 'beans' || stage === 'ground') return <Bean size={36} aria-hidden="true" />;
  if (stage === 'leaves') return <Leaf size={36} aria-hidden="true" />;
  if (stage === 'dirty') return <CupSoda size={36} aria-hidden="true" />;
  if (!item) return <ScrollText size={36} aria-hidden="true" />;
  return (
    <>
      <ModelThumbnail model={item === 'tea' ? 'tea' : 'coffee'} />
      {(stage === 'claimed' || stage === 'paper') && <ScrollText className="holding-badge" size={16} aria-hidden="true" />}
      {stage === 'water' && <Droplets className="holding-badge" size={16} aria-hidden="true" />}
    </>
  );
}
