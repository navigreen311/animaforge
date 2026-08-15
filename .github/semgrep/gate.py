#!/usr/bin/env python3
"""Gate a Semgrep JSON report against the accepted-risk register.

Exit 0 only when every finding in the report is explicitly listed in
.github/semgrep/accepted-risks.json. Any unlisted finding fails the build.

Usage:
    semgrep scan --config=... --json --output=semgrep.json
    python .github/semgrep/gate.py semgrep.json
"""
from __future__ import annotations

import json
import os
import pathlib
import sys

REGISTER = pathlib.Path(__file__).with_name("accepted-risks.json")


def summary(line: str = "") -> None:
    """Echo to stdout and, on GitHub Actions, to the job summary."""
    print(line)
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if path:
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(line + "\n")


def key(rule: str, path: str) -> tuple[str, str]:
    return (rule.strip(), path.replace("\\", "/").lstrip("./").strip())


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__)
        return 2

    report_path = pathlib.Path(argv[1])
    if not report_path.exists():
        print(f"::error::Semgrep report not found: {report_path}")
        return 2

    report = json.loads(report_path.read_text(encoding="utf-8"))
    register = json.loads(REGISTER.read_text(encoding="utf-8"))

    accepted = {key(e["rule"], e["path"]): e for e in register["accepted"]}
    seen: set[tuple[str, str]] = set()
    blocking: list[dict] = []

    for result in report.get("results", []):
        k = key(result.get("check_id", ""), result.get("path", ""))
        if k in accepted:
            seen.add(k)
        else:
            blocking.append(result)

    summary("## Semgrep SAST gate")
    summary()

    if blocking:
        summary(f"**{len(blocking)} unaccepted finding(s) — build fails.**")
        summary()
        summary("| Severity | Rule | Location |")
        summary("|---|---|---|")
        for r in blocking:
            sev = r.get("extra", {}).get("severity", "UNKNOWN")
            line = r.get("start", {}).get("line", "?")
            summary(f"| {sev} | `{r.get('check_id')}` | `{r.get('path')}:{line}` |")
        summary()
        for r in blocking:
            line = r.get("start", {}).get("line", "?")
            msg = r.get("extra", {}).get("message", "").strip().splitlines()
            print(f"::error file={r.get('path')},line={line}::"
                  f"{r.get('check_id')}: {msg[0] if msg else ''}")
    else:
        summary("**No unaccepted findings.**")
        summary()

    if accepted:
        summary(f"### Accepted risks ({len(accepted)})")
        summary()
        summary("These are real, unfixed findings. They do not block CI, but they are "
                "not resolved — each names the owner who needs to clear it.")
        summary()
        summary("| Rule | Location | Owner | Reason |")
        summary("|---|---|---|---|")
        for (rule, path), entry in sorted(accepted.items()):
            summary(f"| `{rule.rsplit('.', 1)[-1]}` | `{path}` | {entry['owner']} | {entry['reason']} |")
        summary()

    stale = sorted(set(accepted) - seen)
    if stale:
        summary(f"### Stale register entries ({len(stale)})")
        summary()
        summary("These accepted risks no longer reproduce — the finding was fixed or the "
                "file moved. Delete them from `.github/semgrep/accepted-risks.json`.")
        summary()
        for rule, path in stale:
            summary(f"- `{path}` — `{rule}`")
            print(f"::warning::Stale accepted-risk entry: {path} / {rule}")
        summary()

    errors = report.get("errors", [])
    if errors:
        summary(f"_{len(errors)} scanner error(s) — see raw log._")

    return 1 if blocking else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
