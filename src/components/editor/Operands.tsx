import { useState } from 'react';
import {
  VARIABLES,
  STORE_VALUES,
  parseStore,
  parseSugarWrite,
  parseMarkWrite,
  CONDITION_CONNECTORS,
  formatConditionExpression,
  parseConditionExpression,
  QUERY_CONDITION_OPERATORS,
  QUERY_CONDITION_SOURCES,
  QUERY_CONDITION_VALUES,
  LOOP_VARIABLES,
  LOOP_SELECTORS,
  parseFor,
  parseMoveTo,
  parseTimes,
  parseQueryComparison,
  STORE_SOURCE_LABELS,
  blockFields,
  blockVariants,
  normalizeDirection,
} from '@/domain';
import {
  WORKER_CONDITION_OPERATORS,
  WORKER_CONDITION_SOURCES,
  WORKER_CONDITION_VALUES,
  parseWorkerComparison,
} from '@/domain/robotConditions';
import { MAX_ITEM_QUANTITY, MAX_MOVE_COUNT } from '@/domain/constants';
import { BlockSelect, DirectionSelect } from '../BlockSelect';
import { keepKeysInBlock } from '../selects/blockKeys';
import { BlockIcon } from '../BlockIcon';
import { conditionLabels, conditionOption, operandOption } from './blockMeta';

/**
 * A block's whole-number field. A number in range applies as it's typed; anything else, like the empty field
 * on the way from 2 to 3, stays as typed instead of snapping back, and leaving the field shows the block's own.
 */
function CountInput({
  value,
  max,
  label,
  disabled,
  onChange,
}: {
  value: string;
  max: number;
  label: string;
  disabled: boolean;
  onChange: (count: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      className="tile-count"
      type="number"
      inputMode="numeric"
      min={1}
      max={max}
      step={1}
      aria-label={label}
      // A number out of range shows as typed but isn't applied, so the field says so; an emptied one is mid-retype.
      aria-invalid={!disabled && !!draft}
      // A field disabled mid-edit, as a service starts, may never see its blur: it shows the block's number.
      value={disabled ? value : (draft ?? value)}
      disabled={disabled}
      onKeyDown={keepKeysInBlock}
      onChange={(event) => {
        const text = event.target.value,
          count = Number(text);
        if (text !== '' && Number.isInteger(count) && count >= 1 && count <= max) {
          setDraft(null);
          onChange(count);
        } else setDraft(text);
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

/** Each connector extends the same IF with another editable row, keeping its body intact. */
export function membershipOperands(
  command: string,
  options: string[],
  disabled: boolean,
  label: string,
  onChange: (value: string) => void,
  library: boolean,
  inLoop: boolean,
) {
  const expression = parseConditionExpression(command);
  if (!expression) return null;
  const values = QUERY_CONDITION_VALUES.filter(
    (value) =>
      expression.conditions.some((condition) => condition.left === value) ||
      options.some((candidate) => parseQueryComparison(candidate)?.left === value),
  );
  const update = (index: number, key: 'left' | 'operator' | 'right', value: string) => {
    const conditions = expression.conditions.map((condition, at) =>
      at === index ? { ...condition, [key]: value } : condition,
    );
    onChange(formatConditionExpression({ ...expression, conditions }));
  };
  return (
    <span className="if-condition-rows">
      {expression.conditions.map((condition, index) => {
        const rowLabel = label + (index ? ` condition ${index + 1}` : '');
        const connector = expression.connectors[index] ?? '';
        return (
          <span className="if-comparison-operands" key={index}>
            <BlockSelect
              label={rowLabel + ' value'}
              value={library ? '' : condition.left}
              disabled={disabled}
              onChange={(value) => update(index, 'left', value)}
              options={values.map(conditionOption)}
            />
            <BlockSelect
              label={rowLabel + ' operator'}
              value={library ? '' : condition.operator}
              disabled={disabled}
              onChange={(value) => update(index, 'operator', value)}
              options={QUERY_CONDITION_OPERATORS.map(conditionOption)}
            />
            <BlockSelect
              label={rowLabel + ' source'}
              value={library ? '' : condition.right}
              disabled={disabled}
              onChange={(value) => update(index, 'right', value)}
              options={QUERY_CONDITION_SOURCES.filter((source) => source !== 'item' || inLoop).map(conditionOption)}
            />
            {!library && (
              <span
                className={connector ? 'condition-connector' : 'condition-connector optional-connector'}
                title={connector ? undefined : 'Optional: add another condition'}
              >
                {/* The title only reaches a pointer, so the unset menu names what it's for in its own label. */}
                <BlockSelect
                  label={rowLabel + (connector ? ' connector' : ' add another condition')}
                  value={connector}
                  disabled={disabled}
                  options={[
                    connector
                      ? { value: '', label: 'Remove following condition' }
                      : { value: '', label: '+', spoken: 'No other condition' },
                    ...CONDITION_CONNECTORS.map(conditionOption),
                  ]}
                  onChange={(value) => {
                    const conditions = [...expression.conditions],
                      connectors = [...expression.connectors];
                    if (!value) {
                      conditions.splice(index + 1, 1);
                      connectors.splice(index, 1);
                    } else {
                      connectors[index] = value === 'AND' ? 'AND' : 'OR';
                      if (index === conditions.length - 1) conditions.push({ ...condition });
                    }
                    onChange(formatConditionExpression({ conditions, connectors }));
                  }}
                />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

export function comparisonOperands(
  command: string,
  options: string[],
  disabled: boolean,
  label: string,
  onChange: (key: string, value: string) => void,
  mask: (key: string, value: string) => string,
) {
  const membership = options.includes('LISTEN') ? parseQueryComparison(command) : undefined;
  const condition = membership ?? parseWorkerComparison(command);
  if (!condition) return null;
  const vocabulary = membership ? QUERY_CONDITION_VALUES : WORKER_CONDITION_VALUES;
  const parse = membership ? parseQueryComparison : parseWorkerComparison;
  const values = vocabulary.filter(
    (value) =>
      value === condition.left ||
      options.some((candidate) => candidate === `IF ${value}` || parse(candidate)?.left === value),
  );
  const hasCount =
    options.some((candidate) => candidate === 'IF count' || candidate.startsWith('IF count ')) ||
    condition.left === 'count' ||
    condition.right === 'SUGAR COUNT';
  const sources = membership
    ? QUERY_CONDITION_SOURCES
    : WORKER_CONDITION_SOURCES.filter(
        (value) =>
          value === condition.right || value === 'CUSTOMER SPEECH' || value === 'TRUE' || value === 'FALSE' || hasCount,
      );
  const operators = membership
    ? QUERY_CONDITION_OPERATORS
    : [...new Set([condition.operator, ...WORKER_CONDITION_OPERATORS])];
  const next = (left: string, operator: string, right: string) => `IF ${left} ${operator} ${right}`;
  return (
    <span className="if-comparison-operands">
      <BlockSelect
        label={label + ' value'}
        value={mask('value', condition.left)}
        disabled={disabled}
        onChange={(value) => onChange('value', next(value, condition.operator, condition.right))}
        options={values.map(conditionOption)}
      />
      <BlockSelect
        label={label + ' operator'}
        value={mask('operator', condition.operator)}
        disabled={disabled}
        onChange={(operator) => onChange('operator', next(condition.left, operator, condition.right))}
        options={operators.map(conditionOption)}
      />
      <BlockSelect
        label={label + ' source'}
        value={mask('source', condition.right)}
        disabled={disabled}
        onChange={(right) => onChange('source', next(condition.left, condition.operator, right))}
        options={sources.map(conditionOption)}
      />
    </span>
  );
}

export function Operands({
  command,
  options,
  disabled,
  label,
  onChange,
  library = false,
  inLoop = false,
  storeLabel,
}: {
  command: string;
  options: string[];
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  library?: boolean;
  inLoop?: boolean;
  storeLabel?: React.ReactNode;
}) {
  const mask = (_key: string, value: string) => (library ? '' : value);
  const select = (_key: string, value: string) => {
    if (!library) onChange(value);
  };
  const fields = blockFields(command);
  if (fields.family === 'STORE') {
    const stored = parseStore(command) ?? { variable: 'var1', value: 'number' };
    // Brew and Porter store what their library offers; Query stores numbers.
    const robotSources = options
      .map((option) => parseStore(option)?.value)
      .filter((value) => value && !STORE_VALUES.includes(value));
    const sources = robotSources.length ? [...new Set(robotSources as string[])] : STORE_VALUES;
    return (
      <span className="assignment-operands">
        <span className="assignment-tile">
          {storeLabel ?? (
            <span className="store-label">
              <BlockIcon command={command} />
              <strong>Store :</strong>
            </span>
          )}
          <BlockSelect
            label={label + ' variable'}
            value={stored.variable}
            disabled={disabled}
            options={VARIABLES.map(conditionOption)}
            onChange={(variable) => select('variable', `STORE ${variable} FROM ${stored.value}`)}
          />
        </span>
        <span className="assignment-equals">=</span>
        <span className="assignment-tile">
          <BlockSelect
            label={label + ' source'}
            value={stored.value}
            disabled={disabled}
            options={sources.map((value) => ({
              ...conditionOption(value),
              label: STORE_SOURCE_LABELS[value] ?? conditionLabels[value] ?? value,
            }))}
            onChange={(value) => select('source', `STORE ${stored.variable} FROM ${value}`)}
          />
        </span>
      </span>
    );
  }
  if (fields.family === 'ITEM') {
    const sugar = parseSugarWrite(command),
      mark = parseMarkWrite(command),
      parts = command.split(' ');
    const quantity = sugar ?? (parts.length === 3 ? parts[1] : '1'),
      item = sugar !== undefined ? 'sugar' : parts.at(-1)!;
    const write = (amount: string, ingredient = item) =>
      ingredient === 'sugar' ? `WRITE ${amount} sugar` : `ITEM ${amount} ${ingredient}`;
    const variables = options.some((option) => parseStore(option)) ? VARIABLES : [];
    return (
      <>
        {mark ? null : item === 'sugar' ? (
          <BlockSelect
            label={label + ' quantity'}
            value={mask('quantity', quantity)}
            disabled={disabled}
            options={[
              ...Array.from({ length: 20 }, (_, i) => String(i)),
              ...variables,
              ...(!/^\d+$/.test(quantity) ? [quantity] : []),
            ]
              .filter((value, index, values) => values.indexOf(value) === index)
              .map(conditionOption)}
            onChange={(value) => select('quantity', write(value))}
          />
        ) : (
          <CountInput
            label={label + ' quantity'}
            max={MAX_ITEM_QUANTITY}
            value={library ? '' : quantity}
            disabled={disabled}
            onChange={(count) => select('quantity', write(String(count)))}
          />
        )}
        <BlockSelect
          label={label + ' value'}
          value={library ? '' : mark ? command : item === 'sugar' ? 'WRITE 1 sugar' : `ITEM ${item}`}
          disabled={disabled}
          options={options
            .filter(
              (option) => /^ITEM (coffee|tea)$/.test(option) || option === 'WRITE 1 sugar' || parseMarkWrite(option),
            )
            .map(operandOption)}
          onChange={(value) => {
            // A mark says one thing, with no amount to carry over.
            if (parseMarkWrite(value) || mark) {
              select('item', value);
              return;
            }
            const ingredient = value === 'WRITE 1 sugar' ? 'sugar' : value.slice(5);
            const amount = /^\d+$/.test(quantity) && Number(quantity) > 0 ? quantity : '1';
            select(
              'item',
              ingredient === 'sugar'
                ? write(quantity, ingredient)
                : parts.length === 2
                  ? value
                  : write(amount, ingredient),
            );
          }}
        />
      </>
    );
  }
  if (fields.family === 'MOVE TO') {
    const variable = parseMoveTo(command) ?? 'var1';
    return (
      <BlockSelect
        label={label + ' variable'}
        value={mask('variable', variable)}
        disabled={disabled}
        onChange={(value) => select('variable', `MOVE ${value}`)}
        options={VARIABLES.map(conditionOption)}
      />
    );
  }
  if (['MOVE', 'TAKE', 'DEPOSIT', 'USE'].includes(fields.family)) {
    const [, rawDirection, count = '1'] = command.split(' ');
    // Brew and Porter deposit up onto the counter and tables; Porter takes drinks down from pickup.
    const porter = options.includes('CALL deliver'),
      robot = porter || options.includes('USE UP');
    const defaultDirection = fields.family === 'TAKE' ? (porter ? 'DOWN' : 'UP') : robot ? 'UP' : 'RIGHT';
    const direction = normalizeDirection(rawDirection ?? defaultDirection) ?? defaultDirection;
    const nextCommand = (value: string, nextCount = count) =>
      fields.family === 'MOVE' ? `MOVE ${value} ${nextCount}` : `${fields.family} ${value}`;
    return (
      <>
        <DirectionSelect
          label={label + ' direction'}
          value={mask('direction', direction)}
          disabled={disabled}
          onChange={(v) => select('direction', nextCommand(v))}
        />
        {fields.family === 'MOVE' && (
          <>
            <CountInput
              label={label + ' tiles'}
              max={MAX_MOVE_COUNT}
              value={mask('count', count)}
              disabled={disabled}
              onChange={(n) => select('count', nextCommand(direction, String(n)))}
            />
            <span className="block-verb block-suffix">tiles</span>
          </>
        )}
      </>
    );
  }
  const times = parseTimes(command);
  if (times)
    return (
      <>
        <BlockSelect
          label={label + ' variable'}
          value={mask('variable', times)}
          disabled={disabled}
          onChange={(variable) => select('variable', `FOR ${variable} TIMES`)}
          options={VARIABLES.map(conditionOption)}
        />
        <span className="block-verb block-suffix">times</span>
      </>
    );
  if (fields.family === 'FOR') {
    const loop = parseFor(command);
    if (!loop) return null;
    return (
      <>
        <BlockSelect
          label={label + ' variable'}
          value={mask('variable', loop.variable)}
          disabled={disabled}
          onChange={(variable) => select('variable', `FOR ${variable} IN ${loop.selector}`)}
          options={LOOP_VARIABLES.map(conditionOption)}
        />
        <span className="block-verb block-suffix">in</span>
        <BlockSelect
          label={label + ' selector'}
          value={mask('selector', loop.selector)}
          disabled={disabled}
          onChange={(selector) => select('selector', `FOR ${loop.variable} IN ${selector}`)}
          options={LOOP_SELECTORS.map(conditionOption)}
        />
      </>
    );
  }
  if (fields.family === 'IF') {
    const membership =
      options.includes('LISTEN') &&
      membershipOperands(command, options, disabled, label, (value) => select('condition', value), library, inLoop);
    if (membership) return membership;
    const comparison = comparisonOperands(command, options, disabled, label, select, mask);
    if (comparison) return comparison;
  }
  if (!fields.value || ['JUMP', 'POSITION'].includes(fields.family)) return null;
  const variants = blockVariants(command, options);
  if (!variants.includes(command) && command !== 'ITEM heard') variants.unshift(command);
  return (
    <>
      <BlockSelect
        label={label + (fields.family === 'IF' ? ' condition' : ' value')}
        value={mask('value', command)}
        disabled={disabled}
        onChange={(value) => select('value', value)}
        options={variants.map(operandOption)}
      />
      {fields.family === 'ITEM' && <span className="block-verb block-suffix">on paper</span>}
    </>
  );
}
