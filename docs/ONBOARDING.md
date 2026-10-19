# First-Time Contributor Onboarding — Stardial

Welcome! This checklist gets you from zero to a passing test run.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20 LTS or later | `node --version` |
| pnpm | 8+ | `npm i -g pnpm` |
| Rust | stable | `rustup install stable` |
| `soroban-cli` | 20.x | `cargo install --locked soroban-cli` |
| Docker | any | Required for local Postgres |

---

## Setup checklist

- [ ] **Clone and install**

  ```bash
  git clone https://github.com/Split-Naira/Stardial.git
  cd Stardial
  pnpm install
  ```

- [ ] **Copy environment files**

  ```bash
  cp backend/.env.example backend/.env
  cp frontend/.env.example frontend/.env.local
  ```

  Edit both files — the only required change for local dev is setting a `DATABASE_URL` pointing at the Docker Postgres instance (started below).

- [ ] **Start the database**

  ```bash
  docker compose up -d postgres
  ```

- [ ] **Run backend migrations**

  ```bash
  cd backend && pnpm run migrate
  ```

- [ ] **Build and test the Soroban contracts**

  ```bash
  cd contracts
  cargo test --features testutils
  ```

  All tests should pass. If you see linker errors, run `rustup target add wasm32-unknown-unknown`.

- [ ] **Start backend dev server**

  ```bash
  cd backend && pnpm run dev
  ```

- [ ] **Start frontend dev server** (new terminal)

  ```bash
  cd frontend && pnpm run dev
  ```

  Open [http://localhost:3000](http://localhost:3000).

- [ ] **Run the full test suite**

  ```bash
  pnpm -r run test
  ```

---

## Good first issues

Look for issues labelled [`good first issue`](https://github.com/Split-Naira/Stardial/issues?q=is%3Aopen+label%3A%22good+first+issue%22) on GitHub.

---

## Troubleshooting

**`cargo test` fails with `no such table` / Diesel error**
Run `cd backend && pnpm run migrate` to apply pending migrations before testing.

**Port 3000 already in use**
Set `PORT=3001` in `frontend/.env.local` or stop the process occupying 3000.

**`soroban-cli` not found after install**
Make sure `~/.cargo/bin` is on your `$PATH` (`source ~/.cargo/env`).

**`pnpm install` fails on native modules**
Ensure you have the Xcode Command Line Tools (macOS: `xcode-select --install`) or `build-essential` (Linux) installed.

---

## Submitting a PR

1. Fork the repo and create a branch off `main`: `git checkout -b feat/my-feature`.
2. Make your changes with tests.
3. Push and open a PR against `Split-Naira/Stardial:main`.
4. Add `Closes #<issue-number>` in the PR description so the issue closes automatically.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for code style and review guidelines.
