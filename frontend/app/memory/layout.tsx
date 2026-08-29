import type { Metadata } from 'next';
import SidebarNav from './SidebarNav';
import styles from './memory.module.css';

export const metadata: Metadata = {
  title: 'HyperXDB — Memory Console',
  description: 'Programmable memory reasoning for AI agents, built on HydraDB.',
};

const NAV_ITEMS = [
  { href: '/memory/ask', label: 'Ask Memory', index: '01' },
  { href: '/memory/ingest', label: 'Ingest Sessions', index: '02' },
  { href: '/memory/graph', label: 'Memory Graph', index: '03' },
  { href: '/memory/compiler', label: 'Compiler Inspector', index: '04' },
  { href: '/memory/ablation', label: 'Ablations', index: '05' },
];

export default function MemoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <a className={styles.brand} href="/memory/ask">
          <span className={styles.brandMark}>HyperXDB</span>
          <span className={styles.brandSub}>Memory Console</span>
        </a>

        <SidebarNav items={NAV_ITEMS} />

        <div className={styles.scopeIndicator}>
          asking as
          <br />
          <strong>demo / austin</strong>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
