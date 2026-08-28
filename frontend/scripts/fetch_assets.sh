#!/usr/bin/env bash
# Downloads every asset the SharpLink homepage needs into public/.
# Run from anywhere: paths resolve relative to this script (scripts/ in the project).
set -u
PUB="$(cd "$(dirname "$0")/.." && pwd)/public"
SB="https://a.storyblok.com/f/290008427472090"
SB2="https://a.storyblok.com/f/290581778021750"
SITE="https://www.sharplink.com"

mkdir -p "$PUB/svgs" "$PUB/images" "$PUB/storyblok" "$PUB/videos" "$PUB/lottie" "$PUB/docs"

get () { # url dest
  if [ -f "$2" ] && [ -s "$2" ]; then echo "skip  $2"; return; fi
  code=$(curl -sSL -o "$2" -w "%{http_code}" "$1")
  sz=$(wc -c < "$2" 2>/dev/null || echo 0)
  echo "$code  $sz  $2"
}

# --- site icons (paths kept identical so original CSS mask-image:url(/svgs/..) resolves)
for i in icoArrow-right icoArrow-up icoClose icoSchevron-left icoSchevron-right icoSuccess rotate-device; do
  get "$SITE/svgs/$i.svg" "$PUB/svgs/$i.svg"
done
get "$SITE/images/gradient-dark-transparent.png" "$PUB/images/gradient-dark-transparent.png"
get "$SITE/images/heroOverlay_homepage.avif"     "$PUB/images/heroOverlay_homepage.avif"
get "$SITE/favicon.png" "$PUB/favicon.png"

# --- Storyblok images -> /storyblok/<basename>
get "$SB/1024x1920/ee239a4b63/shrp_machine_1.avif" "$PUB/storyblok/shrp_machine_1.avif"
get "$SB/1024x1920/2c22bb57dd/shrp_machine_2.avif" "$PUB/storyblok/shrp_machine_2.avif"
get "$SB/1024x1920/913f7b32b7/shrp_machine_3.avif" "$PUB/storyblok/shrp_machine_3.avif"
get "$SB/1024x1920/c19b81581c/shrp_machine_4.avif" "$PUB/storyblok/shrp_machine_4.avif"
get "$SB/1024x1920/a9dd640d26/shrp_machine_5.avif" "$PUB/storyblok/shrp_machine_5.avif"
get "$SB/1024x1920/6cfd545366/shrp_stack_outline.avif" "$PUB/storyblok/shrp_stack_outline.avif"
get "$SB/1162x650/a29f7aad46/chart-img.webp" "$PUB/storyblok/chart-img.webp"
get "$SB/176x50/1f5cd96fe5/nasdaq_logo-1.png" "$PUB/storyblok/nasdaq_logo-1.png"
get "$SB/252x72/c7ee962a25/logonasdaq.svg" "$PUB/storyblok/logonasdaq.svg"
get "$SB/270x270/0321fe5cd5/icoopp_1.webp" "$PUB/storyblok/icoopp_1.webp"
get "$SB/270x270/51e086bcb0/icoopp_2.webp" "$PUB/storyblok/icoopp_2.webp"
get "$SB/270x270/0c92801c32/icoopp_3.webp" "$PUB/storyblok/icoopp_3.webp"
get "$SB/270x270/4eaaf8ac16/icoopp_4.webp" "$PUB/storyblok/icoopp_4.webp"
get "$SB/272x68/6652277faa/logo.png" "$PUB/storyblok/logo.png"
get "$SB/720x564/b5c3c1351f/dotillustration_1.avif" "$PUB/storyblok/dotillustration_1.avif"
get "$SB/720x564/c931a885e0/dotillustration_2.avif" "$PUB/storyblok/dotillustration_2.avif"
get "$SB/720x564/7465a9b37f/dotillustration_3.avif" "$PUB/storyblok/dotillustration_3.avif"
get "$SB/1200x630/cee5dffe93/og-homepage.jpg" "$PUB/storyblok/og-homepage.jpg"
get "$SB2/3200x2000/61b8a04902/galaxy-sharplink-ecosystem-liquidity-fund.png" "$PUB/storyblok/galaxy-sharplink-ecosystem-liquidity-fund.png"
get "$SB2/64x64/39bbf656ff/sharplinkfavicon.png" "$PUB/storyblok/sharplinkfavicon.png"

# --- videos
get "$SB/x/87414464bd/shrp_homepagehero_30fps.webm" "$PUB/videos/shrp_homepagehero_30fps.webm"
get "$SB/x/324ca8b2c3/shrp_homeopportunity_chrome.webm" "$PUB/videos/shrp_homeopportunity_chrome.webm"
get "$SB/x/fc3ccdb6eb/shrp_homeopportunity_safari.mp4" "$PUB/videos/shrp_homeopportunity_safari.mp4"

# --- lottie + pdf
get "$SB/x/c203c1fda0/shrp_stack.json" "$PUB/lottie/shrp_stack.json"
get "$SB2/x/6fb27ea04d/q2_earnings.pdf" "$PUB/docs/q2_earnings.pdf"

echo "--- done ---"
ls -R "$PUB" | head -80
