import type { Ticket } from "../domain/ticket.ts";
import type { TicketRepository } from "../domain/ticket-repository.ts";
import { loadTicketFor } from "./access-policy.ts";
import type { AccessPolicy, Actor } from "./access-policy.ts";

export class RejectTicket {
  readonly #repository: TicketRepository;
  readonly #policy: AccessPolicy;

  constructor(repository: TicketRepository, policy: AccessPolicy) {
    this.#repository = repository;
    this.#policy = policy;
  }

  async execute(input: { ticketId: string; actor: Actor; reason: string }): Promise<Ticket> {
    const ticket = await loadTicketFor(this.#repository, this.#policy, input.ticketId, input.actor, "ticket:reject");
    ticket.reject(input.actor.id, input.reason);
    await this.#repository.save(ticket);
    return ticket;
  }
}