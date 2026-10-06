import { useMemo, useRef, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  BENCH_GAPS,
  BENCH_GUESTS,
  benchEases,
  benchGuests,
  benchKit,
  benchProblems,
  benchSays,
  benchSeed,
  benchTicket,
  count,
  freshGuest,
  ROBOT_DISPLAY_NAMES,
  type BenchEase,
  type BenchGuest,
  type BenchKit,
  type BenchOrder,
  type BenchSugar,
  type Customer,
  type ExpectedTicket,
  type LevelDefinition,
} from '@/domain';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import { useAnnouncement } from '@/hooks/useAnnouncement';
import { easeChoice, readBench, readEased, writeBench } from '../bench';

export interface BenchModalProps {
  /** The shift on screen: its own guests say what the bench can ask for. */
  level: LevelDefinition;
  running: boolean;
  /** Runs the bench's guests with the routines as they are now, under any rules it eases. */
  onRun: (customers: Customer[], eased: BenchEase[]) => void;
  onClose: () => void;
}

const capital = (word: string) => word[0].toUpperCase() + word.slice(1);
const sugarWords = (sugar: BenchSugar) =>
  typeof sugar === 'number'
    ? count(sugar, 'sugar')
    : { plain: 'No word on sugar', with: 'With sugar', without: 'Without sugar' }[sugar];

/** What a ticket should say, in words: "tea · 2 sugars · to go". */
function ticketWords(ticket: ExpectedTicket): string {
  return [
    ticket.item,
    ticket.sugar_count !== undefined
      ? count(ticket.sugar_count, 'sugar')
      : ticket.with_sugar !== undefined && (ticket.with_sugar ? 'sugar' : 'no sugar'),
    ticket.to_go && 'to go',
    ticket.rush && 'rushed',
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * The test bench: guests the player writes for this shift, to run the routines on without the shift's own rounds.
 * Each guest only says what they ask for and when they come in, from what the shift's guests ask for; what each one
 * should get is worked out the same way as for those guests, and shown beside them. Where the shift has a rule to
 * ease, like a few cups to wash, the bench can ease it, to practise one thing at a time. The bench is kept in this
 * browser, per shift, and a bench run never earns stars.
 */
export function BenchModal({ level, running, onRun, onClose }: BenchModalProps) {
  const kit = useMemo(() => benchKit(level), [level]);
  const rounds = level.seeds.map((seed) => benchGuests(seed.customers));
  const [guests, setGuests] = useState<BenchGuest[]>(() => readBench(level.id, kit) ?? rounds[0]);
  const offered = benchEases(level);
  const [eased, setEased] = useState(() => readEased(level));
  const [kept, setKept] = useState(true);
  const [said, say] = useAnnouncement();
  const list = useRef<HTMLOListElement>(null),
    addButton = useRef<HTMLButtonElement>(null);
  const problems = benchProblems(kit, guests);

  const commit = (next: BenchGuest[], words?: string) => {
    setGuests(next);
    setKept(writeBench(level.id, next, eased));
    if (words) say(words);
  };
  const edit = (at: number, guest: BenchGuest) => commit(guests.map((g, i) => (i === at ? guest : g)));
  const editOrder = (at: number, which: number, order: BenchOrder) =>
    edit(at, { ...guests[at], orders: guests[at].orders.map((o, i) => (i === which ? order : o)) });
  // Focus follows the guest a change was about: a new guest's first choice, or the remove button of the guest now in
  // the place of one removed, so removing again stays put; Add a guest once there are none.
  const focusGuest = (at: number, on: 'choice' | 'remove') =>
    requestAnimationFrame(() => {
      const guest = list.current?.querySelectorAll('.bench-guest')[at];
      const target = on === 'choice' ? guest?.querySelector<HTMLElement>('select, input') : undefined;
      (target ?? guest?.querySelector<HTMLElement>('.bench-remove') ?? addButton.current)?.focus();
    });
  const addGuest = () => {
    if (guests.length >= BENCH_GUESTS) return;
    commit([...guests, freshGuest(kit, !guests.length)], `Guest ${guests.length + 1} added.`);
    focusGuest(guests.length, 'choice');
  };
  const removeGuest = (at: number) => {
    // The guest after comes in as the café opens when the first one goes.
    const next = guests.filter((_, i) => i !== at).map((g, i) => (i === 0 ? { ...g, after: 0 } : g));
    commit(
      next,
      `Guest ${at + 1} removed.${next.length > at ? ` The guests after are numbered on from ${at + 1}.` : ''}`,
    );
    focusGuest(Math.min(at, next.length - 1), 'remove');
  };
  const ease = (which: BenchEase, on: boolean) => {
    const next = offered.filter((e) => (e === which ? on : eased.includes(e)));
    setEased(next);
    setKept(writeBench(level.id, guests, next));
  };
  const copyRound = (round: number) => {
    commit(rounds[round], `Copied round ${round + 1}: ${count(rounds[round].length, 'guest')}.`);
    focusGuest(0, 'choice');
  };

  return (
    <Modal
      className="settings-window confirm-slip bench-slip"
      kicker="For no stars"
      title="Test bench"
      onClose={onClose}
    >
      <p>
        Write the guests to run the routines on: what each asks for, and when they come in. What each should get is
        worked out the way it is for the shift’s own guests.
      </p>
      <div className="bench-copy" role="group" aria-label="Start from a round of the shift">
        <span aria-hidden="true">Start from</span>
        {rounds.map((round, i) => (
          <button key={i} type="button" className="settings-chip" onClick={() => copyRound(i)}>
            {level.seeds.length > 1 ? `Round ${i + 1}` : 'The shift’s guests'}
            <span className="sr-only">, {count(round.length, 'guest')}</span>
          </button>
        ))}
      </div>

      {!guests.length && (
        <p className="bench-empty">No guests on the bench. Add one, or start from the shift’s guests.</p>
      )}
      <ol className="bench-guests" ref={list} aria-label="Bench guests" hidden={!guests.length}>
        {guests.map((guest, at) => (
          <GuestRow
            key={at}
            at={at}
            guest={guest}
            kit={kit}
            onChange={(next) => edit(at, next)}
            onOrder={(which, order) => editOrder(at, which, order)}
            onRemove={() => removeGuest(at)}
          />
        ))}
      </ol>
      <button
        ref={addButton}
        type="button"
        className="settings-chip bench-add"
        aria-disabled={guests.length >= BENCH_GUESTS || undefined}
        onClick={addGuest}
      >
        <Plus size={15} aria-hidden="true" />
        {guests.length >= BENCH_GUESTS ? `The bench takes ${BENCH_GUESTS} guests` : 'Add a guest'}
      </button>

      {offered.length > 0 && (
        <fieldset className="bench-eases" aria-describedby="bench-eases-note">
          <legend>Ease the shift’s rules</legend>
          {offered.map((which) => {
            const { label, detail } = easeChoice(level, which);
            return (
              <label key={which} className="bench-mark bench-ease">
                <input
                  type="checkbox"
                  checked={eased.includes(which)}
                  onChange={(e) => ease(which, e.target.checked)}
                />
                <span>
                  <strong>{label}</strong> <small>{detail}</small>
                </span>
              </label>
            );
          })}
          <small id="bench-eases-note">
            Practise one thing at a time. A bench that goes right eased says less: the shift keeps its own rules.
          </small>
        </fieldset>
      )}

      <p className="bench-status" role="status">
        {said}
      </p>
      {problems.length > 0 && guests.length > 0 && (
        <ul className="bench-problems" id="bench-problems">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
      {!kept && (
        <p role="alert" className="error-text">
          This browser isn’t keeping the bench, so it lasts until the café closes.
        </p>
      )}
      {running && <p id="bench-running">Stop the service to run the bench.</p>}
      <div className="modal-buttons">
        <Button
          variant="primary"
          data-autofocus
          disabled={running || problems.length > 0}
          aria-describedby={running ? 'bench-running' : problems.length && guests.length ? 'bench-problems' : undefined}
          onClick={() => onRun(benchSeed(kit, guests).customers, eased)}
        >
          {guests.length
            ? `Run the bench · ${count(guests.length, 'guest')}${eased.length ? ' · eased' : ''}`
            : 'Add a guest to run the bench'}
        </Button>
      </div>
    </Modal>
  );
}

function GuestRow({
  at,
  guest,
  kit,
  onChange,
  onOrder,
  onRemove,
}: {
  at: number;
  guest: BenchGuest;
  kit: BenchKit;
  onChange: (guest: BenchGuest) => void;
  onOrder: (which: number, order: BenchOrder) => void;
  onRemove: () => void;
}) {
  const who = `Guest ${at + 1}`;
  const gaps = [...new Set([...BENCH_GAPS, kit.gap, guest.after])].filter((gap) => gap > 0).sort((a, b) => a - b);
  // What the guest should get, once they ask for nothing the shift hasn't taught; when they come in is checked apart.
  const fits = benchProblems(kit, [{ ...guest, after: 0 }]).length === 0;
  const together = !!guest.together && guest.orders.length > 1;
  const tickets = fits ? guest.orders.map((order) => benchTicket(kit, order, together)) : [];
  const says = benchSays(guest.orders, together);
  return (
    <li className="bench-guest">
      <div className="bench-guest-head">
        <strong>{who}</strong>
        {at === 0 ? (
          <span className="bench-when">Comes in as the café opens</span>
        ) : (
          <select
            className="bench-when"
            aria-label={`${who} comes in`}
            value={guest.after}
            onChange={(e) => onChange({ ...guest, after: Number(e.target.value) })}
          >
            {gaps.map((gap) => (
              <option key={gap} value={gap}>
                {gap} s after guest {at}
              </option>
            ))}
          </select>
        )}
        <button type="button" className="bench-remove" aria-label={`Remove ${who.toLowerCase()}`} onClick={onRemove}>
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>
      {guest.orders.map((order, which) => {
        const drink = guest.orders.length > 1 ? `${who}, drink ${which + 1}` : who;
        return (
          <div key={which} className="bench-order">
            {/* A choice the shift doesn't offer is only said. */}
            {kit.drinks.length > 1 ? (
              <select
                aria-label={`${drink}: drink`}
                value={order.drink}
                onChange={(e) => onOrder(which, { ...order, drink: e.target.value as BenchOrder['drink'] })}
              >
                {kit.drinks.map((d) => (
                  <option key={d} value={d}>
                    {capital(d)}
                  </option>
                ))}
              </select>
            ) : (
              <span className="bench-fixed">{capital(order.drink)}</span>
            )}
            {kit.sugars.length > 1 ? (
              <select
                aria-label={`${drink}: sugar`}
                value={String(order.sugar)}
                onChange={(e) => {
                  const sugar = kit.sugars.find((s) => String(s) === e.target.value)!;
                  onOrder(which, { ...order, sugar });
                }}
              >
                {kit.sugars.map((s) => (
                  <option key={String(s)} value={String(s)}>
                    {sugarWords(s)}
                  </option>
                ))}
              </select>
            ) : (
              <span className="bench-fixed">{sugarWords(order.sugar)}</span>
            )}
            {kit.toGo && (
              <label className="bench-mark">
                <input
                  type="checkbox"
                  checked={!!order.toGo}
                  onChange={(e) => onOrder(which, { ...order, toGo: e.target.checked || undefined })}
                />
                To go
              </label>
            )}
            {kit.rush && (
              <label className="bench-mark">
                <input
                  type="checkbox"
                  checked={!!order.rush}
                  onChange={(e) => onOrder(which, { ...order, rush: e.target.checked || undefined })}
                />
                In a rush
              </label>
            )}
            {guest.orders.length > 1 && (
              <button
                type="button"
                className="bench-remove"
                aria-label={`Remove ${drink.toLowerCase()}`}
                onClick={() => onChange({ ...guest, orders: guest.orders.filter((_, i) => i !== which) })}
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        );
      })}
      {(kit.most > 1 || kit.mumble || kit.together) && (
        <div className="bench-guest-more">
          {kit.most > 1 && !guest.mumbles && guest.orders.length < kit.most && (
            <button
              type="button"
              className="bench-link"
              onClick={() =>
                onChange({
                  ...guest,
                  orders: [...guest.orders, { ...guest.orders[0], toGo: undefined, rush: undefined }],
                })
              }
            >
              <Plus size={13} aria-hidden="true" /> Another drink
            </button>
          )}
          {kit.together && guest.orders.length > 1 && (
            <label className="bench-mark">
              <input
                type="checkbox"
                checked={!!guest.together}
                onChange={(e) => onChange({ ...guest, together: e.target.checked || undefined })}
              />
              Orders together
            </label>
          )}
          {kit.mumble && (
            <label className="bench-mark">
              <input
                type="checkbox"
                checked={!!guest.mumbles}
                onChange={(e) =>
                  onChange({
                    ...guest,
                    mumbles: e.target.checked || undefined,
                    // A guest who mumbles asks for one drink, said once they're asked.
                    orders: e.target.checked ? guest.orders.slice(0, 1) : guest.orders,
                  })
                }
              />
              Mumbles first
            </label>
          )}
        </div>
      )}
      <p className="bench-says">
        {guest.mumbles ? <>Mumbles “The usual, please.”, then says “{says}” once asked</> : <>Says “{says}”</>}
        {tickets.length > 0 && (
          <>
            {' '}
            · Should get <strong>{tickets.map(ticketWords).join(' and ')}</strong>
            {guest.mumbles && `, once ${ROBOT_DISPLAY_NAMES.query} asks for help`}
          </>
        )}
      </p>
    </li>
  );
}
