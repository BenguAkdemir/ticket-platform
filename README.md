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
| 3 | `policy/` | Authorization rules separated from code (OPA, Rego) | Planned |
| 4 | `gateway/` | Reverse proxy and middleware chain (Go) | Planned |
| 5 | Wiring | Everything started with a single `terraform apply` | Planned |

## Architecture

Target request path once all parts are in place:

```
client -> gateway (Go) -> server (Node.js) -> PostgreSQL
              |                |
              +----- OPA ------+
```

What runs today: `server` talking to PostgreSQL, both described below.

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

## Design decisions

| Decision | Reasoning |
|----------|-----------|
| State rules live in the `Ticket` class | A ticket cannot be put into an invalid state, because its status is a private field changed only by its own methods. Use cases do not repeat the rules. |
| Repository interface is defined in `domain/` | Use cases depend on the contract, not on a database. Switching from the in-memory repository to PostgreSQL changed no file in `application/` or `http/`. |
| Manual dependency injection, no framework | Dependencies are passed through constructors and wired in one place (`main.ts`), so the mechanism stays visible. |
| Domain errors, HTTP status codes mapped at the edge | The domain throws `InvalidTicketError` or `InvalidTransitionError`; only the HTTP layer knows these mean 400 and 409. |
| Parameterized SQL only | Values are sent separately from the query text, which rules out SQL injection by construction. |
| Authorization kept out of the server for now | "Who may do what" is a separate concern and will live in OPA, not in the domain. |
| PostgreSQL in its own Terraform module | The module exposes only variables and outputs; it was moved there with `moved` blocks so no resource was recreated. |
| Secrets stay out of the code | The database password is a sensitive variable supplied through an untracked `terraform.tfvars`; the server reads its connection string from `DATABASE_URL`. |

The full decision record, with sources, is in [docs/DECISIONS.md](docs/DECISIONS.md)
and [docs/REFERENCES.md](docs/REFERENCES.md) (written in Turkish).

## Running it locally

Requirements: Docker, Terraform 1.12 or newer, Node.js 24.

**1. Infrastructure**

```bash
cd infra
echo 'db_password = "choose-a-password"' > terraform.tfvars
terraform init
terraform apply
```

**2. Database schema**

```bash
cd ../server
docker exec -i ticket-postgres psql -U postgres < sql/001_tickets.sql
```

**3. Server**

```bash
npm install
export DATABASE_URL=$(cd ../infra && terraform output -raw db_url)
npm start
```

**4. Try it**

```bash
curl -s -X POST localhost:3000/tickets \
  -H "Content-Type: application/json" -H "X-User-Id: u1" \
  -d '{"title": "Printer is broken"}'

curl -i -X POST localhost:3000/tickets/<id>/submit  -H "X-User-Id: u1"
curl -i -X POST localhost:3000/tickets/<id>/approve -H "X-User-Id: u2"
```

To remove everything: `cd infra && terraform destroy`.

## API

| Method and path | Purpose | Success |
|-----------------|---------|---------|
| `POST /tickets` | Open a ticket | 201 |
| `GET /tickets/{id}` | Read a ticket | 200 |
| `POST /tickets/{id}/submit` | Send for review | 200 |
| `POST /tickets/{id}/approve` | Approve | 200 |
| `POST /tickets/{id}/reject` | Reject, with a reason | 200 |

Errors: 400 invalid input, 401 missing `X-User-Id`, 404 unknown ticket,
409 action not allowed in the ticket's current state.

## Tests

```bash
cd server
npm test            # unit tests for the domain and the use cases
npm run typecheck   # TypeScript, no emit
```

The tests run without a database or an HTTP server: the domain and use cases are
exercised directly, with the in-memory repository standing in for PostgreSQL.

## Known limitations

- No authorization yet: any caller can approve any ticket. This is part 3.
- The server trusts the `X-User-Id` header. That is only acceptable once the
  gateway (part 4) is the sole way to reach it.
- The schema is applied by hand and must be re-applied after `terraform destroy`.
- The PostgreSQL repository is verified manually, not by an automated test.
- Terraform state is local and contains the database password in plain text;
  it is excluded from version control.

## Documentation

- [docs/DECISIONS.md](docs/DECISIONS.md): rules of the project and the decision record
- [docs/TICKET.md](docs/TICKET.md): the contract all parts follow
- [docs/REFERENCES.md](docs/REFERENCES.md): sources behind the decisions
- [docs/parts/](docs/parts/): steps and completion criteria for each part
