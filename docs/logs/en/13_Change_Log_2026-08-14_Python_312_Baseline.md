# Python 3.12 Baseline Change Log

**Date:** 14 August 2026
**Status:** PoC runtime baseline

## Change

- Added `pyproject.toml` with `requires-python = ">=3.12,<3.13"`.
- Declared the PoC dependencies: `openpyxl` and `pydantic`.
- Declared Python 3.12 as Ruff's target version.
- Made `parser_poc` an explicit package and updated the run/test instructions to use an isolated Python 3.12 environment.

## Rationale

The macOS system Python remains untouched. The project baseline follows the existing architecture specification and allows production-oriented typing and dependency choices without maintaining compatibility with the system's Python 3.9 runtime.
