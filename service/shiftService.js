const mongoose = require('mongoose');
const User = require('../models/userModel');
const { Command, COMMAND_STATUSES } = require('../models/commandModel');
const { Shift, SHIFT_STATUSES } = require('../models/shiftModel');
const { USER_ROLES, USER_STATUSES } = require('../constants/userAccess');
const { appendAuditEntry } = require('../utils/salonAudit');
const {
  buildShiftTotals,
  normalizeShiftDateRange,
  normalizeShiftNotes,
  resolveShiftWaiterId,
} = require('../utils/shiftRules');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const serializeShift = (shiftDocument, computedTotals = null) => {
  const shift = typeof shiftDocument.toObject === 'function' ? shiftDocument.toObject() : { ...shiftDocument };

  if (computedTotals) {
    shift.computedTotals = computedTotals;
  }

  return shift;
};

const canAccessShift = (currentUser, shift) => {
  if (!currentUser || !shift) {
    return false;
  }

  if ([USER_ROLES.ADMIN, USER_ROLES.MANAGER].includes(currentUser.role)) {
    return true;
  }

  return String(shift.waiterId) === String(currentUser._id);
};

const buildShiftCommandFilter = (shift, rangeEnd = null) => ({
  waiterId: shift.waiterId,
  status: COMMAND_STATUSES.CLOSED,
  closedAt: {
    $gte: shift.openedAt,
    $lte: rangeEnd || shift.closedAt || new Date(),
  },
});

const loadShiftCommands = async (shift, rangeEnd = null) =>
  Command.find(buildShiftCommandFilter(shift, rangeEnd)).select('total serviceTax payments closedAt');

const computeShiftTotals = async (shift, rangeEnd = null) => {
  const commands = await loadShiftCommands(shift, rangeEnd);
  return buildShiftTotals(commands);
};

const ensureShiftWaiterExists = async (waiterId) =>
  User.findOne({
    _id: waiterId,
    role: USER_ROLES.WAITER,
    status: USER_STATUSES.ACTIVE,
  }).select('_id username role status');

const hasOpenShift = async (waiterId) =>
  Boolean(
    await Shift.findOne({
      waiterId,
      status: SHIFT_STATUSES.OPEN,
    }).select('_id'),
  );

const buildShiftFilter = ({ status, waiterId, currentUser }) => {
  const filter = {};

  if (status !== undefined) {
    if (!Object.values(SHIFT_STATUSES).includes(status)) {
      return { error: 'Invalid shift status' };
    }
    filter.status = status;
  }

  if (currentUser.role === USER_ROLES.WAITER) {
    filter.waiterId = currentUser._id;
  } else if (waiterId !== undefined) {
    if (!isValidObjectId(waiterId)) {
      return { error: 'Invalid waiter ID' };
    }
    filter.waiterId = waiterId;
  }

  return { filter };
};

const openNewShift = async ({ waiterId, notes, currentUser }) => {
  const waiterResolution = resolveShiftWaiterId({
    currentUser,
    requestedWaiterId: waiterId,
    waiterRole: USER_ROLES.WAITER,
    isValidObjectId,
  });

  if (waiterResolution.error) {
    return { error: waiterResolution.error, statusCode: 400 };
  }

  const waiter = await ensureShiftWaiterExists(waiterResolution.waiterId);
  if (!waiter) {
    return { error: 'Waiter not found or not active', statusCode: 404 };
  }

  if (await hasOpenShift(waiter._id)) {
    return { error: 'This waiter already has an open shift', statusCode: 409 };
  }

  const shift = new Shift({
    waiterId: waiter._id,
    openedBy: currentUser._id,
    notes: normalizeShiftNotes(notes),
  });

  appendAuditEntry(shift, 'shift_opened', currentUser, {
    waiterId: String(waiter._id),
    waiterName: waiter.username,
  });

  const savedShift = await shift.save();
  return { shift: savedShift, computedTotals: buildShiftTotals([]) };
};

const getShiftDetails = async ({ shiftId, currentUser }) => {
  const shift = await Shift.findById(shiftId);
  if (!shift) {
    return { error: 'Shift not found', statusCode: 404 };
  }

  if (!canAccessShift(currentUser, shift)) {
    return { error: 'You do not have permission to access this shift', statusCode: 403 };
  }

  const dateRange = normalizeShiftDateRange(shift.openedAt, shift.closedAt);
  if (dateRange.error) {
    return { error: dateRange.error, statusCode: 409 };
  }

  const computedTotals =
    shift.status === SHIFT_STATUSES.CLOSED && shift.totalsSnapshot
      ? shift.totalsSnapshot
      : await computeShiftTotals(shift);

  return { shift, computedTotals };
};

const closeExistingShift = async ({ shiftId, notes, currentUser }) => {
  const shift = await Shift.findById(shiftId);
  if (!shift) {
    return { error: 'Shift not found', statusCode: 404 };
  }

  if (!canAccessShift(currentUser, shift)) {
    return { error: 'You do not have permission to close this shift', statusCode: 403 };
  }

  if (shift.status !== SHIFT_STATUSES.OPEN) {
    return { error: 'Only open shifts can be closed', statusCode: 409 };
  }

  const closedAt = new Date();
  const dateRange = normalizeShiftDateRange(shift.openedAt, closedAt);
  if (dateRange.error) {
    return { error: dateRange.error, statusCode: 409 };
  }

  const computedTotals = await computeShiftTotals(shift, closedAt);
  shift.status = SHIFT_STATUSES.CLOSED;
  shift.closedAt = closedAt;
  shift.closedBy = currentUser._id;
  shift.notes = normalizeShiftNotes(notes) || shift.notes;
  shift.totalsSnapshot = {
    ...computedTotals,
    computedAt: closedAt,
  };

  appendAuditEntry(
    shift,
    'shift_closed',
    currentUser,
    {
      waiterId: String(shift.waiterId),
      commandsCount: computedTotals.commandsCount,
      paymentCount: computedTotals.paymentCount,
      paymentsTotal: computedTotals.payments.total,
    },
    closedAt,
  );

  const savedShift = await shift.save();
  return { shift: savedShift, computedTotals: savedShift.totalsSnapshot };
};

module.exports = {
  isValidObjectId,
  serializeShift,
  canAccessShift,
  computeShiftTotals,
  buildShiftFilter,
  openNewShift,
  getShiftDetails,
  closeExistingShift,
};
