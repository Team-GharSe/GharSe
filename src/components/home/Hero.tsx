"use client";

import { useRef } from "react";
import HangTag from "@/components/product/HangTag";
import Words from "@/components/motion/Words";
import { Button } from "@/components/ui/Button";
import Sticker from "@/components/ui/Sticker";
import { cx } from "@/lib/cx";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion/gsap";
import styles from "./Hero.module.css";

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const scope = root.current;
      if (!scope || prefersReducedMotion()) return;
      const q = gsap.utils.selector(scope);

      // CSS hides these until JS is ready; reveal, then animate from hidden.
      gsap.set(q(`.${styles.intro}`), { opacity: 1 });

      gsap
        .timeline({ defaults: { ease: "power4.out" } })
        .from(q("[data-split]"), {
          y: 70,
          opacity: 0,
          rotation: () => gsap.utils.random(-8, 8),
          duration: 0.9,
          stagger: 0.07,
        })
        .from(
          q(`.${styles.eyebrow}, .${styles.sub}, .${styles.finder}`),
          { autoAlpha: 0, y: 30, duration: 0.8, stagger: 0.12 },
          "-=0.5",
        )
        .from(
          q(`.${styles.clusterTag}`),
          {
            y: -140,
            opacity: 0,
            rotation: (i: number) => [-14, 12, -9][i % 3],
            duration: 1.1,
            stagger: 0.16,
            ease: "back.out(1.5)",
          },
          "-=1",
        )
        .from(
          q(`.${styles.pop}`),
          {
            scale: 0,
            rotation: -45,
            duration: 0.6,
            stagger: 0.12,
            ease: "back.out(3)",
          },
          "-=0.5",
        );

      gsap.to(q(`.${styles.cluster}`), {
        yPercent: -12,
        ease: "none",
        scrollTrigger: {
          trigger: scope,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.hero}>
      <div className={`wrap ${styles.grid}`}>
        <div>
          <p className={cx("hand", styles.eyebrow, styles.intro)}>
            mumbai&apos;s home makers, pinned up in one place
          </p>
          <h1 className={styles.intro}>
            <Words text="Somebody" />{" "}
            <span data-split className={styles.pill} aria-hidden="true" />{" "}
            <Words text="near you is" />{" "}
            <span
              data-split
              className={cx(styles.pill, styles.pillTeal)}
              aria-hidden="true"
            />{" "}
            <span data-split className="hl">
              baking
            </span>{" "}
            <Words text="right now." />
          </h1>
          <p className={cx(styles.sub, styles.intro)}>
            Bakers, potters and tailors working from their own kitchens, a few
            lanes away.
          </p>

          {/* /explore is built later. For now this submits to a 404. */}
          <form className={cx(styles.finder, styles.intro)} action="/explore">
            <span>I&apos;m after</span>
            <select
              aria-label="What are you after"
              name="c"
              defaultValue="bread"
            >
              <option>bread</option>
              <option>pottery</option>
              <option>a kurta</option>
              <option>pickles</option>
              <option>gifts</option>
            </select>
            <span>near</span>
            <input
              aria-label="Your area"
              name="area"
              defaultValue="Andheri"
              autoComplete="off"
            />
            <Button type="submit">Go →</Button>
          </form>
        </div>

        <div className={styles.cluster}>
          <HangTag
            mini
            name="Sourdough"
            note="baked at 5am"
            price={180}
            category="bakes"
            tilt="-5deg"
            floatDelay="0s"
            className={cx(styles.clusterTag, styles.intro)}
            style={{ left: 0, top: 30 }}
          />
          <HangTag
            mini
            name="Chai cups"
            note="no two alike"
            price={650}
            category="pottery"
            tilt="4deg"
            floatDelay="-2s"
            className={cx(styles.clusterTag, styles.intro)}
            style={{ right: 0, top: 120 }}
          />
          <HangTag
            mini
            name="Block-print kurta"
            note="made to order"
            price={1450}
            category="tailoring"
            tilt="-2deg"
            floatDelay="-4s"
            className={cx(styles.clusterTag, styles.intro)}
            style={{ left: 60, bottom: 0 }}
          />
          <Sticker
            hand
            live
            rotate="5deg"
            className={cx(styles.intro, styles.pop)}
            style={{ right: "6%", top: 0 }}
          >
            baking now · 0.8 km
          </Sticker>
          <Sticker
            variant="red"
            rotate="-8deg"
            className={cx(styles.intro, styles.pop)}
            style={{ left: "2%", bottom: "36%" }}
          >
            Verified
          </Sticker>
        </div>
      </div>
    </section>
  );
}
