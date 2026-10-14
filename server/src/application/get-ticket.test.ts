import assert from "node:assert/strict";
import { test } from "node:test";
import { Ticket } from "../domain/ticket.ts";
import { InMemoryTicketRepository } from "../infrastructure/in-memory-ticket-repository.ts";
import { TicketNotFoundError } from "./errors.ts";
import { GetTicket } from "./get-ticket.ts";
import type { AccessPolicy } from "./access-policy.ts";

const allowAll: AccessPolicy = { allows: async () => true };

test("GetTicket: ticket'ı döndürür", async () => {
  const repository = new InMemoryTicketRepository();
  await repository.save(new Ticket("t-1", "Yazıcı bozuk", "u1"));
  const getTicket = new GetTicket(repository, allowAll);

  const ticket = await getTicket.execute({ ticketId: "t-1", actor: { id: "u1", roles: ["requester"] } });

  assert.equal(ticket.id, "t-1");
  assert.equal(ticket.title, "Yazıcı bozuk");
  assert.equal(ticket.status, "open");
});

test("GetTicket: olmayan ticket için TicketNotFoundError", async () => {
  const repository = new InMemoryTicketRepository();
  const getTicket = new GetTicket(repository, allowAll);

  await assert.rejects(
    () => getTicket.execute({ ticketId: "yok", actor: { id: "u1", roles: ["requester"] } }),
    TicketNotFoundError,
  );
});