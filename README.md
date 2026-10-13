# ticket-platform

A small ticket-approval backend built to practise how production teams structure
services and infrastructure: an onion-architecture API, policy-based authorization
with OPA, a hand-written Go gateway, and local infrastructure managed with Terraform.

This is a learning project. The goal is not a product but a codebase where every
file exists for a reason that can be explained. The domain (tickets) is deliberately
simple so the architecture stays in focus.

## Status

| # | Part | What it demonstrates | Status |
|---|------|----------------------|--------|
| 1 | `infra/` | Terraform: providers, variables, state, modules | Done |
| 2 | `server/` | Onion architecture and dependency inversion (Node.js, TypeScript) | Done |
| 3 | `policy/` | Authorization rules separated from code (OPA, Rego) | Done |
| 4 | `gateway/` | Reverse proxy, middleware chain, JWT, policy enforcement (Go) | Done, load measurement pending |
| 5 | Wiring | Everything started with a single `terraform apply` | In progress |

## Architecture

```
client -> gateway (Go) -> server (Node.js) -> PostgreSQL
              |                |
              +----- OPA ------+
```

What runs today: all four components, started as separate local processes.
The gateway authenticates and authorizes every request before it reaches the server.
Part 5 moves them into containers so that only the gateway is reachable from outside.

### Gateway

Every request passes through the same chain:

```
request ID -> structured log -> route allowlist -> JWT (RS256) -> OPA route_allowed -> proxy -> server
```

| Step | Rejects with |
|------|--------------|
| Path or method not in the allowlist | 404 / 405 |
| Missing, expired or invalid token; wrong `iss` or `aud` | 401 |
| OPA says no | 403 |
| OPA unreachable, slow or returns no decision | 503 (fail closed) |
| Server unreachable | 502 |

Before forwarding, the gateway deletes any `X-User-Id`, `X-User-Roles` and
`Authorization` header sent by the client and writes `X-User-Id` and `X-User-Roles`
from the verified token. `/healthz` answers without authentication and does not
depend on the server.

```
gateway/
  cmd/gateway/        Wiring: configuration, routes, server, shutdown
  cmd/devtoken/       Signs development tokens
  internal/auth/      JWT verification, identity in the request context
  internal/authz/     Authorization middleware and its Decider interface
  internal/opa/       OPA REST client
  internal/proxy/     Reverse proxy and identity headers
  internal/middleware/ Request ID and logging
```

### Server layers

```
server/src/
  domain/           Ticket entity, state rules, repository interface
  application/      Use cases: open, get, submit, approve, reject
  infrastructure/   Repository implementations: in-memory, PostgreSQL
  http/             Express routes, error-to-status mapping
  main.ts           Composition root
```

Dependencies point inwards only. `domain/` imports nothing; `express` is imported
only in `http/`, and `pg` only in `infrastructure/` and `main.ts`.

### Ticket lifecycle

```
open --submit--> in_review --approve--> approved
                           \--reject--> rejected
```

The rules are specified in [docs/TICKET.md](docs/TICKET.md).

### Authorization policy

OPA answers two separate questions, each under its own name:

| Decision | Question | Asked by | Input |
|----------|----------|----------|-------|
| `route_allowed` | May this role perform this action at all? | Gateway | `subject`, `action` |
| `allowed` | May this person perform this action on this ticket? | Server (part 5) | `subject`, `action`, `resource.openedBy` |

The rules (P1 to P5) are listed in [docs/TICKET.md](docs/TICKET.md). Both decisions
are served at `POST /v1/data/ticket/authz/<decision>`.

## Design decisions

| Decision | Reasoning |
|----------|-----------|
| State rules live in the `Ticket` class | A ticket cannot be put into an invalid state, because its status is a private field changed only by its own methods. Use cases do not repeat the rules. |
| Repository interface is defined in `domain/` | Use cases depend on the contract, not on a database. Switching from the in-memory repository to PostgreSQL changed no file in `application/` or `http/`. |
| Manual dependency injection, no framework | Dependencies are passed through constructors and wired in one place (`main.ts`), so the mechanism stays visible. |
| Domain errors, HTTP status codes mapped at the edge | The domain throws `InvalidTicketError` or `InvalidTransitionError`; only the HTTP layer knows these mean 400 and 409. |
| Parameterized SQL only | Values are sent separately from the query text, which rules out SQL injection by construction. |
| State rules in the domain, authorization rules in OPA | "Can this ticket be approved now?" and "Can this person approve it?" are different questions. Each rule is written in exactly one place. |
| Default deny | Both decisions start as `false`; rules only describe what is allowed. An unknown action or a user without roles is rejected without a rule of its own. |
| Two decisions instead of one | The gateway does not know who opened a ticket. A separate `allowed` decision keeps ownership checks away from callers that cannot supply `resource`. |
| A missing `resource` never grants access | Ownership rules compare against `resource.openedBy`; the reviewer read rule requires it explicitly. Both cases have tests. |
| Deny tests assert `== false`, not `not` | In Rego a rule that does not match is undefined, and `not` treats undefined as false. Comparing with `false` proves the default exists, so the API returns `{"result": false}` instead of an empty `{}`. |
| Gateway written by hand on the standard library | The goal is to see what a gateway does, not to configure one. The only dependency is `golang-jwt`. |
| Server timeouts and graceful shutdown | Zero values in `http.Server` mean no timeout. `ReadHeaderTimeout` closes connections that never finish their headers (Slowloris); verified with `nc`. |
| Tokens signed with RS256; the gateway holds only the public key | A compromised gateway can verify tokens but cannot mint them. The algorithm, `exp`, `iss` and `aud` are all enforced. |
| Explicit route allowlist | Only the five endpoints of the API are forwarded. Anything else is rejected at the gateway, so a new server endpoint is never exposed by accident. |
| Fail closed | If OPA cannot answer, the request is rejected. Crashing OPA must not switch authorization off. A missing `result` in OPA's response is treated as an error, not as `false`. |
| Identity headers rewritten, token not forwarded | The server trusts `X-User-*` only because the gateway removes the client's copies first. The server never sees the token it does not need. |
| Interfaces defined by the consumer | `authz.Decider` lives next to the middleware that uses it; the OPA client satisfies it without knowing it exists. Same idea as the repository interface in the server. |
| PostgreSQL in its own Terraform module | The module exposes only variables and outputs; it was moved there with `moved` blocks so no resource was recreated. |
| Secrets stay out of the code | The database password is a sensitive variable supplied through an untracked `terraform.tfvars`; signing keys are generated locally and ignored by git. |

The full decision record, with sources, is in [docs/DECISIONS.md](docs/DECISIONS.md)
and [docs/REFERENCES.md](docs/REFERENCES.md) (written in Turkish).

## Running it locally

Requirements: Docker, Terraform 1.12 or newer, Node.js 24, Go 1.22 or newer, OPA 1.0 or newer.
Each block runs in its own terminal.

**1. Infrastructure and schema**

```bash
cd infra
echo 'db_password = "choose-a-password"' > terraform.tfvars
terraform init
terraform apply
docker exec -i ticket-postgres psql -U postgres < ../server/sql/001_tickets.sql
```

**2. Server**

```bash
cd server
npm install
export DATABASE_URL=$(cd ../infra && terraform output -raw db_url)
npm start
```

**3. Policy**

```bash
cd policy
opa run --server ticket/authz.rego
```

**4. Gateway**

```bash
cd gateway
mkdir -p dev-keys
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out dev-keys/private.pem
openssl pkey -in dev-keys/private.pem -pubout -out dev-keys/public.pem
go run ./cmd/gateway
```

**5. Try it**, from `gateway/`:

```bash
REQUESTER=$(go run ./cmd/devtoken -sub u1 -roles requester)
REVIEWER=$(go run ./cmd/devtoken -sub u2 -roles reviewer)

curl -s -X POST localhost:8080/tickets \
  -H "Authorization: Bearer $REQUESTER" \
  -H "Content-Type: application/json" -d '{"title": "Printer is broken"}'

curl -i -X POST localhost:8080/tickets/<id>/submit  -H "Authorization: Bearer $REQUESTER"
curl -i -X POST localhost:8080/tickets/<id>/approve -H "Authorization: Bearer $REQUESTER"   # 403
curl -i -X POST localhost:8080/tickets/<id>/approve -H "Authorization: Bearer $REVIEWER"    # 200
```

To remove everything: `cd infra && terraform destroy`.

## API

Served through the gateway on `localhost:8080`. Every request needs
`Authorization: Bearer <token>`.

| Method and path | Action | Success |
|-----------------|--------|---------|
| `POST /tickets` | `ticket:open` | 201 |
| `GET /tickets/{id}` | `ticket:read` | 200 |
| `POST /tickets/{id}/submit` | `ticket:submit` | 200 |
| `POST /tickets/{id}/approve` | `ticket:approve` | 200 |
| `POST /tickets/{id}/reject` | `ticket:reject` | 200 |

Errors: 400 invalid input, 401 missing or invalid token, 403 not allowed,
404 unknown ticket or route, 409 action not allowed in the ticket's current state,
502 server unreachable, 503 authorization unavailable.

## Tests

```bash
cd server
npm test            # domain and use cases, no database
npm run typecheck   # TypeScript, no emit
```

```bash
cd policy
opa test . -v                              # 24 tests, one per row of the rule tables
opa test . --coverage --format=json        # every line of authz.rego is exercised
```

```bash
cd gateway
go vet ./...
go test ./...       # middleware, JWT cases, OPA client against a fake OPA, proxy against a fake server
```

None of the tests need a running database, OPA or server. Run each tool from its own
directory: `opa` loads every JSON and YAML file under the given path as data,
including `server/node_modules` if pointed at the repository root.

## Known limitations

- **Ownership is not checked yet.** A user with the `reviewer` role can approve a
  ticket they opened themselves, which breaks rule P4. The gateway can only ask
  `route_allowed`, because it does not know who opened a ticket. Part 5 makes the
  server ask `allowed` (OWASP API1:2023, Broken Object Level Authorization).
- The server is still reachable directly on port 3000 and trusts `X-User-Id`.
  Part 5 removes that port from the host, leaving the gateway as the only entry point.
- The schema is applied by hand and must be re-applied after `terraform destroy`.
- The PostgreSQL repository is verified manually, not by an automated test.
- The gateway's latency cost has not been measured yet (step 7 of part 4).
- Terraform state is local and contains the database password in plain text;
  it is excluded from version control.

## Documentation

- [docs/DECISIONS.md](docs/DECISIONS.md): rules of the project and the decision record
- [docs/TICKET.md](docs/TICKET.md): the contract all parts follow
- [docs/REFERENCES.md](docs/REFERENCES.md): sources behind the decisions
- [docs/parts/](docs/parts/): steps and completion criteria for each part
