import type { Metadata } from "next";
import {
  LegalDocumentPage,
  LegalExternalLink,
  LegalSection,
  LegalSubsection,
} from "@/components/legal/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Privacy Policy — The Sideline",
  description: "Privacy Policy for The Sideline play-calling companion app.",
};

export default function PrivacyPage() {
  return (
    <LegalDocumentPage title="Privacy Policy">
      <LegalSection title="The short version">
        <p>
          We collect the minimum data needed to run the app. We don&apos;t sell your data. We don&apos;t share
          it with advertisers. You can delete everything at any time.
        </p>
      </LegalSection>

      <LegalSection title="Who we are">
        <p>
          The Sideline is an independent product built and operated by a solo developer. We&apos;re not a
          large company with complex data operations — we&apos;re one person building a tool for dynasty mode
          players.
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <LegalSubsection title="Account information">
          <p>When you sign in with Google, we receive:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Your name (as provided by Google)</li>
            <li>Your email address</li>
            <li>A profile identifier from Google</li>
          </ul>
          <p>
            We use this to create and manage your account. We don&apos;t access your Google account beyond
            what&apos;s needed for authentication.
          </p>
        </LegalSubsection>

        <LegalSubsection title="Data you create in the app">
          <p>When you use The Sideline, you create:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Game sessions (opponent, game settings)</li>
            <li>Drives and logged plays (play names, formations, results, yardage)</li>
            <li>Play sheets (situation buckets, play selections)</li>
          </ul>
          <p>
            This is your coaching data. It&apos;s stored so you can access it across sessions and devices.
          </p>
        </LegalSubsection>

        <LegalSubsection title="Data we collect automatically">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Basic server logs (IP address, request timestamps) — standard for any web application, used
              for debugging and abuse prevention
            </li>
            <li>Error logs when something breaks — used to fix bugs</li>
          </ul>
          <p>
            We do not currently use any third-party analytics services. If we add analytics in the future,
            we&apos;ll update this policy and note what we&apos;re tracking.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="How we store your data">
        <p>
          Your data is stored in Supabase (hosted on AWS infrastructure). All data is transmitted over
          HTTPS. Access to your data is restricted through row-level security — you can only access your
          own data, and we enforce this at the database level.
        </p>
      </LegalSection>

      <LegalSection title="Who can see your data">
        <ul className="list-disc space-y-2 pl-5">
          <li>You — through the app</li>
          <li>The developer — for debugging and support purposes, with direct database access</li>
          <li>Supabase — as our hosting provider, per their privacy policy and data processing terms</li>
          <li>Vercel — as our deployment platform, which processes web requests</li>
          <li>
            Resend — as our email provider, which handles transactional emails (password resets, account
            verification)
          </li>
        </ul>
        <p>
          We don&apos;t sell, rent, or share your data with advertisers, data brokers, or any third parties
          for marketing purposes.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep your data">
        <p>
          We keep your data as long as you have an account. When you delete your account, all associated
          data (game sessions, drives, logged plays, play sheets) is permanently deleted. We don&apos;t retain
          backups of deleted user data beyond standard database backup windows (typically 7 days with
          Supabase), after which it&apos;s fully purged.
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>You can:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Access your data — everything you&apos;ve logged is visible in the app</li>
          <li>
            Delete your data — delete individual games, play sheets, or your entire account from within the
            app
          </li>
          <li>Export your data — if you need a copy of your data, contact us and we&apos;ll provide it</li>
        </ul>
        <p>
          If you&apos;re in the EU, California, or another jurisdiction with specific privacy rights, you have
          additional rights under GDPR, CCPA, or equivalent local law. Contact us to exercise them — we&apos;ll
          handle requests promptly.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          We use cookies only for authentication (keeping you signed in). We don&apos;t use tracking cookies,
          advertising cookies, or third-party cookies.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          The Sideline is not directed at children under 13. We don&apos;t knowingly collect data from
          children under 13. If you believe a child under 13 has created an account, contact us and we&apos;ll
          delete it.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          If we make material changes to how we handle your data, we&apos;ll update this page and note the new
          date at the top. We won&apos;t retroactively weaken your privacy protections without notice.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Privacy questions? Reach us on our Discord server (
          <LegalExternalLink href="https://discord.gg/a9TeQggFqF">
            https://discord.gg/a9TeQggFqF
          </LegalExternalLink>
          ).
        </p>
      </LegalSection>
    </LegalDocumentPage>
  );
}
