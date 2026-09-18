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
  robotUnlocked,
  robotActorName,
  ROBOT_DISPLAY_NAMES,
  type ActorId,
  type ActorSnapshot,
  type RobotRole,
  type RunResult,
} from '@/domain';
import { Room } from './Room';
import { Character } from './Character';
import { CameraFit } from './CameraFit';

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

/** Scale bubbles with the café so zooming out also reduces their screen footprint. */
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
}) {
  const state = result ? sampleReplay(result, time) : undefined;
  const actors = state?.actors ?? fallbackActors(level);
  const gateOpen = isGateOpen(state);
  return (
    <>
      <OrthographicCamera makeDefault position={CAMERA_POSITION} near={0.1} far={150} />
      <CameraFit serviceView={serviceView} reduced={reduced} focusRole={focusRole} />
      <SceneLights evening={evening} />
      <Room evening={evening} gateOpen={gateOpen} showLabels={showLabels} />
      {Object.entries(actors).map(
        ([id, actor]) =>
          actor && (
            <group key={id}>
              <Character
                at={actor.position}
                robot={id === 'query' || (id === 'prep' && robotUnlocked('prep', level)) || (id === 'floor' && robotUnlocked('floor', level))}
                label={
                  id === 'prep' && !robotUnlocked('prep', level)
                    ? 'Moka · Auto'
                    : id === 'floor' && !robotUnlocked('floor', level)
                      ? 'Pip · Auto'
                      : undefined
                }
                facing={actor.facing ?? (id === 'query' ? -Math.PI / 2 : 0)}
                walking={moving && actor.walking}
                reach={actor.reach}
                color={id === 'floor' ? '#d4ac6b' : id === 'prep' ? '#7d9eae' : '#80a889'}
                animate={moving}
                phase={time}
                reduced={reduced}
              />
              {serviceView &&
                state &&
                !((id === 'prep' && !robotUnlocked('prep', level)) || (id === 'floor' && !robotUnlocked('floor', level))) &&
                (actor.heldPaper ||
                  actor.inventory.length > 0 ||
                  actor.action ||
                  Object.keys(actor.variables ?? {}).length) && (
                  <SceneHtml
                    position={[actor.position[0], 2.8, actor.position[1]]}
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
                      inventory={actor.inventory}
                      paper={actor.heldPaper}
                      action={actor.action}
                      variables={actor.variables}
                      paused={!moving}
                      reduced={reduced}
                    />
                  </SceneHtml>
                )}
              {actor.inventory.map((item, i) => (
                <Cup
                  key={item.ticketId}
                  at={[actor.position[0] - 0.2 + i * 0.4, 1.2, actor.position[1] + 0.3]}
                  tea={item.item === 'tea'}
                />
              ))}
            </group>
          ),
      )}
      {state && (
        <SceneHtml
          position={[STATIONS.orders.cell[0], 2.7, STATIONS.orders.cell[1]]}
          zIndexRange={[11, 0]}
        >
          <OrderQueueBubble tickets={state.waitingTickets} />
        </SceneHtml>
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
      {state?.pickup.slice(0, 2).map(([id, item], i) => (
        <Cup
          key={id}
          at={[STATIONS.pickup.cell[0] - 0.2 + i * 0.4, 1.16, STATIONS.pickup.cell[1]]}
          tea={item === 'tea'}
        />
      ))}
      {state?.tableDrinks.map((drink, index) => (
        <Cup
          key={drink.id}
          at={[TABLE_LAYOUT[drink.table - 1].x - 0.2 + (index % 2) * 0.4, 1.33, TABLE_LAYOUT[drink.table - 1].z]}
          tea={drink.item === 'tea'}
        />
      ))}
      <Street evening={evening} paused={!!result && !moving} reduced={reduced} />
      <StreetClip>
        {state?.customers.map((c, i) => {
          const event = result?.events.find(
            (event) => event.seed_id === state.seed?.seed_id && event.customer.customer_id === c.id,
          );
          const clarified = !!state.seed?.events.some(
            (log) =>
              log.role === 'query' && log.command === 'HELP' && log.customerId === c.id && log.end <= state.local,
          );
          return (
            <group key={c.id}>
              <Character
                at={c.position}
                color={['#af7e67', '#79929c', '#b29c66'][i % 3]}
                sit={c.sit}
                walking={moving && c.walking}
                animate={moving}
                phase={time}
                reduced={reduced}
                facing={c.facing}
                drinking={c.drinking}
                tea={c.drink === 'tea'}
              />
              {event && c.showOrder && (
                <SceneHtml
                  position={[c.position[0], 2.2, c.position[1]]}
                  zIndexRange={[12, 0]}
                  style={{ pointerEvents: 'none' }}
                >
                  <CustomerSpeech customer={event.customer} clarified={clarified} />
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

