export type TicketStatus = "open" | "in_review" | "approved" | "rejected";

export class InvalidTicketError extends Error {}
export class InvalidTransitionError extends Error {}

export class Ticket {
  readonly id: string;
  readonly title: string;
  readonly openedBy: string;
  #status: TicketStatus = "open";
  #decidedBy: string | null = null;
  #rejectReason: string | null = null;

  constructor(id: string, title: string, openedBy: string) {
    if (title.trim() === "") {
      throw new InvalidTicketError("title boş olamaz");
    }
    this.id = id;
    this.title = title;
    this.openedBy = openedBy;
  }

  static restore(state: {
    id: string;
    title: string;
    openedBy: string;
    status: TicketStatus;
    decidedBy: string | null;
    rejectReason: string | null;
  }): Ticket {
    const ticket = new Ticket(state.id, state.title, state.openedBy);
    ticket.#status = state.status;
    ticket.#decidedBy = state.decidedBy;
    ticket.#rejectReason = state.rejectReason;
    return ticket;
  } 

  get status(): TicketStatus {
    return this.#status;
  }

  get decidedBy(): string | null {
    return this.#decidedBy;
  }

  get rejectReason(): string | null {
    return this.#rejectReason;
  }

  submit(): void {
    if (this.#status !== "open") {
      throw new InvalidTransitionError("sadece open durumunda submit edilebilir");
    }
    this.#status = "in_review";
  }

  approve(decidedBy: string): void {
    if (this.#status !== "in_review") {
      throw new InvalidTransitionError("sadece in_review durumunda approve edilebilir");
    }
    this.#status = "approved";
    this.#decidedBy = decidedBy;
  }

  reject(decidedBy: string, reason: string): void {
    if (this.#status !== "in_review") {
      throw new InvalidTransitionError("sadece in_review durumunda reject edilebilir");
    }
    if (reason.trim() === "") {
      throw new InvalidTicketError("reject bir sebep ister");
    }
    this.#status = "rejected";
    this.#decidedBy = decidedBy;
    this.#rejectReason = reason;
  }
}