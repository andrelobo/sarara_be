const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const TABLE_STATUSES = Object.freeze({
  FREE: 'free',
  OCCUPIED: 'occupied',
  CLOSING: 'closing',
  RESERVED: 'reserved',
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

const tableSchema = new Schema(
  {
    number: { type: Number, required: true, min: 1 },
    name: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: Object.values(TABLE_STATUSES),
      default: TABLE_STATUSES.FREE,
    },
    openedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    currentCommandId: { type: Schema.Types.ObjectId, ref: 'Command', default: null },
    waiterId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
    auditTrail: [auditTrailEntrySchema],
  },
  {
    timestamps: true,
  },
);

const Table = model('Table', tableSchema);

module.exports = {
  Table,
  TABLE_STATUSES,
};
