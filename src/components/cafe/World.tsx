import { OrthographicCamera } from '@react-three/drei';
import { SceneHtml } from '../three/SceneHtml';
import { SceneLights } from '../three/SceneLights';
import { Box, Cup } from '../CafeModels';
import { Street, StreetClip } from '../Street';
import { OrderQueueBubble } from '../OrderQueueBubble';
import { CustomerSpeech } from '../CustomerSpeech';
import { RobotHolding } from '../RobotHolding';
import {
  CAMERA_POSITION,
  STARTS,
  STATIONS,
  STAFF_ENTRY,
  TABLE_LAYOUT,
  sampleReplay,
  roundRegulars,
  orderWhereabouts,
  robotUnlocked,
  robotActorName,
  ROBOT_DISPLAY_NAMES,
  type ActorId,
  type ActorSnapshot,
  type BlockPreview,
  type Decor,
  type RobotRole,
  type RunResult,
} from '@/domain';
import { Room } from './Room';
import { Character } from './Character';
import { CameraFit } from './CameraFit';
import { Steam, machineSteaming } from './Steam';
import { FollowRing } from './FollowRing';
import { BlockPath } from './BlockPath';
import { BREW, MOKA, NIKO, PIP, PORTER, QUERY, customerLook, type HumanLook, type RobotLook } from './looks';

/** Each crew post is drawn as whoever holds it: the robot once it is unlocked, otherwise its human stand-in. */
export function crewLook(id: string, level: number): { robot: RobotLook } | { human: HumanLook } {
  if (id === 'query') return { robot: QUERY };
  if (id === 'prep') return robotUnlocked('prep', level) ? { robot: BREW } : { human: MOKA };
  if (id === 'floor') return robotUnlocked('floor', level) ? { robot: PORTER } : { human: PIP };
  return { human: NIKO };
}

/** Idle actors before the first replay event: Niko covers Query's counter until it unlocks. */
export function fallbackActors(level: number): Partial<Record<ActorId, ActorSnapshot>> {
  return {
    ...(robotUnlocked('query', level)
      ? { query: { position: STARTS.query, inventory: [], role: 'query' as const } }
      : { niko: { position: STARTS.query, inventory: [], role: 'query' as const } }),
    prep: { position: STARTS.prep, inventory: [], role: 'prep' as const },
    floor: { position: STARTS.floor, inventory: [], role: 'floor' as const },
  };
}

/** The staff gate swings while Niko crosses the prep-aisle opening. */
export function isGateOpen(state: ReturnType<typeof sampleReplay> | undefined): boolean {
  return !!state?.seed?.events.some(
    (e) =>
      e.actor === 'niko' &&
      e.from[0] === STAFF_ENTRY[0] &&
      e.to[0] === STAFF_ENTRY[0] &&
      e.from[1] !== e.to[1] &&
      (e.from[1] === STAFF_ENTRY[1] || e.to[1] === STAFF_ENTRY[1]) &&
      state.local >= e.start - 0.3 &&
      state.local <= e.end + 0.2,
  );
}

/** Extra height for a bubble with another robot's bubble just in front of it, easing in and out with distance. */
function bubbleLift(at: readonly [number, number], others: readonly (readonly [number, number])[]): number {
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  return Math.max(
    0,
    ...others.map(([x, z]) => {
      const ahead = z - at[1];
      return 0.9 * clamp((1.7 - Math.abs(x - at[0])) / 0.7) * clamp(ahead / 0.5) * clamp(3 - ahead);
    }),
  );
}

/** Render replay actors and scenery, with optional status overlays for passive previews. */
export function World({
  evening,
  result,
  time,
  reduced,
  moving,
  level,
  showLabels,
  serviceView,
  focusRole,
  showStatusBubbles,
  zoomScale,
  cameraTarget,
  cameraAngleDegrees,
  follow,
  preview,
  restored,
  decor,
  counterLines,
}: {
  evening: boolean;
  result?: RunResult;
  time: number;
  reduced: boolean;
  moving: boolean;
  level: number;
  showLabels: boolean;
  serviceView: boolean;
  focusRole?: RobotRole;
  showStatusBubbles: boolean;
  zoomScale: number;
  cameraTarget?: readonly [number, number, number];
  cameraAngleDegrees: number;
  /** The guest whose order is followed, by round and id; it is ringed wherever it is. */
  follow?: { seed: string; guest: string };
  /** The block picked in the routine, drawn where it goes. */
  preview?: BlockPreview;
  /** The shift whose café is dressed: what the story has put back by then. */
  restored: number;
  /** The looks the café has picked. */
  decor: Decor;
  /** What the counter says back to the regulars it recognises, by round and guest. */
  counterLines?: ReadonlyMap<string, string>;
}) {
  const state = result ? sampleReplay(result, time) : undefined;
  const followed =
    follow && state?.seed?.seed_id === follow.seed
      ? result?.events.find((e) => e.seed_id === follow.seed && e.customer.customer_id === follow.guest)
      : undefined;
  const whereabouts = state && followed ? orderWhereabouts(state, followed) : undefined;
  const actors = state?.actors ?? fallbackActors(level);
  const regulars = result && state?.seed ? roundRegulars(result, state.seed.seed_id) : undefined;
  const gateOpen = isGateOpen(state);
  const bubbleShown = (id: string, actor: ActorSnapshot) =>
    serviceView &&
    showStatusBubbles &&
    !!state &&
    !((id === 'prep' || id === 'floor') && !robotUnlocked(id, level)) &&
    !!(actor.heldPaper || actor.inventory.length > 0 || actor.action || Object.keys(actor.variables ?? {}).length);
  const bubbles = Object.entries(actors).flatMap(([id, actor]) =>
    actor && bubbleShown(id, actor) ? [actor.position] : [],
  );
  return (
    <>
      <OrthographicCamera makeDefault position={CAMERA_POSITION} near={0.1} far={150} />
      <CameraFit
        serviceView={serviceView}
        reduced={reduced}
        focusRole={focusRole}
        zoomScale={zoomScale}
        cameraTarget={cameraTarget}
        cameraAngleDegrees={cameraAngleDegrees}
      />
      <SceneLights evening={evening} />
      <Room evening={evening} gateOpen={gateOpen} showLabels={showLabels} restored={restored} decor={decor} />
      {preview && <BlockPath preview={preview} />}
      {Object.entries(actors).map(
        ([id, actor]) =>
          actor && (
            <group key={id}>
              {whereabouts?.holders.includes(id as ActorId) && (
                <FollowRing at={actor.position} phase={time} reduced={reduced || !moving} />
              )}
              <Character
                at={actor.position}
                look={crewLook(id, level)}
                label={
                  !showStatusBubbles
                    ? undefined
                    : id === 'prep' && !robotUnlocked('prep', level)
                      ? 'Moka · Auto'
                      : id === 'floor' && !robotUnlocked('floor', level)
                        ? 'Pip · Auto'
                        : undefined
                }
                facing={actor.facing ?? (id === 'query' ? -Math.PI / 2 : 0)}
                walking={moving && actor.walking}
                reach={actor.reach}
                held={actor.inventory}
                waiting={actor.waiting}
                failed={actor.failed}
                animate={moving}
                phase={time}
                reduced={reduced}
              />
              {bubbleShown(id, actor) && (
                <SceneHtml
                  position={[
                    actor.position[0],
                    2.8 +
                      bubbleLift(
                        actor.position,
                        bubbles.filter((at) => at !== actor.position),
                      ),
                    actor.position[1],
                  ]}
                  zIndexRange={[10, 0]}
                  style={{ pointerEvents: 'none' }}
                >
                  <RobotHolding
                    name={
                      id === 'niko'
                        ? 'Niko'
                        : id === 'query'
                          ? ROBOT_DISPLAY_NAMES.query
                          : robotActorName(id === 'prep' ? 'prep' : 'floor', level)
                    }
                    crew={id}
                    inventory={actor.inventory}
                    paper={actor.heldPaper}
                    action={actor.action}
                    variables={actor.variables}
                    paused={!moving}
                    reduced={reduced}
                  />
                </SceneHtml>
              )}
            </group>
          ),
      )}
      {state && showStatusBubbles && (
        // The queue points down at the paper stack from above and to its left, below the robots' bubbles.
        <SceneHtml
          position={[STATIONS.orders.cell[0] - 0.15, 2.3, STATIONS.orders.cell[1] + 0.18]}
          zIndexRange={[9, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <OrderQueueBubble tickets={state.waitingTickets} />
        </SceneHtml>
      )}
      {whereabouts?.counter && (
        <FollowRing
          at={[STATIONS.orders.cell[0] + 0.2, STATIONS.orders.cell[1] + 0.18]}
          height={1.1}
          radius={0.36}
          phase={time}
          reduced={reduced || !moving}
        />
      )}
      {whereabouts?.pickup && (
        <FollowRing at={STATIONS.pickup.cell} height={1.14} radius={0.5} phase={time} reduced={reduced || !moving} />
      )}
      {state?.waitingTickets.slice(0, 4).map((ticket, i) => (
        <group
          key={ticket.ticket_id}
          position={[STATIONS.orders.cell[0] + 0.2, 1.12 + i * 0.015, STATIONS.orders.cell[1] + 0.18]}
        >
          <Box size={[0.32, 0.012, 0.4]} color="#fff3d5" />
          <Box at={[0, 0.009, -0.08]} size={[0.2, 0.006, 0.025]} color="#405d61" />
          <Box at={[-0.035, 0.009, 0.02]} size={[0.13, 0.006, 0.025]} color="#b77959" />
        </group>
      ))}
      {state?.pickup.slice(0, 2).map(([id, drink], i) => (
        <Cup
          key={id}
          at={[STATIONS.pickup.cell[0] - 0.2 + i * 0.4, 1.16, STATIONS.pickup.cell[1]]}
          tea={drink.item === 'tea'}
          paper={drink.toGo}
          lid={drink.toGo}
        />
      ))}
      {/* Fresh drinks steam on the pickup counter, and the machine steams while it brews or steeps. */}
      {state?.pickup
        .slice(0, 2)
        .map(([id, drink], i) =>
          drink.toGo ? null : (
            <Steam
              key={id}
              at={[
                STATIONS.pickup.cell[0] - 0.2 + i * 0.4,
                drink.item === 'tea' ? 1.62 : 1.48,
                STATIONS.pickup.cell[1],
              ]}
              phase={time}
              reduced={reduced}
            />
          ),
        )}
      {state?.seed && machineSteaming(state.seed.events, state.local) && (
        <Steam
          at={[STATIONS.brewer.cell[0] - 0.4, 1.4, STATIONS.brewer.cell[1] + 0.3]}
          phase={time}
          reduced={reduced}
          height={0.7}
        />
      )}
      {state?.tableDrinks.map((drink, index) => (
        <Cup
          key={drink.id}
          at={[TABLE_LAYOUT[drink.table - 1].x - 0.2 + (index % 2) * 0.4, 1.33, TABLE_LAYOUT[drink.table - 1].z]}
          tea={drink.item === 'tea'}
        />
      ))}
      <Street evening={evening} paused={!!result && !moving} reduced={reduced} />
      <StreetClip>
        {state?.customers.map((c) => {
          const event = result?.events.find(
            (event) => event.seed_id === state.seed?.seed_id && event.customer.customer_id === c.id,
          );
          const atCounter =
            !c.sit &&
            Math.hypot(c.position[0] - STATIONS.orders.floor[0], c.position[1] - STATIONS.orders.floor[1]) < 0.5;
          const clarified = !!state.seed?.events.some(
            (log) =>
              log.role === 'query' && log.command === 'HELP' && log.customerId === c.id && log.end <= state.local,
          );
          return (
            <group key={c.id}>
              {c.id === followed?.customer.customer_id && (
                <FollowRing at={c.position} phase={time} reduced={reduced || !moving} />
              )}
              <Character
                at={c.position}
                look={{ human: customerLook(c.id, regulars?.get(c.id)) }}
                sit={c.sit}
                walking={moving && c.walking}
                animate={moving}
                phase={time}
                reduced={reduced}
                facing={c.facing}
                drinking={c.drinking}
                tea={c.drink === 'tea'}
                paper={c.toGo}
              />
              {event && c.showOrder && showStatusBubbles && (
                <SceneHtml
                  position={[c.position[0], 2.2, c.position[1]]}
                  zIndexRange={[12, 0]}
                  style={{ pointerEvents: 'none' }}
                >
                  <CustomerSpeech
                    customer={event.customer}
                    clarified={clarified}
                    atCounter={atCounter}
                    counterLine={atCounter ? counterLines?.get(`${event.seed_id}/${c.id}`) : undefined}
                  />
                </SceneHtml>
              )}
            </group>
          );
        })}
      </StreetClip>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.81, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <shadowMaterial transparent opacity={0.12} />
      </mesh>
    </>
  );
}
