import { DECOR_OPTIONS, type Decor, type DecorSpot } from '@/domain';
import { words } from '@/shared/language';
import { lower } from './rail/railWords';
import { keepsakes, type KeepsakeId } from './shelf';

type Said = { name: string; goal: string; story: string };
type Look = { name: string; goal: string };
type LookId = Decor[DecorSpot];

/**
 * The shelf's words: its frame, each keepsake's name, what earns it and what it marks, and the café's looks. The
 * English is the keepsakes' and looks' own, so the shelf and the rail never say them two ways.
 */
export const SHELF_WORDS = words(
  {
    kicker: (cafe: string) => `${cafe} · Behind the counter`,
    title: 'The shelf.',
    underWraps: 'Under wraps',
    fresh: 'New on the shelf',
    on: 'On the shelf',
    notYet: 'Not yet',
    /** A keepsake still wrapped: the act it comes with, and the act to serve first, by their names on the rail. */
    wrapped: (act: string, before: string) => `Something for ${act}. It comes out once ${before} is served.`,
    keepsakes: Object.fromEntries(keepsakes.map(({ id, name, goal, story }) => [id, { name, goal, story }])) as Record<
      KeepsakeId,
      Said
    >,
    looks: 'The café’s looks',
    looksIntro: 'Picked here, out for every shift. Lou’s are there from the start, and each act served brings another.',
    spots: { cushions: 'The cushions', print: 'The print by the window' } satisfies Record<DecorSpot, string>,
    options: Object.fromEntries(
      Object.values(DECOR_OPTIONS)
        .flat()
        .map(({ id, name, goal }) => [id, { name, goal }]),
    ) as Record<LookId, Look>,
  },
  {
    kicker: (cafe) => `${cafe} · Derrière le comptoir`,
    title: 'L’étagère.',
    underWraps: 'Encore emballé',
    fresh: 'Nouveau sur l’étagère',
    on: 'Sur l’étagère',
    notYet: 'Pas encore',
    wrapped: (act, before) => `Quelque chose pour ${lower(act)}. Il sort une fois ${lower(before)} servi.`,
    keepsakes: {
      'order-pad': {
        name: 'Le carnet de commandes de Query',
        goal: 'Assurer tous les services de l’acte I.',
        story:
          'Query a pris toutes les commandes de l’acte I, du premier café aux commandes que personne n’arrivait à déchiffrer.',
      },
      'recipe-card': {
        name: 'La fiche recette de Brew',
        goal: 'Assurer tous les services de l’acte II.',
        story: 'Brew a préparé toutes les recettes de l’acte II, et appris à garder une seule fiche pour toutes.',
      },
      'name-tags': {
        name: 'Trois badges',
        goal: 'Assurer un service avec les trois robots au travail.',
        story: 'Query, Brew et Porter ont assuré un service ensemble, chacun avec sa propre routine.',
      },
      'floor-plan': {
        name: 'Le plan de salle de Porter',
        goal: 'Assurer tous les services de l’acte III.',
        story: 'Porter a porté chaque tasse de l’acte III jusqu’à sa table, puis a débarrassé les tasses vides.',
      },
      'closing-sign': {
        name: 'La pancarte Fermé',
        goal: 'Assurer tous les services de l’acte IV.',
        story:
          'Toute l’équipe a tenu les journées les plus chargées, et retourné la pancarte à l’heure de la fermeture.',
      },
      'gold-star': {
        name: 'Une étoile d’or',
        goal: 'Obtenir trois étoiles à tous les services d’un même acte.',
        story: 'Tous les services d’un acte assurés dans les objectifs, en blocs comme en pas.',
      },
      stopwatch: {
        name: 'Un chronomètre',
        goal: 'Relever l’un des défis facultatifs, sur n’importe quel service.',
        story:
          'Un service mesuré au-delà des étoiles : un trajet plus court, une attente plus courte ou une soirée finie plus tôt.',
      },
    },
    looks: 'Les décors du café',
    looksIntro:
      'Choisis ici, en place pour chaque service. Ceux de Lou sont là dès le début, et chaque acte assuré en apporte un autre.',
    spots: { cushions: 'Les coussins', print: 'L’affiche près de la fenêtre' },
    options: {
      'clay-sage': { name: 'Argile et sauge', goal: 'Ceux de Lou, là depuis le début.' },
      'mustard-teal': { name: 'Moutarde et bleu canard', goal: 'Assurer tous les services de l’acte II.' },
      'berry-oat': { name: 'Mûre et avoine', goal: 'Terminer la campagne.' },
      hills: { name: 'Collines à midi', goal: 'Celle de Lou, là depuis le début.' },
      harbour: { name: 'Le port', goal: 'Assurer tous les services de l’acte I.' },
      'coffee-branch': { name: 'Une branche de caféier', goal: 'Assurer tous les services de l’acte III.' },
    },
  },
);
