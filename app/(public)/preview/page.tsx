// preview page for newly created UI components

import Skeleton from "@/components/Skeleton"
import styles from "./preview.module.css"

export default function PreviewPage() {
  return (
    <div className="page-content">
      <h2>Preview</h2>
      <section className={styles.section}>
        <h3>Skeleton</h3>
        <div className={styles.grid}>
          <Skeleton />
          <Skeleton />
        </div>
      </section>
    </div>
  )
}
