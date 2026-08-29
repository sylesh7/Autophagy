import type { Metadata } from "next";
import SidebarNav from "./SidebarNav";
import styles from "./fleet.module.css";

export const metadata: Metadata = {
  title: "Autophagy — Fleet Console",
  description: "Behavioral waste detection and on-chain efficiency reputation for agent fleets.",
};

const NAV_ITEMS = [
  { href: "/fleet/overview", label: "Fleet Overview", index: "01" },
  { href: "/fleet/agents", label: "Agent Detail", index: "02" },
  { href: "/fleet/approve", label: "Approve / Review", index: "03" },
  { href: "/fleet/demo", label: "Live Demo", index: "04" },
  { href: "/fleet/how-it-works", label: "How It Works", index: "05" },
];

export default function FleetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <a className={styles.brand} href="/fleet/overview">
          <span className={styles.brandMark}>Autophagy</span>
          <span className={styles.brandSub}>Fleet Console</span>
        </a>

        <SidebarNav items={NAV_ITEMS} />

        <div className={styles.scopeIndicator}>
          watching namespace
          <br />
          <strong>autophagy</strong>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
