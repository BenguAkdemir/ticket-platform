import type { Ticket } from "../domain/ticket.ts";
import type { TicketRepository } from "../domain/ticket-repository.ts";
import { loadTicketFor } from "./access-policy.ts";
import type { AccessPolicy, Actor } from "./access-policy.ts";

export class GetTicket {
    readonly #repository: TicketRepository;
    readonly #policy: AccessPolicy;

    constructor(repository: TicketRepository , policy: AccessPolicy) {
        this.#repository = repository;
        this.#policy = policy;
    }

    async execute(input: { ticketId: string; actor: Actor }): Promise<Ticket> {
        return await loadTicketFor(this.#repository, this.#policy, input.ticketId, input.actor, "ticket:read");
    }
}