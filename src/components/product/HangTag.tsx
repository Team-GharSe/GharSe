import { cx } from "@/lib/cx";
import type { CSSVars } from "@/lib/css";
import { formatINR } from "@/lib/format";
import styles from "./HangTag.module.css";

export type TagCategory =
  "bakes" | "pottery" | "tailoring" | "pickles" | "crafts";

type Props = {
  name: string;
  note?: string;
  price: number;
  category?: TagCategory;
  mini?: boolean;
  tilt?: string;
  floatDelay?: string;
  className?: string;
  style?: CSSVars;
};

// Kept minimal on purpose. Maker, distance and add-to-basket arrive with the noticeboard.
export default function HangTag({
  name,
  note,
  price,
  category,
  mini = false,
  tilt = "0deg",
  floatDelay,
  className,
  style,
}: Props) {
  const vars: CSSVars = {
    "--r": tilt,
    ...(floatDelay ? { "--d": floatDelay } : {}),
    ...style,
  };
  return (
    <article
      className={cx(styles.tag, mini && styles.mini, className)}
      data-cat={category}
      style={vars}
    >
      <i className={styles.pin} aria-hidden="true" />
      <div className={styles.media}>
        <span>photo</span>
      </div>
      <span className={styles.stamp}>{formatINR(price)}</span>
      <div className={styles.body}>
        <h3>{name}</h3>
        {note && <p className={styles.note}>{note}</p>}
      </div>
    </article>
  );
}
