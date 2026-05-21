const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const COMMAND_STATUSES = Object.freeze({
  OPEN: 'open',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
});

const COMMAND_ITEM_STATUSES = Object.freeze({
  PENDING: 'pending',
  PREPARING: 'preparing',
  DELIVERED: 'delivered',
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

const paymentSchema = new Schema(
  {
    method: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paidAt: { type: Date, default: Date.now },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: true },
);

const commandItemSchema = new Schema(
  {
    productType: { type: String, trim: true, default: '' },
    productId: { type: Schema.Types.ObjectId, default: null },
    nameSnapshot: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: Object.values(COMMAND_ITEM_STATUSES),
      default: COMMAND_ITEM_STATUSES.PENDING,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const commandSchema = new Schema(
  {
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: true },
    waiterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: Object.values(COMMAND_STATUSES),
      default: COMMAND_STATUSES.OPEN,
    },
    items: [commandItemSchema],
    subtotal: { type: Number, default: 0, min: 0 },
    serviceTax: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
    payments: [paymentSchema],
    syncMetadata: { type: Schema.Types.Mixed, default: null },
    auditTrail: [auditTrailEntrySchema],
  },
  {
    timestamps: true,
  },
);

const Command = model('Command', commandSchema);

module.exports = {
  Command,
  COMMAND_STATUSES,
  COMMAND_ITEM_STATUSES,
};
