import styles from "./Skeleton.module.css"

export default function Skeleton() {
  return (
    <div className={styles.skeleton} role="status" aria-label="Loading">
      <div className={styles.header}>
        <div className={styles.avatar} />
        <div className={styles.headerLines}>
          <div className={styles.lineLong} />
          <div className={styles.lineMedium} />
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.lineFull} />
        <div className={styles.lineFull} />
        <div className={styles.lineShort} />
      </div>
    </div>
  )
}
