import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import type { CSSVars } from "@/lib/css";
import styles from "./Sticker.module.css";

type Props = {
  variant?: "butter" | "red" | "teal";
  hand?: boolean;
  live?: boolean;
  rotate?: string;
  className?: string;
  style?: CSSVars;
  children: ReactNode;
};

export default function Sticker({
  variant = "butter",
  hand = false,
  live = false,
  rotate = "-6deg",
  className,
  style,
  children,
}: Props) {
  const vars: CSSVars = { "--r": rotate, ...style };
  return (
    <span
      className={cx(
        styles.sticker,
        styles[variant],
        hand && styles.hand,
        live && styles.live,
        className,
      )}
      style={vars}
    >
      {children}
    </span>
  );
}
