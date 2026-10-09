import assert from "node:assert/strict";
import { test } from "node:test";
import { InvalidTicketError, Ticket } from "../domain/ticket.ts";
import { InMemoryTicketRepository } from "../infrastructure/in-memory-ticket-repository.ts";
import { TicketNotFoundError } from "./errors.ts";
import { RejectTicket } from "./reject-ticket.ts";

test("RejectTicket: ticket'ı rejected yapar, kararı vereni ve sebebi kaydeder", async () => {
  const repository = new InMemoryTicketRepository();
  const ticket = new Ticket("t-1", "Yazıcı bozuk", "u1");
  ticket.submit();
  await repository.save(ticket);
  const rejectTicket = new RejectTicket(repository);

  await rejectTicket.execute({ ticketId: "t-1", decidedBy: "u2", reason: "Bütçe yok" });

  const saved = await repository.findById("t-1");
  assert.equal(saved?.status, "rejected");
  assert.equal(saved?.decidedBy, "u2");
  assert.equal(saved?.rejectReason, "Bütçe yok");
});

test("RejectTicket: sebepsiz reject InvalidTicketError verir", async () => {
  const repository = new InMemoryTicketRepository();
  const ticket = new Ticket("t-1", "Yazıcı bozuk", "u1");
  ticket.submit();
  await repository.save(ticket);
  const rejectTicket = new RejectTicket(repository);

  await assert.rejects(
    () => rejectTicket.execute({ ticketId: "t-1", decidedBy: "u2", reason: "  " }),
    InvalidTicketError,
  );
  const saved = await repository.findById("t-1");
  assert.equal(saved?.status, "in_review");
});

test("RejectTicket: olmayan ticket için TicketNotFoundError", async () => {
  const repository = new InMemoryTicketRepository();
  const rejectTicket = new RejectTicket(repository);

  await assert.rejects(
    () => rejectTicket.execute({ ticketId: "yok", decidedBy: "u2", reason: "Bütçe yok" }),
    TicketNotFoundError,
  );
});