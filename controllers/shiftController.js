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

const shiftController = {
  async createShift(req, res) {
    const { waiterId, notes } = req.body || {};

    try {
      const waiterResolution = resolveShiftWaiterId({
        currentUser: req.currentUser,
        requestedWaiterId: waiterId,
        waiterRole: USER_ROLES.WAITER,
        isValidObjectId,
      });

      if (waiterResolution.error) {
        return res.status(400).json({ error: waiterResolution.error });
      }

      const waiter = await ensureShiftWaiterExists(waiterResolution.waiterId);
      if (!waiter) {
        return res.status(404).json({ error: 'Waiter not found or not active' });
      }

      if (await hasOpenShift(waiter._id)) {
        return res.status(409).json({ error: 'This waiter already has an open shift' });
      }

      const shift = new Shift({
        waiterId: waiter._id,
        openedBy: req.currentUser._id,
        notes: normalizeShiftNotes(notes),
      });

      appendAuditEntry(shift, 'shift_opened', req.currentUser, {
        waiterId: String(waiter._id),
        waiterName: waiter.username,
      });

      const savedShift = await shift.save();
      return res.status(201).json(serializeShift(savedShift, buildShiftTotals([])));
    } catch (error) {
      console.error('Erro ao abrir turno:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getAllShifts(req, res) {
    const { status, waiterId } = req.query;
    const filter = {};

    if (status !== undefined) {
      if (!Object.values(SHIFT_STATUSES).includes(status)) {
        return res.status(400).json({ error: 'Invalid shift status' });
      }
      filter.status = status;
    }

    if (req.currentUser.role === USER_ROLES.WAITER) {
      filter.waiterId = req.currentUser._id;
    } else if (waiterId !== undefined) {
      if (!isValidObjectId(waiterId)) {
        return res.status(400).json({ error: 'Invalid waiter ID' });
      }
      filter.waiterId = waiterId;
    }

    try {
      const shifts = await Shift.find(filter).select('-auditTrail').sort({ openedAt: -1, createdAt: -1 });
      return res.status(200).json(shifts.map((shift) => serializeShift(shift)));
    } catch (error) {
      console.error('Erro ao listar turnos:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getShiftById(req, res) {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid shift ID' });
    }

    try {
      const shift = await Shift.findById(id);
      if (!shift) {
        return res.status(404).json({ error: 'Shift not found' });
      }

      if (!canAccessShift(req.currentUser, shift)) {
        return res.status(403).json({ error: 'You do not have permission to access this shift' });
      }

      const dateRange = normalizeShiftDateRange(shift.openedAt, shift.closedAt);
      if (dateRange.error) {
        return res.status(409).json({ error: dateRange.error });
      }

      const computedTotals =
        shift.status === SHIFT_STATUSES.CLOSED && shift.totalsSnapshot
          ? shift.totalsSnapshot
          : await computeShiftTotals(shift);

      return res.status(200).json(serializeShift(shift, computedTotals));
    } catch (error) {
      console.error('Erro ao buscar turno:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async closeShift(req, res) {
    const { id } = req.params;
    const { notes } = req.body || {};

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid shift ID' });
    }

    try {
      const shift = await Shift.findById(id);
      if (!shift) {
        return res.status(404).json({ error: 'Shift not found' });
      }

      if (!canAccessShift(req.currentUser, shift)) {
        return res.status(403).json({ error: 'You do not have permission to close this shift' });
      }

      if (shift.status !== SHIFT_STATUSES.OPEN) {
        return res.status(409).json({ error: 'Only open shifts can be closed' });
      }

      const closedAt = new Date();
      const dateRange = normalizeShiftDateRange(shift.openedAt, closedAt);
      if (dateRange.error) {
        return res.status(409).json({ error: dateRange.error });
      }

      const computedTotals = await computeShiftTotals(shift, closedAt);
      shift.status = SHIFT_STATUSES.CLOSED;
      shift.closedAt = closedAt;
      shift.closedBy = req.currentUser._id;
      shift.notes = normalizeShiftNotes(notes) || shift.notes;
      shift.totalsSnapshot = {
        ...computedTotals,
        computedAt: closedAt,
      };

      appendAuditEntry(
        shift,
        'shift_closed',
        req.currentUser,
        {
          waiterId: String(shift.waiterId),
          commandsCount: computedTotals.commandsCount,
          paymentCount: computedTotals.paymentCount,
          paymentsTotal: computedTotals.payments.total,
        },
        closedAt,
      );

      const savedShift = await shift.save();
      return res.status(200).json(serializeShift(savedShift, savedShift.totalsSnapshot));
    } catch (error) {
      console.error('Erro ao fechar turno:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = shiftController;
