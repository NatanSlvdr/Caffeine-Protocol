import { Box, SoftBox, Appliance, TicketTray, CAFE_COLORS } from '../CafeModels';
import { CafeFloor } from '../CafeFloor';
import {
  ENTRANCE,
  FURNITURE,
  ROOM,
  STARTS,
  STATIONS,
  TABLE_LAYOUT,
  tableSeat,
  type StationId,
} from '@/domain';
import { Plant, Chair, Table, CafeMural, FloorLabel, CounterGate } from './Furniture';

/** Floor zones, furniture, and station positions share the simulation's tile model. */
export function Room({ evening, gateOpen, showLabels }: { evening: boolean; gateOpen: boolean; showLabels: boolean }) {
  return (
    <group>
      <Box at={[-0.55, -0.42, -0.55]} size={[16.1, 0.7, ROOM[1] + 0.1]} color={CAFE_COLORS.walnut} />
        <CafeFloor showGrid={showLabels} />
      <Box at={[-0.6, 1.3, -6.6]} size={[16.2, 2.7, 0.2]} color={CAFE_COLORS.wall} />
      <CafeMural />
      <Box at={[-8.6, 1.3, -1.6]} size={[0.2, 2.7, 10.2]} color={CAFE_COLORS.wall} />
      <Box at={[-8.6, 2.48, 4.5]} size={[0.24, 0.34, 2]} color={CAFE_COLORS.walnut} />
      <Box at={[-8.6, 1.14, 3.45]} size={[0.25, 2.3, 0.1]} color={CAFE_COLORS.walnut} />
      <Box at={[-8.6, 1.14, 5.55]} size={[0.25, 2.3, 0.1]} color={CAFE_COLORS.walnut} />
      {/* The two-tile sliding entrance stays fully open, with its panels recessed into the wall. */}
      <Box at={[-8.6, 0.035, 4.5]} size={[0.6, 0.025, 2]} color={CAFE_COLORS.sand} />
      {[-4, 0, 2.3].map((z) => (
        <group key={z}>
          <Box at={[-8.48, 1.7, z]} size={[0.1, 1.8, 2]} color={CAFE_COLORS.walnut} />
          <Box at={[-8.41, 1.7, z]} size={[0.04, 1.5, 1.7]} color={evening ? '#aa99a2' : '#c7e3df'} />
          <Box at={[-8.37, 1.7, z]} size={[0.06, 1.55, 0.055]} color={CAFE_COLORS.walnut} />
          <Box at={[-8.37, 1.7, z]} size={[0.06, 0.055, 1.7]} color={CAFE_COLORS.walnut} />
          <Box at={[-8.28, 0.88, z]} size={[0.35, 0.09, 2.12]} color={CAFE_COLORS.clay} />
        </group>
      ))}
      {FURNITURE.filter((f) => f.kind !== 'table' && f.kind !== 'chair' && f.id !== 'storage').map((f) => (
        <group key={f.id} position={[f.x + (f.width - 1) / 2, 0, f.z + (f.depth - 1) / 2]}>
          {f.kind === 'plant' ? (
            <Plant at={[0, 0, 0]} />
          ) : (
            <>
              <SoftBox at={[0, 0.54, 0]} size={[f.width, 0.98, f.depth]} radius={0.16} color={CAFE_COLORS.walnut} />
              <SoftBox at={[0, 1.04, 0]} size={[f.width, 0.12, f.depth]} radius={0.059} color={CAFE_COLORS.sand} />
              <Box at={[0, 0.065, 0]} size={[f.width - 0.08, 0.1, f.depth - 0.08]} color={CAFE_COLORS.charcoal} />
            </>
          )}
        </group>
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
          <FloorLabel at={STATIONS.pickup.floor} label="DRINK PICKUP" />
          <FloorLabel at={STATIONS.returns.floor} label="SINK" />
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

