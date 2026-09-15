import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms under which restaurants may use AR Menu.',
}

const LAST_UPDATED = '9 September 2026'

export default function TermsPage() {
  return (
    <>
      <div className="mb-8 rounded-lg border border-critical/40 bg-critical-wash p-4 text-sm text-menu-ink">
        <strong className="font-semibold">Before you launch:</strong> the bracketed fields
        below must be replaced with your real operating entity and governing jurisdiction, and
        the whole document reviewed by a lawyer. It reflects how the software behaves, but it
        is not legal advice.
      </div>

      <h1>Terms of Service</h1>
      <p className="lead">Last updated {LAST_UPDATED}</p>

      <p>
        These terms govern use of AR Menu (&ldquo;the Service&rdquo;) operated by{' '}
        <strong>[YOUR LEGAL ENTITY NAME]</strong> (&ldquo;we&rdquo;). By creating an account you
        agree to them. If you are agreeing on behalf of a business, you confirm you are
        authorised to bind it.
      </p>

      <h2>1. What the Service does</h2>
      <p>
        The Service lets a restaurant publish a digital menu, upload photographs and 3D models
        of dishes, and generate QR codes that open that menu. Guests can view dishes in
        augmented reality on supported devices.
      </p>
      <p>
        The Service does not take orders, process payments, or handle deliveries. Nothing shown
        to a guest constitutes an offer or a binding price on our part.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>One account represents one restaurant. Keep your password confidential.</li>
        <li>
          You are responsible for everything done through your account. Tell us promptly at{' '}
          <strong>[YOUR SUPPORT EMAIL]</strong> if you believe it has been compromised.
        </li>
        <li>You must be legally able to enter a contract in your jurisdiction.</li>
      </ul>

      <h2>3. Your content</h2>
      <p>
        You keep ownership of everything you upload: dish names, descriptions, prices,
        photographs and 3D models. You grant us a non-exclusive, worldwide, royalty-free licence
        to store, reproduce and display that content, strictly for the purpose of operating the
        Service, which necessarily includes showing it to your guests.
      </p>
      <p>You confirm that you have the right to upload what you upload. Do not upload:</p>
      <ul>
        <li>Content you do not own or have permission to use, including stock photography.</li>
        <li>Content that is unlawful, misleading, or infringes someone else&apos;s rights.</li>
        <li>Malware, or files disguised as images or 3D models.</li>
      </ul>

      <h3>Accuracy of what you publish</h3>
      <p>
        You are solely responsible for the accuracy of your menu, including prices, allergen
        and dietary information, and the measurements used to size dishes in AR. AR renders
        each dish using the dimensions <em>you</em> supply. If those are wrong, the AR view will
        be wrong. Guests rely on this, so treat it with the same care as a printed menu.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Attempt to access another restaurant&apos;s data.</li>
        <li>
          Probe, scan or test the security of the Service without our written permission, or
          circumvent rate limits, storage quotas or authentication.
        </li>
        <li>Use the Service to store or distribute files unrelated to your menu.</li>
        <li>Resell or sublicense the Service without our written agreement.</li>
      </ul>

      <h2>5. Storage limits</h2>
      <p>
        Each account has a storage allowance for uploaded media, shown on your dashboard.
        Uploads that would exceed it are refused. We will give you reasonable notice before
        changing the allowance.
      </p>

      <h2>6. Availability</h2>
      <p>
        We work to keep the Service available but do not guarantee uninterrupted operation. We
        may take it down for maintenance, and will give notice where we reasonably can. AR
        depends on your guests&apos; devices and browsers, which we do not control; where AR is
        unsupported, the Service falls back to an interactive 3D preview.
      </p>

      <h2>7. Suspension and termination</h2>
      <p>
        You may close your account at any time by contacting{' '}
        <strong>[YOUR SUPPORT EMAIL]</strong>. We may suspend or terminate an account that
        breaches these terms, and will tell you why unless we are legally prevented from doing
        so. On termination your menu stops being served and your data is deleted as described
        in the Privacy Policy.
      </p>

      <h2>8. Liability</h2>
      <p>
        To the fullest extent the law allows, the Service is provided &ldquo;as is&rdquo;. We
        are not liable for indirect or consequential loss, lost profits, or lost goodwill. Our
        total liability in any twelve-month period is limited to the amount you paid us in that
        period.
      </p>
      <p>
        Nothing here limits liability for death or personal injury caused by negligence, for
        fraud, or for anything else that cannot lawfully be limited.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update these terms. For material changes we will email account holders at least
        30 days beforehand. Continuing to use the Service after that means you accept the new
        terms.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These terms are governed by the laws of <strong>[YOUR JURISDICTION]</strong>, and the
        courts of <strong>[YOUR JURISDICTION]</strong> have exclusive jurisdiction over any
        dispute.
      </p>

      <h2>Contact</h2>
      <p>
        <strong>[YOUR LEGAL ENTITY NAME]</strong>
        <br />
        <strong>[YOUR REGISTERED ADDRESS]</strong>
        <br />
        <strong>[YOUR SUPPORT EMAIL]</strong>
      </p>
    </>
  )
}
