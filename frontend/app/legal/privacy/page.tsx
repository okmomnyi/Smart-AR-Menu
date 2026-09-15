import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'What AR Menu collects, why, how long it is kept, and how to have it deleted.',
}

const LAST_UPDATED = '15 September 2026'

export default function PrivacyPage() {
  return (
    <>
      <div className="mb-8 rounded-lg border border-critical/40 bg-critical-wash p-4 text-sm text-menu-ink">
        <strong className="font-semibold">Before you launch:</strong> the bracketed fields
        below must be replaced with your real operating entity, contact address and
        jurisdiction, and the whole document reviewed by a lawyer in the market you operate
        in. It describes what this software actually does, but it is not legal advice.
      </div>

      <h1>Privacy Policy</h1>
      <p className="lead">Last updated {LAST_UPDATED}</p>

      <p>
        AR Menu is a service that lets a restaurant publish a menu that guests can view in
        augmented reality. This policy explains what we collect, why, and what you can do
        about it. It covers two different groups of people: the restaurant staff who hold an
        account, and the guests who scan a code and look at a menu.
      </p>

      <h2>If you are a guest looking at a menu</h2>
      <p>
        You do not need an account, and we do not ask you for anything. Specifically:
      </p>
      <ul>
        <li>We do not set cookies on the menu or AR pages.</li>
        <li>
          We do not run analytics, advertising, or third-party tracking on the customer-facing
          pages.
        </li>
        <li>We do not ask for your name, email, phone number, or payment details.</li>
        <li>
          <strong>The camera never leaves your device.</strong> Augmented reality runs entirely
          in your browser using WebXR. The camera feed is used by your phone to work out where
          your table is. No image, video, or depth data is transmitted to us or stored
          anywhere.
        </li>
      </ul>
      <p>
        Our servers do process the network requests needed to send you the menu. That includes
        your IP address, which is used only to apply rate limits that keep the service
        available, is held in memory, and is not written to a database or used to build a
        profile.
      </p>

      <h2>If you hold a restaurant account</h2>
      <p>We store the following, because the product cannot work without it:</p>
      <ul>
        <li>
          <strong>Your email address</strong>: identifies your account and is how you sign in.
        </li>
        <li>
          <strong>A hash of your password</strong>: produced with scrypt. We never store, log,
          or have any way to recover your actual password.
        </li>
        <li>
          <strong>Your restaurant&apos;s name, menu address, logo and accent colour</strong>:
          this is published on your public menu by design.
        </li>
        <li>
          <strong>Your menu content</strong>: dish names, descriptions, prices, measurements,
          photographs and 3D models you upload. Also public by design.
        </li>
        <li>
          <strong>The time of your last sign-in</strong>: so you can spot access you did not
          expect.
        </li>
      </ul>

      <h3>Cookies we set</h3>
      <p>
        One, and only for signed-in staff: a session cookie that keeps you logged in. It is
        <code> httpOnly</code> (JavaScript on the page cannot read it), <code>Secure</code> in
        production, restricted to the sign-in endpoints, and expires after 30 days. It is
        strictly necessary to operate the admin panel and is not used for analytics or
        advertising. Signing out invalidates it immediately.
      </p>
      <p>
        If a member of staff chooses a light or dark theme for the admin panel, that choice is
        saved in their own browser&apos;s local storage so it is remembered next time. It is
        not a cookie, it is never sent to us, and it holds nothing except the word
        <code> light</code> or <code>dark</code>. Guests never have anything stored.
      </p>

      <h2>Who we share it with</h2>
      <p>
        We do not sell personal data and we do not share it for advertising. We use these
        processors to run the service:
      </p>
      <ul>
        <li>
          <strong>[YOUR HOSTING PROVIDER]</strong>: runs the application servers and the
          PostgreSQL database.
        </li>
        <li>
          <strong>Cloudflare R2</strong>: stores the photographs and 3D models you upload, and
          serves them to guests.
        </li>
      </ul>
      <p>
        We will disclose data if we are legally required to, and will tell you unless we are
        prohibited from doing so.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Account and menu data: for as long as your account is open.</li>
        <li>
          After you ask us to close your account: deleted within 30 days, including uploaded
          media, except where we are required to retain records for tax or legal reasons.
        </li>
        <li>Rate-limiting data: held in memory and discarded within the hour.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access a copy of your data,
        correct it, delete it, restrict or object to how we use it, and to receive it in a
        portable format. Under Kenya&apos;s Data Protection Act 2019, the GDPR, and similar
        laws, you also have the right to complain to your data protection authority.
      </p>
      <p>
        Most of this you can do yourself in the admin panel. For anything else, or to close
        your account, write to <strong>[YOUR PRIVACY CONTACT EMAIL]</strong> and we will
        respond within 30 days.
      </p>

      <h2>Security</h2>
      <p>
        Passwords are hashed with scrypt. Sessions use short-lived signed tokens with a
        separate refresh token in an httpOnly cookie. All traffic is served over HTTPS.
        Restaurants are isolated from one another: every request that touches menu data is
        checked against the signed identity of the caller. Uploaded images are re-encoded on
        our servers, and 3D models are verified to be genuine glTF files.
      </p>
      <p>
        No system is perfectly secure. If you believe you have found a vulnerability, please
        report it to <strong>[YOUR SECURITY CONTACT EMAIL]</strong>.
      </p>

      <h2>Children</h2>
      <p>
        The admin panel is a business tool and is not directed at children. We do not knowingly
        collect personal data from anyone under 18 through it. The public menu collects nothing
        from anyone.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy in a way that materially affects account holders, we will
        email you before it takes effect. The date at the top always reflects the current
        version.
      </p>

      <h2>Contact</h2>
      <p>
        <strong>[YOUR LEGAL ENTITY NAME]</strong>
        <br />
        <strong>[YOUR REGISTERED ADDRESS]</strong>
        <br />
        <strong>[YOUR PRIVACY CONTACT EMAIL]</strong>
      </p>
    </>
  )
}
