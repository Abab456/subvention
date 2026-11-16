export class AppError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export function ensure(ok, status, code, message) { if (!ok) throw new AppError(status, code, message); }
export function text(value, max = 200) {
  ensure(typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value), 400, 'INVALID_TEXT', 'A bounded nonempty text value is required.');
  return value.trim();
}
export function integer(value, min, max) {
  ensure(Number.isSafeInteger(value) && value >= min && value <= max, 400, 'INVALID_AMOUNT', 'Use an integer within the documented range.'); return value;
}
export function fields(object, allowed) {
  ensure(object && typeof object === 'object' && !Array.isArray(object), 400, 'INVALID_BODY', 'A JSON object is required.');
  ensure(Object.keys(object).every(k => allowed.includes(k)), 400, 'UNEXPECTED_FIELD', 'Unexpected fields are not accepted.');
}
export function successFeeCents(receivedCents, basisPoints) {
  integer(receivedCents, 1, 1_000_000_000); integer(basisPoints, 0, 3000);
  return Number((BigInt(receivedCents) * BigInt(basisPoints) + 5000n) / 10000n);
}
export const CASE_TRANSITIONS = Object.freeze({
  review: ['awaiting_documents'], awaiting_documents: ['ready_for_approval'],
  ready_for_approval: ['submitted', 'awaiting_documents'], submitted: ['administrator_review'],
  administrator_review: ['approved', 'partially_approved', 'refused'], approved: ['awaiting_payment'],
  partially_approved: ['awaiting_payment'], awaiting_payment: ['paid'], refused: ['closed'], paid: ['closed'], closed: []
});
