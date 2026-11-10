"use client";

import { useRef } from "react";
import HangTag from "@/components/product/HangTag";
import { ButtonLink } from "@/components/ui/Button";
import { cx } from "@/lib/cx";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion/gsap";
import styles from "./Noticeboard.module.css";

const SAMPLE_TAGS = [
  {
    id: 1,
    name: "Sourdough loaf",
    note: "Baked at 5am, packed warm.",
    price: 180,
    category: "bakes" as const,
    tilt: "-2deg",
  },
  {
    id: 2,
    name: "Clay chai cups (set of 4)",
    note: "Thrown on balconey wheel. Unique.",
    price: 650,
    category: "pottery" as const,
    tilt: "1.6deg",
  },
  {
    id: 3,
    name: "Block-print kurta",
    note: "Made to order. Custom size.",
    price: 1450,
    category: "tailoring" as const,
    tilt: "-1deg",
  },
  {
    id: 4,
    name: "Mango pickle, 500g",
    note: "Mother-in-law's authentic recipe.",
    price: 240,
    category: "pickles" as const,
    tilt: "2.2deg",
  },
  {
    id: 5,
    name: "Jaggery cookies",
    note: "Box of six. Melt in mouth.",
    price: 240,
    category: "bakes" as const,
    tilt: "-1.6deg",
  },
  {
    id: 6,
    name: "Jute tote bag",
    note: "Hand-stitched strong handles.",
    price: 360,
    category: "crafts" as const,
    tilt: "1deg",
  },
];

export default function Noticeboard() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !root.current) return;

      const items = gsap.utils.toArray<HTMLElement>("[data-board-item]", root.current);

      gsap.set(items, {
        opacity: 0,
        y: -70,
        rotation: () => gsap.utils.random(-8, 8),
        transformOrigin: "50% 0",
      });

      gsap.to(items, {
        opacity: 1,
        y: 0,
        rotation: 0,
        duration: 1.1,
        stagger: 0.12,
        ease: "elastic.out(1, 0.65)",
        scrollTrigger: {
          trigger: root.current,
          start: "top 60%",
          once: true,
        },
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} className={styles.board}>
      <div className={cx("wrap", styles.inner)}>
        <div className={styles.head}>
          <div className={styles.noteTitle}>
            <p className="hand">pinned this week</p>
            <h2>Fresh tags on the wall</h2>
          </div>
          <p className={cx("hand", styles.aside)}>
            new tags every morning. most are gone by evening.
          </p>
        </div>

        <div className={styles.tags}>
          {SAMPLE_TAGS.map((tag) => (
            <div key={tag.id} data-board-item>
              <HangTag
                name={tag.name}
                note={tag.note}
                price={tag.price}
                category={tag.category}
                tilt={tag.tilt}
              />
            </div>
          ))}
        </div>

        <div className={styles.moreWrap}>
          <ButtonLink href="/explore">See the whole wall →</ButtonLink>
        </div>
      </div>
    </section>
  );
}