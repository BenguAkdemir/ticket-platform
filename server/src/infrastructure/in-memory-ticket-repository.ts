import type { Ticket } from "../domain/ticket.ts";
import type { TicketRepository } from "../domain/ticket-repository.ts";

export class InMemoryTicketRepository implements TicketRepository {
  readonly #tickets = new Map<string, Ticket>();

  async save(ticket: Ticket): Promise<void> {
    this.#tickets.set(ticket.id, ticket);
  }

  async findById(id: string): Promise<Ticket | null> {
    return this.#tickets.get(id) ?? null;
  }
}