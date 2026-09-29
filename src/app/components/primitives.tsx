import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/** Page heading that receives focus after navigation so screen readers land in context. */
export function PageHeader({
  title,
  intro,
  children,
  hideTitle = false,
}: {
  title: string;
  intro?: ReactNode;
  children?: ReactNode;
  hideTitle?: boolean;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `${title} · NeuroNav`;
    // Only move focus for in-app navigation, not the first page load.
    if (document.body.dataset.navigated === 'true') ref.current?.focus({ preventScroll: false });
  }, [title]);
  return (
    <header className={hideTitle ? undefined : 'page-header'}>
      <div>
        <h1 ref={ref} tabIndex={-1} className={hideTitle ? 'visually-hidden' : 'page-title'}>
          {title}
        </h1>
        {intro && !hideTitle && <p className="page-intro">{intro}</p>}
      </div>
      {children}
    </header>
  );
}

export function Switch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="switch-row">
      <div className="switch-row__text">
        <span id={`${id}-label`} className="label">
          {label}
        </span>
        {description && (
          <span id={`${id}-desc`} className="hint">
            {description}
          </span>
        )}
      </div>
      <span className="button-row" style={{ gap: '0.5rem', flexWrap: 'nowrap' }}>
        <span className="switch__state" aria-hidden="true">
          {checked ? 'On' : 'Off'}
        </span>
        <button
          type="button"
          role="switch"
          className="switch"
          aria-checked={checked}
          aria-labelledby={`${id}-label`}
          aria-describedby={description ? `${id}-desc` : undefined}
          onClick={() => onChange(!checked)}
        />
      </span>
    </div>
  );
}

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/** Radio group styled as selectable tiles. Native radios keep arrow-key behaviour. */
export function ChoiceGroup<T extends string>({
  legend,
  hint,
  name,
  value,
  options,
  onChange,
  columns,
}: {
  legend: string;
  hint?: string;
  name: string;
  value: T;
  options: ChoiceOption<T>[];
  onChange: (value: T) => void;
  columns?: number;
}) {
  const id = useId();
  return (
    <fieldset className="fieldset" aria-describedby={hint ? `${id}-hint` : undefined}>
      <legend>{legend}</legend>
      {hint && (
        <p id={`${id}-hint`} className="hint" style={{ marginTop: '-0.25rem', marginBottom: '0.5rem' }}>
          {hint}
        </p>
      )}
      <div className="choice-grid" style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}>
        {options.map((o) => (
          <label key={o.value} className="choice">
            <input type="radio" name={`${name}-${id}`} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span className="choice__label">{o.label}</span>
            {o.hint && <span className="choice__hint">{o.hint}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Button that opens a small list of labelled actions. Not an ARIA menu; plain buttons in a list. */
export function ActionMenu({ label, children }: { label: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  return (
    <div className="action-menu" ref={wrapper}>
      <button
        ref={button}
        type="button"
        className="btn btn--ghost btn--small"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
      </button>
      <div id={id} className="action-menu__panel" hidden={!open}>
        {open && <ul role="list">{children(close)}</ul>}
      </div>
    </div>
  );
}

export function MenuItem({ onSelect, children, danger }: { onSelect: () => void; children: ReactNode; danger?: boolean }) {
  return (
    <li>
      <button type="button" className={`action-menu__item${danger ? ' action-menu__item--danger' : ''}`} onClick={onSelect}>
        {children}
      </button>
    </li>
  );
}

/** Native <dialog> with a labelled title; the browser handles focus containment and Escape. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal?.();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} className="dialog" aria-labelledby={`${id}-title`} onCancel={onCancel} onClose={() => open && onCancel()}>
      <h2 id={`${id}-title`} className="card__title">
        {title}
      </h2>
      <div className="dialog__body">{body}</div>
      <div className="button-row dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      {children && <div className="muted">{children}</div>}
    </div>
  );
}
