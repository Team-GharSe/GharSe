"use client";

import { useRef } from "react";
import Hero from "@/components/home/Hero";
import Marquee from "@/components/home/Marquee";
import Shelf from "@/components/home/Shelf";
import Noticeboard from "@/components/home/Noticeboard";
import Overheard from "@/components/home/Overheard";
import SellerCTA from "@/components/home/SellerCTA";
import { prefersReducedMotion, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";

export default function HomePage() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !container.current) return;

      const sections = container.current.querySelectorAll<HTMLElement>("[data-theme]");

      sections.forEach((sec) => {
        ScrollTrigger.create({
          trigger: sec,
          start: "top 50%",
          end: "bottom 50%",
          onToggle: (self) => {
            if (self.isActive && sec.dataset.theme) {
              document.body.dataset.theme = sec.dataset.theme;
            }
          },
        });
      });
    },
    { scope: container }
  );

  return (
    <div ref={container}>
      <Hero />
      <Marquee />
      <div data-theme="sand">
        <Shelf />
      </div>
      <div data-theme="cream">
        <Noticeboard />
      </div>
      <div data-theme="sand">
        <Overheard />
      </div>
      <div data-theme="cream">
        <SellerCTA />
      </div>
    </div>
  );
}