import type { Ticket } from "../domain/ticket.ts";
import type { TicketRepository } from "../domain/ticket-repository.ts";
import { TicketNotFoundError } from "./errors.ts";

export class GetTicket {
    readonly #repository: TicketRepository;

    constructor(repository: TicketRepository) {
        this.#repository = repository;
    }

    async execute(input: { ticketId: string }): Promise<Ticket> {
        const ticket = await this.#repository.findById(input.ticketId);
        if (ticket === null) {
            throw new TicketNotFoundError(`ticket bulunamadı: ${input.ticketId}`);
        }
        return ticket;
    }
}