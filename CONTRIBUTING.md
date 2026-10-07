# Contributing to Wolvinix

Thanks for helping build Wolvinix. This document keeps contributions
consistent and reviewable.

## Development setup

```bash
git clone https://github.com/faizcasm/wolvinix-2.0.git
cd wolvinix-2.0
npm install
cp apps/api/.env.example apps/api/.env
npm run dev
```

## Branch naming

| Prefix       | Use                              |
| ------------ | -------------------------------- |
| `feat/…`     | new user-facing feature          |
| `fix/…`      | bug fix                          |
| `chore/…`    | tooling, deps, repo maintenance  |
| `docs/…`     | documentation only               |
| `refactor/…` | behaviour-preserving code change |
| `test/…`     | tests only                       |

## Commit style

Conventional Commits — the subject line is required, the body is optional:

```
feat(web): add bookmark tab to profile
fix(api): enforce ownership on post edits
chore(ci): cache npm dependencies
docs: document socket ticket handshake
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `style`.

## Before you open a PR

All of these must pass locally — CI runs the same checks:

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run build
```

## Pull request checklist

- [ ] Change is scoped to a single concern
- [ ] New endpoints are documented in `docs/API.md`
- [ ] New UI follows the tokens in `apps/web/src/index.css` (no raw hex)
- [ ] Lists have loading, empty, error and pagination states
- [ ] Mutations are optimistic where it improves perceived speed
- [ ] No `console.log` left in shipped code
- [ ] No secrets, `.env` files or credentials committed
- [ ] Responsive down to 360px; keyboard accessible

## Reporting bugs

Open an issue with:

1. What you expected vs what happened
2. Steps to reproduce
3. Browser + OS, Node version
4. Console/network errors or screenshots
