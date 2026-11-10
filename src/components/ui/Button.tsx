import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Button.module.css";

type Variant = "butter" | "ink" | "paper";
type Common = { variant?: Variant; className?: string; children: ReactNode };

export function Button({
  variant = "butter",
  className,
  children,
  ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cx(styles.btn, styles[variant], className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "butter",
  className,
  children,
  href,
}: Common & { href: string }) {
  return (
    <Link href={href} className={cx(styles.btn, styles[variant], className)}>
      {children}
    </Link>
  );
}
