import { line } from '../../domain/dialogue';
import type { DialogueLine, Speaker } from '../../domain/dialogue';
import type { ProgressSave } from '../../domain/types';

/** One still of a cutscene and the lines spoken over it. */
export interface CutscenePanel {
  /** What the picture shows, printed on its placeholder card until the art is in. */
  art: string;
  lines: DialogueLine[];
}

export interface Cutscene {
  /** Folder name under assets/cutscenes/. */
  id: string;
  title: string;
  /** One line for the specials board. */
  logline: string;
  /** Zero-based shift the scene opens; the campaign length for the closing scene. */
  before: number;
  panels: CutscenePanel[];
}

type ScriptLine = readonly [Speaker, string];
const panel = (art: string, lines: readonly ScriptLine[]): CutscenePanel => ({
  art,
  lines: lines.map(([speaker, text]) => line(speaker, text)),
});

/** Story scenes between shifts, in campaign order. Prompts for their art: docs/game_design/cutscene_prompts.md. */
export const cutscenes: Cutscene[] = [
  {
    id: 'the-keys',
    title: 'The Keys',
    logline: 'Aunt Lou leaves Niko her café, and an old friend comes with it.',
    before: 0,
    panels: [
      panel('A rainy evening. Niko stands outside the shuttered café with a suitcase, a ring of keys and a note.', [
        ['', 'A parcel from the seaside: a ring of keys and a note.'],
        ['', '“The café is yours now, Niko. Be kind to the espresso machine. — Aunt Lou”'],
      ]),
      panel(
        'Inside, in the dark. Chairs upside down on the tables. Niko pulls a dust sheet off the espresso machine.',
        [
          ['niko:surprised', 'Huh. Smaller than I remembered.'],
          ['niko', 'It still smells like coffee. Old coffee. But coffee.'],
        ],
      ),
      panel('A dark shape in the doorway, backlit by the street lamp. Niko spins round, brandishing a portafilter.', [
        ['', 'Behind him, the door slides open. A dark shape stands in the rain.'],
        ['niko:surprised', 'We’re— we’re closed! Very closed! I have a… portafilter!'],
      ]),
      panel('Moka steps in, shaking out her umbrella. She is not impressed.', [
        ['moka', 'Put that down before you hurt the machine.'],
        ['moka', 'Moka. I ran that machine next to your aunt for forty years. I live across the street. Saw a light.'],
        ['moka', 'Lou said you’d come. She didn’t say you’d be this jumpy.'],
        ['niko:worried', 'Nice to… meet you?'],
        ['moka', 'We’ll see. We open tomorrow. Six sharp.'],
      ]),
      panel('The next morning, bright sun. Pip has his nose pressed against the front window.', [
        ['pip', 'Are you open? Can I help? I’m really fast!'],
        ['moka', 'That’s Pip. Lives upstairs. Saving his pocket money for something. It changes every week.'],
        ['pip', 'A bike, this week! And I helped at my mum’s restaurant all last summer. I know trays!'],
        ['moka', 'He’s quick, he’s kind, and he’s never once dropped a cup. Hire him.'],
        ['niko:happy', 'Welcome aboard, Pip.'],
      ]),
    ],
  },
  {
    id: 'the-scrapyard',
    title: 'The Scrapyard',
    logline: 'Too many tickets for one pair of hands. Somewhere in the scrapyard, help is waiting.',
    before: 2,
    panels: [
      panel('After the rush. Niko slumps on the counter under a mountain of handwritten tickets while Moka sweeps.', [
        ['niko:worried', 'Eighty-three tickets. My hand is cramping in shapes I didn’t know existed.'],
        [
          'moka',
          'Lou always said this place would run itself one day. She had a counter robot once. It went to the scrapyard when it broke.',
        ],
        ['niko:surprised', 'A robot? Which scrapyard?'],
      ]),
      panel('The scrapyard at sunset. A cream robot head pokes out of a pile of old toasters.', [
        ['', 'The scrapyard at the edge of town. Old toasters, vending machines, a jukebox that only plays one song.'],
        ['niko:surprised', 'Is that… a name plate? “Q-U-E-R-Y.”'],
      ]),
      panel(
        'The back room at two in the morning. The robot lies open on the workbench beside three empty charging docks.',
        [
          ['', 'Two in the morning. Three cold coffees. One manual, with most of its pages.'],
          ['', 'Against the wall, three charging docks that nobody has used in years.'],
        ],
      ),
      panel('Close-up: the robot’s visor lights up mint green, and the glow falls on Niko’s face.', [
        ['query', '*bip… bip… BOOP*'],
        ['niko:happy', 'Hello, Query.'],
      ]),
    ],
  },
  {
    id: 'a-second-pair-of-hands',
    title: 'A Second Pair of Hands',
    logline: 'Query earns its badge, and the kitchen drowns in tickets.',
    before: 14,
    panels: [
      panel('An “Employee of the Month” photo on the wall. Query wears its badge; Mr. Albert applauds.', [
        ['niko:happy', 'Employee of the Month. First month. Only employee. Still counts.'],
        ['query', '*bip* Badge polished. Forty-two times.'],
        ['albert:happy', 'Well deserved. It remembered my usual.'],
      ]),
      panel('The ticket tray at the handoff overflows onto the floor. Moka is buried behind it.', [
        ['moka', 'Your robot writes faster than I can pour. It’s snowing tickets in here.'],
        ['niko:worried', 'So now the kitchen is the bottleneck.'],
      ]),
      panel(
        'Back at the scrapyard, Query rides in the wheelbarrow. Under a tarp, a steel-blue robot hugs an old espresso machine.',
        [
          ['', 'Under a tarp, a steel-blue robot is hugging a broken espresso machine. It will not let go.'],
          ['query', '*bip* Same model detected. Sibling.'],
        ],
      ),
      panel('Brew wakes up on the workbench. Moka watches from the doorway, arms crossed.', [
        ['brew', '*BEEP BEEP!*'],
        ['moka', 'If it touches my machine before it’s trained, I’m unplugging it.'],
      ]),
    ],
  },
  {
    id: 'ninety-two-degrees',
    title: 'Ninety-Two Degrees',
    logline: 'Moka’s last morning in the kitchen.',
    before: 21,
    panels: [
      panel('Dawn. Moka, alone in the kitchen, polishes the espresso machine one last time.', [
        ['', 'Early morning. Moka came in before everyone, to polish the machine one last time.'],
      ]),
      panel('Moka hands her tamper to Brew while Niko and Query watch.', [
        ['moka', 'Forty years of espresso. I’ve earned a porch chair.'],
        ['niko:worried', 'Moka, you don’t have to…'],
        ['moka', 'Ninety-two degrees, Brew. Always.'],
        ['brew', '*sad beep* Ninety-two. Always.'],
      ]),
      panel('Her apron hangs on a hook by the kitchen door, with a note pinned to it: 92°.', [
        ['moka', 'And you, the one writing its code: it only knows what you tell it. Look after my kitchen.'],
      ]),
      panel('Moka on her porch across the street, cup in hand, watching the café window.', [
        ['', 'From her porch across the street, Moka can see the machine through the window. Just in case.'],
      ]),
    ],
  },
  {
    id: 'the-floor-robot',
    title: 'The Floor Robot',
    logline: 'Pip can’t be everywhere, and school starts soon.',
    before: 22,
    panels: [
      panel('A packed café floor. Pip runs with too many trays while Rosa’s group waves.', [
        ['pip', 'Table four! Table two! Table… which one was four?!'],
        ['rosa:happy', 'Over here, sweetie! And another round when you can!'],
      ]),
      panel('A wall calendar with the end of August circled: SCHOOL.', [
        ['pip', 'School starts soon. Who’s going to run the floor when I’m gone?'],
        ['niko', 'I’ve got an idea. Grab the wheelbarrow.'],
      ]),
      panel('The scrapyard. Under a broken parasol sits a honey-gold robot, still holding a tray perfectly level.', [
        ['pip', 'Look! It’s holding the tray perfectly flat! Can we keep it? Please please please?'],
      ]),
      panel('Porter wakes up, tray raised. All three charging docks are taken.', [
        ['porter', '*ding ding!*'],
        ['', 'Three docks. Three robots. Aunt Lou would be pleased.'],
      ]),
    ],
  },
  {
    id: 'back-to-school',
    title: 'Back to School',
    logline: 'Pip’s first day of school, and Niko’s first day as just the owner.',
    before: 30,
    panels: [
      panel('Morning. Pip stands at the door with a school bag; the three robots line up to say goodbye.', [
        ['pip', 'First day of school. Don’t let anyone touch my tray.'],
        ['porter', '*sad beep* Who teach Porter?'],
        ['pip', 'Whoever writes your code, silly!'],
      ]),
      panel('Pip runs off down the street, waving. Porter waves back with its tray.', [
        ['pip', 'I’ll come by after school! Save me a hot chocolate!'],
      ]),
      panel('Niko hangs his apron on the hook next to Moka’s.', [
        ['niko', 'Query takes the orders. Brew makes them. Porter brings them out.'],
        ['niko:happy', 'From today, I’m just the owner.'],
      ]),
    ],
  },
  {
    id: 'closing-time',
    title: 'Closing Time',
    logline: 'The café runs itself. Everyone comes by at the end of the day.',
    before: 32,
    panels: [
      panel('Sunset. A full café: the regulars at their tables, the three robots at work.', [
        ['', 'Closing time. The last cup is on its way to the sink.'],
      ]),
      panel('Niko at the counter with a coffee he made himself. Query watches him.', [
        ['query', '*bip* Niko drinking coffee. No ticket written.'],
        ['niko:happy', 'I made it myself. Old habits.'],
        ['query', 'Not in instruction set.'],
        ['niko:happy', 'It is now.'],
      ]),
      panel('Moka comes over from her porch and Pip comes in from school.', [
        ['moka', 'Ninety-two degrees. Good.'],
        ['pip', 'Tables are clean!'],
        ['moka', 'Not bad, for someone who started with one ticket. Same time tomorrow.'],
      ]),
      panel('A group photo on the wall, and a postcard from the sea pinned beside it.', [
        ['', 'A week later, a postcard arrives from the sea. It just says: “Told you so. — Lou”'],
      ]),
    ],
  },
];

/** The scene that opens a shift, if there is one. */
export const sceneBefore = (shift: number): Cutscene | undefined => cutscenes.find((scene) => scene.before === shift);

export const sceneById = (id: string): Cutscene | undefined => cutscenes.find((scene) => scene.id === id);

/** Every line of a scene in order, each with the panel it plays over. */
export function sceneLines(scene: Cutscene): { lines: DialogueLine[]; panels: number[] } {
  const lines = scene.panels.flatMap((panel) => panel.lines);
  const panels = scene.panels.flatMap((panel, index) => panel.lines.map(() => index));
  return { lines, panels };
}

type SceneProgress = Pick<ProgressSave, 'unlocked' | 'complete' | 'stars' | 'story'>;

/** A scene opens once the shift before it is served; the closing scene once the campaign is. */
export const sceneOpen = (save: SceneProgress, scene: Cutscene): boolean =>
  scene.before <= save.unlocked || save.complete;

/** Seen scenes are marked in the save's story map under the shift they open. The closing scene, past the last shift, counts as seen once the campaign is complete. */
export const sceneSeen = (save: SceneProgress, scene: Cutscene): boolean =>
  save.story[scene.before] === true || (save.complete && scene.before > save.unlocked);

/** The unseen scene holding back the next unplayed shift. Only that shift waits, so older saves never lose access to shifts they had already unlocked. */
export function waitingScene(save: SceneProgress, shift: number): Cutscene | undefined {
  const scene = sceneBefore(shift);
  return scene && shift === save.unlocked && save.stars[shift] === undefined && !sceneSeen(save, scene)
    ? scene
    : undefined;
}
