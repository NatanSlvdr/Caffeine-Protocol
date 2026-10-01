import { describe, it, expect } from 'vitest';
import { parseSave, SAVE_KEY } from '../../../src/features/campaign/save/persistence';
import { lessons } from '../../../src/data';
import saveV1 from '../../fixtures/save-v1.json';
import saveV2 from '../../fixtures/save-v2.json';

// Historical fixtures reconstructed from migration.ts + git history:
// - v1: Act I flat drafts/solutions, no robot maps, pre-pixel_art settings,
//   retired Query syntax (TICKET/SUBMIT/CHARGE ORDER/EACH/READ/SUGAR).
// - v2: per-robot drafts with Brew/Porter routines, retired floor
//   BATTERY/CHARGE branches, Act I + later stars/story.
// They are raw serialized JSON payloads checked in as files, not
// JSON.stringify(newSave()) with a flipped version, so parseSave must prove
// compat with actual history.

describe('historical save fixtures', () => {
  it('uses a stable storage namespace, not a schema version', () => {
    // SAVE_KEY suffix is the localStorage namespace. Schema version lives
    // inside the JSON payload (version 1/2/3/4) and migrates via parseSave.
    // Renaming the key would orphan existing saves; bumping the schema must
    // not rename it.
    expect(SAVE_KEY).toBe('caffeine-protocol.v1');
  });

  it('migrates a real v1 Act I save: progress/settings preserved, Query reset per policy', () => {
    const text = JSON.stringify(saveV1);
    const raw = saveV1 as Record<string, unknown>;
    expect(raw.version).toBe(1);
    expect(raw).not.toHaveProperty('robotDrafts');
    expect(raw).not.toHaveProperty('robotSolutions');
    // Retired Query syntax present in actual history.
    expect(text).toContain('TICKET');
    expect(text).toContain('SUBMIT');
    expect(text).toContain('CHARGE ORDER');
    expect(text).toContain('SUGAR true');

    const migrated = parseSave(text, lessons);
    expect(migrated.version).toBe(4);
    // Progress preserved (mid-Act I, not the completed-Act I bump), moved onto the 21-shift
    // campaign: the old tenth shift is the new seventh, and the eighth-shift selection the new sixth.
    expect(migrated.selected).toBe(5);
    expect(migrated.unlocked).toBe(6);
    expect(migrated.complete).toBe(false);
    // Settings preserved; pre-display-option saves default pixel_art on.
    expect(migrated.settings).toEqual({
      volume: 0.6,
      music: 0.55,
      effects: 0.65,
      reduced_motion: false,
      pixel_art: true,
      text_editor: false,
      fullscreen: false,
    });
    // Incompatible Query programs retire: flat maps cleared, Act I scores
    // and story beats cleared (semantic-copy cannot map to token puzzles).
    expect(migrated.drafts).toEqual({});
    expect(migrated.solutions).toEqual({});
    expect(migrated.stars).toEqual({});
    expect(migrated.story).toEqual({});
    expect(migrated.robotSolutions).toEqual({});
    // Every surviving draft resets to its lesson starter, not a
    // char-for-char migration of the old syntax. The old sixth shift was merged away.
    expect(Object.keys(migrated.robotDrafts)).toEqual(['5', '6']);
    for (const shift of ['5', '6']) {
      expect(migrated.robotDrafts[shift].query).toBe(lessons[Number(shift)].starter);
      expect(migrated.robotDrafts[shift].prep).toBe('');
      expect(migrated.robotDrafts[shift].floor).toBe('');
    }
    expect(migrated.robotDrafts['5'].query).not.toContain('TICKET');
    expect(migrated.robotDrafts['5'].query).not.toContain('CHARGE ORDER');
    // Migrated output round-trips as current version.
    expect(parseSave(JSON.stringify(migrated), lessons)).toEqual(migrated);
  });

  it('migrates a real v2 save: Brew/Porter preserved, Query reset, floor cleaned', () => {
    const text = JSON.stringify(saveV2);
    const raw = saveV2 as Record<string, unknown>;
    expect(raw.version).toBe(2);
    expect(text).toContain('CHARGE ORDER');
    expect(text).toContain('BATTERY');

    const migrated = parseSave(text, lessons);
    expect(migrated.version).toBe(4);
    // Progress preserved in later acts: the old 24th shift is now Porter's first.
    expect(migrated.selected).toBe(13);
    expect(migrated.unlocked).toBe(13);
    expect(migrated.complete).toBe(false);
    // Settings preserved exactly (v2 already had pixel_art).
    expect(migrated.settings).toEqual({
      volume: 0.6,
      music: 0.4,
      effects: 0.65,
      reduced_motion: true,
      pixel_art: true,
      text_editor: false,
      fullscreen: false,
    });
    // Flat Query maps retire even when they contain retired payment lines.
    expect(migrated.drafts).toEqual({});
    expect(migrated.solutions).toEqual({});
    // Only later-act scores survive the token-puzzle cut, and only for shifts that still play
    // the same way; the old story beats were never scenes.
    expect(migrated.stars).toEqual({ 13: 2 });
    expect(migrated.story).toEqual({});
    // Act I robot solution retires; later Query programs reset to starters.
    expect(Object.keys(migrated.robotDrafts)).toEqual(['13']);
    expect(Object.keys(migrated.robotSolutions)).toEqual(['13']);
    expect(migrated.robotDrafts['13'].query).toBe(lessons[13].starter);
    expect(migrated.robotSolutions['13'].query).toBe(lessons[13].starter);
    expect(migrated.robotDrafts['13'].query).not.toContain('CHARGE ORDER');
    expect(migrated.robotDrafts['13'].query).not.toContain('TICKET');
    // Brew routines keep their shape; retired station verbs become Take, Use and Deposit,
    // and the retired Repeat becomes a Jump back to a marker at the top.
    const brew =
      'POSITION listen\nLISTEN\nCALL recipe\nJUMP listen\nFUNCTION recipe\nTAKE UP\nUSE UP\nTAKE UP\nUSE UP\nTAKE UP\nDEPOSIT UP\nRETURN\nEND';
    expect(migrated.robotDrafts['13'].prep).toBe(brew);
    expect(migrated.robotSolutions['13'].prep).toBe(brew);
    // Porter routines preserved; retired charging branches keep only the
    // non-charging path with comments intact.
    expect(migrated.robotDrafts['13'].floor).toBe('# my route\nLISTEN\nTAKE DOWN\nTAKE DOWN\nDEPOSIT UP');
    expect(migrated.robotDrafts['13'].floor).not.toContain('BATTERY');
    expect(migrated.robotDrafts['13'].floor).not.toContain('CHARGE');
    expect(migrated.robotSolutions['13'].floor).toBe('# porter run\nLISTEN\nTAKE DOWN\nDEPOSIT UP');
    // Migrated output round-trips as current version.
    expect(parseSave(JSON.stringify(migrated), lessons)).toEqual(migrated);
  });
});
