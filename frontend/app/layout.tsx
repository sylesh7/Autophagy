import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/generated/Header";
import Footer from "@/components/generated/Footer";
import CookieBanner from "@/components/generated/CookieBanner";
import SiteScripts from "@/components/SiteScripts";

const DESCRIPTION =
  "Sharplink is the institutional-grade Ethereum treasury platform giving investors a smarter, more productive access vehicle to ETH";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.sharplink.com"),
  title: "Sharplink : Home",
  description: DESCRIPTION,
  icons: { icon: "/favicon.png" },
  robots: "index, follow",
  openGraph: {
    title: "Sharplink : Home",
    description: DESCRIPTION,
    type: "website",
    images: ["/storyblok/og-homepage.jpg"],
  },
  twitter: { card: "summary_large_image", title: "Sharplink : Home", description: DESCRIPTION },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div id="sf-boilerplate">
          <div id="site" className="index fonts-loaded theme-light" data-v-00374420="">
            <div className="lenis" data-v-15fa0cd1="">
              <div>
                <div className="gradient-bg-light" data-v-15fa0cd1="" data-v-9d8fa70e=""></div>
                <div className="container" data-v-15fa0cd1="">
                  <Header />
                  <div className="page-wrapper" data-v-590d8da8="">
                    <div data-v-753cfce6="">
                      <main className="page-index" data-v-753cfce6="">
                        {children}
                      </main>
                    </div>
                  </div>
                  <Footer />
                  <CookieBanner />
                </div>
              </div>
            </div>
          </div>
        </div>
        <SiteScripts />
      </body>
    </html>
  );
}
