"use client";

import Link from "next/link";
import { useRef } from "react";
import { cx } from "@/lib/cx";
import type { CSSVars } from "@/lib/css";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion/gsap";
import styles from "./Shelf.module.css";

type ShelfItem = {
  label: string;
  href: string;
  shape?: "jar" | "pot" | "gift";
  vars: CSSVars;
};

// Placeholder shapes stand in for the illustrations. Category links map to real ids later.
const TOP: ShelfItem[] = [
  {
    label: "bakes",
    href: "/explore?category=bakes",
    vars: {
      "--r": "-3deg",
      "--w": "150px",
      "--h": "150px",
      "--c": "var(--orange)",
    },
  },
  {
    label: "pottery",
    href: "/explore?category=pottery",
    shape: "pot",
    vars: {
      "--r": "2deg",
      "--w": "130px",
      "--h": "150px",
      "--c": "var(--terracotta)",
      "--br": "50% 50% 24px 24px / 44% 44% 24px 24px",
      "--y": "4px",
    },
  },
  {
    label: "tailoring",
    href: "/explore?category=tailoring",
    vars: {
      "--r": "-1.5deg",
      "--w": "100px",
      "--h": "150px",
      "--c": "var(--teal)",
      "--br": "14px",
    },
  },
  {
    label: "pickles",
    href: "/explore?category=pickles",
    shape: "jar",
    vars: {
      "--r": "3deg",
      "--w": "110px",
      "--h": "130px",
      "--c": "var(--butter)",
      "--br": "16px",
    },
  },
];

const BOTTOM: ShelfItem[] = [
  {
    label: "spices",
    href: "/explore?category=spices",
    vars: {
      "--r": "2deg",
      "--w": "140px",
      "--h": "110px",
      "--c": "var(--sage)",
      "--br": "140px 140px 18px 18px / 110px 110px 18px 18px",
    },
  },
  {
    label: "gifts",
    href: "/explore?category=gifts",
    shape: "gift",
    vars: {
      "--r": "-2deg",
      "--w": "120px",
      "--h": "120px",
      "--c": "var(--peach)",
      "--br": "12px",
    },
  },
  {
    label: "crafts",
    href: "/explore?category=crafts",
    vars: {
      "--r": "3deg",
      "--w": "90px",
      "--h": "150px",
      "--c": "var(--chilli)",
      "--br": "45px",
    },
  },
];

function renderItem(item: ShelfItem) {
  return (
    <Link
      key={item.label}
      href={item.href}
      className={styles.thing}
      style={item.vars}
    >
      <span className={cx(styles.shape, item.shape && styles[item.shape])} />
      <span className={styles.label}>{item.label}</span>
    </Link>
  );
}

export default function Shelf() {
  const topRow = useRef<HTMLDivElement>(null);
  const bottomRow = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion()) return;

    // dir 1: items start off-screen right and slide left. dir -1: start off-screen left and slide right.
    const slideIn = (row: HTMLElement | null, dir: 1 | -1) => {
      if (!row) return;
      const items = gsap.utils.toArray<HTMLElement>(`.${styles.thing}`, row);
      gsap.from(items, {
        x: () => dir * window.innerWidth,
        duration: 1.3,
        ease: "power3.out",
        // the item that travels furthest leads, so the row arrives like a train
        stagger: { each: 0.14, from: dir === 1 ? "start" : "end" },
        scrollTrigger: { trigger: row, start: "top 80%", once: true },
      });
    };

    slideIn(topRow.current, 1);
    slideIn(bottomRow.current, -1);
  });

  return (
    <section className={styles.shelf}>
      <div className="wrap">
        <div className={styles.intro}>
          <h2>Start with what you need</h2>
          <span className={cx("hand", styles.hint)}>
            (tap anything on the shelf)
          </span>
        </div>
        <div ref={topRow} className={styles.row}>
          {TOP.map(renderItem)}
        </div>
        <div ref={bottomRow} className={cx(styles.row, styles.rowEnd)}>
          {BOTTOM.map(renderItem)}
        </div>
      </div>
    </section>
  );
}
