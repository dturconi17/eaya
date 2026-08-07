import { SidebarMenu } from "@/app/components/SidebarMenu";
import styles from "./layout.module.css";

export default function CRMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.crmLayout}>
      <SidebarMenu />

      <div className={styles.crmContent}>
        {children}
      </div>
    </div>
  );
}