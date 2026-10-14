import type { Ticket } from "../domain/ticket.ts";
import type { TicketRepository } from "../domain/ticket-repository.ts";
import { ForbiddenError, TicketNotFoundError } from "./errors.ts";

export interface Actor {
  id: string;
  roles: string[];
}

export type TicketAction = "ticket:read" | "ticket:submit" | "ticket:approve" | "ticket:reject";

export interface AccessPolicy {
  allows(actor: Actor, action: TicketAction, ticket: Ticket): Promise<boolean>;
}

export async function loadTicketFor(
  repository: TicketRepository,
  policy: AccessPolicy,
  ticketId: string,
  actor: Actor,
  action: TicketAction,
): Promise<Ticket> {
  const ticket = await repository.findById(ticketId);
  if (ticket === null) {
    throw new TicketNotFoundError(`ticket bulunamadı: ${ticketId}`);
  }
  if (!(await policy.allows(actor, action, ticket))) {
    throw new ForbiddenError(`${action} için izin yok`);
  }
  return ticket;
}