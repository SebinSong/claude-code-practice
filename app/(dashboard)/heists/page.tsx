import HeistList from "@/components/HeistList"
import WelcomeBanner from "@/components/WelcomeBanner"

export default function HeistsPage() {
  return (
    <div className="page-content">
      <WelcomeBanner />
      <div className="active-heists">
        <h2 className="mb-2">Your Active Heists</h2>
        <HeistList mode="active" />
      </div>
      <div className="assigned-heists">
        <h2 className="mb-2">Heists You&apos;ve Assigned</h2>
        <HeistList mode="assigned" />
      </div>
      <div className="expired-heists">
        <h2 className="mb-2">All Expired Heists</h2>
        <HeistList mode="expired" />
      </div>
    </div>
  )
}
