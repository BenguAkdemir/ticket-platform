import assert from "node:assert/strict";
import { test } from "node:test";
import { InvalidTicketError } from "../domain/ticket.ts";
import { InMemoryTicketRepository } from "../infrastructure/in-memory-ticket-repository.ts";
import { OpenTicket } from "./open-ticket.ts";

test("OpenTicket: ticket yaratır ve kaydeder", async () => {
  const repository = new InMemoryTicketRepository();
  const openTicket = new OpenTicket(repository, () => "t-1");

  const ticket = await openTicket.execute({ title: "Yazıcı bozuk", openedBy: "u1" });

  assert.equal(ticket.id, "t-1");
  assert.equal(ticket.status, "open");
  const saved = await repository.findById("t-1");
  assert.equal(saved?.openedBy, "u1");
});

test("OpenTicket: geçersiz title ile hiçbir şey kaydedilmez", async () => {
  const repository = new InMemoryTicketRepository();
  const openTicket = new OpenTicket(repository, () => "t-1");

  await assert.rejects(
    () => openTicket.execute({ title: "  ", openedBy: "u1" }),
    InvalidTicketError,
  );
  assert.equal(await repository.findById("t-1"), null);
});