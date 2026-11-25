# Stardial Contractor Agreement Terms

This document defines the baseline terms Stardial expects in contractor agreements.
It covers quality standards, acceptance and sign-off, payment, security obligations,
subcontractor management, confidentiality duration, and ongoing service levels.
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

The ongoing service targets in section 5 apply whenever the statement of work
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

## 5. Confidentiality Duration

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
## 5. Ongoing Service Levels

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

## 6. Fees, Invoicing, and Payment

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

## 7. Renewal and Extension

### 7.1 Initial term

Each engagement runs for the period stated in the statement of work (the
"initial term"). If the statement of work does not state a term, the engagement
continues until all deliverables have been accepted and any post-acceptance
support period has elapsed.

### 7.2 Renewal

An engagement does not renew automatically. If both parties wish to continue
after the initial term they must agree a new or amended statement of work in
writing before the initial term ends. The new statement of work must set a fresh
start date, deliverables, budget, and term.

### 7.3 Notice period for renewal discussions

Either party that wishes to renew should give written notice of its intent at
least **20 business days** before the initial term ends, to allow time for
negotiation. Missing this window does not create an obligation to renew — it
only means less time for negotiation.

### 7.4 Extension

Either party may request an extension of the initial term in writing at least
**10 business days** before the term ends. An extension must state:

- The new end date.
- Any change to deliverables, milestones, or budget.
- Whether rates or fees carry over from the original statement of work.

An extension is effective only when both parties confirm it in writing. A
contractor who continues work after the initial term without a signed extension
does so at their own risk; Stardial is not obliged to pay for work performed
outside the agreed term unless it approves an extension in writing.

### 7.5 Price adjustments on renewal

Unless the new statement of work states otherwise, rates from the previous
engagement carry over into the renewal. Either party may propose revised rates
at least **20 business days** before the renewal start date. If the parties do
not agree revised rates before the renewal start date, the previous rates apply
until the parties agree otherwise or either party terminates under section 8 of
[`contractor-terms-commercial-and-legal.md`](./contractor-terms-commercial-and-legal.md#4-exit-and-transition).

## 8. Confidentiality

### 8.1 Definition of confidential information

"Confidential information" means any non-public information that one party
(the "disclosing party") discloses to the other (the "receiving party") in
connection with the engagement, whether in writing, orally, electronically, or
by inspection, and that:

- is marked or identified as confidential at the time of disclosure; or
- a reasonable person in the receiving party's position would understand to be
  confidential given the nature of the information and the circumstances of
  disclosure.

Confidential information includes, without limitation: business plans, pricing,
financial data, unreleased product features, source code, security
configurations, personal data, customer information, and the terms of any
statement of work.

### 8.2 Exclusions

Information is not confidential to the extent it:

1. is or becomes publicly available without the receiving party's breach;
2. was already known to the receiving party before disclosure without an
   obligation of confidence;
3. is independently developed by the receiving party without use of or reference
   to the disclosing party's confidential information; or
4. is received from a third party who had the right to disclose it without
   restriction.

### 8.3 Permitted use

The receiving party may use confidential information only to perform its
obligations or exercise its rights under the engagement. It must not use
confidential information for any other purpose, including developing competing
products or services, without the disclosing party's prior written consent.

### 8.4 Handling and protection

The receiving party must:

- Keep confidential information at least as secure as its own confidential
  information of similar sensitivity, and in any event apply reasonable security
  measures.
- Disclose confidential information only to its own personnel and approved
  subcontractors who need it to perform the engagement and who are bound by
  confidentiality obligations at least as strict as those in this section.
- Not copy, extract, or summarise confidential information beyond what is
  reasonably necessary for the engagement.
- Notify the disclosing party promptly (and in any event within **48 hours**) on
  becoming aware of any unauthorised access to or disclosure of confidential
  information.

### 8.5 Duration

Confidential information remains protected for the period stated in section 5
(Confidentiality Duration) of this document, which runs from the date of each
disclosure and survives termination or expiry of the engagement.

### 8.6 Return and destruction

On request or within **10 business days** of the engagement ending, the
receiving party must return or securely destroy all confidential information and
any copies, except for one archival copy retained solely to meet legal or audit
obligations. The receiving party must certify compliance in writing on request.

### 8.7 Compelled disclosure

If the receiving party is required by law, regulation, or court order to
disclose confidential information, it must, to the extent permitted by law:

1. Give the disclosing party prompt written notice before disclosure.
2. Cooperate with the disclosing party in seeking a protective order or other
   appropriate relief.
3. Disclose only the minimum amount of information required.

## Questions

Open an issue or contact the maintainers if any term here is unclear or conflicts
with a statement of work. The required staged dispute process, governing law,
arbitration rules, and court venue are set out in
[`contractor-terms-commercial-and-legal.md`](./contractor-terms-commercial-and-legal.md#3-dispute-resolution).
