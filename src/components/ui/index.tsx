"use client";

import { Check, Loader2, Minus, Plus, type LucideIcon } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
};

const variants = {
  primary: "bg-brand text-white hover:bg-brand-strong shadow-sm disabled:bg-brand/40",
  secondary: "bg-surface text-ink border border-line-strong hover:border-ink/30 hover:bg-paper disabled:opacity-50",
  ghost: "text-ink-soft hover:bg-ink/5 disabled:opacity-40",
  danger: "text-danger hover:bg-danger-soft disabled:opacity-40",
};

const sizes = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-11 px-4 text-[15px] gap-2 rounded-xl",
  lg: "h-13 px-6 text-base gap-2 rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", icon: Icon, iconRight: IconRight, loading, className, children, disabled, ...rest },
  ref,
) {
  const iconSize = size === "sm" ? 16 : 18;
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={cx(
        "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-[background,border,color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 size={iconSize} className="animate-spin" /> : Icon && <Icon size={iconSize} aria-hidden />}
      {children}
      {IconRight && !loading && <IconRight size={iconSize} aria-hidden />}
    </button>
  );
});

/* ------------------------------------------------------------------ */
/* Chips                                                               */
/* ------------------------------------------------------------------ */

export function Chip({
  selected,
  onClick,
  children,
  icon: Icon,
  multi,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  icon?: LucideIcon;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onClick}
      className={cx(
        "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.97]",
        selected
          ? "border-brand bg-brand text-white shadow-sm"
          : "border-line-strong bg-surface text-ink-soft hover:border-ink/30 hover:text-ink",
      )}
    >
      {selected && multi ? <Check size={15} aria-hidden /> : Icon && <Icon size={15} aria-hidden />}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Option card (big selectable tile)                                    */
/* ------------------------------------------------------------------ */

export function OptionCard({
  selected,
  onClick,
  icon: Icon,
  title,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  icon: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cx(
        "flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all duration-150 active:scale-[0.98]",
        selected ? "border-brand bg-brand-soft ring-1 ring-brand" : "border-line bg-surface hover:border-line-strong",
      )}
    >
      <span className={cx("grid size-9 place-items-center rounded-xl", selected ? "bg-brand text-white" : "bg-paper text-ink-soft")}>
        <Icon size={18} aria-hidden />
      </span>
      <span className="font-medium text-ink">{title}</span>
      {hint && <span className="text-[13px] leading-snug text-muted">{hint}</span>}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Number stepper                                                      */
/* ------------------------------------------------------------------ */

export function Stepper({
  value,
  onChange,
  min,
  max,
  label,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label: string;
  suffix?: (v: number) => string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-2 pl-4">
      <span className="text-sm font-medium text-ink-soft">{label}</span>
      <div className="flex items-center gap-1" role="group" aria-label={label}>
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="grid size-9 place-items-center rounded-xl text-ink-soft hover:bg-paper disabled:opacity-30"
        >
          <Minus size={16} />
        </button>
        <output aria-live="polite" className="min-w-16 text-center font-semibold tabular-nums">
          {value}
          {suffix && <span className="font-normal text-muted"> {suffix(value)}</span>}
        </output>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="grid size-9 place-items-center rounded-xl text-ink-soft hover:bg-paper disabled:opacity-30"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={htmlFor} className="block text-[15px] font-semibold text-ink">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]", className)} {...rest}>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-[15px] text-ink placeholder:text-muted/70 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

/** Country flag as an image — emoji flags don't render on Windows. */
export function Flag({ code, className }: { code?: string; className?: string }) {
  if (!code || !/^[a-z]{2}$/i.test(code)) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny external SVG, no optimisation needed
    <img
      src={`https://flagcdn.com/${code.toLowerCase()}.svg`}
      alt=""
      width={20}
      height={15}
      loading="lazy"
      className={cx("inline-block h-[0.9em] w-auto rounded-[2px] align-[-0.05em] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]", className)}
    />
  );
}
