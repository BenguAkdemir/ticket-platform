import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { ApproveTicket } from "./application/approve-ticket.ts";
import { GetTicket } from "./application/get-ticket.ts";
import { OpenTicket } from "./application/open-ticket.ts";
import { RejectTicket } from "./application/reject-ticket.ts";
import { SubmitTicket } from "./application/submit-ticket.ts";
import { createApp } from "./http/app.ts";
import { migrate } from "./infrastructure/migrate.ts";
import { OpaAccessPolicy } from "./infrastructure/opa-access-policy.ts";
import { PostgresTicketRepository } from "./infrastructure/postgres-ticket-repository.ts";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} environment variable is not set`);
  }
  return value;
}

const pool = new pg.Pool({ connectionString: requireEnv("DATABASE_URL") });
const applied = await migrate(pool, fileURLToPath(new URL("../sql", import.meta.url)));
console.log(`server: migrations applied: ${applied.length > 0 ? applied.join(", ") : "none"}`);

const repository = new PostgresTicketRepository(pool);
const policy = new OpaAccessPolicy(requireEnv("OPA_URL"));

const app = createApp({
  openTicket: new OpenTicket(repository, randomUUID),
  getTicket: new GetTicket(repository, policy),
  submitTicket: new SubmitTicket(repository, policy),
  approveTicket: new ApproveTicket(repository, policy),
  rejectTicket: new RejectTicket(repository, policy),
});

const server = app.listen(3000, () => {
  console.log("server: listening on 3000");
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    console.log(`server: ${signal} received, shutting down`);
    server.close(() => {
      pool.end().then(() => process.exit(0));
    });
  });
}