# RPC Provider Failover Runbook

**Area:** Operations  
**Applies to:** Backend and contract services that communicate with the Stellar Soroban RPC  
**Config variable:** `SOROBAN_RPC_URL`

---

## Symptoms That Justify Failover

Initiate failover when **two or more** of the following are observed within a 5-minute window:

| Symptom | Where to observe |
|---------|-----------------|
| RPC timeout errors appear in backend logs (`RPC timeout`) | Log aggregator (Datadog / ELK) — filter on `"RPC timeout"` |
| `GET /health/ready` returns unhealthy | Uptime monitor / load-balancer health check |
| Payment or distribution transactions fail to confirm on-chain | `stardial.transaction.failed` metric spike |
| `soroban_rpc_error_rate` metric exceeds 10 % over 5 min | Grafana / observability dashboard |
| Provider status page shows degraded or outage | Stellar provider status pages |

Do **not** failover for a single transient timeout — check the provider status page first and wait 2–3 minutes.

---

## Identifying the Current Endpoint

```bash
# On the running container / pod
echo $SOROBAN_RPC_URL

# Or read from the deployed environment config
kubectl get secret stardial-backend-env -o jsonpath='{.data.SOROBAN_RPC_URL}' | base64 -d
```

---

## Known Fallback Endpoints

| Network | Primary | Fallback |
|---------|---------|---------|
| Testnet | `https://soroban-testnet.stellar.org` | `https://rpc-futurenet.stellar.org` |
| Mainnet | _(configured per deployment)_ | Contact the ops channel for the current secondary — do not commit mainnet URLs to this file |

---

## Config Change and Deployment Order

> **Never change `SOROBAN_RPC_URL` while a batch distribution is in flight.**  
> Check the `stardial.distribution.in_progress` metric or confirm with the on-call engineer first.

1. **Update the environment secret** (or `.env` file for the affected environment):

   ```bash
   # Example: Kubernetes secret patch
   kubectl patch secret stardial-backend-env \
     -p '{"stringData":{"SOROBAN_RPC_URL":"<FALLBACK_URL>"}}'
   ```

2. **Restart backend pods** to pick up the new value:

   ```bash
   kubectl rollout restart deployment/stardial-backend
   kubectl rollout status deployment/stardial-backend
   ```

3. **Verify the backend started cleanly** — `SOROBAN_RPC_URL` is a required env var and is validated at startup:

   ```bash
   kubectl logs -l app=stardial-backend --tail=40 | grep -i "rpc\|startup\|error"
   ```

---

## Verification Queries and Smoke Tests

Run these immediately after restart:

```bash
# 1. Readiness probe
curl -s https://<BACKEND_HOST>/health/ready | jq .

# 2. Check the backend can reach the new RPC endpoint
#    (triggers a lightweight getLatestLedger call internally)
curl -s https://<BACKEND_HOST>/health/startup | jq .

# 3. Confirm a single recent on-chain event is indexable
curl -s https://<BACKEND_HOST>/api/events?limit=1 | jq '.data | length'
```

Expected: readiness `status: "ok"`, startup `status: "ok"`, events returns ≥ 0 items without 5xx.

If any check fails, review logs before proceeding — do not assume the fallback endpoint is healthy either.

---

## Rollback to the Primary Provider

1. Confirm the primary provider's status page shows **fully operational**.
2. Repeat the config-change and deployment steps above, substituting the **primary** URL.
3. Re-run the verification queries.
4. Log the incident, time of failover, and time of restoration in the `#incidents` channel.

---

## Local Testing

To validate a candidate RPC URL before deploying:

```bash
# Quick connectivity check (replace URL as needed)
curl -s -X POST https://soroban-testnet.stellar.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getLatestLedger","params":{}}' \
  | jq '.result.sequence'
```

A numeric ledger sequence in the response confirms the endpoint is live.

---

## Related

- [Reliability runbook](reliability.md)
- [Incident response runbook](incident-response.md)
- [Backend deploy guide](../backend-deploy.md)
- [Secrets management](../secrets.md)
