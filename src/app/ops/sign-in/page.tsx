import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OpsSignInForm } from "@/components/ops/OpsSignInForm";
import { getStaff } from "@/lib/staff-auth";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false, nocache: true },
};

export default async function SignInPage() {
  // Already signed in: no reason to show a login form, and re-authenticating
  // would issue a second session for no benefit.
  if (await getStaff()) redirect("/ops");

  return (
    <main id="main" className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <p className="eyebrow text-gold">Pearl Trails</p>
        <h1 className="mt-2 text-[1.75rem] leading-tight text-forest">Operations</h1>
        <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">
          Internal access for the Pearl Trails team.
        </p>

        <div className="mt-8">
          <OpsSignInForm />
        </div>
      </div>
    </main>
  );
}
