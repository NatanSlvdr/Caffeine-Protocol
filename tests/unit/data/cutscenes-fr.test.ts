import { describe, expect, it } from 'vitest';
import { cutscenes, sceneIn, sceneLines } from '@/data/campaign/cutscenes';
import { cutscenesFr } from '@/data/campaign/cutscenes.fr';
import type { DialogueLine } from '@/domain';

/** How many sound effects a line makes: the French says its own, as many as the English. */
const sounds = (text: string) => (text.match(/\*[^*]+\*/g) ?? []).length;
/** A line as spoken, its words left out: who says it, how, and what it asks or recalls. */
const shape = ({ text: _text, choice, ...rest }: DialogueLine) => ({
  ...rest,
  choice: choice && { id: choice.id, options: choice.options.map((option) => option.id) },
});

describe('the scenes between shifts in French', () => {
  it('tells every scene the English does, and none it doesn’t', () => {
    expect(Object.keys(cutscenesFr)).toEqual(cutscenes.map((scene) => scene.id));
  });

  it('tells each scene panel for panel and line for line, by the same speakers, with as many sounds', () => {
    for (const en of cutscenes) {
      const fr = sceneIn(en, 'fr');
      const told = cutscenesFr[en.id];
      expect(told.panels, en.id).toHaveLength(en.panels.length);
      expect({ id: fr.id, before: fr.before }).toEqual({ id: en.id, before: en.before });
      expect(fr.title).not.toBe(en.title);
      expect(fr.logline).not.toBe(en.logline);
      en.panels.forEach((panel, p) => {
        const where = `${en.id}, panel ${p + 1}`;
        expect(told.panels[p], where).toHaveLength(panel.lines.length + 1);
        expect(fr.panels[p].art, where).not.toBe(panel.art);
        expect(fr.panels[p].lines.map(shape), where).toEqual(panel.lines.map(shape));
        fr.panels[p].lines.forEach((line, i) => {
          expect(line.text.trim(), `${where}, line ${i + 1}`).not.toBe('');
          expect(sounds(line.text), `${where}, line ${i + 1}`).toBe(sounds(panel.lines[i].text));
        });
      });
    }
  });

  it('answers each choice in French, with the same answers saved', () => {
    const asked = cutscenes.flatMap((scene) =>
      scene.panels.flatMap((panel) => panel.lines.filter((line) => line.choice).map((line) => ({ scene, line }))),
    );
    expect(asked.map(({ line }) => line.choice!.id)).toEqual(['hello-query', 'hot-chocolate']);
    for (const { scene, line } of asked) {
      expect(Object.keys(cutscenesFr[scene.id].options ?? {})).toEqual(line.choice!.options.map((option) => option.id));
      const fr = sceneIn(scene, 'fr')
        .panels.flatMap((panel) => panel.lines)
        .find((each) => each.choice?.id === line.choice!.id)!;
      line.choice!.options.forEach((option, o) => {
        const answer = fr.choice!.options[o];
        expect(answer.id).toBe(option.id);
        expect(answer.label).not.toBe(option.label);
        expect(answer.lines.map(shape), option.id).toEqual(option.lines.map(shape));
        answer.lines.forEach((each, i) => expect(sounds(each.text)).toBe(sounds(option.lines[i].text)));
      });
    }
  });

  it('recalls an earlier answer in French, as the English does', () => {
    const closing = sceneIn(cutscenes.at(-1)!, 'fr');
    const said = sceneLines(closing, { 'hello-query': 'minding', 'hot-chocolate': 'ours' }).lines.map((l) => l.text);
    expect(said).toContain('Et le chocolat chaud de samedi avait plein de guimauves. À notre façon.');
    expect(said).toContain('*bip* Mise à jour. Niko plus gardien. Café : Chez Niko. Enregistré.');
    expect(said).not.toContain('*bip* Café : Chez Niko. Enregistré depuis l’établi.');
  });

  it('leaves an English reader’s scene as it is, and gives the French the same scene each time', () => {
    for (const scene of cutscenes) {
      expect(sceneIn(scene, 'en')).toBe(scene);
      expect(sceneIn(scene, 'fr')).toBe(sceneIn(scene, 'fr'));
    }
  });
});
