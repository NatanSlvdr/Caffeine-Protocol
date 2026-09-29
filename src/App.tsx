import { useEffect, useState } from 'react';
import { lessons, CAMPAIGN_LENGTH } from '@/data';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import { Workspace } from '@/features/workspace/Workspace';
import { GuideWindow } from '@/app/GuideWindow';
import { SaveNotice } from '@/app/SaveNotice';
import { SettingsWindow } from '@/app/SettingsWindow';
import { HomePage } from '@/shell/HomePage';
import { CampaignPage } from '@/shell/CampaignPage';
import { EndingPage, ScenePage } from '@/shell/StoryPages';
import { sceneById, sceneOpen, waitingScene } from '@/data/campaign/cutscenes';
import { GameProvider, useGame, useShift } from '@/state/GameStore';
import { go, onOpenGuide, onOpenSettings } from '@/shared/lib/navigation';
import { useSound } from '@/hooks/useSound';

export default function App() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  );
}

function Shell() {
  const { save, route, update, select, completeShift, resetCafe } = useGame();
  const [modal, setModal] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  useEffect(() => onOpenSettings(() => setSettingsOpen(true)), []);
  useEffect(() => onOpenGuide(() => setGuideOpen(true)), []);
  // A hand-typed address like #/shift/abc falls back to the home page rather than loading no shift at all.
  const requested = Number(route.split('/')[2] || 1);
  const index = Number.isInteger(requested) ? Math.max(0, Math.min(CAMPAIGN_LENGTH - 1, requested - 1)) : 0;
  // The next shift waits behind its scene; the address can't skip it.
  const accessible = Number.isInteger(requested) && index <= save.unlocked && !waitingScene(save, index);
  const page = route.split('/')[1];
  // The closing scene belongs to the ending page, which shows the receipt after it.
  const scene = page === 'scene' ? sceneById(route.split('/')[2] ?? '') : undefined;
  const watchable = !!scene && sceneOpen(save, scene) && scene.before < CAMPAIGN_LENGTH;
  const screen =
    page === 'shift' && accessible
      ? 'workspace'
      : page === 'scene' && watchable
        ? 'scene'
        : page === 'campaign' || page === 'settings'
          ? 'campaign'
          : page === 'ending' && save.complete
            ? 'ending'
            : 'home';
  const shift = useShift(index);
  const playSuccess = useSound('success');
  const playRetry = useSound('retry');
  return (
    <div className={`app ${screen}`}>
      <div className="app-body">
        {screen === 'home' && <HomePage />}
        {screen === 'campaign' && <CampaignPage />}
        {screen === 'workspace' && (
          <Workspace
            key={index}
            index={index}
            save={save}
            update={update}
            lessons={lessons}
            shift={shift}
            isLastShift={index === CAMPAIGN_LENGTH - 1}
            onNext={() => {
              if (index === CAMPAIGN_LENGTH - 1) go('/ending');
              else {
                // A scene waiting before the next shift plays straight away.
                const next = waitingScene(save, index + 1);
                select(index + 1);
                go(next ? `/scene/${next.id}` : '/campaign');
              }
            }}
            onComplete={(stars, querySource, programs) => completeShift(index, stars, querySource, programs)}
            onSound={(passed) => (passed ? playSuccess() : playRetry())}
          />
        )}
        {screen === 'scene' && scene && <ScenePage key={scene.id} scene={scene} />}
        {screen === 'ending' && <EndingPage />}
      </div>
      <SaveNotice />
      {(settingsOpen || page === 'settings') && (
        <SettingsWindow
          onNew={() => setModal('new')}
          onClose={() => {
            setSettingsOpen(false);
            if (page === 'settings') go('/campaign');
          }}
        />
      )}
      {modal === 'new' && (
        <Modal
          className="settings-window confirm-slip"
          kicker="A fresh start"
          title="Start a new café?"
          onClose={() => setModal('')}
        >
          <p>This clears all shifts, stars, programs and story progress. Your audio and display settings will stay.</p>
          <p>Export your current café first if you want to return to it.</p>
          <div className="modal-buttons">
            <button className="settings-chip" onClick={() => setModal('')}>
              Keep my café
            </button>
            <Button
              variant="danger"
              onClick={() => {
                resetCafe();
                setModal('');
                setSettingsOpen(false);
              }}
            >
              Start new café
            </Button>
          </div>
        </Modal>
      )}
      {guideOpen && <GuideWindow onClose={() => setGuideOpen(false)} />}
    </div>
  );
}
