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
  bookingSays,
  freshGuest,
  insteadOf,
  ROBOT_DISPLAY_NAMES,
  type BenchEase,
  type BenchGuest,
  type BenchKit,
  type BenchOrder,
  type BenchSoldOut,
  type Customer,
  type ExpectedTicket,
  type LevelDefinition,
} from '@/domain';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import { useAnnouncement } from '@/hooks/useAnnouncement';
import { useUntranslated, useWords } from '@/shared/language';
import { easeChoice, readBench, readEased, writeBench } from '../bench';
import { BENCH_WORDS } from './benchWords';

export interface BenchModalProps {
  /** The shift on screen: its own guests say what the bench can ask for. */
  level: LevelDefinition;
  running: boolean;
  /** Runs the bench's guests with the routines as they are now, under any rules it eases. */
  onRun: (customers: Customer[], eased: BenchEase[]) => void;
  onClose: () => void;
}

/** What a ticket should say, in words: "tea · 2 sugars · to go". */
function ticketWords(ticket: ExpectedTicket, say = BENCH_WORDS.en.ticket): string {
  return [
    ticket.item && say.drink[ticket.item],
    ticket.sugar_count !== undefined
      ? say.sugars(ticket.sugar_count)
      : ticket.with_sugar !== undefined && say.sugar(ticket.with_sugar),
    ticket.to_go && say.toGo,
    ticket.rush && say.rush,
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
  const words = useWords(BENCH_WORDS);
  const english = useUntranslated();
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
    commit([...guests, freshGuest(kit, !guests.length)], words.added(guests.length + 1));
    focusGuest(guests.length, 'choice');
  };
  const removeGuest = (at: number) => {
    // The guest after comes in as the café opens when the first one goes.
    const next = guests.filter((_, i) => i !== at).map((g, i) => (i === 0 ? { ...g, after: 0 } : g));
    commit(next, words.removed(at + 1, next.length > at));
    focusGuest(Math.min(at, next.length - 1), 'remove');
  };
  const ease = (which: BenchEase, on: boolean) => {
    const next = offered.filter((e) => (e === which ? on : eased.includes(e)));
    setEased(next);
    setKept(writeBench(level.id, guests, next));
  };
  const copyRound = (round: number) => {
    commit(rounds[round], words.copied(round + 1, rounds[round].length));
    focusGuest(0, 'choice');
  };

  return (
    <Modal
      className="settings-window confirm-slip bench-slip"
      kicker={words.kicker}
      title={words.title}
      onClose={onClose}
    >
      <p>{words.intro}</p>
      <div className="bench-copy" role="group" aria-label={words.startFromLabel}>
        <span aria-hidden="true">{words.startFrom}</span>
        {rounds.map((round, i) => (
          <button key={i} type="button" className="settings-chip" onClick={() => copyRound(i)}>
            {level.seeds.length > 1 ? words.round(i + 1) : words.shiftsGuests}
            <span className="sr-only">, {words.guests(round.length)}</span>
          </button>
        ))}
      </div>

      {!guests.length && <p className="bench-empty">{words.empty}</p>}
      <ol className="bench-guests" ref={list} aria-label={words.list} hidden={!guests.length}>
        {guests.map((guest, at) => (
          <GuestRow
            key={at}
            at={at}
            guest={guest}
            kit={kit}
            words={words}
            english={english}
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
        {guests.length >= BENCH_GUESTS ? words.full(BENCH_GUESTS) : words.add}
      </button>

      {offered.length > 0 && (
        <fieldset className="bench-eases" aria-describedby="bench-eases-note">
          <legend>{words.easeLegend}</legend>
          {offered.map((which) => {
            const { label, detail } = easeChoice(level, which, words.eases);
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
          <small id="bench-eases-note">{words.easeNote}</small>
        </fieldset>
      )}

      <p className="bench-status" role="status">
        {said}
      </p>
      {problems.length > 0 && guests.length > 0 && (
        <ul className="bench-problems" id="bench-problems" lang={english}>
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
      {!kept && (
        <p role="alert" className="error-text">
          {words.notKept}
        </p>
      )}
      {running && <p id="bench-running">{words.running}</p>}
      <div className="modal-buttons">
        <Button
          variant="primary"
          data-autofocus
          disabled={running || problems.length > 0}
          aria-describedby={running ? 'bench-running' : problems.length && guests.length ? 'bench-problems' : undefined}
          onClick={() => onRun(benchSeed(kit, guests).customers, eased)}
        >
          {guests.length ? words.run(guests.length, eased.length > 0) : words.addToRun}
        </Button>
      </div>
    </Modal>
  );
}

function GuestRow({
  at,
  guest,
  kit,
  words,
  english,
  onChange,
  onOrder,
  onRemove,
}: {
  at: number;
  guest: BenchGuest;
  kit: BenchKit;
  words: (typeof BENCH_WORDS)['en'];
  /** The `lang` for what the guest says, which stays in English. */
  english: string | undefined;
  onChange: (guest: BenchGuest) => void;
  onOrder: (which: number, order: BenchOrder) => void;
  onRemove: () => void;
}) {
  const n = at + 1;
  const gaps = [...new Set([...BENCH_GAPS, kit.gap, guest.after])].filter((gap) => gap > 0).sort((a, b) => a - b);
  // What the guest should get, once they ask for nothing the shift hasn't taught; when they come in is checked apart.
  const fits = benchProblems(kit, [{ ...guest, after: 0 }]).length === 0;
  const together = !!guest.together && guest.orders.length > 1;
  // A guest whose drink has run out gets the other one, or nothing, once Query asks.
  const tickets =
    !fits || guest.later
      ? []
      : guest.soldOut
        ? guest.soldOut === 'switch'
          ? [benchTicket(kit, insteadOf(guest.orders[0]))]
          : []
        : guest.orders.map((order) => benchTicket(kit, order, together));
  const asks = guest.mumbles || !!guest.soldOut;
  const says = guest.later ? bookingSays(guest.orders[0]) : benchSays(guest.orders, together);
  return (
    <li className="bench-guest">
      <div className="bench-guest-head">
        <strong>{words.guest(n)}</strong>
        {at === 0 ? (
          <span className="bench-when">{words.opens}</span>
        ) : (
          <select
            className="bench-when"
            aria-label={words.comesIn(n)}
            value={guest.after}
            onChange={(e) => onChange({ ...guest, after: Number(e.target.value) })}
          >
            {gaps.map((gap) => (
              <option key={gap} value={gap}>
                {words.after(gap, at)}
              </option>
            ))}
          </select>
        )}
        <button type="button" className="bench-remove" aria-label={words.remove(n)} onClick={onRemove}>
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>
      {guest.orders.map((order, which) => {
        const drink = guest.orders.length > 1 ? which + 1 : undefined;
        return (
          <div key={which} className="bench-order">
            {/* A choice the shift doesn't offer is only said. */}
            {kit.drinks.length > 1 ? (
              <select
                aria-label={words.choice(n, drink, 'drink')}
                value={order.drink}
                onChange={(e) => onOrder(which, { ...order, drink: e.target.value as BenchOrder['drink'] })}
              >
                {kit.drinks.map((d) => (
                  <option key={d} value={d}>
                    {words.drinks[d]}
                  </option>
                ))}
              </select>
            ) : (
              <span className="bench-fixed">{words.drinks[order.drink]}</span>
            )}
            {kit.sugars.length > 1 ? (
              <select
                aria-label={words.choice(n, drink, 'sugar')}
                value={String(order.sugar)}
                onChange={(e) => {
                  const sugar = kit.sugars.find((s) => String(s) === e.target.value)!;
                  onOrder(which, { ...order, sugar });
                }}
              >
                {kit.sugars.map((s) => (
                  <option key={String(s)} value={String(s)}>
                    {words.sugar(s)}
                  </option>
                ))}
              </select>
            ) : (
              <span className="bench-fixed">{words.sugar(order.sugar)}</span>
            )}
            {kit.toGo && (
              <label className="bench-mark">
                <input
                  type="checkbox"
                  checked={!!order.toGo}
                  onChange={(e) => onOrder(which, { ...order, toGo: e.target.checked || undefined })}
                />
                {words.toGo}
              </label>
            )}
            {kit.rush && !guest.later && (
              <label className="bench-mark">
                <input
                  type="checkbox"
                  checked={!!order.rush}
                  onChange={(e) => onOrder(which, { ...order, rush: e.target.checked || undefined })}
                />
                {words.rush}
              </label>
            )}
            {guest.orders.length > 1 && (
              <button
                type="button"
                className="bench-remove"
                aria-label={words.remove(n, drink)}
                onClick={() => onChange({ ...guest, orders: guest.orders.filter((_, i) => i !== which) })}
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        );
      })}
      {(kit.most > 1 || kit.mumble || kit.together || kit.soldOut || kit.later) && (
        <div className="bench-guest-more">
          {kit.most > 1 && !asks && !guest.later && guest.orders.length < kit.most && (
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
              <Plus size={13} aria-hidden="true" /> {words.another}
            </button>
          )}
          {kit.together && guest.orders.length > 1 && (
            <label className="bench-mark">
              <input
                type="checkbox"
                checked={!!guest.together}
                onChange={(e) => onChange({ ...guest, together: e.target.checked || undefined })}
              />
              {words.together}
            </label>
          )}
          {kit.mumble && !guest.soldOut && !guest.later && (
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
              {words.mumbles}
            </label>
          )}
          {kit.soldOut && !guest.mumbles && !guest.later && (
            <select
              aria-label={words.soldOut.label(n)}
              value={guest.soldOut ?? ''}
              onChange={(e) => {
                const soldOut = (e.target.value || undefined) as BenchSoldOut | undefined;
                // A guest whose drink has run out asked for one drink, and orders it alone.
                onChange({
                  ...guest,
                  soldOut,
                  ...(soldOut && { orders: guest.orders.slice(0, 1), together: undefined }),
                });
              }}
            >
              <option value="">{words.soldOut.in}</option>
              <option value="switch">{words.soldOut.switch}</option>
              <option value="leave">{words.soldOut.leave}</option>
            </select>
          )}
          {kit.later && !guest.mumbles && !guest.soldOut && (
            <label className="bench-mark">
              <input
                type="checkbox"
                checked={!!guest.later}
                onChange={(e) =>
                  onChange({
                    ...guest,
                    later: e.target.checked || undefined,
                    // A guest who books for later books one drink, and isn't in a rush for it.
                    ...(e.target.checked && {
                      orders: guest.orders.slice(0, 1).map((order) => ({ ...order, rush: undefined })),
                      together: undefined,
                    }),
                  })
                }
              />
              {words.later}
            </label>
          )}
        </div>
      )}
      <p className="bench-says">
        {guest.mumbles ? (
          <>
            {words.mumbled[0]}
            <span lang={english}>The usual, please.</span>
            {words.mumbled[1]}
            <span lang={english}>{says}</span>
            {words.mumbled[2]}
          </>
        ) : (
          <>
            {words.says[0]}
            <span lang={english}>{says}</span>
            {words.says[1]}
          </>
        )}
        {fits && (tickets.length > 0 || guest.soldOut || guest.later) && (
          <>
            {' '}
            · {words.shouldGet}{' '}
            <strong>
              {tickets.length
                ? tickets.map((ticket) => ticketWords(ticket, words.ticket)).join(` ${words.ticket.and} `)
                : words.soldOut.nothing}
            </strong>
            {asks && words.onceHelped(ROBOT_DISPLAY_NAMES.query)}
            {guest.later && words.untilBack}
          </>
        )}
      </p>
    </li>
  );
}
