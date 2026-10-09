import type { TicketRepository } from "../domain/ticket-repository.ts";
import { TicketNotFoundError } from "./errors.ts";

export class ApproveTicket {
    readonly #repository: TicketRepository;

    constructor(repository: TicketRepository) {
        this.#repository = repository;
    }
    
    async execute(input: { ticketId: string; decidedBy: string }): Promise<void> {
        const ticket = await this.#repository.findById(input.ticketId);
        if (ticket === null) {
            throw new TicketNotFoundError(`ticket bulunamadı: ${input.ticketId}`);
        }
        ticket.approve(input.decidedBy);
        await this.#repository.save(ticket);
    }
}