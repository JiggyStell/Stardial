#![cfg(test)]
//! Explicit pause-state transition tests (Issue #1255).
//!
//! `pause_claim_tests` pins `claim` behaviour while paused. This suite instead
//! enumerates the *entire* paused surface and verifies the three properties the
//! emergency stop must guarantee:
//!
//! 1. Every pause-protected operation (`distribute`, `batch_distribute`,
//!    `claim`) fails deterministically with `SplitError::DistributionsPaused`
//!    while the flag is set.
//! 2. Administrative and funding operations (`create_project`, `deposit`,
//!    `allow_token`, `set_max_collaborators`, `lock_project`,
//!    `update_project_metadata`, `transfer_project_ownership`) continue to work
//!    while paused so operators can keep managing the platform.
//! 3. Normal operation resumes exactly after `unpause_distributions` — the very
//!    same operation that failed while paused succeeds afterwards.

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

    let project_id = Symbol::new(&env, "pause_ops");
    create_project(&env, &client, &token, &project_id, &owner, &alice, &bob);

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

fn collaborators(env: &Env, alice: &Address, bob: &Address) -> Vec<Collaborator> {
    let mut collabs = Vec::new(env);
    collabs.push_back(Collaborator {
        address: alice.clone(),
        alias: String::from_str(env, "Alice"),
        basis_points: ALICE_BPS,
    });
    collabs.push_back(Collaborator {
        address: bob.clone(),
        alias: String::from_str(env, "Bob"),
        basis_points: BOB_BPS,
    });
    collabs
}

fn create_project(
    env: &Env,
    client: &StardialContractClient,
    token: &Address,
    project_id: &Symbol,
    owner: &Address,
    alice: &Address,
    bob: &Address,
) {
    client.create_project(
        owner,
        project_id,
        &String::from_str(env, "Pause Ops"),
        &String::from_str(env, "music"),
        token,
        &collaborators(env, alice, bob),
    );
}

fn fund_and_deposit(
    env: &Env,
    client: &StardialContractClient,
    token: &Address,
    project_id: &Symbol,
    from: &Address,
    amount: i128,
) {
    token::StellarAssetClient::new(env, token).mint(from, &amount);
    client.deposit(project_id, from, &amount);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Pause-protected methods fail while paused
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn distribute_fails_while_paused_and_succeeds_after_unpause() {
    let f = setup();
    fund_and_deposit(
        &f.env,
        &f.client,
        &f.token,
        &f.project_id,
        &f.owner,
        DEPOSIT,
    );

    f.client.pause_distributions(&f.admin);

    assert_eq!(
        f.client.try_distribute(&f.project_id),
        Err(Ok(SplitError::DistributionsPaused))
    );
    assert_eq!(f.client.get_balance(&f.project_id), DEPOSIT);

    f.client.unpause_distributions(&f.admin);
    f.client.distribute(&f.project_id);
    assert_eq!(f.client.get_balance(&f.project_id), 0);
}

#[test]
fn batch_distribute_fails_while_paused_and_succeeds_after_unpause() {
    let f = setup();
    fund_and_deposit(
        &f.env,
        &f.client,
        &f.token,
        &f.project_id,
        &f.owner,
        DEPOSIT,
    );

    let mut ids = Vec::new(&f.env);
    ids.push_back(f.project_id.clone());

    f.client.pause_distributions(&f.admin);

    assert_eq!(
        f.client.try_batch_distribute(&ids),
        Err(Ok(SplitError::DistributionsPaused))
    );
    assert_eq!(f.client.get_balance(&f.project_id), DEPOSIT);

    f.client.unpause_distributions(&f.admin);
    let results = f.client.batch_distribute(&ids);
    assert_eq!(results.len(), 1);
    assert_eq!(results.get(0).unwrap().1, None);
}

#[test]
fn claim_fails_while_paused_and_succeeds_after_unpause() {
    let f = setup();
    fund_and_deposit(
        &f.env,
        &f.client,
        &f.token,
        &f.project_id,
        &f.owner,
        DEPOSIT,
    );

    f.client.pause_distributions(&f.admin);

    assert_eq!(
        f.client.try_claim(&f.project_id, &f.alice),
        Err(Ok(SplitError::DistributionsPaused))
    );

    f.client.unpause_distributions(&f.admin);
    let amount = f.client.claim(&f.project_id, &f.alice);
    assert_eq!(amount, DEPOSIT * ALICE_BPS as i128 / 10_000);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Administrative operations keep working while paused
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn create_project_and_deposit_still_work_while_paused() {
    let f = setup();
    f.client.pause_distributions(&f.admin);

    // New projects can still be created during an emergency stop.
    let other = Symbol::new(&f.env, "pause_new");
    create_project(
        &f.env, &f.client, &f.token, &other, &f.owner, &f.alice, &f.bob,
    );
    assert!(f.client.project_exists(&other));

    // Funding stays open so owners can keep topping up while paused.
    fund_and_deposit(
        &f.env,
        &f.client,
        &f.token,
        &f.project_id,
        &f.owner,
        DEPOSIT,
    );
    assert_eq!(f.client.get_balance(&f.project_id), DEPOSIT);

    // Only the distribution paths are blocked.
    assert_eq!(
        f.client.try_distribute(&f.project_id),
        Err(Ok(SplitError::DistributionsPaused))
    );
}

#[test]
fn admin_token_allowlist_and_cap_updates_work_while_paused() {
    let f = setup();
    f.client.pause_distributions(&f.admin);

    let new_token = Address::generate(&f.env);
    f.client.allow_token(&f.admin, &new_token);
    assert!(f.client.is_token_allowed(&new_token));

    f.client.disallow_token(&f.admin, &new_token);
    assert!(!f.client.is_token_allowed(&new_token));

    f.client.set_max_collaborators(&f.admin, &25);
    assert_eq!(f.client.get_max_collaborators(), 25);
}

#[test]
fn project_owner_operations_work_while_paused() {
    let f = setup();
    f.client.pause_distributions(&f.admin);

    // Metadata update.
    f.client.update_project_metadata(
        &f.project_id,
        &f.owner,
        &String::from_str(&f.env, "Renamed"),
        &String::from_str(&f.env, "film"),
    );

    // Ownership transfer.
    let new_owner = Address::generate(&f.env);
    f.client
        .transfer_project_ownership(&f.project_id, &f.owner, &new_owner);
    assert_eq!(
        f.client.get_project(&f.project_id).unwrap().owner,
        new_owner
    );

    // Locking (owner-gated, not pause-gated).
    f.client.lock_project(&f.project_id, &new_owner);
    assert!(f.client.get_project(&f.project_id).unwrap().locked);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Flag transitions are idempotent and observable
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn pause_flag_reports_false_by_default_and_flips_with_admin_calls() {
    let f = setup();
    assert!(!f.client.is_distributions_paused());

    f.client.pause_distributions(&f.admin);
    assert!(f.client.is_distributions_paused());

    f.client.unpause_distributions(&f.admin);
    assert!(!f.client.is_distributions_paused());

    f.client.pause_distributions(&f.admin);
    assert!(f.client.is_distributions_paused());
}

#[test]
fn read_only_endpoints_stay_available_while_paused() {
    let f = setup();
    fund_and_deposit(
        &f.env,
        &f.client,
        &f.token,
        &f.project_id,
        &f.owner,
        DEPOSIT,
    );

    f.client.pause_distributions(&f.admin);

    assert!(f.client.get_project(&f.project_id).is_some());
    assert_eq!(f.client.get_balance(&f.project_id), DEPOSIT);
    assert_eq!(f.client.get_claimed(&f.project_id, &f.alice), 0);
    assert_eq!(f.client.get_claimable(&f.project_id, &f.alice).claimed, 0);
}

#[test]
fn unauthenticated_pause_rejected_for_non_admin() {
    let f = setup();
    let mallory = Address::generate(&f.env);

    // `require_contract_admin` compares against the stored admin before any
    // auth check, so a non-admin address is rejected outright.
    assert_eq!(
        f.client.try_pause_distributions(&mallory),
        Err(Ok(SplitError::Unauthorized))
    );
    assert!(!f.client.is_distributions_paused());
}
