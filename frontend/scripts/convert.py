"""SharpLink (Nuxt) homepage -> Next.js components.

Adapted from the reference Webflow converter. This site is Vue/Nuxt with
scoped styles (data-v-* attrs) + heavy GSAP/Lenis runtime mutation, so the
converter additionally:
  - strips GSAP/Lenis runtime inline styles (transform/opacity/clip-path/...)
  - unwraps ScrollTrigger `pin-spacer` wrappers
  - restores camelCase SVG element + attribute names html.parser lowercased
  - resolves Nuxt <img> (_vercel/image + srcset) back to a real local asset
  - swaps 3 runtime-only canvases (Chart.js line chart, dotLottie, three.js
    wordmark) for static equivalents
  - keeps every data-v-* attribute so the original CSS matches verbatim
"""
import os, re
from urllib.parse import unquote
from bs4 import BeautifulSoup, NavigableString, Comment

HERE = os.path.dirname(os.path.abspath(__file__))          # page_content_next/scripts
PROJECT = os.path.dirname(HERE)                             # page_content_next
# the scraped Nuxt page — sibling of the project by default; override with $SCRAPE_DIR
SCRAPE = os.environ.get("SCRAPE_DIR", os.path.join(PROJECT, "..", "page_content (1)"))
SRC = os.path.join(SCRAPE, "index.html")
OUT = os.path.join(PROJECT, "components", "generated")

VOID = {"area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"}

# SVG element names that html.parser lower-cased and React/DOM needs back in camelCase
SVG_TAGS = {
    "lineargradient":"linearGradient","radialgradient":"radialGradient","clippath":"clipPath",
    "textpath":"textPath","foreignobject":"foreignObject","fegaussianblur":"feGaussianBlur",
    "fecolormatrix":"feColorMatrix","feoffset":"feOffset","feblend":"feBlend","fecomposite":"feComposite",
    "feflood":"feFlood","femerge":"feMerge","femergenode":"feMergeNode","femorphology":"feMorphology",
    "fedropshadow":"feDropShadow","feturbulence":"feTurbulence","fedisplacementmap":"feDisplacementMap",
    "fespecularlighting":"feSpecularLighting","fepointlight":"fePointLight","fetile":"feTile",
    "feimage":"feImage","fecomponenttransfer":"feComponentTransfer","fefuncr":"feFuncR","fefuncg":"feFuncG",
    "fefuncb":"feFuncB","fefunca":"feFuncA","animatetransform":"animateTransform","animatemotion":"animateMotion",
}

ATTR_MAP = {
    "class":"className","for":"htmlFor","tabindex":"tabIndex","colspan":"colSpan","rowspan":"rowSpan",
    "maxlength":"maxLength","autocomplete":"autoComplete","autofocus":"autoFocus","autoplay":"autoPlay",
    "playsinline":"playsInline","crossorigin":"crossOrigin","readonly":"readOnly",
    "contenteditable":"contentEditable","spellcheck":"spellCheck","enctype":"encType","novalidate":"noValidate",
    "usemap":"useMap","accesskey":"accessKey","srclang":"srcLang","datetime":"dateTime",
    "fetchpriority":"fetchPriority","referrerpolicy":"referrerPolicy","inputmode":"inputMode",
    "allowfullscreen":"allowFullScreen","frameborder":"frameBorder",
    "viewbox":"viewBox","preserveaspectratio":"preserveAspectRatio","stroke-width":"strokeWidth",
    "stroke-linecap":"strokeLinecap","stroke-linejoin":"strokeLinejoin","stroke-miterlimit":"strokeMiterlimit",
    "stroke-dasharray":"strokeDasharray","stroke-dashoffset":"strokeDashoffset","stroke-opacity":"strokeOpacity",
    "fill-rule":"fillRule","fill-opacity":"fillOpacity","clip-rule":"clipRule","clip-path":"clipPath",
    "clippathunits":"clipPathUnits","stop-color":"stopColor","stop-opacity":"stopOpacity",
    "gradientunits":"gradientUnits","gradienttransform":"gradientTransform","patternunits":"patternUnits",
    "patterncontentunits":"patternContentUnits","maskunits":"maskUnits","maskcontentunits":"maskContentUnits",
    "text-anchor":"textAnchor","dominant-baseline":"dominantBaseline",
    "font-family":"fontFamily","font-size":"fontSize","font-weight":"fontWeight","letter-spacing":"letterSpacing",
    "xlink:href":"xlinkHref","xml:space":"xmlSpace","vector-effect":"vectorEffect",
    "color-interpolation-filters":"colorInterpolationFilters","filterunits":"filterUnits",
    "stddeviation":"stdDeviation","flood-color":"floodColor","flood-opacity":"floodOpacity",
    "baseprofile":"baseProfile","enable-background":"enableBackground",
}

BOOLEAN_ATTRS = {"loop","muted","autoplay","playsinline","controls","disabled","checked","readonly",
                 "required","selected","async","defer","hidden","multiple","novalidate","open","reversed",
                 "allowfullscreen","inert"}
NUMERIC_ATTRS = {"tabindex","rowspan","colspan","span","start"}

DROP_ATTRS = {
    "style","fdprocessedid","data-nuxt-img","onerror","onload","onclick","data-v-app","index",
    "data-error","data-us-initialized","data-wf-ignore","sizes","srcset","data-srcset","data-engine",
    "data-v-inspector","aria-current",
}

STYLE_KEEP = {
    "z-index","pointer-events","border-radius","overflow","display",
    "backdrop-filter","-webkit-backdrop-filter","mask-image","-webkit-mask-image",
    "mask","-webkit-mask","mask-repeat","mask-size","mask-position",
    "position","inset","height","max-height",
}
ZERO = {"0","0px","0 0","0px 0px","0 0 0 0","0px 0px 0px 0px"}

STORYBLOK = re.compile(r"https?://a\.storyblok\.com/[^\s\"')]+")
DOTLOTTIE_SRC = "/lottie/shrp_stack.json"
CHART_IMG = "/storyblok/chart-img.webp"


def camel(prop: str) -> str:
    prop = prop.strip()
    if prop.startswith("--"):
        return prop
    for pfx, js in (("-webkit-", "Webkit"), ("-moz-", "Moz"), ("-ms-", "ms"), ("-o-", "O")):
        if prop.startswith(pfx):
            rest = re.sub(r"-([a-z])", lambda m: m.group(1).upper(), prop[len(pfx):])
            return js + rest[:1].upper() + rest[1:]
    return re.sub(r"-([a-z])", lambda m: m.group(1).upper(), prop)


def sb_local(url: str) -> str:
    base = url.rstrip("/").split("/")[-1].split("?")[0]
    if base.endswith((".webm", ".mp4")):
        return "/videos/" + base
    if base.endswith(".json"):
        return "/lottie/" + base
    if base.endswith(".pdf"):
        return "/docs/" + base
    return "/storyblok/" + base


def decode_vercel(u: str) -> str:
    m = re.search(r"[?&]url=([^&]+)", u)
    return unquote(m.group(1)) if m else u


def rewrite_url(url: str) -> str:
    if not url:
        return url
    u = url.strip()
    if "url=" in u and "_vercel/image" in u:
        u = decode_vercel(u)
    m = STORYBLOK.search(u)
    if m:
        return sb_local(m.group(0))
    return u


def resolve_nuxt_img(tag):
    real = None
    ss = tag.get("srcset") or tag.get("data-srcset")
    if ss:
        real = decode_vercel(ss.split(",")[0].strip().split(" ")[0])
    if not real:
        src = tag.get("src", "")
        real = decode_vercel(src) if "url=" in src else src
    if real:
        m = STORYBLOK.search(real)
        if m:
            tag["src"] = sb_local(m.group(0))
        elif real.startswith("/"):
            tag["src"] = real
        elif real and real != "_vercel/image":
            tag["src"] = "/" + real.lstrip("./")
        else:
            tag["src"] = ""


def rewrite_css_urls(v: str) -> str:
    return re.sub(r"url\(([^)]+)\)",
                  lambda m: 'url("' + rewrite_url(m.group(1).strip(" '\"")) + '")', v)


def clean_style(val: str):
    out = []
    for decl in val.split(";"):
        decl = decl.strip()
        if not decl or ":" not in decl:
            continue
        prop, _, v = decl.partition(":")
        prop = prop.strip().lower(); v = v.strip()
        if prop not in STYLE_KEEP:
            continue
        low = v.lower()
        if prop == "display" and low == "none":
            continue
        if prop == "inset" and low not in ZERO:
            continue
        if prop == "position" and low not in ("absolute", "relative"):
            continue
        if prop in ("height", "max-height") and low not in ZERO:
            continue
        v = v.replace("&quot;", '"')
        v = rewrite_css_urls(v)
        v = v.replace("'", "\\'")
        out.append((prop, v))
    if not out:
        return None
    return "{ " + ", ".join(f"{camel(p)}: '{v}'" for p, v in out) + " }"


def jsx_attr(name, value, tag):
    n = name.lower()
    if n in DROP_ATTRS:
        return None
    if isinstance(value, list):
        value = " ".join(value)
    if n in ("aria-label", "aria-hidden", "title") and (value is None or value == ""):
        return None
    if n in ("src", "href", "poster"):
        if value in (None, "", "_vercel/image", "/_vercel/image"):
            return None
        value = rewrite_url(str(value))
    if n == "value" and tag.name == "input":
        name = "defaultValue"
    prop = ATTR_MAP.get(n, name)
    if n in BOOLEAN_ATTRS and (value is None or str(value).strip() in ("", "true", n)):
        return prop
    if n in NUMERIC_ATTRS and re.fullmatch(r"-?\d+", str(value).strip() or ""):
        return f"{prop}={{{int(str(value).strip())}}}"
    if n in ("width", "height") and re.fullmatch(r"-?\d+", str(value).strip() or ""):
        return f"{prop}={{{int(str(value).strip())}}}"
    if value is None:
        value = ""
    value = str(value).replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")
    return f'{prop}="{value}"'


def esc_text(s):
    return s.replace("{", "&#123;").replace("}", "&#125;").replace("<", "&lt;").replace(">", "&gt;")


def has_class(node, *names):
    cs = node.get("class", []) if hasattr(node, "get") else []
    return any(x in cs for x in names)


def ancestor_has_class(node, name):
    p = node.parent
    while p is not None and getattr(p, "name", None):
        if name in (p.get("class", []) or []):
            return True
        p = p.parent
    return False


def is_split_char(n):
    """SplitText per-character/word wrapper: <div aria-hidden="true"
    style="position:relative;display:inline-block|block"> ..."""
    if not getattr(n, "name", None) or n.name != "div":
        return False
    if n.get("aria-hidden") != "true":
        return False
    st = (n.get("style") or "").replace(" ", "").lower()
    return "position:relative" in st and ("display:inline-block" in st or "display:block" in st)


def collapse_split(node, depth):
    """Render a SplitText host as plain text inside <p> (undo the char-split)."""
    pad = "  " * depth
    text = re.sub(r"\s+", " ", node.get_text()).strip()
    cls = " ".join(node.get("class", []))
    dv = " ".join(f'{k}="{v}"' for k, v in node.attrs.items() if k.startswith("data-v-"))
    inner_cls = "storyblok-content" if "storyblok-content" not in cls else ""
    p = f'{pad}  <div className="storyblok-content">\n{pad}    <p>{esc_text(text)}</p>\n{pad}  </div>\n' \
        if inner_cls else f'{pad}  <p>{esc_text(text)}</p>\n'
    open_attrs = " ".join(x for x in [f'className="{cls}"' if cls else "", dv] if x)
    if not open_attrs:
        return p.lstrip()
    return f"{pad}<div {open_attrs}>\n{p}{pad}</div>\n"


def to_jsx(node, depth=1):
    pad = "  " * depth
    if isinstance(node, Comment):
        return ""
    if isinstance(node, NavigableString):
        t = str(node)
        prev_tag = getattr(node.previous_sibling, "name", None)
        next_tag = getattr(node.next_sibling, "name", None)
        if not t.strip():
            # whitespace-only: a real space only if it separates inline elements
            if re.search(r"[ \t\n]", t) and (prev_tag or next_tag):
                return pad + '{" "}\n'
            return ""
        collapsed = re.sub(r"\s+", " ", t)
        out = esc_text(collapsed.strip())
        if collapsed[:1] == " " and prev_tag:
            out = '{" "}' + out
        if collapsed[-1:] == " " and next_tag:
            out = out + '{" "}'
        return pad + out + "\n"
    if node.name in ("script", "noscript", "style"):
        return ""

    # ---- GSAP / runtime substitutions -------------------------------------
    if node.name == "div" and has_class(node, "pin-spacer"):
        return "".join(to_jsx(c, depth) for c in node.children)
    # SplitText: an unclassed aria-hidden line-wrapper -> unwrap to its real child
    if is_split_char(node) and not node.get("class"):
        return "".join(to_jsx(c, depth) for c in node.children)
    # SplitText host: a classed node whose children are the split chars -> collapse
    if getattr(node, "name", None):
        kids_el = [c for c in node.children if getattr(c, "name", None)]
        if kids_el and all(is_split_char(c) for c in kids_el):
            return collapse_split(node, depth)
    if node.name == "div" and has_class(node, "vertex-label"):
        return ""  # three.js vertex-editor debug labels
    if node.name == "canvas":
        if ancestor_has_class(node, "logo-canvas") or ancestor_has_class(node, "webgl-wrapper"):
            return f'{pad}<div className="footer-wordmark" aria-label="Sharplink">Sharplink</div>\n'
        if ancestor_has_class(node, "productivity-chart") or ancestor_has_class(node, "chart-image-wrapper"):
            return (f'{pad}<img className="productivity-chart-img" src="{CHART_IMG}" '
                    f'alt="ETH holdings and staking rewards chart" />\n')
        return ""  # dotlottie canvas is dropped; its wrapper div is tagged below
    if node.name == "div" and has_class(node, "dotlottie", "lottie-player"):
        return (f'{pad}<div className="{" ".join(node.get("class", []))}" '
                f'data-dotlottie-src="{DOTLOTTIE_SRC}"'
                + (" " + " ".join(a for a in (jsx_attr(k, v, node) for k, v in node.attrs.items()
                                              if k != "class") if a)).rstrip()
                + f"></div>\n")

    if node.name == "img":
        resolve_nuxt_img(node)
        if not node.get("alt"):
            node["alt"] = ""
        if not node.get("src"):
            return ""

    if node.name == "video":
        # webm (VP9, incl. alpha) before the HEVC/hvc1 mp4 so Chromium doesn't
        # stall trying the codec it can't decode
        srcs = node.find_all("source", recursive=False)
        webms = [s for s in srcs if "webm" in (s.get("type", "") + s.get("src", ""))]
        others = [s for s in srcs if s not in webms]
        for s in srcs:
            s.extract()
        for s in webms + others:
            node.append(s)

    tag_name = SVG_TAGS.get(node.name, node.name)

    attrs = [a for a in (jsx_attr(k, v, node) for k, v in list(node.attrs.items())) if a]
    style_val = node.get("style")
    if style_val:
        kept = clean_style(style_val)
        if kept:
            attrs.append(f"style={{{kept}}}")
    attr_s = (" " + " ".join(attrs)) if attrs else ""

    kids = list(node.children)
    meaningful = [c for c in kids if not isinstance(c, Comment)
                  and not (isinstance(c, NavigableString) and not str(c).strip())]
    if node.name in VOID:
        return f"{pad}<{tag_name}{attr_s} />\n"
    if not meaningful:
        return f"{pad}<{tag_name}{attr_s}></{tag_name}>\n"
    inner = "".join(to_jsx(c, depth + 1) for c in kids)
    return f"{pad}<{tag_name}{attr_s}>\n{inner}{pad}</{tag_name}>\n"


def component(name, node):
    return f"""// AUTO-GENERATED from the scraped SharpLink homepage. Regenerate with _work/convert.py
export default function {name}() {{
  return (
{to_jsx(node, 2).rstrip()}
  );
}}
"""


def main():
    soup = BeautifulSoup(open(SRC, encoding="utf-8", errors="replace").read(), "html.parser")
    for t in soup.find_all(["script", "noscript"]):
        t.decompose()
    for c in soup.find_all(string=lambda s: isinstance(s, Comment)):
        c.extract()

    os.makedirs(OUT, exist_ok=True)
    header = soup.select_one("header.site-header")
    footer = soup.select_one("footer.site-footer")
    cookie = soup.select_one("div.cookie-banner")
    main_el = soup.select_one("main.page-index")
    sec = [c for c in main_el.children if getattr(c, "name", None)]

    # the page loads at the dark hero — start the fixed header in its dark theme
    if header is not None:
        cls = header.get("class", [])
        header["class"] = [("theme-dark" if c == "theme-light" else c) for c in cls]

    emit = {"Header": header, "Footer": footer, "CookieBanner": cookie}
    for nm, el in zip(["HeroProductivity", "Propositions", "Banner", "Opportunity", "News", "Faq"], sec):
        emit[nm] = el

    for nm, el in emit.items():
        if el is None:
            print("!! missing", nm); continue
        open(os.path.join(OUT, nm + ".tsx"), "w", encoding="utf-8").write(component(nm, el))
        print("wrote", nm)
    print("->", os.path.abspath(OUT))


if __name__ == "__main__":
    main()
