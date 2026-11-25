# Contractor Terms: Scope, Compliance, Disputes, and Exit

This document sets the commercial and legal ground rules for contractor
engagements: how scope is defined (deliverables, assumptions, boundaries,
exclusions, and success), how budget and changes are controlled, what compliance applies to
international work, how disagreements are resolved, what happens at the end, and
whether the engagement may be transferred. It supplements the statement of work.

## 1. Scope, Budget, and Change Control

### 1.1 Defining the scope

Every statement of work must contain the sections below, written in plain
language. Work does not start until both parties have agreed them in writing.
Anything left blank or marked "to be decided" is out of scope until a change
request adds it.

| Section             | What it must say                                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective           | One or two sentences on the problem being solved and who benefits                                                                              |
| Deliverables        | A numbered list of each item to be handed over (code, document, design, deployment, or report), with its format and where it will be delivered |
| Acceptance criteria | For each deliverable, the checks that show it is done, in addition to the quality standards in the contractor agreement                        |
| In scope            | The features, systems, environments, platforms, and repositories the work covers                                                               |
| Out of scope        | Related work the contractor will not do (see the default exclusions below)                                                                     |
| Assumptions         | Facts the plan depends on, such as access, inputs, third-party availability, and decision turnaround                                           |
| Dependencies        | What Stardial or others must supply, and by when                                                                                               |
| Milestones          | Target dates for each deliverable and the budget attached to each                                                                              |

Write acceptance criteria so that a reviewer can answer "yes" or "no". For
example, "users can export a split history as CSV from the dashboard, and the
export matches the on-chain records for the test account" is testable; "a good
export feature" is not.

### 1.2 Default exclusions

Unless the statement of work lists them as deliverables, the following are out
of scope:

- New features, screens, endpoints, or contract functions not named in the
  deliverables list.
- Ongoing operation, hosting, monitoring, or support after acceptance. Ongoing
  service levels apply only where the statement of work includes them.
- Fixing defects in code, infrastructure, or third-party services that the
  contractor did not write or change.
- Data migration, content entry, translation, and user training.
- Security audits, penetration tests, or formal verification by a third party.
- Paid third-party licences, hosting, or API usage beyond what Stardial provides.
- Rework caused by Stardial changing requirements after acceptance criteria are
  agreed. This is handled as a change request.

### 1.3 Assumptions and boundaries

- If an assumption in the statement of work turns out to be false, the party who
  finds out tells the other in writing within **2 business days**. The parties
  then agree a change request or confirm that the impact is absorbed.
- Ambiguous scope is not read as including extra work. When the contractor is
  unsure whether something is in scope, they ask in writing before doing it.
  Work done without that confirmation is not payable as extra work.
- Small clarifications that do not change effort, cost, or dates, such as
  wording, naming, or layout choices inside an agreed deliverable, can be agreed
  in the pull request or issue without a change request.

### 1.4 Definition of success

The engagement is successful when every deliverable in the statement of work has
been accepted under the sign-off process in the contractor agreement, and any
milestone budget has not been exceeded without an approved change request. Work
that is not in the deliverables list does not count toward or against success.

### 1.5 Budget and change control

- The statement of work lists the deliverables and a **not-to-exceed budget**.
  Work outside that list is out of scope.
- No out-of-scope work starts without a written change request approved by both
  parties. The change request states the extra cost, effort, and date impact.
- The contractor reports spend against budget at each milestone. If forecast
  spend reaches **80%** of the not-to-exceed amount, the contractor must notify
  Stardial before continuing.
- Stardial may pause or stop work at any milestone; payment is due only for work
  accepted up to that point.
- Once the not-to-exceed budget is reached, the contractor stops unless a new
  change request is approved. Unapproved overruns are not payable.

### 1.6 Pre-existing Materials and Intellectual Property

- Each party retains ownership of materials and intellectual property it owned
  or developed independently before the engagement, or develops independently
  outside its scope ("Background Materials"). The engagement does not assign
  either party's Background Materials to the other.
- Before work starts, the statement of work must identify each Background
  Material the contractor proposes to include in a deliverable, its owner, the
  relevant deliverable, and its applicable licence and restrictions. It must
  also identify third-party and open-source materials and their licences.
  Stardial's written approval is required before incorporating any such material
  that is not already approved in the statement of work.
- For each approved contractor-owned Background Material included in, or needed
  to use, maintain, modify, or distribute, a deliverable, the contractor grants
  Stardial a worldwide, perpetual, irrevocable, royalty-free, non-exclusive,
  transferable, and sublicensable licence to use, reproduce, modify, maintain,
  distribute, display, perform, and otherwise exploit that material as part of,
  or in connection with, the deliverable. This licence does not transfer
  ownership of the Background Material.
- Work created specifically as a deliverable under the statement of work is
  work product, not Background Material, and belongs to Stardial under section 4
  of
  [Contractor Terms: Balance, Breach, Third-Party Tools, and Exit](./contractor-terms-breach-and-exit.md#4-data-and-access-portability).
  The contractor must obtain any rights from its personnel or subcontractors
  needed to give effect to that ownership. Third-party and open-source material
  remains subject to its applicable licence and is not assigned to Stardial.

## 1A. Invoicing and Payment

This section sets what an invoice must contain, how Stardial approves it, when it
is due, and what happens when payment is late. It applies to every invoice under
a statement of work. Billing contacts, currency, and any recurring fees are named
in the statement of work.

### Invoice content

Each invoice is a written document (PDF or email) and must show:

1. A unique **invoice number** and the **issue date**.
2. The contractor's legal name, address, and tax registration details, and the
   Stardial billing entity named in the statement of work.
3. The **statement of work reference** and, where relevant, the milestone or
   deliverable and any approved change request the invoice covers.
4. **Evidence of acceptance** for each deliverable billed: a link to the recorded
   sign-off (a GitHub approval or an email confirming acceptance), or the date on
   which deemed acceptance took effect under
   [Review, Acceptance, and Sign-Off](./contractor-agreement.md#2-review-acceptance-and-sign-off).
5. **Itemised charges**: a description, the quantity or hours, the rate, and the
   amount for each line, in the currency stated in the statement of work.
6. **Budget position**: this invoice's total, the total invoiced to date, and the
   remaining not-to-exceed balance from section 1.
7. **Taxes and withholding** shown separately from fees (see section 2), and any
   service credits applied as separate deduction lines.
8. **Payment details**: the account or address to pay, a payment reference, and
   the due date calculated under "Due dates" below.

### What may be invoiced

- Work accepted under the acceptance process, including work deemed accepted.
- Work under a change request approved in writing by both parties.
- Recurring fees that the statement of work makes payable.
- Not payable: work that has not been accepted, work outside the statement of
  work and approved change requests, and any amount that takes total invoiced
  fees above the not-to-exceed budget (see section 1).

### Submission and approval

1. **Submit.** The contractor emails the invoice to the billing contact named in
   the statement of work (or, if none is named, the nominated contract contact).
   It is received on the day it reaches that contact; one received after the end
   of a business day, or on a non-business day, counts as received on the next
   business day.
2. **Completeness check.** Within **5 business days** of receipt, Stardial
   confirms the invoice is complete or returns it with a written list of the
   missing or incorrect items. A returned invoice is treated as not received
   until the contractor delivers a corrected one.
3. **Review.** Within **10 business days** of receiving a complete invoice,
   Stardial checks it against accepted deliverables, approved change requests,
   the budget, and credits owed, then either approves it in writing or notifies
   the contractor of the items it disputes, with reasons.
4. **Deemed approval.** If Stardial neither approves nor disputes the invoice
   within those **10 business days**, the invoice is treated as approved.
5. **Partial disputes.** Stardial approves and pays the undisputed part on time.
   The disputed part follows the process in section 3, and the contractor issues
   a corrected invoice or credit note once it is resolved.
6. **Later corrections.** Approving or paying an invoice does not accept a
   deliverable or waive any right. An overpayment or billing error found later is
   corrected by a credit note or a deduction from the next invoice; if no further
   invoice is due, the contractor refunds it within **30 calendar days**.

### Due dates

- Payment is due **30 calendar days** after Stardial receives a complete, correct
  invoice. Approval, including deemed approval, does not change the due date.
- If the due date is not a business day, payment is due on the next business
  day.
- Payment is made when Stardial initiates the transfer to the account on the
  invoice, in the invoice currency. Each party bears its own bank charges.
- Taxes and withholding follow section 2.
- A disputed amount later agreed or decided to be payable is due within **10
  business days** after the dispute is resolved.

### Late payment

- An undisputed amount unpaid after its due date accrues simple interest at
  **1% per month** (or the maximum rate applicable law permits, if lower),
  calculated daily from the day after the due date until it is paid. Interest is
  not compounded.
- No interest accrues on an amount disputed in good faith under section 3 while
  the dispute is pending. If it is resolved as payable and not paid within **10
  business days**, interest accrues on it from the end of that period.
- The contractor claims interest with a statement showing the overdue invoice,
  the number of days late, and the calculation. Stardial pays it with the overdue
  amount, or within **10 business days** of the statement if the amount has
  already been paid.
- An undisputed amount that is still unpaid after the contractor gives written
  notice that it is overdue is handled under
  [Breach Notification and Cure](./contractor-terms-breach-and-exit.md#2-breach-notification-and-cure),
  including its **10-business-day** cure period. Interest does not limit the
  contractor's rights under that process.

## 2. International Work and Legal Compliance

- Each party follows the laws that apply where it is established. The contractor
  is responsible for its own tax registration, filings, and work authorisation.
- The contractor identifies the jurisdiction where the work is performed and
  obtains every licence, permit, registration, and approval that the delivery
  location requires before starting that work. Copies are provided to Stardial
  on request, and any renewal or condition is tracked for the duration of the
  engagement.
- The contractor must not use the engagement to handle export-controlled
  technology, sanctioned parties, or restricted data. Flag anything that might
  qualify before work starts.
- Stardial data stays in the systems Stardial designates. The contractor must
  not move it to another country or provider without written approval.
- Fees and rates in the statement of work are exclusive of VAT or other
  transaction taxes. The contractor is responsible for its income, payroll, and
  employment taxes and registrations. Where a transaction tax applies, the
  contractor must state it separately on a valid tax invoice, and Stardial pays
  it with the undisputed invoice.
- The paying party may deduct and remit any withholding tax required by law and
  must provide the official remittance evidence to the other party within
  **10 business days** of receiving it. The parties will provide reasonable
  documentation needed to apply the correct tax treatment.
- If a local law conflicts with these terms, notify Stardial and the parties will
  agree a workaround in writing before proceeding.

## 3. Dispute Resolution

No party may start arbitration or litigation until it completes the stages below.
The parties continue performing undisputed obligations while a dispute is
pending, and work continues and undisputed invoices remain payable unless the
engagement was terminated for cause. Emergency relief to preserve evidence,
protect confidential information, prevent unauthorised access, or stop
misappropriation is permitted at any stage.

1. **Written notice and negotiation.** The party raising a dispute gives written
   notice to the nominated contract contacts, describing the facts, the clause
   involved, and the requested resolution. The nominated contacts meet or confer
   in good faith within **10 business days** of the notice.
2. **Senior escalation.** If the nominated contacts do not resolve the dispute,
   each party appoints a senior representative who has authority to settle the
   matter. The representatives meet within **10 further business days**.
3. **Mediation.** If senior escalation does not resolve the dispute, the parties
   jointly appoint a mediator and meet for one mediation session within
   **30 calendar days**. Unless the parties agree otherwise, mediation is private
   and confidential, and the parties split the mediator's fees equally. Statements
   made and documents created solely for mediation cannot be used in later
   proceedings except to the extent admissible under applicable law.
4. **Arbitration.** If mediation fails or a mediator is not appointed within
   **30 calendar days**, the dispute is finally resolved by binding arbitration
   under the Nigerian Arbitration and Mediation Act 2023 (or its replacement).
   The seat is Lagos, Nigeria. The tribunal consists of one arbitrator agreed by
   the parties within 10 business days after a written request for arbitration;
   absent agreement, the appointing authority is the Lagos Court of Arbitration
   (LCA). The arbitrator decides in accordance with these terms and Nigerian law.
   The award is final and binding, and judgment may be entered on it in a court
   of competent jurisdiction.
5. **Litigation.** Litigation is limited to proceedings for interim or emergency
   relief and recognition or enforcement of an arbitral award. Any such
   proceedings are brought exclusively in the courts of Lagos State, Nigeria.

## 3A. Governing Law and Venue

- These terms and each statement of work are governed by the laws of the Federal
  Republic of Nigeria, without regard to conflict-of-laws rules.
- The seat and legal place of arbitration is Lagos, Nigeria.
- Any court proceedings permitted under section 3 are submitted exclusively to
  the courts sitting in Lagos State, Nigeria.
- Each party waives any objection to jurisdiction or venue in Lagos State only
  to the extent it is permitted to do so under applicable mandatory law.

## 4. Exit and Transition

- Either party may end the engagement with **30 days' written notice**; Stardial
  may end it immediately for uncured breach or non-performance.
- On exit the contractor must, within **10 business days**: hand over all work
  product and documentation, return or destroy Stardial data and credentials, and
  provide a written status of unfinished work.
- The contractor provides up to **5 business days** of transition assistance to
  Stardial or a replacement provider, at the agreed rate.
- Access to Stardial systems ends on the last day of the engagement, or sooner on
  request.
- Payment for accepted work remains due after exit; prepaid but undelivered work
  is refunded.

## 5. Non-Solicitation

- During the engagement and for **12 months** after its termination or expiry for any reason, the contractor shall not, directly or indirectly, solicit, entice away, employ, engage, or contract with any employee, contractor, or commercial partner of Stardial who was involved in or known to the contractor through the engagement, or encourage any such person to leave or terminate their relationship with Stardial.
- General public advertisements or job postings not specifically targeted at Stardial personnel are exempt from this restriction.

## 6. Assignment

- Neither party may assign or transfer this engagement, in whole or in part,
  without the other party's prior written consent. An assignment made without
  that consent is void.
- Either party may assign the engagement without consent to a successor in a
  merger, reorganisation, or sale of substantially all of its assets, provided
  the successor agrees in writing to be bound by these terms and is not a direct
  competitor of the other party.
- The assigning party remains responsible for obligations accrued before the
  assignment and must notify the other party in writing within **10 business
  days** of any permitted transfer.
- The contractor may not subcontract an assignment of the engagement;
  subcontracting remains subject to the flow-down obligations in the contractor
  agreement.
