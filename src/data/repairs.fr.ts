/**
 * The repair benches in French, keyed by robot: a sensor's two readings, each action's label, the cases in the
 * bench's order and the closing scene's lines in its own. The words Query hears are a guest's, and stay English.
 */
export interface RepairFr {
  title: string;
  fault: string;
  /** By sensor id: as it reads, and read the other way. */
  sensors: Record<string, readonly [is: string, isnt: string]>;
  /** By action id. */
  actions: Record<string, string>;
  /** The cases, in order. */
  examples: readonly string[];
  touch: string;
  /** The scene's lines, in order. */
  scene: readonly string[];
}

export const repairsFr: Record<string, RepairFr> = {
  query: {
    title: 'Les oreilles de Query',
    fault:
      'Query entend chaque mot, mais la casse lui a rebranché les oreilles n’importe comment : il écrit ce qu’il entend dans les mauvaises cases du ticket.',
    sensors: {
      tea: ['entend « tea »', 'n’entend pas « tea »'],
      sugar: ['entend « sugar »', 'n’entend pas « sugar »'],
      no: ['entend « no » ou « without »', 'n’entend ni « no » ni « without »'],
    },
    actions: { coffee: 'Écrit café', tea: 'Écrit thé', sugar: 'Écrit un sucre' },
    examples: [
      '« coffee »',
      '« tea »',
      '« coffee with sugar »',
      '« tea with sugar »',
      '« coffee no sugar »',
      '« tea without sugar »',
    ],
    touch: 'Une pince en laiton sur son porte-bloc, tirée du tiroir de Lou.',
    scene: [
      'L’atelier, après la fermeture. Niko revisse le panneau latéral de Query.',
      '*bip* Autotest. « Tea without sugar. » Thé. Pas de sucre. Câblage : correct.',
      'Six sur six. Et encore une chose.',
      'Il remplace la pince tordue du porte-bloc de Query par une pince en laiton tirée du tiroir de Lou.',
      '*bip bip* Pince : neuve. Porte-bloc : de Lou.',
      'Elle voudrait que tu en aies une bonne.',
    ],
  },
  brew: {
    title: 'Les mains de Brew',
    fault:
      'Les mains de Brew ont été câblées d’après un schéma de la casse fait pour un autre robot. Elles vont vers les bonnes machines aux mauvais moments, et attrapent une tasse quand elles en tiennent déjà une.',
    sensors: {
      cup: ['tient une tasse propre', 'ne tient pas de tasse'],
      tea: ['le ticket dit thé', 'le ticket dit café'],
      sugar: ['le ticket demande du sucre', 'le ticket n’en demande pas'],
    },
    actions: {
      cup: 'Prend une tasse',
      machine: 'Utilise la machine à café',
      kettle: 'Utilise la bouilloire',
      cube: 'Ajoute un sucre',
    },
    examples: [
      'Mains vides, un ticket café',
      'Mains vides, un ticket thé avec sucre',
      'Une tasse, un ticket café',
      'Une tasse, un ticket café avec sucre',
      'Une tasse, un ticket thé',
      'Une tasse, un ticket thé avec sucre',
    ],
    touch: 'Un torchon rayé tout propre sur le bras.',
    scene: [
      'L’atelier, après la fermeture. Niko referme la plaque de poitrine de Brew. Brew tourne et retourne ses mains.',
      '*BIP BIP !* Tasse d’abord ! Puis machine ! Mains savent, maintenant !',
      'Et un torchon neuf, puisque l’ancien finit toujours par terre.',
      'Un torchon rayé tout propre se pose sur le bras de Brew.',
      '*petit bip* Est torchon le plus doux. Pas utiliser par terre.',
      '*bip* …Presque jamais.',
    ],
  },
  porter: {
    title: 'Les yeux de Porter',
    fault:
      'Porter voit nettement le comptoir de retrait et les tables, mais ses yeux ont été branchés à l’envers : il débarrasse des tasses pendant que les boissons refroidissent, et se promène quand il y a du travail.',
    sensors: {
      drink: ['voit une boisson au comptoir de retrait', 'voit le comptoir de retrait vide'],
      used: ['voit une tasse utilisée sur une table', 'ne voit aucune tasse utilisée'],
    },
    actions: {
      carry: 'Porte la boisson à sa table',
      clear: 'Débarrasse une tasse utilisée',
      wait: 'Attend près du comptoir de retrait',
    },
    examples: [
      'Une boisson prête, les tables propres',
      'Une boisson prête, une tasse utilisée qui traîne',
      'Pas de boisson, une tasse utilisée qui traîne',
      'Pas de boisson, les tables propres',
    ],
    touch: 'Son nœud papillon redressé et lustré.',
    scene: [
      'L’atelier, après la fermeture. Porter cligne deux fois des yeux pendant que Niko serre la dernière vis.',
      '*ding* Boisson prête : porter. Tasse utilisée : débarrasser. Rien : attendre. Compris.',
      'Les boissons avant les tasses. Ne bouge pas une seconde.',
      'Il redresse le nœud papillon de Porter et le fait briller d’un coup de manche.',
      '*ding ding* Nœud papillon : droit. Service : prêt.',
    ],
  },
};
