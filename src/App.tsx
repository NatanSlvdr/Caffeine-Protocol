import { Suspense, useEffect, useRef, useState } from 'react';
import { lessons, CAMPAIGN_LENGTH } from '@/data';
import { GuideWindow } from '@/app/GuideWindow';
import { NewCafeModal } from '@/app/NewCafeModal';
import { MemoryShift, preloadScreens, ScreenLoading, SpecialShift, Workspace } from '@/app/screens';
import { SaveNotice } from '@/app/SaveNotice';
import { SettingsWindow } from '@/app/SettingsWindow';
import { HomePage } from '@/shell/HomePage';
import { CampaignPage } from '@/shell/CampaignPage';
import { EndingPage, ScenePage } from '@/shell/StoryPages';
import { narrativeFor } from '@/data/campaign/narrative';
import { drills } from '@/data/drills';
import { memoryById, memoryOpen } from '@/data/memories';
import { specialById } from '@/data/specials';
import { sceneById, sceneOpen, waitingScene } from '@/data/campaign/cutscenes';
import { GameProvider, useGame, useShift } from '@/state/GameStore';
import { go, onOpenGuide, onOpenSettings } from '@/shared/lib/navigation';
import { pad2 } from '@/shared/lib/format';
import { reclaimFocus } from '@/shared/lib/focus';
import { DialoguePaceContext } from '@/components';

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
  // The shift screens come after startup: fetched once the page is idle, so a shift opens without a wait.
  useEffect(() => {
    const fetch = () => void preloadScreens().catch(() => undefined);
    if (typeof requestIdleCallback !== 'function') {
      const timer = window.setTimeout(fetch, 1500);
      return () => window.clearTimeout(timer);
    }
    const idle = requestIdleCallback(fetch, { timeout: 4000 });
    return () => cancelIdleCallback(idle);
  }, []);
  // A hand-typed address like #/shift/abc falls back to the home page rather than loading no shift at all.
  const requested = Number(route.split('/')[2] || 1);
  const index = Number.isInteger(requested) ? Math.max(0, Math.min(CAMPAIGN_LENGTH - 1, requested - 1)) : 0;
  // The next shift waits behind its scene; the address can't skip it.
  const accessible = Number.isInteger(requested) && index <= save.unlocked && !waitingScene(save, index);
  const page = route.split('/')[1];
  // The closing scene belongs to the ending page, which shows the receipt after it.
  const scene = page === 'scene' ? sceneById(route.split('/')[2] ?? '') : undefined;
  const watchable = !!scene && sceneOpen(save, scene) && scene.before < CAMPAIGN_LENGTH;
  // The specials open once the campaign is finished.
  const special = page === 'special' && save.complete ? specialById(route.split('/')[2] ?? '') : undefined;
  // A memory opens once the shift that brings it out is served.
  const remembered = page === 'memory' ? memoryById(route.split('/')[2] ?? '') : undefined;
  const memory = remembered && memoryOpen(save, remembered) ? remembered : undefined;
  const screen =
    page === 'shift' && accessible
      ? 'workspace'
      : special
        ? 'special'
        : memory
          ? 'memory'
          : page === 'scene' && watchable
            ? 'scene'
            : page === 'campaign' || page === 'settings'
              ? 'campaign'
              : page === 'ending' && save.complete
                ? 'ending'
                : 'home';
  const shift = useShift(index);
  // The tab names the screen, so browser history and screen readers can tell the pages apart.
  const title = {
    home: '',
    campaign: 'Choose a shift',
    workspace: `Shift ${pad2(index + 1)}: ${shift.title}`,
    special: `Special: ${special?.title}`,
    memory: `Memory: ${memory?.title}`,
    scene: scene?.title ?? '',
    ending: 'Closing time',
  }[screen];
  useEffect(() => {
    document.title = title ? `${title} · Caffeine Protocol` : 'Caffeine Protocol';
  }, [title]);
  // The button that changed the screen is gone with the old one; pick focus up on the new screen's title.
  const shown = useRef(title);
  useEffect(() => {
    if (shown.current === title) return;
    shown.current = title;
    reclaimFocus();
  }, [title]);
  return (
    // A special and a memory are shifts too, and lay out as one.
    <div className={`app ${screen === 'special' || screen === 'memory' ? `workspace ${screen}` : screen}`}>
      {/* Every dialogue box, in a shift or a scene, keeps to the pace chosen in the house settings. */}
      <DialoguePaceContext value={save.settings.dialogue_pace}>
        <div className="app-body">
          {/* Only a shift opened before its screen has arrived waits here, and then only for a moment. */}
          <Suspense fallback={<ScreenLoading />}>
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
                drills={drills}
                nextShift={index < CAMPAIGN_LENGTH - 1 ? narrativeFor(index + 1).title : undefined}
                onNext={() => {
                  if (index === CAMPAIGN_LENGTH - 1) go('/ending');
                  else {
                    // A scene waiting before the next shift plays straight away.
                    const next = waitingScene(save, index + 1);
                    select(index + 1);
                    go(next ? `/scene/${next.id}` : '/campaign');
                  }
                }}
                onComplete={(stars, querySource, programs, met) =>
                  completeShift(index, stars, querySource, programs, met)
                }
              />
            )}
            {screen === 'special' && special && <SpecialShift key={special.id} special={special} />}
            {screen === 'memory' && memory && <MemoryShift key={memory.id} memory={memory} />}
            {screen === 'scene' && scene && <ScenePage key={scene.id} scene={scene} />}
            {screen === 'ending' && <EndingPage />}
          </Suspense>
        </div>
      </DialoguePaceContext>
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
        <NewCafeModal
          onClose={() => setModal('')}
          onConfirm={() => {
            resetCafe();
            setModal('');
            setSettingsOpen(false);
          }}
        />
      )}
      {guideOpen && <GuideWindow onClose={() => setGuideOpen(false)} />}
    </div>
  );
}
