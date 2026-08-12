"use client";

import {
Shield,
Database,
CreditCard,
Cookie,
Lock,
UserCheck,
Mail,
AlertCircle,
} from "lucide-react";

const sections = [
{
id: "information",
title: "1. Information We Collect",
icon: Database,
content: [
"Account information such as name, email address, phone number, and encrypted login credentials.",
"Order information including shipping address, billing address, order history, and transaction details.",
"Vendor information including business details, GST information, bank account details, and verification documents.",
"Technical information such as IP address, browser type, device information, cookies, and session data.",
],
},
{
id: "usage",
title: "2. How We Use Your Information",
icon: UserCheck,
content: [
"Create and manage user accounts.",
"Process orders and payments.",
"Provide customer support.",
"Verify vendor accounts.",
"Detect fraud and abuse.",
"Improve platform performance and user experience.",
"Comply with legal and regulatory obligations.",
],
},
{
id: "payments",
title: "3. Payments & Transactions",
icon: CreditCard,
content: [
"Payments are processed through authorised payment providers.",
"Cash on Delivery orders may be offered where available.",
"Payment information is processed securely and is never sold.",
"Transaction records are retained for accounting, taxation, and dispute resolution purposes.",
],
},
{
id: "cookies",
title: "4. Cookies & Analytics",
icon: Cookie,
content: [
"We use cookies to maintain sessions and improve user experience.",
"Analytics tools may collect aggregated usage data.",
"Marketing and advertising technologies may be used to measure campaign performance.",
"Users may manage cookies through browser settings.",
],
},
{
id: "sharing",
title: "5. Information Sharing",
icon: Lock,
content: [
"Payment providers for transaction processing.",
"Shipping and logistics partners for order fulfilment.",
"Technology providers for hosting, analytics, and platform operations.",
"Government authorities where required by applicable law.",
"We do not sell personal information to third parties.",
],
},
{
id: "security",
title: "6. Security Measures",
icon: Shield,
content: [
"Encrypted communication via HTTPS.",
"Access controls and role-based permissions.",
"Secure password storage.",
"Monitoring and fraud prevention measures.",
"Regular security improvements and updates.",
],
},
{
id: "rights",
title: "7. Your Privacy Rights",
icon: UserCheck,
content: [
"Request access to your personal data.",
"Request correction of inaccurate information.",
"Request deletion of eligible information.",
"Withdraw consent where applicable.",
"Opt out of marketing communications.",
],
},
{
id: "children",
title: "8. Children's Privacy",
icon: AlertCircle,
content: [
"Our platform is not intended for individuals under 18 years of age.",
"We do not knowingly collect personal information from minors.",
],
},
];

export default function PrivacyPolicy() {
return ( <section className="min-h-screen bg-white">
{/* Hero */} <div className="bg-neutral-950 px-6 py-20"> <div className="mx-auto max-w-5xl text-center"> <div className="mb-6 inline-flex rounded-2xl bg-amber-500/10 p-5"> <Shield className="h-10 w-10 text-amber-500" /> </div>

```
      <h1 className="mb-4 text-5xl font-bold text-white">
        Privacy Policy
      </h1>

      <p className="mx-auto max-w-3xl text-lg text-neutral-300">
        Learn how LinknSmile collects, uses, stores, and protects your
        personal information when you use our marketplace platform.
      </p>

      <p className="mt-6 text-sm text-neutral-400">
        Last Updated: June 2026
      </p>
    </div>
  </div>

  {/* Table of Contents */}
  <div className="border-b bg-neutral-50">
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h2 className="mb-4 text-xl font-semibold">
        Table of Contents
      </h2>

      <div className="grid gap-3 md:grid-cols-2">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-lg border bg-white p-4 hover:bg-neutral-50"
          >
            {section.title}
          </a>
        ))}
      </div>
    </div>
  </div>

  {/* Sections */}
  <div className="mx-auto max-w-5xl px-6 py-16">
    <div className="space-y-12">
      {sections.map((section) => {
        const Icon = section.icon;

        return (
          <div
            key={section.id}
            id={section.id}
            className="scroll-mt-24 rounded-2xl border p-8"
          >
            <div className="mb-6 flex items-center gap-4">
              <div className="rounded-xl bg-amber-500/10 p-3">
                <Icon className="h-6 w-6 text-amber-500" />
              </div>

              <h2 className="text-2xl font-bold">
                {section.title}
              </h2>
            </div>

            <ul className="space-y-3 text-neutral-700">
              {section.content.map((item, index) => (
                <li key={index} className="flex gap-3">
                  <span>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>

    {/* Contact */}
    <div className="mt-16 rounded-2xl bg-neutral-950 p-8 text-white">
      <Mail className="mb-4 h-10 w-10 text-amber-500" />

      <h3 className="mb-3 text-2xl font-bold">
        Privacy & Data Requests
      </h3>

      <p className="mb-6 text-neutral-300">
        For privacy-related questions, requests, or complaints, contact our
        support team.
      </p>

      <a
        href="mailto:support@linknsmile.com"
        className="inline-flex rounded-xl bg-amber-500 px-6 py-3 font-semibold"
      >
        Contact Support
      </a>
    </div>
  </div>
</section>


);
}
