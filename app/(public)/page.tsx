// this page should be used only as a splash page to decide where a user should be navigated to
// when logged in --> to /heists
// when not logged in --> to /login

import Link from "next/link"
import { Clock8, ArrowRight } from "lucide-react"
import HeistCountdown from "@/components/HeistCountdown"
import styles from "./page.module.css"

const BRIEFING = [
  {
    label: "Pick your target",
    detail:
      "Assign a teammate a tiny, time-boxed mission — nothing that can't be undone by Friday.",
  },
  {
    label: "Run the clock",
    detail:
      "48 hours on the timer, starting the moment they're briefed. No extensions.",
  },
  {
    label: "Claim it or pay up",
    detail:
      "Pull it off and it's legend. Fumble it, and the next round's on you.",
  },
]

const MISSIONS = [
  {
    title: "Wallpaper swap",
    detail: "Sneak in a new desktop background before they log back in.",
  },
  {
    title: "Duck infiltration",
    detail: "Plant a rubber duck on the standup table. Nobody asks why.",
  },
  {
    title: "Coffee resupply",
    detail: "Refill the pot before anyone notices it ran dry.",
  },
]

export default function Home() {
  return (
    <div className={styles.splash}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>
            <span className={styles.liveDot} aria-hidden />
            Mission control — office ops division
          </div>
          <h1 className="mb-4">
            P<Clock8 className="logo" strokeWidth={2.75} />
            cket Heist
          </h1>
          <div className="tagline">Tick. Tock. Heist.</div>
          <p className={styles.heroLead}>
            Turn the dull bits of the workday into a caper. Assign tiny,
            time-boxed missions to your teammates, then race the clock before
            anyone notices.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/signup" className={styles.registerBtn}>
              Get your codename
              <ArrowRight size={18} strokeWidth={2.5} />
            </Link>
            <Link href="/login" className={styles.loginLink}>
              Already enlisted? Log in
            </Link>
          </div>
        </div>
        <HeistCountdown />
      </section>

      <section className={styles.briefing}>
        <h2 className={styles.sectionTitle}>How a heist goes down</h2>
        <ol className={styles.briefingList}>
          {BRIEFING.map((step, i) => (
            <li key={step.label} className={styles.briefingItem}>
              <span className={styles.briefingIndex}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className={styles.briefingLabel}>{step.label}</h3>
                <p className={styles.briefingDetail}>{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.missions}>
        <h2 className={styles.sectionTitle}>Field-tested missions</h2>
        <div className={styles.missionGrid}>
          {MISSIONS.map((mission) => (
            <article key={mission.title} className={styles.missionCard}>
              <h3 className={styles.missionTitle}>{mission.title}</h3>
              <p className={styles.missionDetail}>{mission.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <p className={styles.finalCtaText}>
          Every operative needs a codename. Yours is waiting.
        </p>
        <Link href="/signup" className={styles.registerBtn}>
          Get your codename
          <ArrowRight size={18} strokeWidth={2.5} />
        </Link>
      </section>
    </div>
  )
}
