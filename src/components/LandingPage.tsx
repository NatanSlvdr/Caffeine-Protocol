import { ArrowRight, Play } from 'lucide-react';
import type { ProgressSave } from '../domain/types';
import { Cafe } from './Cafe';

export function LandingPage({ save, onContinue, onExplore }: { save: ProgressSave; onContinue: () => void; onExplore: () => void }) {
  const started = Object.keys(save.stars).length > 0;
  return <main className="welcome-page">
    <section className="welcome-hero">
      <div className="welcome-copy"><div className="eyebrow"><span className="status-dot"/> A COZY PROGRAMMING ADVENTURE</div><h1>A little café.<br/>A lot of <em>possibility.</em></h1><p>A secondhand robot. A fresh start. Bring your little café to life, one routine at a time.</p><div className="welcome-actions"><button className="primary large" onClick={onContinue}><Play size={16} fill="currentColor"/>{started ? 'Continue your café' : 'Open the café'}<ArrowRight size={18}/></button><button className="welcome-explore" onClick={onExplore}>Explore the trail <ArrowRight size={15}/></button></div></div>
      <div className="welcome-scene"><Cafe level={save.selected + 1} reduced={save.settings.reduced_motion} pixelArt={save.settings.pixel_art}/><div className="welcome-dialogue"><span className="note-icon">Q<span>••</span></span><div><small>MEET QUERY</small><strong>“What is a coffee?”</strong></div></div></div>
    </section>
  </main>;
}
