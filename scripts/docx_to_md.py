#!/usr/bin/env python3
"""
Convert .docx files (e.g. Google Drive exports) to plain markdown.

Usage:
  python3 scripts/docx_to_md.py path/to/file.docx [output.md]
  python3 scripts/docx_to_md.py path/to/folder/          # converts all .docx in folder

Requires: pip3 install python-docx
"""

import sys
import os
import docx


def heading_prefix(level: int) -> str:
    return "#" * max(1, min(level, 6)) + " "


def docx_to_md(path: str) -> str:
    doc = docx.Document(path)
    lines = []
    for para in doc.paragraphs:
        style = para.style.name
        text = para.text
        if style.startswith("Heading "):
            try:
                level = int(style.split(" ")[1])
            except (IndexError, ValueError):
                level = 2
            lines.append(heading_prefix(level) + text)
        elif style == "Title":
            lines.append("# " + text)
        elif style.startswith("List Bullet"):
            suffix = style[len("List Bullet"):]
            depth = int(suffix.strip()) - 1 if suffix.strip().isdigit() else 0
            lines.append("  " * depth + "- " + text)
        elif style.startswith("List Number"):
            suffix = style[len("List Number"):]
            depth = int(suffix.strip()) - 1 if suffix.strip().isdigit() else 0
            lines.append("  " * depth + "1. " + text)
        else:
            lines.append(text)
    return "\n\n".join(lines)


def convert_file(src: str, dest: str | None = None) -> str:
    if dest is None:
        base = src[:-5] if src.endswith(".docx") else src
        dest = base if base.endswith(".md") else base + ".md"
    md = docx_to_md(src)
    with open(dest, "w") as f:
        f.write(md)
    return dest


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    target = sys.argv[1]
    out_arg = sys.argv[2] if len(sys.argv) > 2 else None

    if os.path.isdir(target):
        files = [os.path.join(target, f) for f in sorted(os.listdir(target)) if f.endswith(".docx")]
        if not files:
            print(f"No .docx files found in {target}")
            sys.exit(0)
        for f in files:
            dest = convert_file(f)
            print(f"  {os.path.basename(f)} -> {os.path.basename(dest)}")
    elif os.path.isfile(target):
        dest = convert_file(target, out_arg)
        print(f"  {os.path.basename(target)} -> {os.path.basename(dest)}")
    else:
        print(f"Error: {target} not found")
        sys.exit(1)


if __name__ == "__main__":
    main()
