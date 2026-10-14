import { AuthorizationUnavailableError } from "../application/errors.ts";
import type { AccessPolicy, Actor, TicketAction } from "../application/access-policy.ts";
import type { Ticket } from "../domain/ticket.ts";

export class OpaAccessPolicy implements AccessPolicy {
  readonly #url: string;
  readonly #timeoutMs: number;

  constructor(baseUrl: string, timeoutMs = 500) {
    this.#url = `${baseUrl}/v1/data/ticket/authz/allowed`;
    this.#timeoutMs = timeoutMs;
  }

  async allows(actor: Actor, action: TicketAction, ticket: Ticket): Promise<boolean> {
    let response: Response;
    try {
      response = await fetch(this.#url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            subject: { id: actor.id, roles: actor.roles },
            action,
            resource: { openedBy: ticket.openedBy },
          },
        }),
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch (error) {
      throw new AuthorizationUnavailableError("OPA'ya ulaşılamadı", { cause: error });
    }

    if (!response.ok) {
      throw new AuthorizationUnavailableError(`OPA ${response.status} döndü`);
    }
    const body = (await response.json()) as { result?: unknown };
    if (typeof body.result !== "boolean") {
      throw new AuthorizationUnavailableError("OPA karar dönmedi");
    }
    return body.result;
  }
}