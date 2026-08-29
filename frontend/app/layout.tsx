import type { Metadata } from "next";
import type { ReactNode } from "react";

const DESCRIPTION =
  "HyperXDB compiles a question into a typed intent, resolves it against a HydraDB " +
  "graph, and returns evidence-backed context — or an honest, typed abstention.";

const OG_IMAGE = "/assets/6a5a4043436ba7ed8f8a3507_og-image-1.png";

export const metadata: Metadata = {
  title: "HyperXDB | Programmable Memory Reasoning Engine",
  description: DESCRIPTION,
  metadataBase: new URL("https://hyperxdb.dev"),
  alternates: { canonical: "https://hyperxdb.dev" },
  openGraph: {
    type: "website",
    title: "HyperXDB | Programmable Memory Reasoning Engine",
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "HyperXDB | Programmable Memory Reasoning Engine",
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
  name: "HyperXDB",
  description:
    "Programmable memory reasoning engine that compiles a typed intent into a " +
    "bounded retrieval plan, executes it against a HydraDB graph, and returns " +
    "evidence-backed context or an honest, typed abstention",
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
    "Typed Intent Compilation",
    "Bounded Retrieval Plans",
    "Knowledge Updates and Supersession",
    "Contradiction Detection",
    "Fail-Closed Abstention",
  ],
  provider: { "@type": "Organization", name: "HyperXDB", url: "/" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-wf-domain="hyperxdb.dev"
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
