#!/usr/bin/env python3
"""Validate Murte fixtures against docs/murte.schema.json.

Contract:
  - the schema itself must be a valid JSON Schema (Draft 2020-12);
  - every file under docs/fixtures/valid/   MUST pass the schema;
  - every file under docs/fixtures/invalid/ MUST be rejected by the schema.

This is the anti-drift guard: it keeps the authoritative schema and the example
payloads honest with each other on every commit.

Note: bounds that JSON Schema cannot express (tree depth, total node count,
action-chain depth) and semantic checks (a type/screen/request actually resolves)
are the client validator's job, not this script's — see docs/schema.md.

Usage:
  python3 scripts/lint_schema.py       # exits non-zero on any mismatch
"""
import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator
from jsonschema.exceptions import best_match

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = ROOT / "docs" / "murte.schema.json"
VALID = ROOT / "docs" / "fixtures" / "valid"
INVALID = ROOT / "docs" / "fixtures" / "invalid"


def load(path):
    with open(path) as f:
        return json.load(f)


def main():
    schema = load(SCHEMA)
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema)
    print("schema is a valid Draft 2020-12 schema")

    failures = []

    for path in sorted(VALID.glob("*.json")):
        errors = list(validator.iter_errors(load(path)))
        if errors:
            err = best_match(errors)
            failures.append(f"valid/{path.name} was rejected: {err.message}")
            print(f"  FAIL  valid/{path.name}: {err.message}")
        else:
            print(f"  ok    valid/{path.name}")

    for path in sorted(INVALID.glob("*.json")):
        errors = list(validator.iter_errors(load(path)))
        if not errors:
            failures.append(f"invalid/{path.name} was accepted (schema must reject it)")
            print(f"  FAIL  invalid/{path.name}: accepted, but the schema must reject it")
        else:
            err = best_match(errors)
            loc = "/".join(str(p) for p in err.absolute_path) or "(root)"
            print(f"  ok    invalid/{path.name} (rejected at {loc}: {err.message[:72]})")

    print()
    if failures:
        print(f"FAILED: {len(failures)} problem(s)")
        return 1
    print("All fixtures conform to the schema contract.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
