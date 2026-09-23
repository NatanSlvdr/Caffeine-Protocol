import { useState } from 'react';
import { lessons, CAMPAIGN_LENGTH } from '@/data';
import { stories } from '@/data/campaign/narrative';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import { Workspace } from '@/features/workspace/Workspace';
import { SettingsPage } from '@/app/SettingsPage';
import { AppHeader } from '@/shell/AppHeader';
import { Rail } from '@/shell/Rail';
import { HomePage } from '@/shell/HomePage';
import { CampaignPage } from '@/shell/CampaignPage';
import { EndingPage, InterludePage } from '@/shell/StoryPages';
import { GameProvider, useGame, useShift } from '@/state/GameStore';
import { go } from '@/shared/lib/navigation';
import { useSound } from '@/hooks/useSound';

export default function App() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  );
}

function Shell() {
  const { save, saveError, route, update, select, completeShift, resetCafe } = useGame();
  const [modal, setModal] = useState('');
  const index = Math.max(0, Math.min(CAMPAIGN_LENGTH - 1, Number(route.split('/')[2] || 1) - 1));
  const accessible = Number.isInteger(index) && index <= save.unlocked;
  const page = route.split('/')[1];
  const screen =
    page === 'shift' && accessible
      ? 'workspace'
      : page === 'campaign'
        ? 'campaign'
        : page === 'settings'
          ? 'settings'
          : page === 'interlude' && accessible && stories[index]
            ? 'interlude'
            : page === 'ending' && save.complete
              ? 'ending'
              : 'home';
  const shift = useShift(index);
  const playSuccess = useSound('success');
  const playRetry = useSound('retry');
  return (
    <div className={`app ${screen}`}>
      {screen !== 'home' && screen !== 'campaign' && <AppHeader />}
      <div className="app-body">
        {screen !== 'home' && screen !== 'campaign' && screen !== 'workspace' && (
          <Rail screen={screen} onGuide={() => setModal('guide')} />
        )}
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
            saveError={saveError}
            isLastShift={index === CAMPAIGN_LENGTH - 1}
            onNext={() => {
              if (index === CAMPAIGN_LENGTH - 1) go('/ending');
              else {
                select(index + 1);
                go('/campaign');
              }
            }}
            onComplete={(stars, querySource, programs) => completeShift(index, stars, querySource, programs)}
            onSound={(passed) => (passed ? playSuccess() : playRetry())}
          />
        )}
        {screen === 'settings' && <SettingsPage onNew={() => setModal('new')} />}
        {screen === 'interlude' && <InterludePage index={index} />}
        {screen === 'ending' && <EndingPage />}
      </div>
      {modal === 'new' && (
        <Modal title="Start a new café?" onClose={() => setModal('')}>
          <p>This clears all shifts, stars, programs and story progress. Your audio and display settings will stay.</p>
          <p>Export your current café first if you want to return to it.</p>
          <div className="modal-buttons">
            <button onClick={() => setModal('')}>Keep my café</button>
            <Button
              variant="danger"
              onClick={() => {
                resetCafe();
                setModal('');
              }}
            >
              Start new café
            </Button>
          </div>
        </Modal>
      )}
      {modal === 'guide' && (
        <Modal title="A little logic. A lot of heart." onClose={() => setModal('')}>
          <p>
            Follow 32 shifts. Query takes orders from shift 3; Brew takes over the kitchen at shift 15; Porter takes
            over the floor at shift 23. Moka handles the kitchen and Pip handles the floor automatically until you
            program those roles. MOVE uses screen directions and whole tiles. Blocked moves stop early; customers never
            block paths. Use station actions beside the matching equipment. Query moves right one tile to Submit Ticket
            at the shared kitchen counter, then left one tile back to the register, where checkout is automatic. Coffee
            costs 3 credits and tea 2; sugar is included.
          </p>
          <p>
            Choose a block from the library and click its action name to append it to your routine, or drag it to a drop
            position. Set its values in the code pane; library selectors only preview the available options. Drag its
            grip to move a complete branch, loop or function. Drop a block into the optional else area to add an
            alternative. Move the empty destination tile to route a jump. Grip controls also work with Space, arrow keys
            and Space to drop.
          </p>
          <p>
            Run service with <kbd>Ctrl / ⌘ + Enter</kbd>. Run the current shift one instruction at a time. One star
            rewards correctness; the second rewards the block target, and the third rewards the step target.
          </p>
          <p>
            Follow each customer’s request above their head. If an instruction fails, its line is highlighted and you
            can edit immediately. Help in each shift includes its lesson and a worked example.
          </p>
        </Modal>
      )}
    </div>
  );
}
