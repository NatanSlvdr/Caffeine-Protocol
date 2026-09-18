import { ArrowRight } from 'lucide-react';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import type { LevelDefinition, RobotPrograms, RobotRole } from '@/domain';
import { pad2 } from '@/shared/lib/format';
import type { ShiftBrief } from '../Workspace';

export interface HelpModalProps {
  index: number;
  lesson: { note: string; solution: string; robotSolution?: RobotPrograms };
  brief: ShiftBrief;
  level: LevelDefinition;
  role: RobotRole;
  observation: boolean;
  running: boolean;
  showSolution: boolean;
  onToggleSolution: () => void;
  onUseExample: (source: string) => void;
  onClose: () => void;
}

/** Shift field notes: lesson, goal, star targets, and the worked example. */
export function HelpModal({
  index,
  lesson,
  brief,
  level,
  role,
  observation,
  running,
  showSolution,
  onToggleSolution,
  onUseExample,
  onClose,
}: HelpModalProps) {
  return (
    <Modal title={`Shift ${pad2(index + 1)} · Field notes`} onClose={onClose}>
      <div className="lesson-note">{lesson.note}</div>
      <p>{brief.story}</p>
      <p>
        <strong>Your goal:</strong> {brief.objective}
      </p>
      {!observation && (
        <>
          <div className="help-targets">
            <span>★ Correct tickets</span>
            <span>
              ★★ ≤ {level.block_target} blocks
            </span>
            <span>
              ★★★ ≤ {level.instruction_target} steps
            </span>
          </div>
          <button onClick={onToggleSolution}>{showSolution ? 'Hide worked example' : 'Reveal worked example'}</button>
          {showSolution && (
            <>
              <pre className="code-example">{lesson.robotSolution?.[role] ?? lesson.solution}</pre>
              <Button
                variant="primary"
                disabled={running}
                onClick={() => {
                  onUseExample(lesson.robotSolution?.[role] ?? lesson.solution);
                }}
              >
                Use this example <ArrowRight size={15} />
              </Button>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
