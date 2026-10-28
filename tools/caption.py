"""Print a video's paste-ready caption and check the house format; exit 1 (nothing printed) if it breaks a rule.

Usage: python3 -I tools/caption.py videos/NNN-slug
Strips the `# Caption` heading and the <!-- sources --> comment. Rules (docs/FORMAT.md §9): a question
CTA with 👇, a "Send this to…" line, no promo/course link (user, Oct 26 2026), and a last line of exactly 5 hashtags
including #animation. Run it before posting; a caption that fails should not go out.
"""
import re
import sys
from pathlib import Path

def main():
    src = (Path(sys.argv[1]) / "caption.md").read_text()
    txt = re.sub(r"<!--.*?-->", "", src, flags=re.S)
    txt = re.sub(r"^# Caption\s*\n", "", txt.lstrip()).strip()
    lines = txt.split("\n")
    errs = []
    if "<hook line" in txt:
        errs.append("still the template")
    if "👇" not in txt:
        errs.append("no question CTA with 👇")
    if not any(l.startswith("Send this to") for l in lines):
        errs.append('no "Send this to…" line')
    if "payhip" in txt.lower():
        errs.append("contains the original creator's course link (this channel has no promo line)")
    tags = lines[-1].split()
    if len(tags) != 5 or not all(t.startswith("#") for t in tags) or "#animation" not in tags:
        errs.append(f"last line must be exactly 5 hashtags incl. #animation (got: {lines[-1]!r})")
    if len(txt) > 2200:
        errs.append(f"too long ({len(txt)} chars > 2200)")
    if errs:
        sys.exit("caption check FAILED: " + "; ".join(errs))
    print(txt)


if __name__ == "__main__":
    main()
