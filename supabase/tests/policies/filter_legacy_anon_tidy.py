#!/usr/bin/env python3
"""Adapt a known historical fixture for replay after Tesla tree removal.

Only local test data are transformed. The original migration remains immutable.
Whole Tesla policies/functions vanish; mixed list grants keep live relations.
"""
from pathlib import Path
import re
import sys

sql = Path(sys.argv[1]).read_text()
sql = re.sub(r"(?is)^[ \t]*(?:DROP|CREATE) POLICY[^;]*\btesla_[^;]*;[ \t]*\n?", "", sql, flags=re.M)
sql = re.sub(r"(?im)^\s*(?:REVOKE|GRANT)[^\n]*FUNCTION public\.has_tesla_linked[^\n]*;\s*", "", sql)
for match in reversed(list(re.finditer(r"(?is)^[ \t]*(?:GRANT|REVOKE)\b[^;]*;", sql, flags=re.M))):
    stmt = match.group(0)
    if "tesla_" not in stmt:
        continue
    parts = re.fullmatch(r"(?is)\s*(.*\bON\s+)(.*?)(\s+\b(?:TO|FROM)\b\s+.*?;)", stmt)
    if not parts:
        raise SystemExit("Unexpected permission fixture: a Tesla statement was not safely understood")
    prefix, tables, suffix = parts.groups()
    kept = [table.strip() for table in tables.split(",") if "tesla_" not in table and table.strip()]
    sql = sql[:match.start()] + (prefix + ", ".join(kept) + suffix + "\n" if kept else "") + sql[match.end():]
print(sql)
