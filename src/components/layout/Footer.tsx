"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import styles from "./Footer.module.css";

export default function Footer() {
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateFooterHeight = () => {
      if (!footerRef.current) return;
      const isDesktop = window.matchMedia("(min-width: 900px)").matches;
      if (isDesktop) {
        document.body.classList.add("footer-reveal");
        const height = footerRef.current.offsetHeight;
        document.documentElement.style.setProperty("--footer-h", `${height}px`);
      } else {
        document.body.classList.remove("footer-reveal");
      }
    };

    updateFooterHeight();
    window.addEventListener("resize", updateFooterHeight);
    return () => {
      document.body.classList.remove("footer-reveal");
      window.removeEventListener("resize", updateFooterHeight);
    };
  }, []);

  return (
    <footer ref={footerRef} className={styles.footer}>
      <div className="wrap">
        <div className={styles.grid}>
          <div>
            <Link href="/" className={styles.brand}>
              <i aria-hidden="true" className={styles.mark} />
              GharSe
            </Link>
            <p className={styles.tagline}>
              A noticeboard for Mumbai&apos;s home makers. Pinned up one lane at
              a time.
            </p>
          </div>
          <div>
            <h4 className={styles.heading}>Shop</h4>
            <ul>
              <li>
                <Link href="/explore">Explore</Link>
              </li>
              <li>
                <Link href="/makers">Makers</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className={styles.heading}>Sell</h4>
            <ul>
              <li>
                <Link href="/sell">Pin a tag</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className={styles.heading}>Help</h4>
            <ul>
              <li>
                <Link href="/support">Support</Link>
              </li>
              <li>
                <Link href="/orders">Orders</Link>
              </li>
              <li>
                <Link href="/about">About</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className={styles.word} aria-hidden="true">
          GharSe
        </div>
        <p className={styles.legal}>© 2026 GharSe. Made with care in Mumbai.</p>
      </div>
    </footer>
  );
}