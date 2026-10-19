# Stardial

**A Stellar wallet you can use from any phone. Dial a short code, send USDC or XLM to a phone number, and cash out through a local agent, with on-chain spending limits that protect the user even from the gateway.**

Stardial brings Stellar to feature phones through USSD and SMS. No smartphone, no data plan, no seed phrase. Wallets are Soroban smart accounts whose spending rules are enforced on-chain, so a lost SIM or a compromised gateway can only ever do limited damage.

![License: MIT](https://img.shields.io/badge/License-MIT-green) ![Network: Stellar](https://img.shields.io/badge/Network-Stellar-blue) ![Contracts: Soroban](https://img.shields.io/badge/Contracts-Soroban-purple) ![Monorepo: pnpm](https://img.shields.io/badge/Monorepo-pnpm-orange) ![Build: Turborepo](https://img.shields.io/badge/Build-Turborepo-red)

> **Status:** early design and Testnet development. Function tables, invariants and error codes below describe the target interface. Items marked *planned* are not yet implemented.

---

## The Problem

Stablecoins and Stellar's low fees are most useful to people who are least likely to own a smartphone with reliable data.

- Hundreds of millions of people in Africa and South Asia use feature phones or have intermittent data. Every Stellar wallet today assumes an app, a screen that can show a QR code, and a seed phrase.
- Mobile-money services already reach these users, but they are closed systems with high cross-border fees and no access to dollar-denominated savings.
- Moving money from phone to cash still depends on trusting a local agent. If the agent takes the transfer and does not hand over the cash, the user has no recourse.
- A wallet that works over SMS invites a new set of risks: SIM swaps, stolen phones, and a gateway that could in theory move user funds.

## The Solution

Stardial puts a Stellar wallet behind a phone number, with the safety rules on the ledger instead of in a company's database.

1. **USSD and SMS gateway.** Dial `*384*7#` (example code) to check a balance, send money, or cash out. Works on any handset and degrades to SMS when a USSD session drops.
2. **Policy-bounded smart wallets.** Each user gets a Soroban smart account. The gateway holds only a *relay key* that can execute transfers inside limits the contract enforces: per-transaction cap, daily cap, new-recipient cool-down, and a PIN-attempt lockout. The user (or a guardian) can freeze or revoke the relay key at any time.
3. **Cash Code escrow.** Cashing out locks the user's funds in an escrow contract. The agent only gets paid once the user gives them a one-time code after receiving the cash.
4. **AI in local languages.** An assistant parses requests like *"send 2k to Tunde"* in English, Pidgin, Hausa, Yoruba, and Igbo into a structured intent that the user must still confirm with their PIN.

---

## Core Features

### Wallet and Payments
- Send USDC or XLM to a phone number, even if the recipient has no wallet yet (a pending claim is created and the recipient is notified by SMS)
- Balance, history, and receipts by USSD or SMS
- Works offline-first: if a USSD session times out, the request is queued and completed by SMS
- Savings pockets: lock an amount until a date, enforced by the wallet contract
- Optional upgrade: link a smartphone or passkey as a full owner key at any time

### Cash In and Cash Out
- A network of local agents who deposit and dispense cash
- Escrowed cash-outs protected by a one-time Cash Code
- Agent profiles with stake, limits, ratings, and dispute history

### AI Features (Stardial Assist)
| Feature | What it does |
|---|---|
| **Intent Parsing** | Converts a message in English, Pidgin, Hausa, Yoruba, or Igbo into a structured request (`send`, `amount`, `recipient`). The user must still confirm with their PIN |
| **Scam Warnings** | Warns, in the user's language, when a request matches known scam patterns (urgent "refund" messages, unfamiliar recipients, unusually large amounts) |
| **Agent Matching** | Suggests nearby agents based on location, liquidity, and rating |
| **Support Assistant** | Explains fees, limits, and failed transactions in plain language |

The AI never holds keys and never signs anything. It only produces structured intent. Spending limits are enforced by the contract, so a model mistake cannot drain a wallet.

### Unique Feature 1: Policy-Bounded Relay Wallet
The gateway signs on the user's behalf, but only within rules fixed on-chain. Even a fully compromised gateway key cannot exceed the user's daily limit, cannot send to a new recipient before the cool-down, and loses access the moment the owner or a guardian freezes it.

### Unique Feature 2: Cash Code Escrow
When a user cashes out, `AgentEscrow` locks the funds and stores a hash of a one-time code sent to the user by SMS. The user hands over the code only after receiving cash. The agent submits it to release the funds. If nothing happens before the deadline, the user is refunded automatically.

---

## Monorepo Structure

```
stardial/
├── packages/
│   ├── contracts/      # @stardial/contracts - Soroban smart contracts (Rust)
│   ├── gateway/        # @stardial/gateway   - USSD + SMS engine, session handling, relay signer (TypeScript)
│   ├── assist/         # @stardial/assist    - AI intent parsing, scam warnings, language packs
│   ├── agent/          # @stardial/agent     - Agent PWA for cash-in / cash-out (Next.js)
│   ├── api/            # @stardial/api       - REST API for partners and the agent app
│   ├── sdk/            # @stardial/sdk       - TypeScript SDK for contracts and API
│   └── web/            # @stardial/web       - Landing site, docs, status, and simulator (Next.js)
├── docs/               # Architecture, threat model, USSD menu spec, SECURITY_MODEL.md
├── simulator/          # Local USSD/SMS simulator, no telecom account needed
├── scripts/            # Testnet bootstrap, seed data, deploy helpers
├── audits/             # Smart contract audit reports
├── pnpm-workspace.yaml
├── turbo.json
└── README.md           <- you are here
```

---

## How It Works

```
User (feature phone)       Gateway                      Stellar Ledger
      │                       │                               │
      ├─ dial *384*7# ───────▶│ open USSD session             │
      ├─ "1. Send" ──────────▶│ Assist parses intent          │
      ├─ confirm with PIN ───▶│ verify PIN (hash + lockout)   │
      │                       ├─ relay key signs ─────────────▶ StardialWallet.transfer()
      │                       │                               ├─ check per-tx cap
      │                       │                               ├─ check daily cap
      │                       │                               ├─ check new-recipient cool-down
      │◀── SMS receipt ───────┤◀────────── event ─────────────┤

Cash out
      ├─ "Cash out 5000" ────▶│ ─────────────────────────────▶ AgentEscrow.open(code_hash)
      │◀── SMS: Cash Code ────┤                               │
Agent hands over cash         │                               │
      ├─ gives Cash Code to agent                             │
      │                  Agent ─ submits code ───────────────▶ AgentEscrow.release(code)
      │                       │                               └─ funds -> agent
      │   (no release before deadline)  ─────────────────────▶ AgentEscrow.refund()
```

### Example USSD menu
USSD screens are limited to about 160 characters, and sessions time out in roughly 90 seconds, so every screen is short.

```
Stardial
1. Send money
2. Balance
3. Cash out
4. Save
5. Settings
```

---

## Packages

### @stardial/contracts
Soroban smart contracts in Rust, deployable to Stellar Testnet and Mainnet.

| Contract | Purpose |
|---|---|
| `PhoneRegistry` | Maps a keyed hash of a phone number to a wallet address, and holds pending claims for recipients without a wallet |
| `WalletFactory` | Deploys a `StardialWallet` per user with a fixed wasm hash and default policy |
| `StardialWallet` | The smart account: owner, relay key, guardians, spending policy, savings pockets |
| `AgentEscrow` | Cash-out escrow released by a one-time code, with agent stake and dispute window |

```
packages/contracts/
├── contracts/
│   ├── phone-registry/
│   ├── wallet-factory/
│   ├── stardial-wallet/
│   ├── agent-escrow/
│   └── common/              # Shared error enum
├── tests/
├── Cargo.toml
└── README.md
```
**Stack:** Rust, Soroban SDK, Stellar CLI

#### PhoneRegistry

Phone numbers never appear on-chain. The registry stores a **keyed hash** (HMAC-SHA256 with a pepper held by the gateway cluster), because phone numbers have too little entropy for a plain hash to be private.

| Function | Purpose |
|---|---|
| `initialize(admin, verifier_set)` | Sets the admin and the set of verifier keys allowed to register numbers |
| `register(phone_hash, wallet)` | Binds a phone hash to a wallet after a verifier attests an SMS ownership check. Verifier auth required |
| `rebind(phone_hash, new_wallet, sim_swap_proof)` | Moves a number to a new wallet; subject to a cool-down (see SIM-swap protection) |
| `lookup(phone_hash) -> Option<Address>` | Returns the wallet for a hash. Read-only |
| `create_claim(phone_hash, token, amount, expiry_ledger)` | Holds funds for a recipient who has no wallet yet |
| `claim(phone_hash, wallet)` | Releases a pending claim once the recipient registers |
| `refund_claim(claim_id)` | Returns an expired claim to the sender |
| `get_claim(claim_id) -> Option<Claim>` | Read-only |

#### StardialWallet

| Function | Purpose |
|---|---|
| `__constructor(WalletInit)` | Sets owner, relay key, guardians, token, and policy in one call. No post-deployment initialize window |
| `transfer(to, token, amount, nonce)` | Relay or owner transfers funds, subject to policy. `nonce` is the caller's current replay-protection nonce |
| `deposit(from, token, amount)` | Tops up the wallet |
| `set_policy(per_tx_cap, daily_cap, new_recipient_delay_ledgers)` | Owner changes the spending policy. Loosening takes effect after a timelock; tightening is immediate |
| `execute_policy()` | Applies a pending loosened policy after the timelock |
| `add_trusted_recipient(address)` | Adds a recipient exempt from the new-recipient cool-down. Owner auth required |
| `freeze()` | Owner or any guardian freezes the wallet immediately |
| `unfreeze()` | Owner unfreezes. Guardians cannot |
| `rotate_relay_key(new_key)` | Owner replaces the relay key |
| `revoke_relay_key()` | Owner or guardian disables the relay key entirely |
| `add_guardian(address)` / `remove_guardian(address)` | Manages recovery guardians. Owner auth required |
| `begin_recovery(new_owner)` | A guardian starts social recovery |
| `finalize_recovery()` | Completes recovery after a threshold of guardians and a timelock |
| `cancel_recovery()` | Current owner cancels a pending recovery |
| `lock_pocket(pocket_id, token, amount, unlock_ledger)` | Locks funds in a savings pocket until a date |
| `unlock_pocket(pocket_id)` | Releases a pocket after its unlock ledger |
| `record_pin_failure()` | Relay records a failed PIN attempt; the contract locks sending after the configured limit |
| `reset_pin_lock()` | Owner or guardian clears a PIN lockout |
| `get_policy() -> Policy` | Read-only |
| `get_spent_today() -> i128` | Read-only, rolling daily total |
| `get_user_nonce() -> u64` | Read-only |
| `is_frozen() -> bool` | Read-only |
| `extend_ttl()` | Extends the TTL of wallet state. Publicly callable |

The PIN itself is never stored on-chain. The gateway verifies it against a salted hash held off-chain, and the wallet only counts failed attempts so lockouts survive a gateway restart.

#### AgentEscrow

| Function | Purpose |
|---|---|
| `initialize(admin, min_stake, dispute_window_ledgers)` | Sets the admin, minimum agent stake, and dispute window |
| `register_agent(agent, stake)` | An agent stakes USDC to join. Agent auth required |
| `open(user_wallet, agent, token, amount, code_hash, deadline_ledger)` | Locks funds for a cash-out. The wallet must authorise |
| `release(escrow_id, code)` | Agent submits the one-time code; if it hashes to `code_hash`, funds are paid to the agent. Agent auth required |
| `refund(escrow_id)` | Returns funds to the user after `deadline_ledger` if not released |
| `open_dispute(escrow_id, evidence_hash)` | User flags a problem within the dispute window |
| `resolve_dispute(escrow_id, outcome)` | Arbiter set resolves, and may slash agent stake |
| `withdraw_stake(agent, amount)` | Agent withdraws stake not tied to open escrows |
| `get_escrow(escrow_id) -> Option<Escrow>` | Read-only |
| `get_agent(agent) -> Option<AgentInfo>` | Read-only |
| `pause()` / `unpause()` | Emergency stop. Admin auth required |

#### Enforced Invariants and Test Mapping
Each invariant below is a design target and will be covered by the named tests.

**StardialWallet**

- **Per-transaction cap**: a relay transfer above `per_tx_cap` is rejected (`ExceedsPerTxCap`). Test: `contracts/stardial-wallet/src/test.rs -> test_transfer_above_cap_fails`, `test_transfer_at_cap_succeeds`
- **Daily cap**: cumulative relay transfers in a rolling window cannot exceed `daily_cap` (`ExceedsDailyCap`). Test: `test_daily_cap_across_multiple_transfers_fails`, `test_daily_cap_resets_after_window`
- **New-recipient cool-down**: a recipient not yet trusted cannot receive funds until `new_recipient_delay_ledgers` pass (`RecipientCoolingDown`). Test: `test_new_recipient_blocked_before_delay`, `test_trusted_recipient_skips_delay`
- **Freeze wins**: once frozen, no relay or owner transfer succeeds (`WalletFrozen`). Test: `test_transfer_when_frozen_fails`, `test_guardian_can_freeze`, `test_guardian_cannot_unfreeze`
- **Tighten now, loosen later**: reducing limits is immediate; raising them requires the timelock (`TimelockNotExpired`). Test: `test_tighten_policy_immediate`, `test_loosen_policy_requires_timelock`
- **PIN lockout persists**: after N failed attempts the wallet refuses relay transfers until reset (`PinLocked`). Test: `test_pin_lockout_after_failures`, `test_pin_lock_survives_gateway_restart`
- **Replay protection**: every transfer requires the current nonce (`InvalidNonce`). Test: `test_replay_with_old_nonce_fails`
- **Savings pockets**: locked funds cannot be spent before `unlock_ledger` (`PocketLocked`). Test: `test_spend_from_locked_pocket_fails`, `test_unlock_at_boundary_succeeds`
- **Recovery needs threshold and delay**: a single guardian cannot take over a wallet (`RecoveryThresholdNotMet`, `TimelockNotExpired`). Test: `test_single_guardian_cannot_recover`, `test_owner_can_cancel_recovery`
- **Owner-only configuration**: policy, relay key, and guardian changes require owner auth (`Unauthorized`). Test: `test_set_policy_requires_owner`, `test_rotate_relay_requires_owner`

**AgentEscrow**

- **Code-gated release**: funds are released only for the correct code (`InvalidCode`). Test: `test_release_with_wrong_code_fails`, `test_release_with_correct_code_succeeds`
- **No double release**: an escrow can be released or refunded once (`AlreadySettled`). Test: `test_double_release_fails`, `test_refund_after_release_fails`
- **Deadline refund**: after the deadline the user can always reclaim funds (`DeadlineNotReached` before it). Test: `test_refund_before_deadline_fails`, `test_refund_after_deadline_succeeds`
- **Stake-backed agents**: an agent cannot take an escrow above their available stake multiple (`InsufficientStake`). Test: `test_open_above_agent_capacity_fails`
- **Dispute window**: disputes only within `dispute_window_ledgers` (`DisputeWindowClosed`). Test: `test_dispute_after_window_fails`
- **Pausable**: operations halt when paused (`Paused`). Test: `test_open_when_paused_fails`, `test_release_when_paused_fails`

**PhoneRegistry**

- **Verifier-only registration**: only an allowlisted verifier can bind a number (`Unauthorized`). Test: `test_register_requires_verifier`
- **Rebind cool-down**: a number cannot be moved to a new wallet until the SIM-swap delay passes (`RebindCoolingDown`). Test: `test_rebind_during_cooldown_fails`
- **Claims expire safely**: unclaimed funds return to the sender after expiry (`ClaimNotExpired` before it). Test: `test_refund_unexpired_claim_fails`, `test_refund_expired_claim_succeeds`

### Events

| Event | Topics | Data |
|---|---|---|
| `TransferEvent` | `("transfer_event", wallet)` | `to`, `token`, `amount`, `spent_today`, `ledger` |
| `PolicyUpdatedEvent` | `("policy_updated_event", wallet)` | `per_tx_cap`, `daily_cap`, `new_recipient_delay`, `pending` |
| `FreezeEvent` | `("freeze_event", wallet)` | `by`, `ledger` |
| `RelayKeyChangedEvent` | `("relay_key_changed_event", wallet)` | `revoked`, `ledger` |
| `RecoveryEvent` | `("recovery_event", wallet)` | `stage`, `new_owner`, `ledger` |
| `PinLockEvent` | `("pin_lock_event", wallet)` | `attempts`, `ledger` |
| `PhoneBoundEvent` | `("phone_bound_event", phone_hash)` | `wallet`, `ledger` |
| `ClaimEvent` | `("claim_event", claim_id)` | `phone_hash`, `amount`, `state` |
| `EscrowOpenedEvent` | `("escrow_opened_event", escrow_id)` | `wallet`, `agent`, `amount`, `deadline_ledger` |
| `EscrowSettledEvent` | `("escrow_settled_event", escrow_id)` | `outcome` (released / refunded / disputed), `ledger` |
| `AgentStakeEvent` | `("agent_stake_event", agent)` | `amount`, `action` |

Indexers should key escrow events on `escrow_id` and wallet events on the wallet address.

### Error Codes
Every contract returns errors from a single shared enum in `contracts/common`. Codes are stable: new variants are appended with fresh values and never renumbered.

| Code | Variant | Meaning |
|---|---|---|
| 1 | `AlreadyInitialized` | Initialisation attempted twice |
| 2 | `NotInitialized` | Call made before initialisation |
| 3 | `Unauthorized` | Caller lacks the required authority |
| 4 | `Paused` | Contract is paused |
| 5 | `InvalidAmount` | Amount was not strictly positive |
| 6 | `InvalidNonce` | Replay-protection nonce did not match |
| 100 | `ExceedsPerTxCap` | Transfer above the per-transaction cap |
| 101 | `ExceedsDailyCap` | Transfer would exceed the daily cap |
| 102 | `RecipientCoolingDown` | New recipient has not passed the cool-down |
| 103 | `WalletFrozen` | Wallet is frozen |
| 104 | `PinLocked` | Too many failed PIN attempts |
| 105 | `PocketLocked` | Savings pocket not yet unlocked |
| 106 | `InsufficientBalance` | Wallet balance too low |
| 107 | `TimelockNotExpired` | Pending change is still in its timelock |
| 108 | `RecoveryThresholdNotMet` | Not enough guardians approved recovery |
| 200 | `InvalidCode` | Cash Code did not match |
| 201 | `AlreadySettled` | Escrow already released or refunded |
| 202 | `DeadlineNotReached` | Refund attempted before the deadline |
| 203 | `InsufficientStake` | Agent stake too low for this escrow |
| 204 | `DisputeWindowClosed` | Dispute opened after the window |
| 205 | `AgentNotRegistered` | Agent has not staked |
| 300 | `PhoneAlreadyBound` | Phone hash is already registered |
| 301 | `RebindCoolingDown` | SIM-swap delay has not passed |
| 302 | `ClaimNotFound` | No such pending claim |
| 303 | `ClaimNotExpired` | Claim refund attempted too early |

### Storage and TTL
Soroban archives ledger entries that are not kept alive. Wallet state, escrows, and claims use a TTL strategy that keeps active records in persistent storage for about 30 days (~518,400 ledgers). Anyone can call `extend_ttl()` on a wallet, and the gateway does so on every user action, so a wallet that is used never expires.

### Amount Semantics
All amounts are integer token base units (`i128`). No floating-point arithmetic is used.

| Unit | Base units |
|---|---|
| 1 stroop (smallest) | 1 |
| 1 token (USDC or XLM) | 10_000_000 |
| 5 USDC | 50_000_000 |

Display conversion to naira or other local currencies is done in the gateway for readability only. The contracts never see a fiat rate.

Ledger-denominated settings (cool-downs, deadlines, windows) are in Stellar ledgers, roughly 5 seconds each. For example, a 24-hour cool-down is about 17,280 ledgers.

---

### @stardial/gateway
The USSD and SMS engine. Handles telecom sessions, PIN verification, the relay signer, and the offline-first queue.

```
packages/gateway/
├── src/
│   ├── ussd/
│   │   ├── session.ts        # Session state, timeouts, resume
│   │   ├── menus.ts          # Menu tree and screen text
│   │   └── router.ts
│   ├── sms/
│   │   ├── inbound.ts        # Command parsing for SMS
│   │   └── outbound.ts       # Receipts, Cash Codes, alerts
│   ├── providers/            # Telecom aggregator adapters (swappable)
│   ├── pin.ts                # Salted PIN verification and lockout reporting
│   ├── relay.ts              # Builds and signs relay transactions
│   ├── queue.ts              # Offline-first retry queue
│   ├── fx.ts                 # Display-only local currency conversion
│   └── metrics.ts            # Prometheus exporter
├── Dockerfile
└── package.json
```
**Stack:** TypeScript, @stellar/stellar-sdk, Redis, PostgreSQL, Docker, Prometheus

### @stardial/assist
The AI layer. Takes a user message and returns a structured intent, a language tag, and a risk score.

```
packages/assist/
├── src/
│   ├── intent.ts         # Message -> { action, amount, recipient }
│   ├── languages/        # English, Pidgin, Hausa, Yoruba, Igbo packs
│   ├── scam.ts           # Pattern and anomaly checks
│   ├── agents.ts         # Agent matching by location and liquidity
│   └── support.ts        # Plain-language explanations
├── prompts/
├── evals/                # Test messages in each language
└── package.json
```
**Stack:** TypeScript, LLM API. Phone numbers and PINs are never sent to a model.

### @stardial/agent
A mobile-first PWA for cash agents: confirm a deposit, check a Cash Code, see float and stake, and manage disputes.

| Route | Description |
|---|---|
| `/` | Float, stake, and open escrows |
| `/cash-in` | Record a cash deposit and credit the user |
| `/cash-out` | Enter the Cash Code to release an escrow |
| `/disputes` | Open disputes and evidence |
| `/stake` | Add or withdraw stake |

**Stack:** Next.js 14, TailwindCSS, @stellar/stellar-sdk, Freighter / LOBSTR / xBull wallet support

### @stardial/api
```
GET   /v1/wallets/:phone_hash              Wallet status (frozen, limits, balance)
GET   /v1/wallets/:address/history         Transfer history
GET   /v1/agents?lat=&lng=&radius=         Nearby agents
GET   /v1/agents/:address                  Stake, ratings, dispute record
GET   /v1/escrows/:id                      Escrow status
POST  /v1/webhooks/ussd                    Telecom USSD callback
POST  /v1/webhooks/sms                     Telecom SMS callback
POST  /v1/assist/intent                    Parse a message (authenticated)
```
**Stack:** Node.js, Fastify, PostgreSQL, Redis, @stellar/stellar-sdk

### @stardial/sdk
```ts
import { Stardial } from "@stardial/sdk";

const sd = new Stardial({ network: "testnet" });
const wallet = await sd.wallet.get(phoneHash);
await sd.wallet.freeze(wallet.address);        // owner or guardian
const escrow = await sd.escrow.get(escrowId);
```

### @stardial/web
Landing page, documentation, a live network status page, and a browser-based **simulator** so reviewers can try the USSD flow without a telecom account.

---

## Why Stellar?

- **Sub-cent fees.** USSD users send small amounts. On most chains the fee would exceed the payment.
- **Native USDC.** Users save and spend in a stable asset without a bridge.
- **Fast finality.** A transfer settles in about 5 seconds, which fits a USSD session that times out in around 90.
- **Soroban smart accounts.** Spending limits, freezes, and social recovery are enforced by contract, not by a company.
- **Predictable fees.** Cost per transfer is known in advance, so the gateway can budget fees per user.

---

## Threat Model and Honest Limits

Feature-phone wallets have different risks from app wallets. Stardial is designed around them.

| Risk | Mitigation |
|---|---|
| **SIM swap** (attacker takes over a phone number) | `PhoneRegistry.rebind` has a long cool-down, the old number's wallet can be frozen by a guardian, and new-recipient cool-downs limit the first hours of damage |
| **Stolen phone** | PIN required for every transaction, lockout after repeated failures stored on-chain |
| **Compromised gateway key** | The relay key can only act within the on-chain policy, and the owner or a guardian can revoke it instantly |
| **Malicious or lazy agent** | Cash Code escrow, agent stake, deadline refund, and a dispute process |
| **Phone-number privacy** | Only a keyed hash is stored on-chain, never the number |
| **AI mistakes** | The AI cannot sign. Every request needs PIN confirmation and passes contract limits |
| **Eavesdropping on SMS** | Cash Codes are single-use and expire. Large transfers can require an additional confirmation |

Known limits:
- A feature-phone wallet cannot be fully non-custodial, because the user has no secure place to hold a private key. Stardial limits the damage through on-chain policy, but users who want full control should link a passkey or smartphone as owner.
- USSD and SMS are not encrypted end to end, which is why limits and cool-downs matter.
- Telecom partnerships, local regulation, and KYC requirements vary by country and are handled per deployment. Tiered limits are supported but compliance is the operator's responsibility.

Full details are in `docs/SECURITY_MODEL.md`.

---

## Getting Started

### Prerequisites
- Node.js 20 or later
- pnpm 9 or later
- Rust stable and the Stellar CLI
- A funded Stellar Testnet account (`stellar keys generate --fund`)
- Optional: LLM API key for `@stardial/assist`
- Optional: a telecom aggregator sandbox account (not needed for the local simulator)

```bash
rustup target add wasm32v1-none
cargo install --locked stellar-cli
```

### Install
```bash
git clone https://github.com/your-org/stardial.git
cd stardial
pnpm install
cp .env.example .env     # add Stellar keys, PIN pepper, phone-hash pepper
```

### Try it with the local simulator
```bash
pnpm --filter @stardial/gateway dev
pnpm --filter @stardial/web dev      # open the simulator at /simulator
```

### Run in development
```bash
pnpm dev                                   # everything via Turborepo
pnpm --filter @stardial/agent dev          # agent app only
pnpm --filter @stardial/api dev            # API only
```

### Test
```bash
cd packages/contracts && cargo test
pnpm turbo test
pnpm turbo lint
```

### Deploy contracts to Testnet
```bash
cd packages/contracts
stellar contract build
bash ../../scripts/deploy_testnet.sh
```

---

## Live on Testnet

| Contract | ID |
|---|---|
| PhoneRegistry | *to be deployed* |
| WalletFactory | *to be deployed* |
| AgentEscrow | *to be deployed* |

Wallets are deployed per user through `WalletFactory`, so there is no single wallet address.

---

## Roadmap

| Phase | Milestone |
|---|---|
| 1 | `StardialWallet` and `WalletFactory` contracts on Testnet, local USSD simulator, balance and send flows |
| 2 | `PhoneRegistry`, SMS receipts, pending claims for recipients without wallets |
| 3 | `AgentEscrow`, Cash Code flow, agent PWA |
| 4 | Stardial Assist (intent parsing in five languages, scam warnings) |
| 5 | Guardians and social recovery, savings pockets, first telecom pilot, security audit, Mainnet launch |

---

## Planned Issues for Contributors

Stardial is built to give contributors scoped, well-defined work every sprint.

| Type | Examples |
|---|---|
| **Smart contracts** | Tests for each invariant above, policy timelock edge cases, recovery threshold logic, storage and fee optimisation |
| **Bug fixes** | USSD session resume after a timeout, SMS parsing edge cases, nonce handling under retries |
| **New features** | New telecom provider adapters, savings pockets UI, agent rating system, multi-currency display |
| **AI and languages** | Add test messages and prompts for a new language, scam-pattern rules, evaluation harness for intent parsing |
| **Testing** | Simulator end-to-end tests, load tests for the gateway queue, fuzzing the SMS command parser |
| **Documentation** | USSD menu spec, security model, agent onboarding guide, API reference |
| **Good first issues** | Typos, screen-text tightening to fit USSD limits, README examples, new simulator scenarios |

Every issue has a description, acceptance criteria, and a pointer to the relevant files.

---

## Security

- Contract audit: pending, with reports to be published in `audits/`
- PINs are never stored on-chain and never sent to an AI model
- Phone numbers are stored on-chain only as keyed hashes
- Relay keys are scoped by on-chain policy and can be revoked by the owner or a guardian
- Responsible disclosure: `security@your-domain.example`

---

## Contributing

```bash
git checkout -b feat/your-feature
pnpm turbo test
pnpm turbo lint
# open a PR against main
```
See `CONTRIBUTING.md`, `docs/architecture.md`, and `docs/SECURITY_MODEL.md`.

---

## License

MIT, 2026 Stardial Contributors

---

*Built on Stellar. Powered by Soroban. Money for every phone.*