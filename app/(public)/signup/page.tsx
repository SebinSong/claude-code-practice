import { Suspense } from "react"
import AuthForm from "@/components/AuthForm"

export default function SignupPage() {
  return (
    <div className="center-content">
      <div className="form-content">
        <h1 className="form-title">Sign up for an Account</h1>
        <Suspense fallback={null}>
          <AuthForm variant="signup" />
        </Suspense>
      </div>
    </div>
  )
}
