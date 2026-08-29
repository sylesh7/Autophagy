import type { Metadata } from "next";
import type { ReactNode } from "react";

const DESCRIPTION =
  "Autophagy reads live cluster metrics, reasons about why a pattern is wasteful, "
  + "and commits every confirmed incident to a public efficiency registry.";

const OG_IMAGE = "/assets/6a5a4043436ba7ed8f8a3507_og-image-1.png";

export const metadata: Metadata = {
  title: "Autophagy | Behavioral Waste Detection for Agent Fleets",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    title: "Autophagy | Behavioral Waste Detection for Agent Fleets",
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Autophagy | Behavioral Waste Detection for Agent Fleets",
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  icons: {
    icon: [
      { url: "/assets/6a3ec362c7dcfde149a901d3_favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/6a3ec3627461b17a289a5ee1_favicon.png", sizes: "48x48", type: "image/png" },
      { url: "/assets/6a3ec3628769352bc69fdecc_favicon.png", sizes: "192x192", type: "image/png" },
      { url: "/assets/6a3ec362c7dcfde149a901d7_favicon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/assets/6a3ec3620bc995da535d41c2_favicon.png", sizes: "180x180" },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Autophagy",
  description:
    "Behavioral waste detection for autonomous agent fleets. Reads live cluster "
    + "metrics, reasons about whether a pattern is genuine waste, and attests every "
    + "human-approved finding to a public on-chain efficiency registry.",
  url: "/",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/InStock",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Live Cluster Metrics",
    "Reasoned Waste Verdicts",
    "Human Approval Gate",
    "Public Efficiency Registry",
  ],
  provider: { "@type": "Organization", name: "Autophagy", url: "/" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-wf-domain="autophagy.local"
      data-wf-page="6a3e64ff64a92f2281e8e826"
      data-wf-site="6a3e64ff64a92f2281e8e82a"
    >
      <head>
        {/* Order matters: Webflow base, then fonts and Swiper, then the page's
            own inline blocks last so their overrides win. */}
        <link rel="stylesheet" href="/vendor/webflow.css" />
        <link rel="stylesheet" href="/fonts/montserrat.css" />
        <link rel="stylesheet" href="/vendor/swiper-bundle.min.css" />
        <link rel="stylesheet" href="/vendor/inline.css" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {/* Webflow CSS keys off html.w-mod-js / .w-mod-touch, which this stamps on. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '!function(o,c){var n=c.documentElement,t=" w-mod-";n.className+=t+"js",' +
              '("ontouchstart"in o||o.DocumentTouch&&c instanceof DocumentTouch)&&' +
              '(n.className+=t+"touch")}(window,document);',
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
