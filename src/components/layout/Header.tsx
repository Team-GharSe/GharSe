import Link from 'next/link';
import styles from './Header.module.css';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/explore', label: 'Explore' },
  { href: '/makers', label: 'Makers' },
  { href: '/sell', label: 'Sell with us' },
];

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={`wrap ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          <i aria-hidden="true" className={styles.mark} />
          GharSe
        </Link>
        <nav className={styles.nav} aria-label="Main">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={styles.link}>
              {item.label}
            </Link>
          ))}
          {/* basket count is wired to the cart feature later */}
          <Link href="/basket" className={`${styles.link} ${styles.basket}`}>
            Basket <span className={styles.count}>0</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}