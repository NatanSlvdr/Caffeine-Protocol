import { STATIONS, tableFront } from './layout';
import type { Point } from './layout';
import type { ReplayEvent } from './types';
import {
  customerApproach,
  customerExit,
  customerSeatPath,
  pathDistance,
  samplePath,
  CUSTOMER_WALK_SPEED,
  SEAT_CHOICE_SECONDS,
  SIDEWALK_X,
  SIT_SECONDS,
  STREET_APPROACH_SECONDS,
  STREET_EXIT_SECONDS,
} from './street';

/** Where take-away customers stand while their drinks are made. */
const TO_GO_SPOTS: readonly Point[] = [STATIONS.togo.customer, [-8, 4], [-7, 3], [-8, 3]];
/** The first waiting customer stands outside, just down the sidewalk, so the doorway stays free. */
const FIRST_QUEUE_GAP = 3.2;
/** Along-the-line spacing; wide enough that a line turning the doorway corner never overlaps. */
export const QUEUE_SPACING = 1.2;
/** Two people side by side need this much room between their centers (shoulders and swinging arms). */
export const PASSING_WIDTH = 0.86;
/** Front-to-back clearance below which two people on the sidewalk would touch. */
export const PASSING_DEPTH = 0.8;
/** People plan a sidestep this far ahead, and never slide sideways faster than a quick step. */
const LOOKAHEAD_SECONDS = 0.7;
const SIDESTEP_SPEED = 2.2;
const GRID = 0.05;
/** The café's outer wall; anyone further out is on the sidewalk. */
export const WALL_X = -8.7;
/** Nobody brushes the wall or steps off the curb while making room. */
const INNERMOST_X = WALL_X - 0.44;
const OUTERMOST_X = -10.7;
/** The sidewalk bench is a fixed obstacle people walk around. */
export const SIDEWALK_BENCH = { minX: -9.3, maxX: -8.8, minZ: -4.6, maxZ: -2.8 } as const;
/** The doorway and the bit of sidewalk in front of it: the next customer steps up only once it is clear. */
const DOORWAY = { minX: -10.1, maxX: -6.5, minZ: 4.3, maxZ: 5.9 } as const;

export type CustomerMotion = {
  position: Point;
  facing: number;
  walking: boolean;
  sit: number;
  leaving: boolean;
};
type Pose = { position: Point; ahead: Point; walking: boolean; sit: number; leaving: boolean; facing?: number };
type Lane = { key: string; first: number; offsets: number[] };
type Approach = { path: Point[]; length: number; along: (time: number) => number; reached: number };

/** Distance, back along the approach, from the counter to where the n-th waiting customer stands. */
export const queueOffset = (place: number) => (place <= 0 ? 0 : FIRST_QUEUE_GAP + QUEUE_SPACING * (place - 1));
const inDoorway = ([x, z]: Point) => x >= DOORWAY.minX && x <= DOORWAY.maxX && z >= DOORWAY.minZ && z <= DOORWAY.maxZ;
export const onSidewalk = (point: Point) => point[0] < WALL_X;
const seatingOf = (event: ReplayEvent) => event.timing.seating ?? event.timing.created;
const hasSeat = (event: ReplayEvent) => Number.isFinite(event.timing.seated) && event.table > 0;
export const isToGo = (event: ReplayEvent) =>
  !!event.tickets.length && !event.table && Number.isFinite(event.timing.seated);

/** Release times depend only on recorded timings, so they are cached per event and refreshed as a live run fills them in. */
const releaseCache = new WeakMap<ReplayEvent, { key: string; at: number }>();
/** Sidesteps are walked forward in time once and reused while the timings that shaped them stay the same. */
const laneCache = new WeakMap<ReplayEvent, Lane>();

/**
 * Deterministic customer motion for one seed: a single-file line outside the door that advances at walking pace,
 * and sidesteps on the sidewalk so two customers never walk through each other. `events` is the seed's intake order;
 * `indexOf` gives each customer's index in the whole run, which picks their sidewalk end and chair side.
 */
export function customerCrowd(events: readonly ReplayEvent[], indexOf: (event: ReplayEvent) => number) {
  const order = new Map(events.map((event, i) => [event, i]));
  const poses = new Map<ReplayEvent, Map<number, Pose>>();
  const approaches = new Map<ReplayEvent, Approach>();

  const ahead = (event: ReplayEvent) => events.slice(0, order.get(event) ?? 0);
  /** Customers ahead in line hand the counter over once they are clear of the doorway. */
  const release = (event: ReplayEvent): number => {
    const t = event.timing,
      key = `${t.seating},${t.created},${t.left},${t.seated},${event.table}`;
    const cached = releaseCache.get(event);
    if (cached?.key === key) return cached.at;
    const start = Math.min(seatingOf(event), t.left);
    let at = start;
    if (Number.isFinite(start)) {
      at = start + 20;
      for (let time = start; time < start + 20; time += GRID)
        if (!inDoorway(pose(event, time).position)) {
          at = time;
          break;
        }
    }
    releaseCache.set(event, { key, at });
    return at;
  };
  const placeAt = (event: ReplayEvent, time: number) => ahead(event).filter((other) => release(other) > time).length;
  /** Walking in, waiting in line, or stepping up as the line moves: one distance along the approach. */
  const approach = (event: ReplayEvent): Approach => {
    const known = approaches.get(event);
    if (known) return known;
    const start = event.timing.arrival - STREET_APPROACH_SECONDS;
    const firstPlace = placeAt(event, event.timing.arrival);
    let path = customerApproach(indexOf(event));
    const doorway = pathDistance(path.slice(1));
    // From the far end, customers walk past the door to the back of the line, which grows down the sidewalk.
    if (firstPlace > 0 && path[0][1] > path[1][1])
      path = [path[0], [SIDEWALK_X, path[1][1] - (queueOffset(firstPlace) - doorway)], ...path.slice(1)];
    const length = pathDistance(path);
    const speed = (length - queueOffset(firstPlace)) / STREET_APPROACH_SECONDS;
    const steps = ahead(event)
      .map(release)
      .sort((a, b) => a - b);
    const finite = steps.filter((at) => Number.isFinite(at));
    /** How many are still ahead in line at a moment: the hand-overs, sorted, that have not happened yet. */
    const placeOf = (time: number) => steps.length - steps.filter((at) => at <= time).length;
    // Where the customer stood just before each step forward, worked out once instead of on every frame.
    const before = finite.map((at) => queueOffset(placeOf(at - 1e-6)));
    const along = (time: number) => {
      let s = Math.min(speed * (time - start), length - queueOffset(placeOf(time)));
      for (let i = 0; i < finite.length && finite[i] <= time; i++)
        s = Math.min(s, length - before[i] + CUSTOMER_WALK_SPEED * (time - finite[i]));
      return Math.max(0, s);
    };
    const reached =
      steps.length > finite.length
        ? Infinity
        : Math.max(start + length / speed, ...finite.map((at, i) => at + before[i] / CUSTOMER_WALK_SPEED));
    const result = { path, length, along, reached };
    approaches.set(event, result);
    return result;
  };
  const spotFor = (event: ReplayEvent) => {
    const seating = seatingOf(event);
    const waiting = ahead(event).filter(
      (other) => isToGo(other) && seatingOf(other) <= seating && other.timing.left > seating,
    ).length;
    return TO_GO_SPOTS[waiting % TO_GO_SPOTS.length];
  };
  const sample = (path: readonly Point[], progress: number, sit = 0, leaving = false): Pose => ({
    position: samplePath(path, progress),
    ahead: samplePath(path, progress + 0.001),
    walking: progress > 0 && progress < 1,
    sit,
    leaving,
  });

  function pose(event: ReplayEvent, time: number): Pose {
    let known = poses.get(event);
    if (!known) poses.set(event, (known = new Map()));
    const cached = known.get(time);
    if (cached) return cached;
    const timing = event.timing,
      seating = seatingOf(event),
      index = indexOf(event),
      side = (index % 2) as 0 | 1,
      line = approach(event);
    const sideways = side === 0 ? Math.PI / 2 : -Math.PI / 2;
    let result: Pose;
    if (time >= timing.left) {
      const seated = hasSeat(event),
        stand = seated ? SIT_SECONDS : 0;
      let path: Point[];
      if (seated) {
        const seatPath = customerSeatPath(event.table - 1, side);
        path = [...seatPath.slice(-2).reverse(), ...customerExit(tableFront(event.table - 1), index)];
      } else if (isToGo(event)) path = customerExit(spotFor(event), index);
      else {
        // A customer who never reached a table heads out from wherever they stood.
        const from = pose(event, timing.left - 1e-6).position,
          counter = STATIONS.orders.floor,
          exit = customerExit(counter, index);
        path =
          Math.hypot(from[0] - counter[0], from[1] - counter[1]) < 1e-6
            ? exit
            : [from, [SIDEWALK_X, from[1]], exit.at(-1)!];
      }
      const progress = (time - timing.left - stand) / (STREET_EXIT_SECONDS - stand);
      result = sample(path, progress, seated ? Math.max(0, 1 - (time - timing.left) / SIT_SECONDS) : 0, true);
      if (seated && !result.walking && progress <= 0) result.facing = sideways;
    } else if (isToGo(event) && time >= Math.max(seating, line.reached)) {
      // Each next step waits until the customer has actually reached the counter.
      const path = [STATIONS.orders.floor, spotFor(event)];
      result = sample(path, (time - Math.max(seating, line.reached)) / (pathDistance(path) / CUSTOMER_WALK_SPEED));
    } else if (hasSeat(event) && time >= Math.max(seating, line.reached)) {
      const walk = Math.max(seating + SEAT_CHOICE_SECONDS, line.reached),
        shift = walk - seating - SEAT_CHOICE_SECONDS,
        path = customerSeatPath(event.table - 1, side);
      result = sample(
        path,
        (time - walk) / (pathDistance(path) / CUSTOMER_WALK_SPEED),
        Math.max(0, Math.min(1, (time - shift - (timing.seated - SIT_SECONDS)) / SIT_SECONDS)),
      );
      if (!result.walking && time >= timing.seated + shift - SIT_SECONDS) result.facing = sideways;
    } else {
      const now = line.along(time);
      const position = samplePath(line.path, now / line.length);
      const next = samplePath(line.path, Math.min(line.length, now + 0.01) / line.length);
      // Waiting customers face up the line; at the counter they face it.
      result = {
        position,
        ahead: next,
        walking: line.along(time + GRID / 2) > now + 1e-6,
        sit: 0,
        leaving: false,
        facing: now >= line.length - 1e-6 ? Math.PI / 2 : undefined,
      };
    }
    known.set(time, result);
    return result;
  }

  const steps = (event: ReplayEvent) => ({
    first: Math.ceil((event.timing.arrival - STREET_APPROACH_SECONDS) / GRID),
    last: Math.floor((event.timing.left + STREET_EXIT_SECONDS) / GRID),
  });
  const timingKey = (event: ReplayEvent) => {
    const t = event.timing;
    return `${t.arrival},${t.seating},${t.created},${t.left},${t.seated},${event.table},${event.tickets.length}`;
  };
  /** A customer's sidesteps depend on their own timings and on everyone ahead of them in the seed. */
  const laneKey = (event: ReplayEvent) =>
    `${indexOf(event)}|${events
      .slice(0, (order.get(event) ?? 0) + 1)
      .map(timingKey)
      .join(';')}`;
  /** Lanes already checked against this sample's timings, which cannot change while it is taken. */
  const checked = new Map<ReplayEvent, Lane>();
  /** The step on screen. A live run fills in timings as it plays; sidesteps already walked stay, the rest is replanned. */
  let shown = -Infinity;
  function lane(event: ReplayEvent): Lane {
    const ready = checked.get(event);
    if (ready) return ready;
    const key = laneKey(event),
      first = steps(event).first,
      known = laneCache.get(event);
    let plan = known;
    if (known?.key !== key || known.first !== first) {
      const walked = known?.first === first ? known.offsets.slice(0, Math.max(0, shown - first + 1)) : [];
      plan = { key, first, offsets: walked };
      laneCache.set(event, plan);
    }
    checked.set(event, plan!);
    return plan!;
  }
  /** Where an earlier customer will be, sidestep included, for planning around them. */
  function placed(event: ReplayEvent, step: number): Point | undefined {
    const { first, last } = steps(event);
    if (step < first || step > last) return undefined;
    const raw = pose(event, step * GRID).position;
    return [raw[0] + sidestep(event, step), raw[1]];
  }
  /**
   * Walk the customer's sidestep forward in time: look a moment ahead along the planned route, pick the free spot
   * nearest where they already are, and drift toward it no faster than a person steps sideways.
   */
  function sidestep(event: ReplayEvent, step: number): number {
    const { first, last } = steps(event);
    if (step < first) return 0;
    step = Math.min(step, last);
    const plan = lane(event);
    const look = Math.round(LOOKAHEAD_SECONDS / GRID),
      maxStep = SIDESTEP_SPEED * GRID;
    const earlier = ahead(event);
    for (let k = plan.first + plan.offsets.length; k <= step; k++) {
      const current = plan.offsets.at(-1) ?? 0;
      const raw = pose(event, k * GRID).position;
      let target = 0;
      if (raw[0] < WALL_X + 1) {
        const blocked: [number, number][] = [];
        for (let i = 0; i <= look && k + i <= last; i++) {
          const z = pose(event, (k + i) * GRID).position[1];
          if (z > SIDEWALK_BENCH.minZ - PASSING_DEPTH / 2 && z < SIDEWALK_BENCH.maxZ + PASSING_DEPTH / 2)
            blocked.push([SIDEWALK_BENCH.minX - PASSING_WIDTH / 2 - raw[0], Infinity]);
          for (const other of earlier) {
            const at = placed(other, k + i);
            const depth = at && onSidewalk(at) ? Math.abs(at[1] - z) / PASSING_DEPTH : 1;
            if (depth >= 1) continue;
            // Room to the side shrinks the further ahead or behind someone is, so a line turning the corner needs no sidestep.
            const width = PASSING_WIDTH * Math.sqrt(1 - depth * depth);
            blocked.push([at![0] - width - raw[0], at![0] + width - raw[0]]);
          }
        }
        const lowest = OUTERMOST_X - raw[0],
          highest = Math.max(0, INNERMOST_X - raw[0]);
        const free = (spot: number) =>
          spot >= lowest - 1e-6 &&
          spot <= highest + 1e-6 &&
          blocked.every(([from, to]) => spot <= from + 1e-6 || spot >= to - 1e-6);
        // Back on their own line as soon as it is clear; otherwise the clear spot nearest where they stand.
        if (free(0) || !onSidewalk(raw)) target = 0;
        else {
          const spots = blocked.flatMap(([from, to]) => [from, to]).filter(free);
          target = spots.length
            ? spots.reduce((best, spot) => (Math.abs(spot - current) < Math.abs(best - current) ? spot : best))
            : current;
        }
      }
      plan.offsets.push(current + Math.max(-maxStep, Math.min(maxStep, target - current)));
    }
    return plan.offsets[step - plan.first] ?? 0;
  }
  function position(event: ReplayEvent, time: number): Point {
    const raw = pose(event, time).position;
    const step = Math.floor(time / GRID + 1e-9),
      t = time / GRID - step;
    return [raw[0] + sidestep(event, step) * (1 - t) + sidestep(event, step + 1) * t, raw[1]];
  }

  return {
    sample(event: ReplayEvent, time: number): CustomerMotion {
      shown = Math.floor(time / GRID + 1e-9);
      const raw = pose(event, time),
        at = position(event, time);
      const lookX = raw.ahead[0] - raw.position[0],
        lookZ = raw.ahead[1] - raw.position[1];
      const step = Math.floor(time / GRID + 1e-9);
      const sliding = sidestep(event, step) !== sidestep(event, step + 1);
      return {
        position: at,
        facing: raw.facing ?? (lookX || lookZ ? Math.atan2(lookX, lookZ) : Math.PI / 2),
        walking: raw.walking || sliding,
        sit: raw.sit,
        leaving: raw.leaving,
      };
    },
  };
}
