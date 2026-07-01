import type { Metadata } from "next";
import {
  LegalDocumentPage,
  LegalExternalLink,
  LegalInternalLink,
  LegalSection,
} from "@/components/legal/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Terms of Service — The Sideline",
  description: "Terms of Service for The Sideline play-calling companion app.",
};

export default function TermsPage() {
  return (
    <LegalDocumentPage title="Terms of Service">
      <LegalSection title="What this is">
        <p>
          The Sideline is an independent companion app for college football video game dynasty mode
          players. It helps you track play calls, review tendencies, and build play sheets across your
          dynasty seasons.
        </p>
        <p>
          By creating an account or using the app, you agree to these terms. If you don&apos;t agree,
          don&apos;t use the app.
        </p>
      </LegalSection>

      <LegalSection title="Not affiliated with EA Sports">
        <p>
          The Sideline is an independent product. It is not affiliated with, endorsed by, or sponsored
          by Electronic Arts, EA Sports, or any of their subsidiaries. College Football 26, College
          Football 27, and related trademarks are the property of their respective owners. Any
          references to game playbooks, formations, or play names are used for informational and
          functional purposes only.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <p>
          You sign in through Google. You&apos;re responsible for keeping your account secure.
          Don&apos;t share your credentials or let someone else use your account.
        </p>
        <p>You must be at least 13 years old to use The Sideline.</p>
      </LegalSection>

      <LegalSection title="What you can do">
        <p>
          You can use The Sideline to log games, build play sheets, and review your play-calling
          tendencies for personal, non-commercial use. Don&apos;t use it to:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Attempt to access other users&apos; data</li>
          <li>Use the app in any way that violates applicable law</li>
          <li>Misrepresent your identity or impersonate others</li>
        </ul>
      </LegalSection>

      <LegalSection title="Your data">
        <p>
          The play-calling data you log belongs to you. You can delete your account and all associated
          data at any time from within the app. When you delete your account, your data is permanently
          removed — we don&apos;t retain it.
        </p>
        <p>
          For details on what we collect and how we handle it, see our{" "}
          <LegalInternalLink href="/privacy">Privacy Policy</LegalInternalLink>.
        </p>
      </LegalSection>

      <LegalSection title="The app as it is">
        <p>The Sideline is provided &quot;as is.&quot; We&apos;re a small, independent product. That means:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>We don&apos;t guarantee uptime or uninterrupted access</li>
          <li>Features may change, be added, or be removed</li>
          <li>Playbook data is community-sourced and may contain errors or lag behind game updates</li>
          <li>We may need to pause or shut down the service</li>
        </ul>
        <p>We do our best to keep things running smoothly, but we can&apos;t make promises beyond that.</p>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, The Sideline and its creator are not liable for any
          indirect, incidental, or consequential damages arising from your use of the app. Our total
          liability for any claim related to the service is limited to the amount you&apos;ve paid us.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p>
          We may update these terms as the product evolves. If we make significant changes, we&apos;ll note
          the updated date at the top of this page. Continued use of the app after changes constitutes
          acceptance.
        </p>
      </LegalSection>

      <LegalSection title="Termination">
        <p>
          We may suspend or terminate your access if you violate these terms. You can stop using the app
          and delete your account at any time.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about these terms? Reach us on our Discord server (
          <LegalExternalLink href="https://discord.gg/a9TeQggFqF">
            https://discord.gg/a9TeQggFqF
          </LegalExternalLink>
          ).
        </p>
      </LegalSection>
    </LegalDocumentPage>
  );
}
