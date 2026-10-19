#![cfg(test)]
//! Duplicate-claim regression tests (Issue #1254).
//!
//! A participant must not be able to claim the same entitlement twice. The
//! contract exposes `claim` as a permissionless self-service pull payout, so
//! without a guard a collaborator could repeatedly drain a project balance by
//! calling `claim` again and again against the same deposited funds.
//!
//! The contract now tracks a per-project *claim epoch* that advances whenever
//! new funds become claimable (a `deposit`) or the pending balance is settled by
//! a push `distribute`. A collaborator may claim at most once per epoch:
//!
//! - The first claim succeeds and pays the collaborator's basis-point share.
//! - An immediate second claim returns `SplitError::AlreadyClaimed` and mutates
//!   no state (balance, claimed ledger, last-claim amount all unchanged).
//! - A new deposit or distribution opens a fresh epoch, so legitimate later
//!   claims still work.
//! - Each collaborator has an independent allowance: one claimer cannot block
//!   another's first claim.

use crate::{errors::SplitError, Collaborator, StardialContract, StardialContractClient};
use soroban_sdk::{testutils::Address as _, token, Address, Env, String, Symbol, Vec};

const DEPOSIT: i128 = 10_000_000;
const ALICE_BPS: u32 = 6_000;
const BOB_BPS: u32 = 4_000;

struct Fixture<'a> {
    env: Env,
    client: StardialContractClient<'a>,
    admin: Address,
    owner: Address,
    token: Address,
    alice: Address,
    bob: Address,
    project_id: Symbol,
}

fn setup<'a>() -> Fixture<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin = Address::generate(&env);
    let token = env.register_stellar_asset_contract(token_admin);

    let contract_id = env.register_contract(None, StardialContract);
    let client = StardialContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.set_admin(&admin);

    let mut collabs = Vec::new(&env);
    collabs.push_back(Collaborator {
        address: alice.clone(),
        alias: String::from_str(&env, "Alice"),
        basis_points: ALICE_BPS,
    });
    collabs.push_back(Collaborator {
        address: bob.clone(),
        alias: String::from_str(&env, "Bob"),
        basis_points: BOB_BPS,
    });

    let project_id = Symbol::new(&env, "dup_claim");
    client.create_project(
        &owner,
        &project_id,
        &String::from_str(&env, "Duplicate Claims"),
        &String::from_str(&env, "music"),
        &token,
        &collabs,
    );

    Fixture {
        env,
        client,
        admin,
        owner,
        token,
        alice,
        bob,
        project_id,
    }
}

fn fund_and_deposit(f: &Fixture, amount: i128) {
    token::StellarAssetClient::new(&f.env, &f.token).mint(&f.owner, &amount);
    f.client.deposit(&f.project_id, &f.owner, &amount);
}

fn token_balance(f: &Fixture, who: &Address) -> i128 {
    token::Client::new(&f.env, &f.token).balance(who)
}

#[test]
fn first_claim_succeeds_and_pays_proportional_share() {
    let f = setup();
    fund_and_deposit(&f, DEPOSIT);

    let alice_tokens = token_balance(&f, &f.alice);
    let expected = DEPOSIT * ALICE_BPS as i128 / 10_000;

    let claimed = f.client.claim(&f.project_id, &f.alice);

    assert_eq!(claimed, expected);
    assert_eq!(token_balance(&f, &f.alice) - alice_tokens, expected);
    assert_eq!(f.client.get_claimed(&f.project_id, &f.alice), expected);
    assert_eq!(f.client.get_balance(&f.project_id), DEPOSIT - expected);
}

#[test]
fn second_claim_in_same_epoch_is_rejected() {
    let f = setup();
    fund_and_deposit(&f, DEPOSIT);

    f.client.claim(&f.project_id, &f.alice);

    assert_eq!(
        f.client.try_claim(&f.project_id, &f.alice),
        Err(Ok(SplitError::AlreadyClaimed))
    );
}

#[test]
fn repeated_claim_is_rejected_deterministically() {
    let f = setup();
    fund_and_deposit(&f, DEPOSIT);
    f.client.claim(&f.project_id, &f.alice);

    for _ in 0..3 {
        assert_eq!(
            f.client.try_claim(&f.project_id, &f.alice),
            Err(Ok(SplitError::AlreadyClaimed))
        );
    }
}

#[test]
fn rejected_duplicate_claim_leaves_state_unchanged() {
    let f = setup();
    fund_and_deposit(&f, DEPOSIT);
    f.client.claim(&f.project_id, &f.alice);

    let balance_before = f.client.get_balance(&f.project_id);
    let claimed_before = f.client.get_claimed(&f.project_id, &f.alice);
    let tokens_before = token_balance(&f, &f.alice);

    assert_eq!(
        f.client.try_claim(&f.project_id, &f.alice),
        Err(Ok(SplitError::AlreadyClaimed))
    );

    assert_eq!(f.client.get_balance(&f.project_id), balance_before);
    assert_eq!(
        f.client.get_claimed(&f.project_id, &f.alice),
        claimed_before
    );
    assert_eq!(token_balance(&f, &f.alice), tokens_before);
}

#[test]
fn new_deposit_reopens_the_claim_window() {
    let f = setup();
    fund_and_deposit(&f, DEPOSIT);
    f.client.claim(&f.project_id, &f.alice);

    // A fresh deposit opens a new epoch, so the same collaborator may claim the
    // newly added funds — but not a second time without another deposit.
    fund_and_deposit(&f, DEPOSIT);

    let balance_before = f.client.get_balance(&f.project_id);
    let claimed = f.client.claim(&f.project_id, &f.alice);
    let expected = balance_before * ALICE_BPS as i128 / 10_000;
    assert_eq!(claimed, expected);

    assert_eq!(
        f.client.try_claim(&f.project_id, &f.alice),
        Err(Ok(SplitError::AlreadyClaimed))
    );
}

#[test]
fn push_distribution_opens_a_new_epoch() {
    let f = setup();
    fund_and_deposit(&f, DEPOSIT);

    // A push distribution settles the balance and advances the epoch.
    f.client.distribute(&f.project_id);
    assert_eq!(f.client.get_balance(&f.project_id), 0);

    // Alice was paid by the push, so a pull claim now has nothing to move and
    // is not treated as a duplicate of the earlier round.
    assert_eq!(f.client.claim(&f.project_id, &f.alice), 0);

    // New funds after the distribution are claimable again.
    fund_and_deposit(&f, DEPOSIT);
    let balance_before = f.client.get_balance(&f.project_id);
    assert_eq!(
        f.client.claim(&f.project_id, &f.alice),
        balance_before * ALICE_BPS as i128 / 10_000
    );
}

#[test]
fn collaborators_have_independent_claim_allowances() {
    let f = setup();
    fund_and_deposit(&f, DEPOSIT);

    let alice_claim = f.client.claim(&f.project_id, &f.alice);
    let bob_claim = f.client.claim(&f.project_id, &f.bob);

    assert_eq!(alice_claim, DEPOSIT * ALICE_BPS as i128 / 10_000);
    assert!(bob_claim > 0);

    // Each has now exhausted their allowance for this epoch.
    assert_eq!(
        f.client.try_claim(&f.project_id, &f.alice),
        Err(Ok(SplitError::AlreadyClaimed))
    );
    assert_eq!(
        f.client.try_claim(&f.project_id, &f.bob),
        Err(Ok(SplitError::AlreadyClaimed))
    );
}

#[test]
fn non_collaborator_still_reports_not_a_collaborator() {
    let f = setup();
    fund_and_deposit(&f, DEPOSIT);
    let stranger = Address::generate(&f.env);

    // Membership is validated before the duplicate-claim guard, so an outsider
    // never receives the (misleading) AlreadyClaimed error.
    assert_eq!(
        f.client.try_claim(&f.project_id, &stranger),
        Err(Ok(SplitError::NotACollaborator))
    );
}

#[test]
fn duplicate_claim_guard_is_independent_of_pause_state() {
    let f = setup();
    fund_and_deposit(&f, DEPOSIT);
    f.client.claim(&f.project_id, &f.alice);

    // Even after an emergency pause, a collaborator who already claimed in this
    // epoch cannot replay the entitlement; the pause error is reported first.
    f.client.pause_distributions(&f.admin);
    assert_eq!(
        f.client.try_claim(&f.project_id, &f.alice),
        Err(Ok(SplitError::DistributionsPaused))
    );

    f.client.unpause_distributions(&f.admin);
    assert_eq!(
        f.client.try_claim(&f.project_id, &f.alice),
        Err(Ok(SplitError::AlreadyClaimed))
    );
}
