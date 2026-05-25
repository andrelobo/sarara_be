const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const SHIFT_STATUSES = Object.freeze({
  OPEN: 'open',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
});

const auditTrailEntrySchema = new Schema(
  {
    event: { type: String, required: true, trim: true },
    at: { type: Date, default: Date.now },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorRole: { type: String, trim: true, default: '' },
    actorName: { type: String, trim: true, default: '' },
    details: { type: Schema.Types.Mixed, default: null },
  },
  { _id: true },
);

const paymentTotalsSchema = new Schema(
  {
    cash: { type: Number, default: 0, min: 0 },
    pix: { type: Number, default: 0, min: 0 },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    voucher: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const shiftTotalsSchema = new Schema(
  {
    commandsCount: { type: Number, default: 0, min: 0 },
    paymentCount: { type: Number, default: 0, min: 0 },
    salesTotal: { type: Number, default: 0, min: 0 },
    serviceTaxTotal: { type: Number, default: 0, min: 0 },
    payments: { type: paymentTotalsSchema, default: () => ({}) },
    computedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const shiftSchema = new Schema(
  {
    waiterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    openedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: Object.values(SHIFT_STATUSES),
      default: SHIFT_STATUSES.OPEN,
    },
    notes: { type: String, trim: true, default: '' },
    totalsSnapshot: { type: shiftTotalsSchema, default: null },
    auditTrail: [auditTrailEntrySchema],
  },
  {
    timestamps: true,
  },
);

const Shift = model('Shift', shiftSchema);

module.exports = {
  Shift,
  SHIFT_STATUSES,
};
