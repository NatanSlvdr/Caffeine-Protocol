import {
  VARIABLES,
  STORE_VALUES,
  parseStore,
  parseSugarWrite,
  CONDITION_CONNECTORS,
  formatConditionExpression,
  parseConditionExpression,
  QUERY_CONDITION_OPERATORS,
  QUERY_CONDITION_SOURCES,
  QUERY_CONDITION_VALUES,
  LOOP_VARIABLES,
  LOOP_SELECTORS,
  parseFor,
  parseQueryComparison,
  blockFields,
  blockVariants,
  normalizeDirection,
} from '@/domain';
import { WORKER_CONDITION_OPERATORS, WORKER_CONDITION_SOURCES, WORKER_CONDITION_VALUES, parseWorkerComparison } from '@/domain/robotConditions';
import { MAX_ITEM_QUANTITY, MAX_MOVE_COUNT } from '@/domain/constants';
import { BlockSelect, DirectionSelect } from '../BlockSelect';
import { BlockIcon } from '../BlockIcon';
import { conditionLabels, conditionOption, operandOption } from './blockMeta';

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
    (value) => expression.conditions.some((condition) => condition.left === value) || options.some((candidate) => parseQueryComparison(candidate)?.left === value),
  );
  const update = (index: number, key: 'left' | 'operator' | 'right', value: string) => {
    const conditions = expression.conditions.map((condition, at) => (at === index ? { ...condition, [key]: value } : condition));
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
                <BlockSelect
                  label={rowLabel + ' connector'}
                  value={connector}
                  disabled={disabled}
                  options={[
                    { value: '', label: connector ? 'Remove following condition' : '+' },
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
    (value) => value === condition.left || options.some((candidate) => candidate === `IF ${value}` || parse(candidate)?.left === value),
  );
  const hasCount =
    options.some((candidate) => candidate === 'IF count' || candidate.startsWith('IF count ')) ||
    condition.left === 'count' ||
    condition.right === 'SUGAR COUNT';
  const sources = membership
    ? QUERY_CONDITION_SOURCES
    : WORKER_CONDITION_SOURCES.filter(
        (value) => value === condition.right || value === 'CUSTOMER SPEECH' || value === 'TRUE' || value === 'FALSE' || hasCount,
      );
  const operators = membership ? QUERY_CONDITION_OPERATORS : [...new Set([condition.operator, ...WORKER_CONDITION_OPERATORS])];
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
            options={STORE_VALUES.map((value) => ({ ...conditionOption(value), label: value === 'number' ? 'Number in item' : (conditionLabels[value] ?? value) }))}
            onChange={(value) => select('source', `STORE ${stored.variable} FROM ${value}`)}
          />
        </span>
      </span>
    );
  }
  if (fields.family === 'ITEM') {
    const sugar = parseSugarWrite(command),
      parts = command.split(' ');
    const quantity = sugar ?? (parts.length === 3 ? parts[1] : '1'),
      item = sugar !== undefined ? 'sugar' : parts.at(-1)!;
    const write = (amount: string, ingredient = item) => (ingredient === 'sugar' ? `WRITE ${amount} sugar` : `ITEM ${amount} ${ingredient}`);
    const variables = options.some((option) => parseStore(option)) ? VARIABLES : [];
    return (
      <>
        {item === 'sugar' ? (
          <BlockSelect
            label={label + ' quantity'}
            value={mask('quantity', quantity)}
            disabled={disabled}
            options={[...Array.from({ length: 20 }, (_, i) => String(i)), ...variables, ...(!/^\d+$/.test(quantity) ? [quantity] : [])]
              .filter((value, index, values) => values.indexOf(value) === index)
              .map(conditionOption)}
            onChange={(value) => select('quantity', write(value))}
          />
        ) : (
          <input
            className="tile-count"
            type="number"
            min={1}
            max={MAX_ITEM_QUANTITY}
            step={1}
            aria-label={label + ' quantity'}
            value={library ? '' : quantity}
            disabled={disabled}
            onKeyDown={(event) => event.stopPropagation()}
            onChange={(event) => {
              const count = Number(event.target.value);
              if (Number.isInteger(count) && count >= 1 && count <= 19) select('quantity', write(String(count)));
            }}
          />
        )}
        <BlockSelect
          label={label + ' value'}
          value={library ? '' : item === 'sugar' ? 'WRITE 1 sugar' : `ITEM ${item}`}
          disabled={disabled}
          options={options.filter((option) => /^ITEM (coffee|tea)$/.test(option) || option === 'WRITE 1 sugar').map(operandOption)}
          onChange={(value) => {
            const ingredient = value === 'WRITE 1 sugar' ? 'sugar' : value.slice(5);
            const amount = /^\d+$/.test(quantity) && Number(quantity) > 0 ? quantity : '1';
            select('item', ingredient === 'sugar' ? write(quantity, ingredient) : parts.length === 2 ? value : write(amount, ingredient));
          }}
        />
      </>
    );
  }
  if (['MOVE', 'TAKE', 'DEPOSIT'].includes(fields.family)) {
    const [, rawDirection, count = '1'] = command.split(' ');
    const query = options.includes('LISTEN');
    const defaultDirection =
      fields.family === 'TAKE'
        ? options.includes('SERVE')
          ? 'DOWN'
          : 'UP'
        : query || !options.includes('BREW')
          ? 'RIGHT'
          : 'UP';
    const direction = normalizeDirection(rawDirection ?? defaultDirection) ?? defaultDirection;
    const nextCommand = (value: string, nextCount = count) => (fields.family === 'MOVE' ? `MOVE ${value} ${nextCount}` : `${fields.family} ${value}`);
    return (
      <>
        <DirectionSelect label={label + ' direction'} value={mask('direction', direction)} disabled={disabled} onChange={(v) => select('direction', nextCommand(v))} />
        {fields.family === 'MOVE' && (
          <>
            <input
              onKeyDown={(e) => e.stopPropagation()}
              className="tile-count"
              type="number"
              min={1}
              max={MAX_MOVE_COUNT}
              step={1}
              aria-label={label + ' tiles'}
              value={mask('count', count)}
              disabled={disabled}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isInteger(n) && n >= 1 && n <= 19) select('count', nextCommand(direction, String(n)));
              }}
            />
            <span className="block-verb block-suffix">tiles</span>
          </>
        )}
      </>
    );
  }
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
      options.includes('LISTEN') && membershipOperands(command, options, disabled, label, (value) => select('condition', value), library, inLoop);
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
