import assert from "node:assert/strict";
import { test } from "node:test";
import { Ticket } from "../domain/ticket.ts";
import { InMemoryTicketRepository } from "../infrastructure/in-memory-ticket-repository.ts";
import { TicketNotFoundError } from "./errors.ts";
import { SubmitTicket } from "./submit-ticket.ts";
import type { AccessPolicy } from "./access-policy.ts";

const allowAll: AccessPolicy = { allows: async () => true };

test("SubmitTicket: ticket'ı in_review yapar ve kaydeder", async () => {
  const repository = new InMemoryTicketRepository();
  await repository.save(new Ticket("t-1", "Yazıcı bozuk", "u1"));
  const submitTicket = new SubmitTicket(repository, allowAll);

  await submitTicket.execute({ ticketId: "t-1", actor: { id: "u1", roles: ["requester"] } });

  const saved = await repository.findById("t-1");
  assert.equal(saved?.status, "in_review");
});

test("SubmitTicket: olmayan ticket için TicketNotFoundError", async () => {
  const repository = new InMemoryTicketRepository();
  const submitTicket = new SubmitTicket(repository, allowAll);

  await assert.rejects(
    () => submitTicket.execute({ ticketId: "yok", actor: { id: "u1", roles: ["requester"] } }),
    TicketNotFoundError,
  );
});