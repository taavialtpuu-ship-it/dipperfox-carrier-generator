"use client";
import clsx from "clsx";
import { HelpCircle, Loader2 } from "lucide-react";
import { forwardRef, useId, useState } from "react";

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "navy";

export const Button = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; busy?: boolean; size?: "sm" | "md" }>(
  function Button({ variant = "secondary", busy, size = "md", className, children, disabled, ...rest }, ref) {
    return (
      <button
        ref={ref}
        disabled={disabled || busy}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-sm",
          variant === "primary" && "bg-orange text-white hover:bg-orange-600",
          variant === "navy" && "bg-navy text-white hover:bg-navy-600",
          variant === "secondary" && "border border-line bg-white text-ink hover:border-navy/40",
          variant === "ghost" && "text-slate hover:bg-black/5",
          variant === "danger" && "border border-status-fail/30 bg-white text-status-fail hover:bg-status-fail-bg",
          className,
        )}
        {...rest}
      >
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  },
);

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("rounded-xl border border-line bg-white", className)} {...rest}>
      {children}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </span>
  );
}

/** Expandable plain-English explanation of a technical term. */
export function Explain({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-xs text-navy underline-offset-2 hover:underline"
      >
        <HelpCircle className="size-3.5" aria-hidden />
        {label}
      </button>
      {open && (
        <span id={id} className="mt-1 block rounded-md bg-ice px-3 py-2 text-xs leading-relaxed text-slate">
          {text}
        </span>
      )}
    </span>
  );
}

export function ErrorNote({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-status-fail/20 bg-status-fail-bg px-3 py-2 text-sm text-status-fail">
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-medium underline">
          {retryLabel ?? "Try again"}
        </button>
      )}
    </div>
  );
}
