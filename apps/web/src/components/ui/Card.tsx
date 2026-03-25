import { type HTMLAttributes } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={twMerge(
        clsx(
          "rounded-xl border border-[var(--color-border)] bg-surface shadow-lg",
          className
        )
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: CardProps) {
  return (
    <div
      className={twMerge(clsx("px-6 py-4 border-b border-[var(--color-border)]", className))}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: CardProps) {
  return (
    <div className={twMerge(clsx("px-6 py-4", className))} {...props} />
  );
}

export function CardFooter({ className, ...props }: CardProps) {
  return (
    <div
      className={twMerge(
        clsx("px-6 py-4 border-t border-[var(--color-border)]", className)
      )}
      {...props}
    />
  );
}
