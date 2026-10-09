import type { Pool } from "pg";
import { Ticket } from "../domain/ticket.ts";
import type { TicketStatus } from "../domain/ticket.ts";
import type { TicketRepository } from "../domain/ticket-repository.ts";

interface TicketRow {
  id: string;
  title: string;
  status: TicketStatus;
  opened_by: string;
  decided_by: string | null;
  reject_reason: string | null;
}

export class PostgresTicketRepository implements TicketRepository {
  readonly #pool: Pool;

  constructor(pool: Pool) {
    this.#pool = pool;
  }

  async save(ticket: Ticket): Promise<void> {
    await this.#pool.query(
      `INSERT INTO tickets (id, title, status, opened_by, decided_by, reject_reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         decided_by = EXCLUDED.decided_by,
         reject_reason = EXCLUDED.reject_reason`,
      [ticket.id, ticket.title, ticket.status, ticket.openedBy, ticket.decidedBy, ticket.rejectReason],
    );
  }

  async findById(id: string): Promise<Ticket | null> {
    const result = await this.#pool.query<TicketRow>(
      "SELECT id, title, status, opened_by, decided_by, reject_reason FROM tickets WHERE id = $1",
      [id],
    );
    const row = result.rows[0];
    if (row === undefined) {
      return null;
    }
    return Ticket.restore({
      id: row.id,
      title: row.title,
      openedBy: row.opened_by,
      status: row.status,
      decidedBy: row.decided_by,
      rejectReason: row.reject_reason,
    });
  }
}