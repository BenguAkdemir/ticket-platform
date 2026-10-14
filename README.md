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
| 5 | Wiring | Everything started with a single `terraform apply` | Done |

## Architecture

```
client -> gateway (Go) -> server (Node.js) -> PostgreSQL
              |                |
              +----- OPA ------+
```

All four components run as containers on one Docker network, created by a single
`terraform apply`. Only the gateway publishes a port, and only on `127.0.0.1`; the server,
OPA and PostgreSQL cannot be reached from the host.

Authorization is checked at two points, each answering the question it can answer:

| Where | Question | Decision |
|-------|----------|----------|
| Gateway | Is this role allowed to perform this action at all? | `route_allowed` |
| Server | Is this person allowed to perform this action on this ticket? | `allowed` |
| Domain | Is the ticket in a state that allows it? | rules S1 to S5 |

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
sql/                Migrations, applied by the server at startup
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
| `allowed` | May this person perform this action on this ticket? | Server | `subject`, `action`, `resource.openedBy` |

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
| Ownership checked in the server, behind an interface | Only the server knows who opened a ticket. Use cases ask an `AccessPolicy` before any change; the OPA adapter lives in `infrastructure/`, tests use a fake. A denied request leaves the ticket untouched. |
| Schema owned by the application | The server applies the files in `sql/` at startup, each in one transaction with its record in `schema_migrations`. Terraform manages infrastructure, not tables. |
| One port on the host | Only the gateway is published. The database is inspected with `docker exec`, not through an open port. |
| Small images, no root | The gateway is built in two stages into a 16 MB distroless image without a shell. The server runs as the `node` user. Both stop cleanly on `SIGTERM`. |
| `for_each` for image builds, a module for containers | The two builds share one shape, so `for_each` fits. The three containers differ in almost every argument, so a shared `modules/service` keeps the rules (localhost-only ports, read-only mounts) in one place while each call stays explicit. |
| PostgreSQL in its own Terraform module | The module exposes only variables and outputs; it was moved there with `moved` blocks so no resource was recreated. |
| Secrets stay out of the code | The database password is a sensitive variable supplied through an untracked `terraform.tfvars`; signing keys are generated locally and ignored by git. |

The full decision record, with sources, is in [docs/DECISIONS.md](docs/DECISIONS.md)
and [docs/REFERENCES.md](docs/REFERENCES.md) (written in Turkish).

## Running it locally

Requirements: Docker, Terraform 1.12 or newer, Go 1.22 or newer (for `devtoken`),
OpenSSL. Node.js and OPA are only needed to run the tests.

```bash
# 1. Development signing keys (ignored by git)
cd gateway
mkdir -p dev-keys
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out dev-keys/private.pem
openssl pkey -in dev-keys/private.pem -pubout -out dev-keys/public.pem

# 2. Everything else
cd ../infra
echo 'db_password = "choose-a-password"' > terraform.tfvars
terraform init
terraform apply
```

Terraform builds both images, starts PostgreSQL, OPA, the server and the gateway, and
waits until the server and gateway report healthy. The server creates the schema itself.

**Try it**, from `gateway/`:

```bash
REQUESTER=$(go run ./cmd/devtoken -sub u1 -roles requester)
REVIEWER=$(go run ./cmd/devtoken -sub u2 -roles reviewer)

curl -s -X POST localhost:8080/tickets \
  -H "Authorization: Bearer $REQUESTER" \
  -H "Content-Type: application/json" -d '{"title": "Printer is broken"}'

curl -i -X POST localhost:8080/tickets/<id>/submit  -H "Authorization: Bearer $REQUESTER"
curl -i -X POST localhost:8080/tickets/<id>/approve -H "Authorization: Bearer $REQUESTER"   # 403, wrong role
curl -i -X POST localhost:8080/tickets/<id>/approve -H "Authorization: Bearer $REVIEWER"    # 200
```

A user holding both roles still cannot approve their own ticket:
`devtoken -sub u1 -roles requester,reviewer` gets 403 from the server.

To inspect the database: `docker exec -it ticket-postgres psql -U postgres`.
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

Errors: 400 invalid input, 401 missing or invalid token, 403 not allowed (by role at the
gateway, or by ownership at the server), 404 unknown ticket or route, 409 action not allowed
in the ticket's current state, 502 server unreachable, 503 authorization unavailable.

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

- Migrations assume a single server instance. Two instances starting at the same time
  could try to apply the same file; production setups use a database lock or run
  migrations as a separate deploy step.
- A ticket that does not exist returns 404 while one the caller may not see returns 403,
  so a caller can tell the two apart.
- The server's integration with PostgreSQL and OPA is verified by hand, not by
  automated tests.
- The gateway's latency cost has not been measured yet (step 7 of part 4).
- Terraform state is local and contains the database password in plain text;
  it is excluded from version control.
- Signing keys are generated locally; there is no identity provider.

## Documentation

- [docs/DECISIONS.md](docs/DECISIONS.md): rules of the project and the decision record
- [docs/TICKET.md](docs/TICKET.md): the contract all parts follow
- [docs/REFERENCES.md](docs/REFERENCES.md): sources behind the decisions
- [docs/parts/](docs/parts/): steps and completion criteria for each part
