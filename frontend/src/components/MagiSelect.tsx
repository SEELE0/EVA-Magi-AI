import type { ReactNode, RefObject } from 'react';
import { Select } from '@base-ui/react/select';

export interface MagiSelectOption {
  value: string;
  label: string;
}

export function MagiSelect({
  value,
  options,
  onValueChange,
  ariaLabel,
  id,
  className = '',
  disabled = false,
  portalContainer,
  triggerContent,
  positionerClassName = '',
  title
}: {
  value: string;
  options: MagiSelectOption[];
  onValueChange: (value: string) => void;
  ariaLabel: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  portalContainer?: HTMLElement | null | RefObject<HTMLElement | null>;
  triggerContent?: ReactNode;
  positionerClassName?: string;
  title?: string;
}) {
  return (
    <Select.Root
      value={value}
      onValueChange={(next) => { if (typeof next === 'string') onValueChange(next); }}
      disabled={disabled}
      items={options}
    >
      <Select.Trigger aria-label={ariaLabel} className={`magi-select__trigger ${className}`} id={id} title={title}>
        {triggerContent ?? <Select.Value className="magi-select__value" />}
        <Select.Icon className="magi-select__icon" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none"><path d="m4 6 4 4 4-4" /></svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal container={portalContainer}>
        <Select.Positioner className={`magi-select__positioner ${positionerClassName}`} sideOffset={6} alignItemWithTrigger={false}>
          <Select.Popup className="magi-select__popup">
            <Select.List className="magi-select__list">
              {options.map((option) => (
                <Select.Item className="magi-select__item" key={option.value} value={option.value}>
                  <Select.ItemText className="magi-select__item-text">{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="magi-select__indicator" aria-hidden="true">✓</Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
