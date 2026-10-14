import { randomUUID } from "node:crypto";
import { GetTicket } from "./application/get-ticket.ts";
import { OpenTicket } from "./application/open-ticket.ts";
import { createApp } from "./http/app.ts";
import { InMemoryTicketRepository } from "./infrastructure/in-memory-ticket-repository.ts";
import { SubmitTicket } from "./application/submit-ticket.ts";
import { ApproveTicket } from "./application/approve-ticket.ts";
import { RejectTicket } from "./application/reject-ticket.ts";
import pg from "pg";
import { PostgresTicketRepository } from "./infrastructure/postgres-ticket-repository.ts";
import { migrate } from "./infrastructure/migrate.ts";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined){
    throw new Error("DATABASE_URL environment variable is not set");
}
const pool = new pg.Pool({ connectionString: databaseUrl });
const applied = await migrate(pool, fileURLToPath(new URL("../sql", import.meta.url)));
console.log(`server: migrations applied: ${applied.length > 0 ? applied.join(", ") : "none"}`);
const repository = new PostgresTicketRepository(pool);

const app = createApp({
  openTicket: new OpenTicket(repository, randomUUID),
  getTicket: new GetTicket(repository),
  submitTicket: new SubmitTicket(repository),
  approveTicket: new ApproveTicket(repository),
  rejectTicket: new RejectTicket(repository),
});

const server = app.listen(3000, () => {
  console.log("server: listening on 3000");""
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    console.log(`server: ${signal} received, shutting down`);
    server.close(() => {
      pool.end().then(() => process.exit(0));
    });
  });
}