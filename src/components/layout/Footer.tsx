import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
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
