"""Concatenate the scraped stylesheets (in <head> order) into one site.css and
rewrite their relative asset URLs to /public paths."""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(HERE)
SRCDIR = os.environ.get("SCRAPE_DIR", os.path.join(PROJECT, "..", "page_content (1)"))
OUT = os.path.join(PROJECT, "styles", "site.css")

# exact order from index.html <head>
ORDER = [
    "_nuxt/entry.dcvptagf.css", "_nuxt/content.dj4l8wba.css", "_nuxt/colors.cpgoanpo.css",
    "_nuxt/wrapper.dsgia7yr.css", "_nuxt/video.99u0rts7.css", "_nuxt/textreveal.bzimmdvc.css",
    "_nuxt/latestarticles.dlqxg2ko.css", "_nuxt/datebadge.dcalajyo.css", "_nuxt/index.cr7h1e92.css",
    "_nuxt/default.bckfdub5.css", "_nuxt/heroproductivitywrapper.bfeytphk.css", "_nuxt/index.dhljffe9.css",
    "_nuxt/banner.dhlitygw.css", "_nuxt/index.cuik1rue.css", "_nuxt/news.b8ogubsw.css",
    "_nuxt/index.fixtabmf.css", "_nuxt/about.bpcb0jft.css", "_nuxt/investors.maure_xk.css",
    "_nuxt/index.dtgqhblo.css", "_nuxt/dashboard.iflecoc0.css", "_nuxt/header.bjl9iurt.css",
    "_nuxt/privacy_policy.bui3lkji.css", "_nuxt/emailalertwidget.b3blrard.css", "_nuxt/_slug_.b8v2v_su.css",
    "_nuxt/contact.d7pecacs.css", "_nuxt/terms_of_use.bup1juec.css", "css/inline_styles.css",
]


def fix(css: str) -> str:
    css = re.sub(r"url\(\s*\.\./_fonts/", "url(/_fonts/", css)
    css = re.sub(r"url\(\s*\.\./images/", "url(/images/", css)
    css = re.sub(r"url\(\s*\.\./svgs/", "url(/svgs/", css)
    css = re.sub(r"url\(\s*\.\./", "url(/", css)
    css = css.replace("https://a.storyblok.com/f/290008427472090/", "/storyblok-cdn/")
    css = css.replace("https://a.storyblok.com/f/290581778021750/", "/storyblok-cdn/")
    return css


os.makedirs(os.path.dirname(OUT), exist_ok=True)
parts = []
for rel in ORDER:
    p = os.path.join(SRCDIR, rel)
    if not os.path.exists(p):
        print("!! missing", rel); continue
    parts.append(f"\n/* ===== {rel} ===== */\n" + fix(open(p, encoding="utf-8", errors="replace").read()))
open(OUT, "w", encoding="utf-8").write("".join(parts))
print("wrote", OUT, os.path.getsize(OUT), "bytes from", len(parts), "files")
