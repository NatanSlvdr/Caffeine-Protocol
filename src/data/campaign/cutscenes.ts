import { isSaid, line } from '../../domain/dialogue';
import type { DialogueChoices, DialogueLine, Speaker } from '../../domain/dialogue';
import type { ProgressSave } from '../../domain/types';
import { UNLOCKS } from '../../domain/unlocks';
import type { Language } from '../../shared/language';
import { cutscenesFr, type SceneFr } from './cutscenes.fr';

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
const script = (lines: readonly ScriptLine[]) => lines.map(([speaker, text]) => line(speaker, text));
const panel = (art: string, lines: readonly (ScriptLine | DialogueLine)[]): CutscenePanel => ({
  art,
  lines: lines.map((each) => ('text' in each ? each : line(...each))),
});

/** A line after which the player picks what Niko says: each answer is its id, its button, and the lines it plays. */
const ask = (
  [speaker, text]: ScriptLine,
  id: string,
  options: readonly (readonly [option: string, label: string, lines: readonly ScriptLine[]])[],
): DialogueLine => ({
  ...line(speaker, text),
  choice: { id, options: options.map(([option, label, lines]) => ({ id: option, label, lines: script(lines) })) },
});

/** A line said only when the choice `id` was answered with `option`. */
const recall = (id: string, option: string, [speaker, text]: ScriptLine): DialogueLine => ({
  ...line(speaker, text),
  recalls: { choice: id, option },
});

/** Story scenes between shifts, in campaign order. Prompts for their art: docs/game_design/cutscene_prompts.md. */
export const cutscenes: Cutscene[] = [
  {
    id: 'the-keys',
    title: 'The Keys',
    logline: 'Aunt Lou’s last card brings Niko her café, seven months late.',
    before: 0,
    panels: [
      panel(
        'A rainy evening. Niko stands outside the shuttered café with a suitcase, a ring of keys and a seaside postcard.',
        [['', 'The keys came in a padded envelope, with a postcard in Aunt Lou’s handwriting.']],
      ),
      panel('Close-up: the postcard in Niko’s hand, rain spotting the ink.', [
        ['', '“The café is yours now, Niko. Be kind to the old machine. — Lou”'],
        ['', 'Lou wrote it in March, a week before she died. The postmark says October.'],
      ]),
      panel(
        'Inside, in the dark. Chairs upside down on the tables. Niko pulls a dust sheet off the espresso machine.',
        [
          ['niko:surprised', 'Huh. Smaller than I remembered.'],
          ['niko', 'The old machine. Okay. I’ll be kind to you.'],
        ],
      ),
      panel('Close-up: the ticket spike by the register. The last ticket is in a stranger’s hand, dated June.', [
        ['', 'Someone has been here since Lou. The last ticket on the spike is in a stranger’s hand, dated June.'],
      ]),
      panel('A dark shape in the doorway, backlit by the street lamp. Niko spins round, brandishing a portafilter.', [
        ['', 'Behind him, the door slides open.'],
        ['niko:surprised', 'We’re— we’re closed! Very closed! I have a… portafilter!'],
      ]),
      panel('Moka steps in, shaking out her umbrella. She is not impressed.', [
        ['moka', 'Put that down before you hurt the machine.'],
        ['moka', 'Moka. Forty years on that machine next to your aunt. I live across the street.'],
      ]),
      panel('Niko holds out the postcard. Moka glances at it, looks away, one hand in her apron pocket.', [
        ['niko:worried', 'Her card took seven months to get here.'],
        ['moka', 'Post’s slow round here.'],
      ]),
      panel('Moka moves the cups along the shelf to the left while Niko watches.', [
        ['moka', 'We open tomorrow. Six sharp. Cups go on the left. Lou kept them on the left.'],
      ]),
      panel('The next morning, bright sun. Pip has his nose pressed against the front window.', [
        ['pip:surprised', 'Is it open? Is Lou’s open again?'],
        ['moka', 'Pip. Lives upstairs. Lou made him a hot chocolate every Saturday since he could reach the counter.'],
      ]),
      panel('Inside, Pip proudly carries a stack of empty cups while Niko ties on his apron and Moka looks on.', [
        [
          'pip',
          'And she let me carry the empties! I never dropped one. Can I help? I’m saving up for a bike. This week.',
        ],
        ['niko:happy', 'Welcome aboard, Pip.'],
        ['moka', 'Cups on the left, Pip.'],
        ['pip', 'I know!'],
      ]),
    ],
  },
  {
    id: 'the-scrapyard',
    title: 'The Scrapyard',
    logline: 'Too many tickets for one pair of hands, and the robot Moka threw out.',
    before: UNLOCKS.query - 1,
    panels: [
      panel('After the rush. Niko slumps on the counter under a mountain of handwritten tickets while Moka sweeps.', [
        ['niko:worried', 'Eighty-three tickets. By hand. How did Lou ever do this?'],
        ['moka', 'She didn’t, at the end. She had a counter robot.'],
      ]),
      panel('Niko sits bolt upright. Moka has stopped sweeping and leans on her broom, not meeting his eye.', [
        ['niko:surprised', 'A robot? Where is it?'],
        [
          'moka',
          'It broke in June. I couldn’t fix it, so I put it out for the scrapyard. Machines break. Hands don’t.',
        ],
      ]),
      panel('Niko pushes a wheelbarrow through the scrapyard’s hand-painted gate at sunset.', [
        ['', 'The scrapyard at the edge of town. Old toasters, vending machines, a jukebox that only plays one song.'],
      ]),
      panel('The scrapyard at sunset. A cream robot head pokes out of a pile of old toasters.', [
        ['niko:surprised', 'Q-U-E-R-Y. And under the name, in marker: “Lou’s.”'],
        ['niko', 'Found you.'],
      ]),
      panel('Dusk. Niko wheels the robot home past the porch across the street, where Moka watches, arms crossed.', [
        ['', 'Moka watched him wheel it past her porch. She didn’t say a word.'],
      ]),
      panel(
        'The back room at two in the morning. The robot lies open on the workbench beside three empty charging docks.',
        [
          ['', 'Two in the morning. Three cold coffees. One manual, with most of its pages.'],
          ['niko', 'Moka couldn’t fix you. Let’s see if I can.'],
        ],
      ),
      panel('Close-up: the robot’s visor lights up mint green, and the glow falls on Niko’s face.', [
        ['query', '*bip… bip… BOOP*'],
        ['query', 'Unit online. Last operator: Moka. Last ticket: June.'],
      ]),
      panel('Query sits up on the workbench and shakes Niko’s outstretched hand.', [
        ask(['query', '*bip* New operator. Identify.'], 'hello-query', [
          [
            'mine',
            'It’s my café now.',
            [
              ['niko:happy', 'Hello, Query. I’m Niko. It’s my café now.'],
              ['niko', 'I think.'],
              ['query', '*bip* Operator: Niko. Café: Niko’s. Saved.'],
            ],
          ],
          [
            'minding',
            'I’m minding Lou’s café.',
            [
              ['niko:happy', 'Hello, Query. I’m Niko. I’m minding Lou’s café.'],
              ['niko', 'For now.'],
              ['query', '*bip* Operator: Niko. Minding. Saved.'],
            ],
          ],
        ]),
      ]),
    ],
  },
  {
    id: 'a-second-pair-of-hands',
    title: 'A Second Pair of Hands',
    logline: 'Query earns its badge, and Moka won’t have a robot in Lou’s kitchen.',
    before: UNLOCKS.prep - 1,
    panels: [
      panel('An “Employee of the Month” photo on the wall. Query wears its badge; Mr. Albert applauds.', [
        ['niko:happy', 'Employee of the Month. First month. Only employee. Still counts.'],
        ['query', '*bip* Badge polished. Forty-two times.'],
      ]),
      panel('Query hands Mr. Albert his cup across the counter. He beams.', [
        ['query', 'Mister Albert. The usual. Coffee.'],
        ['albert:happy', 'It remembered my usual. It never used to.'],
      ]),
      panel('The ticket tray at the handoff overflows onto the floor. Moka is buried behind it.', [
        ['moka', 'Your robot writes faster than I can pour. It’s snowing tickets in here.'],
      ]),
      panel('Niko points into the back room at the two empty docks. Moka blocks the doorway, arms crossed.', [
        ['niko', 'There are two empty docks in the back. If we found one for the kitchen—'],
        ['moka', 'Not in Lou’s kitchen. I ran this place alone before. I can do it again.'],
      ]),
      panel('Grey dawn. Niko tiptoes the wheelbarrow past Moka’s dark porch, with Query riding in it.', [
        ['', 'Niko went anyway. Early, before Moka was up.'],
      ]),
      panel(
        'Back at the scrapyard, Query rides in the wheelbarrow. Under a tarp, a steel-blue robot hugs an old espresso machine.',
        [
          ['query', '*bip* Same model detected. Sibling.'],
          recall('hello-query', 'mine', ['query', '*bip* Sibling joins Niko’s café.']),
          recall('hello-query', 'minding', ['query', '*bip* Niko minding two now.']),
          ['niko', 'It won’t let go of that machine. Moka is going to hate how much she likes it.'],
        ],
      ),
      panel('Brew wakes up on the workbench. Moka watches from the doorway, arms crossed.', [
        ['brew', '*BEEP BEEP!* Grinder? Where grinder?'],
        ['moka', 'If it touches my machine before it’s trained, I’m unplugging it.'],
      ]),
      panel('At the espresso machine, Moka taps the gauge for Brew, who leans in close. Niko grins behind them.', [
        ['niko', 'Then help me train it.'],
        ['moka', '…Ninety-two degrees. Not ninety-one.'],
      ]),
    ],
  },
  {
    id: 'ninety-two-degrees',
    title: 'Ninety-Two Degrees',
    logline: 'Moka’s last morning in the kitchen, and the truth about the card.',
    before: 12,
    panels: [
      panel('Dawn. Moka, alone in the kitchen, polishes the espresso machine one last time.', [
        ['', 'Moka came in before anyone else, the way she had for forty years.'],
      ]),
      panel('Close-up: Moka’s hand resting on her apron pocket, beside the brass tamper.', [
        ['', 'The tamper always rides in that pocket. For a while, something else did too.'],
      ]),
      panel('Niko arrives at the door with Brew. Moka doesn’t turn round from the machine.', [
        ['moka', 'The post wasn’t slow. I had Lou’s card in my apron pocket for seven months.'],
      ]),
      panel('Moka sits on a stool by the machine, tired. Niko sits across from her, listening.', [
        [
          'moka',
          'I thought I could keep it her café. Six sharp, every morning, on my own. By June I couldn’t lift the milk.',
        ],
        ['niko:worried', 'Moka…'],
      ]),
      panel('Brew pulls a shot. Moka tastes it from a small cup, eyes closed.', [
        ['moka', 'Then your robot pulled a shot I couldn’t tell from hers.'],
      ]),
      panel('Moka hands her tamper to Brew while Niko and Query watch.', [
        ['moka', 'Ninety-two degrees, Brew. Always.'],
        ['brew', '*soft beep* Ninety-two. Always.'],
      ]),
      panel('Her apron hangs on a hook by the kitchen door, with a note pinned to it: 92°.', [
        ['moka', 'It stopped being Lou’s café a while ago, Niko. Make it yours.'],
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
    logline: 'School starts soon, and Pip doesn’t want a robot on his floor.',
    before: UNLOCKS.floor - 1,
    panels: [
      panel('A packed café floor. Pip runs with too many trays while Rosa’s group waves.', [
        ['pip', 'Table four! Table two! Table… which one was four?!'],
      ]),
      panel('Rosa’s table, everyone waving. Pip spins toward them, a cup wobbling on his top tray.', [
        ['rosa:happy', 'Over here, sweetie! And another round when you can!'],
      ]),
      panel('A wall calendar with the end of August circled: SCHOOL.', [
        ['niko', 'School starts Monday. There’s one dock left. We could find someone for the floor.'],
      ]),
      panel('Pip stands in the back-room doorway, arms folded, in front of the last empty dock.', [
        ['pip:worried', 'A robot? No way. Lou said the floor’s the best job, because you get to know everybody.'],
        ['pip', 'Robots don’t know anybody.'],
      ]),
      panel('Pip marches through the scrapyard gate ahead of Niko and the wheelbarrow, chin up.', [
        ['', 'Pip came along to prove it.'],
      ]),
      panel('The scrapyard. Under a broken parasol sits a honey-gold robot, still holding a tray perfectly level.', [
        ['pip:surprised', 'It’s still holding the tray flat. After all this time out here.'],
      ]),
      panel('Pip polishes the robot’s dusty visor with his cloth while Niko loads the wheelbarrow.', [
        ['pip', 'Okay. Okay! But I’m teaching it. Everybody’s names.'],
      ]),
      panel('Porter wakes up, tray raised. All three charging docks are taken.', [
        ['porter', '*ding ding!* Hello! Hello! Which one is table four?'],
        ['pip:happy', 'Lesson one: Mr. Albert sits by the window.'],
        ['', 'Three docks, three robots. For the first time since spring, every light in the back room is on.'],
      ]),
    ],
  },
  {
    id: 'back-to-school',
    title: 'Back to School',
    logline: 'Pip’s first day of school, and Niko’s first day as just the owner.',
    before: UNLOCKS.toGo - 1,
    panels: [
      panel('The evening before. Pip points out the regulars to Porter, who holds a notepad on its tray.', [
        ['pip', 'That’s Juno. Tea, never sugar. Never ever.'],
        ['porter', '*ding* Juno. Tea. Never ever sugar.'],
      ]),
      panel('Morning. Pip stands at the door with a school bag; the three robots line up to say goodbye.', [
        ['pip', 'First day of school. Porter knows everybody’s name. I checked. Twice.'],
        ['porter', '*sad beep* Who teach Porter now?'],
        ['pip', 'Whoever writes your code, silly!'],
      ]),
      panel('Pip runs off down the street, waving. Porter waves back with its tray.', [
        ask(['pip', 'I’ll come by on Saturday! Hot chocolate, the way Lou made it!'], 'hot-chocolate', [
          [
            'ours',
            'The way we make it!',
            [
              ['niko:happy', 'The way we make it!'],
              ['pip:happy', 'Extra marshmallows, then. That’s the “we” part!'],
            ],
          ],
          [
            'lous',
            'Just the way Lou did.',
            [
              ['niko:happy', 'Just the way Lou did. I’ll find her recipe.'],
              ['pip:happy', 'It’s pencilled on the back of the menu board. I checked!'],
            ],
          ],
        ]),
      ]),
      panel('A smooth morning service: Query at the register, Brew at the machine, Porter between the tables.', [
        ['niko', 'Query takes the orders. Brew makes them. Porter brings them out.'],
      ]),
      panel('Niko, alone at the shelf, moves the cups across to the right.', [
        ['niko', 'And the cups go on the right. Always bugged me.'],
      ]),
      panel('Niko hangs his apron on the hook next to Moka’s.', [['niko:happy', 'From today, I’m just the owner.']]),
    ],
  },
  {
    id: 'closing-time',
    title: 'Closing Time',
    logline: 'The café runs itself, and Lou’s card goes up on the wall.',
    before: 21,
    panels: [
      panel('Sunset. A full café: the regulars at their tables, the three robots at work.', [
        ['', 'Closing time. The last cup is on its way to the sink.'],
      ]),
      panel('The regulars leave for the night. Porter holds the door; Mr. Albert tips his hat.', [
        ['albert:happy', 'Same time tomorrow, Niko.'],
        ['porter', '*ding ding!* Goodnight, window seat!'],
      ]),
      panel('Niko at the counter with a coffee he made himself. Query watches him.', [
        ['query', '*bip* Niko drinking coffee. No ticket written.'],
        ['niko:happy', 'I made it myself. Old habits.'],
      ]),
      panel('Query prints a tiny ticket and lays it next to Niko’s cup.', [
        ['query', 'Not in instruction set.'],
        ['niko:happy', 'It is now.'],
      ]),
      panel('Moka comes over from her porch and Pip comes in from school.', [
        ['moka', 'Ninety-two degrees. Good.'],
        ['pip', 'Tables are clean! Porter did the corners.'],
        recall('hot-chocolate', 'ours', ['pip:happy', 'And Saturday’s hot chocolate had extra marshmallows. Our way.']),
        recall('hot-chocolate', 'lous', [
          'pip:happy',
          'And Saturday’s hot chocolate tasted just like Lou’s. Pencil and all.',
        ]),
      ]),
      panel('Moka stops in front of the shelf, where the cups now sit on the right. Niko hovers, nervous.', [
        ['moka', 'Cups on the right, I see.'],
        ['niko:worried', 'Is that… okay?'],
        ['moka', 'It’s your café.'],
        recall('hello-query', 'mine', ['query', '*bip* Café: Niko’s. Saved since the workbench.']),
        recall('hello-query', 'minding', ['query', '*bip* Update. Niko not minding. Café: Niko’s. Saved.']),
      ]),
      panel('Niko pins Lou’s postcard to the wall beside the group photo. Moka stands at his shoulder.', [
        ['niko', '“Be kind to the old machine.”'],
        ['niko', 'She didn’t mean the espresso machine, did she?'],
        ['moka', 'Forty years, she called me that.'],
      ]),
      panel('A group photo on the wall, and Lou’s seaside postcard pinned beside it.', [
        ['niko:happy', 'Six sharp tomorrow?'],
        ['moka', 'Seven. I’m retired.'],
      ]),
    ],
  },
];

/** A scene with the French words over the English ones, line for line; anything not yet in French stays English. */
function inFrench(scene: Cutscene, fr: SceneFr): Cutscene {
  const retold = (lines: readonly DialogueLine[], said: readonly string[]) =>
    lines.map((each, index) => ({ ...each, text: said[index] ?? each.text }));
  return {
    ...scene,
    title: fr.title,
    logline: fr.logline,
    panels: scene.panels.map((panel, index) => {
      const [art = panel.art, ...said] = fr.panels[index] ?? [];
      return {
        art,
        lines: retold(panel.lines, said).map((each) =>
          each.choice
            ? {
                ...each,
                choice: {
                  ...each.choice,
                  options: each.choice.options.map((option) => {
                    const [label = option.label, ...answer] = fr.options?.[option.id] ?? [];
                    return { ...option, label, lines: retold(option.lines, answer) };
                  }),
                },
              }
            : each,
        ),
      };
    }),
  };
}

const french = new Map(
  cutscenes.map((scene) => {
    const fr = cutscenesFr[scene.id];
    return [scene.id, fr ? inFrench(scene, fr) : scene];
  }),
);

/** A scene in the reader's language: the same scene, the same choices and the same art, told in their words. */
export const sceneIn = (scene: Cutscene, language: Language): Cutscene =>
  language === 'fr' ? (french.get(scene.id) ?? scene) : scene;

/** The scene that opens a shift, if there is one. */
export const sceneBefore = (shift: number): Cutscene | undefined => cutscenes.find((scene) => scene.before === shift);

export const sceneById = (id: string): Cutscene | undefined => cutscenes.find((scene) => scene.id === id);

/**
 * Every line of a scene in order, each with the panel it plays over. A line recalling an earlier answer is said only
 * when that was the answer given, so a scene whose choices were skipped plays as it was first written.
 */
export function sceneLines(
  scene: Cutscene,
  choices: DialogueChoices = {},
): { lines: DialogueLine[]; panels: number[] } {
  const said = scene.panels.flatMap((panel, index) =>
    panel.lines.filter((each) => isSaid(each, choices)).map((each) => ({ each, index })),
  );
  return { lines: said.map(({ each }) => each), panels: said.map(({ index }) => index) };
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
