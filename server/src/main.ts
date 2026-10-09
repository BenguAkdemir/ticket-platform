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

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined){
    throw new Error("DATABASE_URL environment variable is not set");
}
const repository = new PostgresTicketRepository(new pg.Pool({ connectionString: databaseUrl }));

const app = createApp({
  openTicket: new OpenTicket(repository, randomUUID),
  getTicket: new GetTicket(repository),
  submitTicket: new SubmitTicket(repository),
  approveTicket: new ApproveTicket(repository),
  rejectTicket: new RejectTicket(repository),
});

app.listen(3000, () => {
  console.log("server: http://localhost:3000");
});