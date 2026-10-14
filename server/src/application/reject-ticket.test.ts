import assert from "node:assert/strict";
import { test } from "node:test";
import { InvalidTicketError, Ticket } from "../domain/ticket.ts";
import { InMemoryTicketRepository } from "../infrastructure/in-memory-ticket-repository.ts";
import { TicketNotFoundError } from "./errors.ts";
import { RejectTicket } from "./reject-ticket.ts";
import type { AccessPolicy } from "./access-policy.ts";

const allowAll: AccessPolicy = { allows: async () => true };

test("RejectTicket: ticket'ı rejected yapar, kararı vereni ve sebebi kaydeder", async () => {
  const repository = new InMemoryTicketRepository();
  const ticket = new Ticket("t-1", "Yazıcı bozuk", "u1");
  ticket.submit();
  await repository.save(ticket);
  const rejectTicket = new RejectTicket(repository, allowAll);

  await rejectTicket.execute({ ticketId: "t-1", actor: { id: "u2", roles: ["reviewer"] }, reason: "Bütçe yok" });

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
  const rejectTicket = new RejectTicket(repository, allowAll);

  await assert.rejects(
    () => rejectTicket.execute({ ticketId: "t-1", actor: { id: "u2", roles: ["reviewer"] }, reason: "  " }),
    InvalidTicketError,
  );
  const saved = await repository.findById("t-1");
  assert.equal(saved?.status, "in_review");
});

test("RejectTicket: olmayan ticket için TicketNotFoundError", async () => {
  const repository = new InMemoryTicketRepository();
  const rejectTicket = new RejectTicket(repository, allowAll);

  await assert.rejects(
    () => rejectTicket.execute({ ticketId: "yok", actor: { id: "u2", roles: ["reviewer"] }, reason: "Bütçe yok" }),
    TicketNotFoundError,
  );
});