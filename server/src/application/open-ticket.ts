import { Ticket } from "../domain/ticket.ts";
import type { TicketRepository } from "../domain/ticket-repository.ts";

export class OpenTicket {
  readonly #repository: TicketRepository;
  readonly #generateId: () => string;

  constructor(repository: TicketRepository, generateId: () => string) {
    this.#repository = repository;
    this.#generateId = generateId;
  }

  async execute(input: { title: string; openedBy: string }): Promise<Ticket> {
    const ticket = new Ticket(this.#generateId(), input.title, input.openedBy);
    await this.#repository.save(ticket);
    return ticket;
  }
}