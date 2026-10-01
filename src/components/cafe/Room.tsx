import { Box, Appliance, TicketTray, CAFE_COLORS } from '../CafeModels';
import { CafeFloor } from '../CafeFloor';
import {
  counterOutlines,
  ENTRANCE,
  FURNITURE,
  ROOM,
  STARTS,
  STATIONS,
  TABLE_LAYOUT,
  tableSeat,
  type StationId,
} from '@/domain';
import { STREET_WINDOWS } from './dressing';
import { WallDressing, KitchenFloor } from './WallDressing';
import { Plant, Chair, Table, CafeMural, FloorLabel, CounterGate, CounterRun } from './Furniture';

/** The storage tile holds the fridge and shelf instead of a counter, so it is left out of the joinery. */
const COUNTER_OUTLINES = counterOutlines(FURNITURE.filter((f) => f.kind === 'counter' && f.id !== 'storage'));

/** Floor zones, furniture, and station positions share the simulation's tile model. */
export function Room({ evening, gateOpen, showLabels }: { evening: boolean; gateOpen: boolean; showLabels: boolean }) {
  return (
    <group>
      <Box at={[-0.55, -0.42, -0.55]} size={[16.1, 0.7, ROOM[1] + 0.1]} color={CAFE_COLORS.walnut} />
      <CafeFloor showGrid={showLabels} />
      <Box at={[-0.6, 1.3, -6.6]} size={[16.2, 2.7, 0.2]} color={CAFE_COLORS.wall} />
      <CafeMural />
      <WallDressing />
      <KitchenFloor />
      <Box at={[-8.6, 1.3, -1.6]} size={[0.2, 2.7, 10.2]} color={CAFE_COLORS.wall} />
      <Box at={[-8.6, 2.48, 4.5]} size={[0.24, 0.34, 2]} color={CAFE_COLORS.walnut} />
      <Box at={[-8.6, 1.14, 3.45]} size={[0.25, 2.3, 0.1]} color={CAFE_COLORS.walnut} />
      <Box at={[-8.6, 1.14, 5.55]} size={[0.25, 2.3, 0.1]} color={CAFE_COLORS.walnut} />
      {/* The two-tile sliding entrance stays fully open, with its panels recessed into the wall. */}
      <Box at={[-8.6, 0.035, 4.5]} size={[0.6, 0.025, 2]} color={CAFE_COLORS.sand} />
      {STREET_WINDOWS.map((z) => (
        <group key={z}>
          <Box at={[-8.48, 1.7, z]} size={[0.1, 1.8, 2]} color={CAFE_COLORS.walnut} />
          <Box
            at={[-8.41, 1.7, z]}
            size={[0.04, 1.5, 1.7]}
            color={evening ? '#e8c58f' : '#c7e3df'}
            glow={evening ? 0.35 : 0}
          />
          <Box at={[-8.37, 1.7, z]} size={[0.06, 1.55, 0.055]} color={CAFE_COLORS.walnut} />
          <Box at={[-8.37, 1.7, z]} size={[0.06, 0.055, 1.7]} color={CAFE_COLORS.walnut} />
          <Box at={[-8.28, 0.88, z]} size={[0.35, 0.09, 2.12]} color={CAFE_COLORS.clay} />
        </group>
      ))}
      {FURNITURE.filter((f) => f.kind === 'plant').map((f) => (
        <Plant key={f.id} at={[f.x + (f.width - 1) / 2, 0, f.z + (f.depth - 1) / 2]} />
      ))}
      {COUNTER_OUTLINES.map((outline) => (
        <CounterRun key={outline.join(';')} outline={outline} />
      ))}
      {Object.entries(STATIONS).map(([id, station]) =>
        id === 'returns' || id === 'brewer' ? null : (
          <group key={id} position={[station.cell[0], 0, station.cell[1]]}>
            {id === 'orders' ? <TicketTray /> : <Appliance id={id as StationId} />}
          </group>
        ),
      )}
      <group
        position={[STATIONS.orders.customerCounter[0], 0, STATIONS.orders.customerCounter[1]]}
        rotation-y={Math.PI / 2}
      >
        <Appliance id="orders" />
      </group>
      {/* Query takes paper from the counter one tile above its starting position. */}
      <group position={[STARTS.query[0], 1.11, STARTS.query[1] - 1]}>
        {Array.from({ length: 7 }, (_, i) => (
          <group key={i} position={[((i % 3) - 1) * 0.018, i * 0.024, 0]} rotation-y={(i % 2 ? 1 : -1) * 0.025}>
            <Box size={[0.58, 0.018, 0.7]} color={i === 6 ? '#fffbed' : '#e4d5b7'} />
          </group>
        ))}
      </group>
      <CounterGate open={gateOpen} />
      {showLabels && (
        <>
          <FloorLabel at={STATIONS.orders.prep} label="ORDER HANDOFF" />
          <FloorLabel at={STATIONS.ingredients.prep} label="STORAGE" />
          <FloorLabel at={STATIONS.grinder.prep} label="COFFEE MACHINE" />
          <FloorLabel at={STATIONS.sugar.prep} label="SUGAR" />
          <FloorLabel at={STATIONS.lids.prep} label="LIDS" />
          <FloorLabel at={STATIONS.pickup.floor} label="DRINK PICKUP" />
          <FloorLabel at={STATIONS.returns.floor} label="SINK" />
          <FloorLabel at={STATIONS.togo.floor} label="TO-GO SHELF" />
          <FloorLabel at={ENTRANCE} label="ENTER" />
        </>
      )}
      {TABLE_LAYOUT.map((t, i) => (
        <group key={t.id}>
          <Table point={[t.x, t.z + (t.depth - 1) / 2]} depth={t.depth} />
          <Chair at={[tableSeat(i, 0)[0], 0, tableSeat(i, 0)[1]]} rotation={Math.PI / 2} />
          <Chair at={[tableSeat(i, 1)[0], 0, tableSeat(i, 1)[1]]} rotation={-Math.PI / 2} />
        </group>
      ))}
    </group>
  );
}
