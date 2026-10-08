import { Suspense, useEffect, useRef, useState } from 'react';
import { lessons, CAMPAIGN_LENGTH } from '@/data';
import { GuideWindow } from '@/app/GuideWindow';
import { NewCafeModal } from '@/app/NewCafeModal';
import { LongDayShift, MemoryShift, preloadScreens, ScreenLoading, SpecialShift, Workspace } from '@/app/screens';
import { SaveNotice } from '@/app/SaveNotice';
import { SettingsWindow } from '@/app/SettingsWindow';
import { HomePage } from '@/shell/HomePage';
import { CampaignPage } from '@/shell/CampaignPage';
import { EndingPage, ScenePage } from '@/shell/StoryPages';
import { drillsIn } from '@/data/drills';
import { memoryById, memoryIn, memoryOpen } from '@/data/memories';
import { specialById } from '@/data/specials';
import { longDay } from '@/data/longDay';
import { waveOpen } from '@/features/campaign/save/endurance';
import { sceneById, sceneIn, sceneOpen, waitingScene } from '@/data/campaign/cutscenes';
import { GameProvider, useGame, useNarrative, useShift } from '@/state/GameStore';
import { go, onOpenGuide, onOpenSettings } from '@/shared/lib/navigation';
import { pad2 } from '@/shared/lib/format';
import { reclaimFocus } from '@/shared/lib/focus';
import { DialoguePaceContext } from '@/components';
import { LanguageProvider, useLanguage, useWords } from '@/shared/language';
import { SCREEN_WORDS } from '@/app/screenWords';

export default function App() {
  return (
    <LanguageProvider>
      <GameProvider>
        <Shell />
      </GameProvider>
    </LanguageProvider>
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
  // A wave of the Long Day opens once the day has reached it, on the waves as they are now.
  const wave = page === longDay.id ? Number(route.split('/')[2]) : NaN;
  const day = save.complete && wave <= longDay.waves.length && waveOpen(save, wave, longDay.version);
  const screen =
    page === 'shift' && accessible
      ? 'workspace'
      : special
        ? 'special'
        : memory
          ? 'memory'
          : day
            ? 'long-day'
            : page === 'scene' && watchable
              ? 'scene'
              : page === 'campaign' || page === 'settings'
                ? 'campaign'
                : page === 'ending' && save.complete
                  ? 'ending'
                  : 'home';
  const shift = useShift(index);
  const narrative = useNarrative();
  const tab = useWords(SCREEN_WORDS).tab;
  const [language] = useLanguage();
  // The tab names the screen, so browser history and screen readers can tell the pages apart.
  const title = {
    home: '',
    campaign: tab.campaign,
    workspace: tab.shift(pad2(index + 1), shift.title),
    special: tab.special(special?.title ?? ''),
    memory: tab.memory(memory ? memoryIn(memory, language).title : ''),
    'long-day': tab.wave(longDay.title, wave),
    scene: scene ? sceneIn(scene, language).title : '',
    ending: tab.ending,
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
    // A special, a memory and a wave of the Long Day are shifts too, and lay out as one.
    <div
      className={`app ${screen === 'special' || screen === 'memory' || screen === 'long-day' ? `workspace ${screen}` : screen}`}
    >
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
                drills={drillsIn(language)}
                nextShift={index < CAMPAIGN_LENGTH - 1 ? narrative[index + 1].title : undefined}
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
            {screen === 'long-day' && <LongDayShift key={wave} number={wave} />}
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
