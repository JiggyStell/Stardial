# Stardial Contractor Agreement Terms

This document defines the baseline terms Stardial expects in contractor agreements.
It covers quality standards, acceptance and sign-off, payment, security obligations,
data protection, subcontractor management, confidentiality duration, and ongoing
service levels.
Individual contracts may add stricter terms, but should not weaken the ones below.

## 1. Quality Standards

Every deliverable must state its acceptance criteria before work starts. A
deliverable is only complete when all of the following hold:

| Area          | Measurable standard                                                    |
| ------------- | ---------------------------------------------------------------------- |
| Functionality | All acceptance criteria in the statement of work pass                  |
| Tests         | New or changed behaviour is covered by automated tests that pass in CI |
| Review        | The pull request is approved by a Stardial reviewer                    |
| Documentation | User-facing behaviour changes are reflected in the `docs/` folder      |
| Style         | Existing lint, format, and repository conventions are followed         |
| Security      | No new high or critical findings from dependency or secret scanning    |

The ongoing service targets in section 7 apply whenever the statement of work
includes operating or supporting a production service. Other numeric targets
(such as test coverage) must be listed explicitly in the statement of work.

## 2. Review, Acceptance, and Sign-Off

1. The contractor submits the deliverable as a pull request or shared artifact
   with a short summary of what changed and how it was verified.
2. The Stardial reviewer acknowledges the submission within **2 business days**
   and either approves it or returns written comments.
3. The contractor has **5 business days** to respond to review comments. Silence
   from the reviewer past the acknowledgement window counts as a request for an
   update, not an approval.
4. Sign-off is complete when the reviewer records approval in writing (a GitHub
   approval, or an email confirming acceptance). Informal comments such as
   "looks fine" in chat are not sign-off.
5. If the reviewer raises blocking comments, the contractor gets **2 rework
   cycles** at no extra cost. A third cycle, or a scope change, requires a
   written change order with revised effort and dates.
6. If no sign-off decision is made within **10 business days** of a complete
   submission, the deliverable is deemed accepted and may be invoiced.

## 3. Security Obligations

The contractor must:

- Follow secure development practices: no secrets or credentials in code or
  logs, input validation on all external data, and dependency updates for
  known vulnerabilities.
- Keep access to Stardial systems limited to what the work requires, use
  individual accounts (never shared logins), and enable multi-factor
  authentication wherever available.
- Revoke all access within **5 business days** of the engagement ending or on
  request.
- Report any suspected security incident, data exposure, or leaked credential
  to the Stardial maintainers within **24 hours** of discovery, and cooperate
  with containment and remediation.
- Not copy, retain, or reuse Stardial data or code outside the engagement
  without written permission.

Stardial may audit access and repository activity related to the engagement.

## 4. Subcontractors

- The contractor remains fully responsible to Stardial for all work performed
  by a subcontractor.
- Subcontractors must be disclosed in writing before they start work, and must
  accept the security and confidentiality terms in this document (flow-down
  obligations).
- The contractor must oversee subcontractor output, review it before submission,
  and ensure it meets the quality standards in section 1.
- If a subcontractor fails to deliver or introduces a defect, the contractor
  must provide a remediation plan within **5 business days** and fix the issue
  at no additional cost to Stardial.
- Stardial may object to a subcontractor for security or conflict-of-interest
  reasons, and the contractor must replace them.

## 5. Data Protection

This section applies whenever the contractor can access, store, transmit, or
otherwise process personal data in the course of the engagement, including
testing, debugging, and support. It operates alongside section 3 (Security
Obligations); if the two overlap, the stricter requirement applies. The
statement of work must record any additional processing instructions, the
duration and purpose of processing, and the categories of personal data and
data subjects involved before work starts.

### 5.1 Definitions and roles

- **Personal data** means any information relating to an identified or
  identifiable individual, including a name, email address, IP address, account
  identifier, or wallet address that can be linked to a person.
- **Sensitive data** means special-category data such as health, biometric,
  genetic, political, religious, or financial-account data, and any data a
  reasonable person would treat as highly sensitive.
- **Processing** means any operation performed on personal data, including
  collection, storage, use, disclosure, transfer, and deletion.
- **Data subject** means the individual the personal data relates to.
- For personal data the contractor processes on Stardial's behalf, Stardial is
  the **controller** and the contractor is the **processor**. Where the
  contractor determines the purpose and means of processing, the contractor is
  a controller for that processing and is responsible for its own compliance.

The categories of personal data Stardial processes, their purposes, legal
bases, and default retention periods are listed in
[`PERSONAL_DATA_INVENTORY.md`](./PERSONAL_DATA_INVENTORY.md). The contractor must
not process personal data outside those purposes without written approval.

### 5.2 Scope and permitted processing

- The contractor processes personal data only as necessary to perform the
  statement of work, only on Stardial's documented instructions, and only for
  the duration of the engagement.
- The contractor must not sell, rent, share, or use personal data for its own
  purposes, marketing, profiling, or training models, and must not combine it
  with data from other clients.
- The contractor must not introduce new categories of personal data, new
  processing purposes, or new systems that hold personal data without Stardial's
  prior written approval and, where required, a change order.
- Sensitive data must not be processed under this engagement unless the
  statement of work expressly permits it and the parties record the additional
  safeguards and legal basis. Stardial does not expect contractors to process
  sensitive data in the ordinary course.

### 5.3 Contractor obligations

- **Lawful basis and transparency.** The contractor must not do anything that
  would undermine the legal basis recorded in the personal data inventory or
  that would require a new privacy notice.
- **Data minimisation and accuracy.** Collect only the personal data needed for
  the task, keep it accurate for its purpose, and use pseudonymised or synthetic
  data wherever the task allows.
- **Purpose limitation.** Do not repurpose data collected for one task for
  another, and do not copy production data into local environments, notebooks,
  or third-party tools.
- **Storage limitation.** Keep personal data only for the period stated in the
  statement of work or this document, whichever is shorter, and delete it when
  the purpose is met.
- **Confidentiality.** Limit access to personnel and subcontractors who need it
  for the engagement, bind them to confidentiality and data-protection terms at
  least as strict as these, and keep a record of who has access.
- **Access control.** Use individual accounts, least-privilege roles, and
  multi-factor authentication. Do not share credentials or use production
  credentials outside production.
- **Training and awareness.** Ensure personnel handling personal data understand
  these obligations and report suspected incidents promptly.
- **Compliance with law.** Comply with the Nigeria Data Protection Act 2023 and
  the NDPR, and with any other data-protection law that applies to the
  contractor's processing, including the GDPR where relevant.

### 5.4 Security expectations

At a minimum, the contractor must apply the following technical and
organisational measures, and any stricter measure the parties agree:

| Area                    | Requirement                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Encryption in transit   | Encrypt personal data using current TLS versions; never send personal data over unencrypted channels                                                                            |
| Encryption at rest      | Encrypt devices, backups, and any store holding personal data, consistent with Stardial's AES-256-GCM approach for sensitive fields                                             |
| Credentials and secrets | Keep secrets out of code, logs, screenshots, tickets, and prompts; use a secret manager where available and rotate any credential that may have been exposed                    |
| Logging and telemetry   | Do not log personal data; rely on Stardial's existing redaction (hashed IPs, wallet-address scrubbing) and never disable it without written approval                            |
| Test and development    | Use synthetic or anonymised data; if production data is unavoidable, obtain written approval, minimise it, and delete it as soon as the task ends                               |
| Device and network      | Keep devices patched, use full-disk encryption, screen locks, and a trusted network; do not store personal data on removable media                                              |
| Vulnerability handling  | Patch known critical and high vulnerabilities in contractor-controlled systems within **14 calendar days** of a fix being available, and report unresolved exposure to Stardial |
| Disposal                | Delete or securely wipe personal data and decommission storage so it cannot be recovered, and confirm destruction in writing on request                                         |

### 5.5 Retention, return, and deletion

- On request, and in any event within **10 business days** of the engagement
  ending, the contractor must return all personal data and work product to
  Stardial and delete every copy it holds, including backups, caches, and local
  copies, and confirm deletion in writing.
- One archival copy may be retained only where a law requires it or for
  defending legal claims, for no longer than that purpose requires, and subject
  to these terms.
- The contractor must follow the deletion and anonymisation rules in
  [`data-deletion-and-account-closure.md`](./data-deletion-and-account-closure.md).
  In particular, do not delete or alter financial records, audit records, or
  on-chain data: audit logs follow the retention in
  [`audit-log-retention.md`](./audit-log-retention.md), transaction records are
  retained for reconciliation, and Stellar/Soroban state is immutable and
  outside either party's control.
- Deletion of personal data does not remove obligations that survive under this
  document or under law.

### 5.6 International transfers

- Stardial data stays in the systems and region Stardial designates. The
  contractor must not transfer personal data to another country, provider, or
  region without Stardial's prior written approval.
- Where a transfer is approved, the contractor must use a lawful transfer
  mechanism (such as an adequacy decision, standard contractual clauses, or
  another approved safeguard), keep the data within the approved location, and
  notify Stardial of any change in subprocessor or hosting location.
- The contractor remains responsible for personal data transferred to its
  subcontractors and must ensure equivalent protection flows down to them.
- Where local law compels disclosure of personal data to a public authority,
  the contractor must, unless legally prohibited, notify Stardial before
  disclosing and disclose only the minimum required.

### 5.7 Subcontractors and subprocessors

Section 4 applies to subcontractors generally. Any subcontractor that processes
personal data must additionally be disclosed in writing before access is
granted, be bound by written terms at least as protective as this section, and
be listed in the statement of work or an approved subprocessor list. The
contractor remains fully liable to Stardial for its subcontractors' processing.

### 5.8 Data subject requests

If a data subject contacts the contractor about access, correction, deletion,
portability, or objection, the contractor must forward the request to the
Stardial maintainers within **5 business days**, must not respond substantively
unless instructed, and must assist Stardial in meeting the applicable deadline
at no additional charge. The support process in
[`data-deletion-and-account-closure.md`](./data-deletion-and-account-closure.md)
governs account closure and erasure requests.

### 5.9 Personal data breach notification

- **Discovery and initial notice.** The contractor must notify the Stardial
  maintainers **without undue delay and in any event within 24 hours** of
  discovering a personal data breach. This is the same deadline as the security
  reporting in section 3 and applies even where the breach is suspected rather
  than confirmed. Notification must be made by email to the contract contact
  and, where one is named, the security contact, and must not wait for a full
  investigation.
- **Content of the notice.** State what happened, when it was discovered, the
  categories and approximate volume of data and data subjects affected, the
  likely consequences, the containment steps taken, and the contact leading the
  response. If details are unknown, provide what is available and update it as
  the investigation progresses.
- **Containment and cooperation.** Immediately contain the breach, preserve
  evidence, cooperate with Stardial's investigation and remediation, and follow
  reasonable instructions. Do not delete logs or other evidence relating to the
  breach.
- **No independent notification.** Do not notify regulators, data subjects,
  affected customers, or the public about a breach affecting Stardial data
  unless Stardial instructs it or a law requires it. Where a law requires
  notification, tell Stardial first where lawful.
- **Records and follow-up.** Record the breach, its timeline, affected data,
  decisions, and remedial actions, and provide a written post-incident report
  with root-cause analysis and corrective actions within **5 business days** of
  containment. Corrective work is at no additional charge.
- **Costs.** The contractor bears the reasonable costs of containment,
  notification, credit monitoring, and remediation for a breach caused by its
  acts or omissions, without prejudice to the liability terms in
  [`contractor-terms-breach-and-exit.md`](./contractor-terms-breach-and-exit.md).

### 5.10 Audit, records, and compliance

- The contractor must keep records of its processing, access grants, subprocessors,
  and security measures sufficient to demonstrate compliance with this section,
  and provide them to Stardial on request within **10 business days**.
- Stardial may audit or request an independent assessment of the contractor's
  handling of Stardial personal data on reasonable notice, and the contractor
  must cooperate. Audits must not unreasonably disrupt the engagement.
- The contractor must tell Stardial within **2 business days** if it can no
  longer meet these obligations, if a law prevents it from following an
  instruction, or if an instruction would breach applicable data-protection
  law.

### 5.11 Survival and priority

This section survives termination or expiry of the engagement for as long as the
contractor holds Stardial personal data. If a statement of work, subcontract, or
other term conflicts with this section, the stricter protection for personal
data applies.

## 6. Confidentiality Duration

- Confidential information disclosed under an engagement remains protected for
  **5 years** after the date of disclosure, regardless of when the engagement
  ends.
- Trade secrets and personal data remain protected for as long as they qualify as
  trade secrets or must be protected under applicable data protection law, even
  if that is longer than 5 years.
- The confidentiality obligation survives termination or expiry of the
  engagement and binds permitted subcontractors for the same period.
- On exit, the contractor returns or destroys confidential material within
  **10 business days** on request, except for one archival copy retained solely
  to meet legal or audit obligations.

## 7. Ongoing Service Levels

### Scope and responsibilities

These commitments apply during the ongoing-service term recorded in the statement
of work, starting at production handover. They do not create an ongoing support
obligation for a development-only engagement. Before handover, the parties must
record the covered services and critical user operations, service term, monthly
service fee for each service, monitoring locations and access, support channel,
and primary and escalation contacts in the statement of work. Missing entries
must be resolved before handover; they do not waive the targets below.

The contractor owns monitoring, incident triage, recovery, status updates, and
maintenance for covered services, including coordinating with its subcontractors
and hosting providers. Stardial supplies agreed access and reports incidents
through the recorded support channel. A change to scope, fees, or coverage
requires a written change order agreed by both parties; stricter targets may be
agreed, but these baseline commitments cannot be reduced unilaterally.

### Availability and response time

| Measure               | Minimum commitment                                                            | Measurement                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Availability          | **99.9%** per covered service per calendar month, 24 hours a day              | Successful synthetic checks of each agreed critical operation at least once per minute from two independent locations |
| Service response time | **95%** of eligible requests complete within **2 seconds** per calendar month | Server-side elapsed time from request receipt to completion, including contractor-controlled dependencies             |

A service is unavailable when either monitoring location shows a covered critical
operation failing, returning an incorrect result, or exceeding its agreed timeout
(**10 seconds** by default). Count downtime from the first failed check through
the first subsequent successful checks of all critical operations at both
locations. Corroborated incident logs or customer reports also count; a healthy
process alone is not proof that an operation works. Overlapping failures count
once per service.

Availability is `100 × (eligible minutes − unavailable minutes) / eligible minutes`.
Eligible minutes are the minutes in the active service term within the UTC
calendar month, less permitted exclusions. Calculate without rounding before
comparing with the target. For example, 60 unavailable minutes in a 30-day month
with no exclusions gives **99.8611%**, missing the 99.9% target.

Response-time measurement includes all valid requests to covered operations,
including failures and timeouts; these count as exceeding the target. Exclude
malformed or unauthorised requests and requests over agreed rate limits. External
ledger confirmation is measured separately from API acknowledgement and must not
be represented as completed settlement. The statement of work must name any
operation requiring a separate end-to-end completion target before handover.

Planned maintenance is excluded only with **48 hours' notice**, Stardial's written
approval of the window, and a maximum of **4 hours per month**; overruns count as
downtime. Emergency maintenance counts as downtime. A failure caused solely by
Stardial or an external network outside the contractor's control may be excluded
only for the evidenced affected duration and operations. Contractor-selected
hosting, subcontractor failures, and failures of agreed retry or failover measures
are not excluded. The contractor must document each exclusion in the report;
support and communication obligations continue during excluded events.

The contractor retains timestamped checks, request timing records, and incident
records for **90 days** and gives Stardial read access. Monitoring gaps cannot be
treated as successful operation: reconstruct them from verifiable records or
count the unverified interval as downtime. Report a response-time period with no
eligible requests as "no traffic", not as a measured pass. A month with no
eligible minutes is "not applicable" for availability.

### Support and escalation

The table below covers general service support. For payout incidents, the
[Payout Failure Severity Matrix](../runbooks/payout-failure-severity-matrix.md)
governs classification (including P0), escalation, and any shorter response or
resolution deadline. The statement of work must record the applicable runbook
version at handover; later contractual changes require a written change order.
Where both sets of commitments apply, meet the earlier deadline. Misses against
these applicable deadlines count toward the incident credits below. Payout P0
incidents also require the root-cause analysis specified below for P1 incidents.

Business hours are **09:00–17:00 UTC, Monday–Friday**, excluding holidays listed in
the statement of work before the service term starts. A business day is eight
such hours. For general support, P1 clocks run continuously; P2 and P3 clocks
count business hours only. Payout P0–P2 response and resolution clocks run
continuously; payout P3 clocks count business hours.
Clocks start at the earlier of monitoring detection or receipt through the
recorded support channel. An automated acknowledgement is not a human response.

| Priority      | Impact                                                                                           | Human response       | Restore service or provide a usable workaround       | Updates until restoration |
| ------------- | ------------------------------------------------------------------------------------------------ | -------------------- | ---------------------------------------------------- | ------------------------- |
| P1 — Critical | Service unavailable, funds or data at risk, or a critical operation blocked without a workaround | **30 minutes**, 24/7 | **4 hours**, 24/7                                    | Every **hour**            |
| P2 — High     | Material degradation or a critical operation impaired with a workaround                          | **4 business hours** | **2 business days**                                  | Every **business day**    |
| P3 — Normal   | Minor defect or support request without material service disruption                              | **1 business day**   | Fix or agreed action plan within **5 business days** | Every **2 business days** |

The contractor acknowledges impact, assigns an owner, and provides the next update
time in its response. A workaround must restore the affected operation safely;
closing a ticket alone does not stop the restoration clock. The contractor must
escalate any missed response or restoration deadline to both nominated escalation
contacts immediately and continue working and providing updates. Priority may be
lowered only with Stardial's written agreement. Security reporting under section 3
still applies; it does not extend the shorter P1 deadline.

### Reporting and remedies

Within **5 business days** after each month, the contractor supplies availability
calculations, response-time results, incident timelines, missed support targets,
exclusions with evidence, and credits due for each covered service. For each P1
incident or missed target, provide a root-cause analysis and corrective action
plan with owners and dates within **5 business days** of restoration or discovery
of the miss, whichever applies. Corrective work is at no additional charge.

| Monthly availability for a covered service | Credit against that service's monthly fee |
| ------------------------------------------ | ----------------------------------------- |
| At least 99.9%                             | 0%                                        |
| At least 99.0% but below 99.9%             | 5%                                        |
| At least 95.0% but below 99.0%             | 10%                                       |
| Below 95.0%                                | 20%                                       |

Missing the monthly response-time target adds **5%**. Each incident with one or
more missed human-response, restoration/action-plan, or update deadlines adds
**5%**, counted once per incident. These credits add to the availability credit,
up to **25% of the affected service's fee for that month**; for a partial month,
use the prorated fee. Credits are automatic, require no claim, and appear on the
next invoice. If no further invoice is due, refund them within **30 calendar
days** of the monthly report's due date. A zero-fee service still requires
remediation and remains subject to the repeated-failure process below.

A missed target in **two consecutive months**, or **three months in any rolling
six-month period**, constitutes a material breach. Notice, the **10-business-day**
cure period, and termination for an uncured breach follow
[Breach Notification and Cure](./contractor-terms-breach-and-exit.md#2-breach-notification-and-cure).
Cure requires implementing the corrective actions and supplying evidence that
the affected operations meet their targets; it does not erase accrued credits.
For ongoing services, the cure-period pause in that document applies to affected
deliverable deadlines only: availability measurement, monitoring, support,
incident updates, and service-credit accrual continue throughout the cure period.
Service credits do not replace those breach rights or the existing liability
limits. Disputes about measurements or credits follow the dispute process linked
below; undisputed credits and service obligations remain due.

## 8. Fees, Invoicing, and Payment

The parties must sign a statement of work before work starts. It must state the
payment currency and either:

- for fixed-price work, the total fee and each milestone's amount, deliverables,
  acceptance criteria, and invoice trigger; milestone amounts must add up to the
  total fee; or
- for time-and-materials work, each hourly or daily rate, the billing increment,
  the applicable not-to-exceed budget, and who approves time records.

The statement of work must also list any recurring service fee, billing cycle,
and any approved reimbursable expenses. Rates and budgets include all costs other
than taxes explicitly chargeable under section 2 of
[`Contractor Terms: Scope, Compliance, Disputes, and Exit`](./contractor-terms-commercial-and-legal.md).
No work or expense outside the signed statement of work is payable without a
written change order approved by both parties.

- Fixed-price milestone work may be invoiced when that milestone is accepted
  under section 2. Time-and-materials work and recurring services are invoiced
  monthly in arrears, within **5 business days** after month-end, with an
  itemised statement of work completed and approved time records where
  applicable.
- A correct, undisputed invoice is due **30 calendar days** after Stardial
  receives it. An invoice must identify the engagement and billing period,
  describe the work or milestone, show the agreed rates and amounts, state any
  applicable tax separately, and include the contractor's payment details and
  required tax invoice.
- Stardial must notify the contractor in writing of any disputed amount within
  **10 business days** of receipt, explaining the reason. The parties will work
  promptly to resolve it. Stardial pays the undisputed portion by the original
  due date; a corrected invoice for an agreed adjustment is due **30 calendar
  days** after receipt.
- Interest accrues only on an overdue, undisputed amount, from the day after its
  due date, at **1% per month simple interest** or the maximum rate permitted by
  law, whichever is lower. The contractor may suspend work for an overdue,
  undisputed amount only after giving **5 business days' written notice** and an
  opportunity to pay; deadlines extend by the duration of a suspension caused by
  non-payment.
- Stardial pays in the statement-of-work currency, subject only to withholding
  required by law. Any withholding and tax documentation are handled as stated
  in section 2 of
  [`Contractor Terms: Scope, Compliance, Disputes, and Exit`](./contractor-terms-commercial-and-legal.md).

## Questions

Open an issue or contact the maintainers if any term here is unclear or conflicts
with a statement of work. The required staged dispute process, governing law,
arbitration rules, and court venue are set out in
[`contractor-terms-commercial-and-legal.md`](./contractor-terms-commercial-and-legal.md#3-dispute-resolution).
