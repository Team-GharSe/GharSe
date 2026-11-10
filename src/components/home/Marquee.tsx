"use client";

import { useRef } from "react";
import {
  gsap,
  prefersReducedMotion,
  ScrollTrigger,
  useGSAP,
} from "@/lib/motion/gsap";
import styles from "./Marquee.module.css";

const ITEMS = [
  "Bakers",
  "Potters",
  "Tailors",
  "Pickle makers",
  "Jewellers",
  "Crafters",
];

export default function Marquee() {
  const track = useRef<HTMLDivElement>(null);

  // The strip scrolls by CSS. Scrolling the page speeds it up and flips its direction.
  useGSAP(
    () => {
      if (prefersReducedMotion() || !track.current) return;
      const anim = track.current.getAnimations()[0];
      if (!anim) return;

      anim.currentTime = 100000; // keeps reverse playback inside an iteration
      const proxy = { rate: 1 };
      const apply = () => {
        anim.playbackRate = proxy.rate;
      };

      ScrollTrigger.create({
        onUpdate: (self) => {
          const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 300, 5);
          gsap.to(proxy, {
            rate: self.direction * boost,
            duration: 0.3,
            overwrite: true,
            onUpdate: apply,
            onComplete: () => {
              gsap.to(proxy, {
                rate: self.direction,
                duration: 1.2,
                onUpdate: apply,
              });
            },
          });
        },
      });
    },
    { scope: track },
  );

  return (
    <div className={styles.marquee} aria-hidden="true">
      <div ref={track} className={styles.track}>
        {[...ITEMS, ...ITEMS].map((item, i) => (
          <span key={i}>{item}</span>
        ))}
      </div>
    </div>
  );
}
