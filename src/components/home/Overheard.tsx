"use client";

import { useRef } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion/gsap";
import styles from "./Overheard.module.css";

const REVIEWS = [
  {
    quote:
      "“Ordered at 4, picked up at 6. Still warm. I'm never buying bread from a packet again.”",
    author: "Riya, Versova",
  },
  {
    quote:
      "“I sell thirty cups a week now. My neighbours found me before my relatives did.”",
    author: "Sunita, potter in Bandra",
  },
  {
    quote: "“Got a date, not a guess.”",
    author: "Imran, Kurla",
  },
  {
    quote:
      "“The pickle jar came with a handwritten label. Small thing. Big smile.”",
    author: "Dev, Dadar",
  },
];

export default function Overheard() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !root.current) return;

      const items = gsap.utils.toArray<HTMLElement>(`.${styles.note}`, root.current);

      gsap.set(items, {
        opacity: 0,
        y: -50,
        rotation: () => gsap.utils.random(-6, 6),
      });

      gsap.to(items, {
        opacity: 1,
        y: 0,
        rotation: (i) => [-2, 1.6, -1.4, 1.2][i % 4],
        duration: 1,
        stagger: 0.12,
        ease: "back.out(1.5)",
        scrollTrigger: {
          trigger: root.current,
          start: "top 85%",
          once: true,
        },
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} className={styles.notes}>
      <div className="wrap">
        <h2>Overheard on the lane</h2>
        <div className={styles.wall}>
          {REVIEWS.map((rev, i) => (
            <figure key={i} className={styles.note}>
              <blockquote>{rev.quote}</blockquote>
              <cite>{rev.author}</cite>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}