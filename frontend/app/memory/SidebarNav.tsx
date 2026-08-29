'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './memory.module.css';

interface NavItem {
  href: string;
  label: string;
  index: string;
}

export default function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {items.map((item) => {
        const active = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink}
          >
            <span className={styles.navIndex}>{item.index}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
