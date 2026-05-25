const { SHIFT_STATUSES } = require('../models/shiftModel');
const {
  isValidObjectId,
  serializeShift,
  buildShiftFilter,
  openNewShift,
  getShiftDetails,
  closeExistingShift,
} = require('../service/shiftService');
const { Shift } = require('../models/shiftModel');

const shiftController = {
  async createShift(req, res) {
    const { waiterId, notes } = req.body || {};

    try {
      const result = await openNewShift({
        waiterId,
        notes,
        currentUser: req.currentUser,
      });

      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }

      return res.status(201).json(serializeShift(result.shift, result.computedTotals));
    } catch (error) {
      console.error('Erro ao abrir turno:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getAllShifts(req, res) {
    const { status, waiterId } = req.query;

    const result = buildShiftFilter({ status, waiterId, currentUser: req.currentUser });
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    try {
      const shifts = await Shift.find(result.filter).select('-auditTrail').sort({ openedAt: -1, createdAt: -1 });
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
      const result = await getShiftDetails({
        shiftId: id,
        currentUser: req.currentUser,
      });

      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }

      return res.status(200).json(serializeShift(result.shift, result.computedTotals));
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
      const result = await closeExistingShift({
        shiftId: id,
        notes,
        currentUser: req.currentUser,
      });

      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }

      return res.status(200).json(serializeShift(result.shift, result.computedTotals));
    } catch (error) {
      console.error('Erro ao fechar turno:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = shiftController;
