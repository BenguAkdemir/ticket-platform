import express from "express";
import type { ErrorRequestHandler, Express } from "express";
import { TicketNotFoundError } from "../application/errors.ts";
import type { GetTicket } from "../application/get-ticket.ts";
import type { OpenTicket } from "../application/open-ticket.ts";
import { InvalidTicketError, InvalidTransitionError } from "../domain/ticket.ts";
import type { Ticket } from "../domain/ticket.ts";
import type { SubmitTicket } from "../application/submit-ticket.ts";
import type { ApproveTicket } from "../application/approve-ticket.ts"; 
import type { RejectTicket } from "../application/reject-ticket.ts";

export interface UseCases {
  openTicket: OpenTicket;
  getTicket: GetTicket;
  submitTicket: SubmitTicket;
  approveTicket: ApproveTicket;
  rejectTicket: RejectTicket;
}

class MissingUserError extends Error {}

function toResponse(ticket: Ticket) {
  return {
    id: ticket.id,
    title: ticket.title,
    status: ticket.status,
    openedBy: ticket.openedBy,
    decidedBy: ticket.decidedBy,
    rejectReason: ticket.rejectReason,
  };
}

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof MissingUserError) {
    res.status(401).json({ error: error.message });
  } else if (error instanceof InvalidTicketError) {
    res.status(400).json({ error: error.message });
  } else if (error instanceof TicketNotFoundError) {
    res.status(404).json({ error: error.message });
  } else if (error instanceof InvalidTransitionError) {
    res.status(409).json({ error: error.message });
  } else {
    console.error(error);
    res.status(500).json({ error: "beklenmeyen hata" });
  }
};

export function createApp(useCases: UseCases): Express {
  const app = express();
  app.use(express.json());

  function userId(header: string | undefined): string {
    if (header === undefined || header.trim() === "") {
      throw new MissingUserError("X-User-Id header'ı gerekli");
    }
    return header;
  }

    app.disable("x-powered-by");

  app.get("/healthz", (_req, res) => {
    res.send("ok\n");
  });

  app.post("/tickets", async (req, res) => {
    const openedBy = userId(req.header("x-user-id"));
    const title = typeof req.body?.title === "string" ? req.body.title : "";
    const ticket = await useCases.openTicket.execute({ title, openedBy });
    res.status(201).json(toResponse(ticket));
  });

  app.get("/tickets/:id", async (req, res) => {
    userId(req.header("x-user-id"));
    const ticket = await useCases.getTicket.execute({ ticketId: req.params.id });
    res.json(toResponse(ticket));
  });

  app.post("/tickets/:id/submit", async (req, res) => {
    userId(req.header("x-user-id"));
    await useCases.submitTicket.execute({ ticketId: req.params.id });
    const ticket = await useCases.getTicket.execute({ ticketId: req.params.id });
    res.json(toResponse(ticket));
  });

  app.post("/tickets/:id/approve", async (req, res) => {
    const decidedBy = userId(req.header("x-user-id"));
    await useCases.approveTicket.execute({ ticketId: req.params.id, decidedBy });
    const ticket = await useCases.getTicket.execute({ ticketId: req.params.id });
    res.json(toResponse(ticket));
  });

  app.post("/tickets/:id/reject", async (req, res) => {
    const decidedBy = userId(req.header("x-user-id"));
    const reason = typeof req.body?.reason === "string" ? req.body.reason : "";
    await useCases.rejectTicket.execute({ ticketId: req.params.id, decidedBy, reason });
    const ticket = await useCases.getTicket.execute({ ticketId: req.params.id });
    res.json(toResponse(ticket));
  });

  app.use(errorHandler);
  return app;
}