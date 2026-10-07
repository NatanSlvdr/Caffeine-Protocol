import { count, directionLabel, placeName, tilesAway, type Place, type Point } from '@/domain';
import { countFr, words } from '@/shared/language';

/** How a place is said in a sentence: on its own, or as where a walk starts or ends. */
type PlaceForm = 'bare' | 'from' | 'to';

/** Each French place on its own, then after “de” and after “à”, with the article each takes. */
const FR_PLACES: Record<Exclude<Place, { table: number }>, [string, string, string]> = {
  paper: ['le papier', 'du papier', 'au papier'],
  register: ['la caisse', 'de la caisse', 'à la caisse'],
  handoff: ['le passe de la cuisine', 'du passe de la cuisine', 'au passe de la cuisine'],
  storage: ['la réserve', 'de la réserve', 'à la réserve'],
  machine: ['la machine à café', 'de la machine à café', 'à la machine à café'],
  sink: ['l’évier', 'de l’évier', 'à l’évier'],
  sugar: ['le sucre', 'du sucre', 'au sucre'],
  lids: ['les couvercles', 'des couvercles', 'aux couvercles'],
  pickup: ['le comptoir de retrait', 'du comptoir de retrait', 'au comptoir de retrait'],
  shelf: ['l’étagère à emporter', 'de l’étagère à emporter', 'à l’étagère à emporter'],
};
const FORMS: Record<PlaceForm, number> = { bare: 0, from: 1, to: 2 };

const FR_WAYS: Record<string, string> = {
  UP: 'en haut',
  UP_RIGHT: 'en haut à droite',
  RIGHT: 'à droite',
  DOWN_RIGHT: 'en bas à droite',
  DOWN: 'en bas',
  DOWN_LEFT: 'en bas à gauche',
  LEFT: 'à gauche',
  UP_LEFT: 'en haut à gauche',
};

/**
 * The words beside the café's preview of a picked block: which block, where it went in a dry run of the first round
 * and what the robot did there, or why nothing is drawn. Why a run stopped is the simulation's own sentence, still in
 * English; block names are programming words.
 */
export const PREVIEW_WORDS = words(
  {
    region: 'The picked block in the café',
    block: (n: number) => `Block ${n}`,
    line: (n: number) => `Line ${n}`,
    scope: (rounds: boolean): string => (rounds ? 'In round 1' : 'In the service'),
    times: (n: number): string => (n === 2 ? 'twice' : `${n} times`),
    more: (n: number) => `And ${count(n, 'other way')}.`,
    pick: (textMode: boolean) =>
      `Pick a Move, Take, Deposit or Use ${textMode ? 'line' : 'block'} to see where it goes in the café.`,
    unrunnable: 'Shown once the routines run: one of them needs a fix first.',
    notRun: 'It doesn’t run in this round.',
    /** Before why the round stopped short of the block. */
    stopsBefore: 'The round stops before it runs:',
    /** Before why the run stopped at this way. */
    stops: 'The run stops here:',
    place: (place: Place, form: PlaceForm): string =>
      form === 'bare' ? placeName(place) : `${form} ${placeName(place)}`,
    tiles: (from: Point, to: Point): string => tilesAway(from, to),
    way: (direction: string): string => directionLabel(direction),
    blocked: (who: string) => `${who} can’t move: the way is blocked.`,
    /** A walk, with where it starts and ends when those are stations: “from storage to the coffee machine”. */
    walks: (who: string, tiles: string, where: string) => `${who} walks ${tiles}${where && `, ${where}`}.`,
    nothing: (who: string, way: string) => `${who} reaches ${way}, but nothing is there.`,
    reaches: (who: string, way: string, place: string, did: string) =>
      `${who} reaches ${way} to ${place}${did && `, and ${did}`}.`,
    /** What the station a block reaches into made of it, as the robot did it. */
    done: {
      TAKE: 'takes a cup',
      GRIND: 'grinds the beans',
      'FILL WATER': 'fills the cup',
      BREW: 'brews',
      STEEP: 'steeps the tea',
      USE: 'uses it',
      WASH: 'washes up',
      'ADD SUGAR': 'adds sugar',
      LID: 'puts a lid on',
      DEPOSIT: 'puts the drink out',
      PICKUP: 'picks up a drink',
      COLLECT: 'collects the cups',
      SERVE: 'serves',
      'HAND OVER': 'hands it over to go',
      'RETURN CUPS': 'returns the cups',
    } as Record<string, string>,
    ticketDown: 'puts the ticket down',
    takesSheet: 'takes a sheet',
  },
  {
    region: 'Le bloc choisi, dans le café',
    block: (n) => `Bloc ${n}`,
    line: (n) => `Ligne ${n}`,
    scope: (rounds) => (rounds ? 'Dans la manche 1' : 'Dans le service'),
    times: (n) => `${n} fois`,
    more: (n) => `Et ${countFr(n, 'autre passage', 'autres passages')}.`,
    pick: (textMode) =>
      textMode
        ? 'Choisissez une ligne Move, Take, Deposit ou Use pour voir où elle mène dans le café.'
        : 'Choisissez un bloc Move, Take, Deposit ou Use pour voir où il mène dans le café.',
    unrunnable: 'Affiché une fois que les routines tournent : l’une d’elles doit d’abord être corrigée.',
    notRun: 'Il ne s’exécute pas dans cette manche.',
    stopsBefore: 'La manche s’arrête avant qu’il ne s’exécute :',
    stops: 'L’essai s’arrête ici :',
    place: (place, form) =>
      typeof place === 'object'
        ? `${['la', 'de la', 'à la'][FORMS[form]]} table ${place.table}`
        : FR_PLACES[place][FORMS[form]],
    tiles: (from, to) => {
      const [dx, dz] = [to[0] - from[0], to[1] - from[1]];
      const tiles = (n: number) => countFr(Math.abs(n), 'case');
      return [
        dx && `${tiles(dx)} vers la ${dx > 0 ? 'droite' : 'gauche'}`,
        dz && `${tiles(dz)} vers le ${dz > 0 ? 'bas' : 'haut'}`,
      ]
        .filter(Boolean)
        .join(' et ');
    },
    way: (direction) => FR_WAYS[direction] ?? directionLabel(direction),
    blocked: (who) => `${who} ne peut pas avancer : le chemin est bloqué.`,
    walks: (who, tiles, where) => `${who} avance de ${tiles}${where && `, ${where}`}.`,
    nothing: (who, way) => `${who} tend le bras ${way}, mais il n’y a rien.`,
    reaches: (who, way, place, did) => `${who} tend le bras ${way}, vers ${place}${did && `, et ${did}`}.`,
    done: {
      TAKE: 'prend une tasse',
      GRIND: 'moud les grains',
      'FILL WATER': 'remplit la tasse',
      BREW: 'lance l’infusion',
      STEEP: 'fait infuser le thé',
      USE: 's’en sert',
      WASH: 'fait la vaisselle',
      'ADD SUGAR': 'ajoute du sucre',
      LID: 'met un couvercle',
      DEPOSIT: 'pose la boisson',
      PICKUP: 'prend une boisson',
      COLLECT: 'ramasse les tasses',
      SERVE: 'sert',
      'HAND OVER': 'la remet à emporter',
      'RETURN CUPS': 'rapporte les tasses',
    },
    ticketDown: 'pose le ticket',
    takesSheet: 'prend une feuille',
  },
);
