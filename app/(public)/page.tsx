// this page should be used only as a splash page to decide where a user should be navigated to
// when logged in --> to /heists
// when not logged in --> to /login

import { Clock8 } from "lucide-react"

export default function Home() {
  return (
    <div className="center-content">
      <div className="page-content">
        <h1 className="mb-6">
          P<Clock8 className="logo" strokeWidth={2.75} />cket Heist
        </h1>
        <div className="tagline">Clock&apos;s ticking. Pull the heist.</div>
        <p>
          Turn the dull bits of the workday into a{" "}
          <span className="text-primary font-semibold">caper</span>. Assign tiny,
          time-boxed missions to your teammates — swap someone&apos;s desktop
          wallpaper, sneak a{" "}
          <span className="text-secondary font-semibold">rubber duck</span> onto
          the standup table, refill the coffee pot before anyone notices
          it&apos;s empty.
        </p>
        <p>
          Set the clock, pick a target, and watch the office turn into your{" "}
          <span className="text-primary font-semibold">playground</span>. Pull
          off the heist before time runs out and{" "}
          <span className="text-secondary font-semibold">claim the glory</span>.
          Fumble it, and the next round&apos;s drinks are on you.
        </p>
      </div>
    </div>
  )
}
