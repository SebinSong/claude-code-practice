import styles from "./PageLoader.module.css"

type PageLoaderProps = {
  text?: string
}

export default function PageLoader({ text }: PageLoaderProps) {
  return (
    <div className={styles.wrapper} role="status" aria-label="Loading">
      <span className="spinner is-large" aria-hidden />
      {text && <p className={styles.loaderText}>{text}</p>}
    </div>
  )
}
