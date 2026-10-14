import assert from "node:assert/strict";
import { test } from "node:test";
import { Ticket } from "../domain/ticket.ts";
import { InMemoryTicketRepository } from "../infrastructure/in-memory-ticket-repository.ts";
import type { AccessPolicy } from "./access-policy.ts";
import { ApproveTicket } from "./approve-ticket.ts";
import { ForbiddenError, TicketNotFoundError } from "./errors.ts";

const allowAll: AccessPolicy = { allows: async () => true };
const denyAll: AccessPolicy = { allows: async () => false };
const reviewer = { id: "u2", roles: ["reviewer"] };

async function repositoryWithSubmittedTicket() {
  const repository = new InMemoryTicketRepository();
  const ticket = new Ticket("t-1", "Yazıcı bozuk", "u1");
  ticket.submit();
  await repository.save(ticket);
  return repository;
}

test("ApproveTicket: ticket'ı approved yapar ve kararı vereni kaydeder", async () => {
  const repository = await repositoryWithSubmittedTicket();

  await new ApproveTicket(repository, allowAll).execute({ ticketId: "t-1", actor: reviewer });

  const saved = await repository.findById("t-1");
  assert.equal(saved?.status, "approved");
  assert.equal(saved?.decidedBy, "u2");
});

test("ApproveTicket: izin yoksa ForbiddenError ve ticket değişmez", async () => {
  const repository = await repositoryWithSubmittedTicket();

  await assert.rejects(
    () => new ApproveTicket(repository, denyAll).execute({ ticketId: "t-1", actor: reviewer }),
    ForbiddenError,
  );

  const saved = await repository.findById("t-1");
  assert.equal(saved?.status, "in_review");
});

test("ApproveTicket: olmayan ticket için TicketNotFoundError", async () => {
  const repository = new InMemoryTicketRepository();

  await assert.rejects(
    () => new ApproveTicket(repository, allowAll).execute({ ticketId: "yok", actor: reviewer }),
    TicketNotFoundError,
  );
});