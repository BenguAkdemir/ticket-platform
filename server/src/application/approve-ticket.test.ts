import assert from "node:assert/strict";
import { test } from "node:test";
import { Ticket } from "../domain/ticket.ts";
import { InMemoryTicketRepository } from "../infrastructure/in-memory-ticket-repository.ts";
import { ApproveTicket } from "./approve-ticket.ts";
import { TicketNotFoundError } from "./errors.ts";

test("ApproveTicket: ticket'ı approved yapar ve kararı vereni kaydeder", async () => {
  const repository = new InMemoryTicketRepository();
  const ticket = new Ticket("t-1", "Yazıcı bozuk", "u1");
  ticket.submit();
  await repository.save(ticket);
  const approveTicket = new ApproveTicket(repository);

  await approveTicket.execute({ ticketId: "t-1", decidedBy: "u2" });

  const saved = await repository.findById("t-1");
  assert.equal(saved?.status, "approved");
  assert.equal(saved?.decidedBy, "u2");
});

test("ApproveTicket: olmayan ticket için TicketNotFoundError", async () => {
  const repository = new InMemoryTicketRepository();
  const approveTicket = new ApproveTicket(repository);

  await assert.rejects(
    () => approveTicket.execute({ ticketId: "yok", decidedBy: "u2" }),
    TicketNotFoundError,
  );
});