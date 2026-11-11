# Failed Payout Distribution Round — Incident Checklist

Issue #1074. Use this checklist when a distribution round fails or reports
partial completion.

## 1. Triage
- [ ] Note the split ID, round ID, and timestamp of the failure.
- [ ] Check contract state. There is no per-round status field on-chain: a
      round is identified only by the project's monotonic `distribution_round`
      counter, so reconstruct what happened from `get_project` (balance,
      `locked`, `total_distributed`, `distribution_round`) plus
      `get_claimable(project_id, collaborator)` for each participant.
      - `distribution_round` unchanged and the balance still held: nothing was
        disbursed, the round did not execute.
      - `distribution_round` advanced but a participant has no matching
        payment record / unchanged claimable: partial disbursement — escalate.
      - `is_distributions_paused()` is true: distributions are blocked at the
        contract; follow the pause/unpause steps in
        `docs/runbooks/stuck-payouts.md`.
- [ ] Check Soroban RPC status/health for the network used by the round.
- [ ] Check backend logs for the distribute request that failed: errors
      preparing `POST /splits/:projectId/distribute`, `RPC retries exhausted`
      warnings, and `distributions_paused` 409s. There is no server-side
      distribution job — the backend returns unsigned XDR and the client
      submits it, so submission, fee and sequence failures appear on Horizon
      rather than in these logs.

## 2. Decide: retry or escalate
- [ ] Retry if the failure is a transient RPC/network error and no funds
      were partially disbursed.
- [ ] Escalate to on-call engineering if funds were partially disbursed,
      the contract state is inconsistent, or the same round has already
      failed once.

## 3. User communications
- [ ] If recipients are affected, post a status update per
      `docs/RELEASE_RUNBOOK.md` communication guidelines.
- [ ] Record the incident summary once resolved for postmortem.

## 4. Resolution
- [ ] Confirm the on-chain result matches backend records:
      `distribution_round` and `total_distributed` on `get_project`, the
      `payment_sent` events for the round (`GET /splits/:projectId/history`),
      and the per-recipient payout rows. There is no round status field to
      compare.
- [ ] Link this checklist run in the incident ticket.
