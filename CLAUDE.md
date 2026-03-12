# PR Fitness - Development Guide

## Project Context

**Repository:** DomGme/pr-fitness
**Project Board:** GitHub Issues
**Board CLI:** gh (must be installed and authenticated)
**Tech Stack:** Node.js + Commander + Inquirer + Vitest
**Primary Focus:** CLI tool that assigns calisthenics exercises when creating PRs

---

## Specflow Rules

### Rule 1: No Ticket = No Code

All work requires a GitHub issue with:
- Acceptance criteria
- Contract references (if modifying protected files)
- Test file name

### Rule 2: Contracts Are Non-Negotiable

Check `docs/contracts/` before modifying protected files.

```bash
npm test -- contracts    # Must pass
```

Violation = build fails = PR blocked.

### Rule 3: Tests Must Pass Before Closing

```bash
npm test -- contracts    # Contract tests
npx vitest run           # Unit tests
```

Work is NOT complete if tests fail.

### Contract Locations

| Type | Location |
|------|----------|
| Feature contracts | `docs/contracts/feature_*.yml` |
| Default contracts | `docs/contracts/*_defaults.yml` |
| Contract tests | `src/__tests__/contracts/*.test.ts` |

### Override Protocol

Only humans can override. User must say:
```
override_contract: <contract_id>
```

### Active Contracts

#### Default Contracts (from Specflow):

| Contract | Rules | What it catches |
|----------|-------|----------------|
| `security_defaults.yml` | SEC-001..005 | Hardcoded secrets, SQL injection, XSS, eval, path traversal |
| `accessibility_defaults.yml` | A11Y-001..004 | Missing alt text, aria-labels, form labels, tabindex |
| `test_integrity_defaults.yml` | TEST-001..005 | Mocking in E2E tests, suspicious patterns, placeholder markers |
| `production_readiness_defaults.yml` | PROD-001..003 | Demo/mock data in production, placeholder domains, hardcoded IDs |

_Project-specific contracts: not yet defined. Will be created during implementation._

---

## Commit Message Format

Specflow hooks require issue references in commits:

```bash
# GOOD
git commit -m "feat: add setup command (#3)"

# BAD
git commit -m "feat: add setup command"
```

---

## Project Structure

```
pr-fitness/
├── bin/pr-fitness.js      # CLI entry point
├── src/
│   ├── commands/          # CLI command handlers
│   ├── storage.js         # JSON read/write (atomic)
│   ├── exercises.js       # Exercise pools and selection
│   ├── tones.js           # Prompt formatting
│   └── utils.js           # Date helpers, validation
├── tests/                 # Vitest unit tests
├── docs/
│   ├── contracts/         # Specflow YAML contracts
│   └── superpowers/       # Design specs and plans
├── hooks/                 # Claude Code hook examples
└── Specflow/              # Specflow methodology (reference)
```

## Key Design Decisions

- **Storage:** Local JSON at `~/.pr-fitness/data.json`, atomic writes (temp + rename)
- **Exercise selection:** Random from user's configured pool
- **Daily choice:** First PR of the day prompts user to pick exercise
- **Balance tracking:** Negative = owed, positive = banked credit
- **Tones:** minimal (default), encouraging
- **Distribution:** npm package, MIT license

## Commands

```bash
npm test              # Run all tests (vitest)
npx vitest run        # Run tests once
npx vitest            # Run tests in watch mode
node bin/pr-fitness.js --help  # Test CLI locally
```

## Specs and Plans

- **Design spec:** `docs/superpowers/specs/2026-03-11-pr-fitness-design.md`
- **Implementation plan:** `docs/superpowers/plans/2026-03-11-pr-fitness.md`
