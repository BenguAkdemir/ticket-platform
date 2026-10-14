import express from "express";
import type { ErrorRequestHandler, Express, Request } from "express";
import type { Actor } from "../application/access-policy.ts";
import type { ApproveTicket } from "../application/approve-ticket.ts";
import { AuthorizationUnavailableError, ForbiddenError, TicketNotFoundError } from "../application/errors.ts";
import type { GetTicket } from "../application/get-ticket.ts";
import type { OpenTicket } from "../application/open-ticket.ts";
import type { RejectTicket } from "../application/reject-ticket.ts";
import type { SubmitTicket } from "../application/submit-ticket.ts";
import { InvalidTicketError, InvalidTransitionError } from "../domain/ticket.ts";
import type { Ticket } from "../domain/ticket.ts";

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

// Gateway'in yazdığı iki header'dan "kim soruyor?" bilgisini kurar.
function actorFrom(req: Request): Actor {
  const id = req.header("x-user-id");
  if (id === undefined || id.trim() === "") {
    throw new MissingUserError("X-User-Id header'ı gerekli");
  }
  const roles = (req.header("x-user-roles") ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter((r) => r !== "");
  return { id, roles };
}

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof MissingUserError) {
    res.status(401).json({ error: error.message });
  } else if (error instanceof InvalidTicketError) {
    res.status(400).json({ error: error.message });
  } else if (error instanceof ForbiddenError) {
    res.status(403).json({ error: error.message });
  } else if (error instanceof TicketNotFoundError) {
    res.status(404).json({ error: error.message });
  } else if (error instanceof InvalidTransitionError) {
    res.status(409).json({ error: error.message });
  } else if (error instanceof AuthorizationUnavailableError) {
    console.error(error);
    res.status(503).json({ error: "yetki kontrolü şu an yapılamıyor" });
  } else {
    console.error(error);
    res.status(500).json({ error: "beklenmeyen hata" });
  }
};

export function createApp(useCases: UseCases): Express {
  const app = express();
  app.use(express.json());
  app.disable("x-powered-by");

  app.get("/healthz", (_req, res) => {
    res.send("ok\n");
  });

  app.post("/tickets", async (req, res) => {
    const actor = actorFrom(req);
    const title = typeof req.body?.title === "string" ? req.body.title : "";
    const ticket = await useCases.openTicket.execute({ title, openedBy: actor.id });
    res.status(201).json(toResponse(ticket));
  });

  app.get("/tickets/:id", async (req, res) => {
    const ticket = await useCases.getTicket.execute({ ticketId: req.params.id, actor: actorFrom(req) });
    res.json(toResponse(ticket));
  });

  app.post("/tickets/:id/submit", async (req, res) => {
    const ticket = await useCases.submitTicket.execute({ ticketId: req.params.id, actor: actorFrom(req) });
    res.json(toResponse(ticket));
  });

  app.post("/tickets/:id/approve", async (req, res) => {
    const ticket = await useCases.approveTicket.execute({ ticketId: req.params.id, actor: actorFrom(req) });
    res.json(toResponse(ticket));
  });

  app.post("/tickets/:id/reject", async (req, res) => {
    const reason = typeof req.body?.reason === "string" ? req.body.reason : "";
    const ticket = await useCases.rejectTicket.execute({ ticketId: req.params.id, actor: actorFrom(req), reason });
    res.json(toResponse(ticket));
  });

  app.use(errorHandler);
  return app;
}