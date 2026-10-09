import assert from "node:assert/strict";
import { test } from "node:test";
import { InvalidTicketError, InvalidTransitionError, Ticket } from "./ticket.ts";

function inReviewTicket(): Ticket {
  const ticket = new Ticket("t-1", "Yazıcı bozuk", "u1");
  ticket.submit();
  return ticket;
}

test("yeni ticket open durumunda başlar", () => {
  const ticket = new Ticket("t-1", "Yazıcı bozuk", "u1");
  assert.equal(ticket.status, "open");
  assert.equal(ticket.decidedBy, null);
  assert.equal(ticket.rejectReason, null);
});

test("S1: title boş olamaz", () => {
  assert.throws(() => new Ticket("t-1", "   ", "u1"), InvalidTicketError);
});

test("S2: open ticket submit edilince in_review olur", () => {
  const ticket = new Ticket("t-1", "Yazıcı bozuk", "u1");
  ticket.submit();
  assert.equal(ticket.status, "in_review");
});

test("S2: in_review ticket tekrar submit edilemez", () => {
  const ticket = inReviewTicket();
  assert.throws(() => ticket.submit(), InvalidTransitionError);
});

test("S3: in_review ticket approve edilir ve kararı veren kaydedilir", () => {
  const ticket = inReviewTicket();
  ticket.approve("u2");
  assert.equal(ticket.status, "approved");
  assert.equal(ticket.decidedBy, "u2");
});

test("S3: open ticket approve edilemez", () => {
  const ticket = new Ticket("t-1", "Yazıcı bozuk", "u1");
  assert.throws(() => ticket.approve("u2"), InvalidTransitionError);
});

test("S3: in_review ticket reject edilir, kararı veren ve sebep kaydedilir", () => {
  const ticket = inReviewTicket();
  ticket.reject("u2", "Bütçe yok");
  assert.equal(ticket.status, "rejected");
  assert.equal(ticket.decidedBy, "u2");
  assert.equal(ticket.rejectReason, "Bütçe yok");
});

test("S3: open ticket reject edilemez", () => {
  const ticket = new Ticket("t-1", "Yazıcı bozuk", "u1");
  assert.throws(() => ticket.reject("u2", "Bütçe yok"), InvalidTransitionError);
});

test("S4: sebepsiz reject reddedilir ve ticket değişmez", () => {
  const ticket = inReviewTicket();
  assert.throws(() => ticket.reject("u2", "   "), InvalidTicketError);
  assert.equal(ticket.status, "in_review");
  assert.equal(ticket.decidedBy, null);
});

test("S5: approved ticket bir daha değişmez", () => {
  const ticket = inReviewTicket();
  ticket.approve("u2");
  assert.throws(() => ticket.submit(), InvalidTransitionError);
  assert.throws(() => ticket.approve("u2"), InvalidTransitionError);
  assert.throws(() => ticket.reject("u2", "Bütçe yok"), InvalidTransitionError);
});

test("S5: rejected ticket bir daha değişmez", () => {
  const ticket = inReviewTicket();
  ticket.reject("u2", "Bütçe yok");
  assert.throws(() => ticket.submit(), InvalidTransitionError);
  assert.throws(() => ticket.approve("u2"), InvalidTransitionError);
  assert.throws(() => ticket.reject("u2", "Bütçe yok"), InvalidTransitionError);
});