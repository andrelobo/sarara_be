const mongoose = require('mongoose');
const Beverage = require('../models/beverageModel');

const ACTIVE_BEVERAGE_FILTER = { deletedAt: null };

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const buildDateRange = (startDate, endDate) => {
  const range = {};

  if (startDate) {
    range.$gte = new Date(startDate);
  }

  if (endDate) {
    range.$lte = new Date(endDate);
  }

  return Object.keys(range).length > 0 ? range : null;
};

const createNewBeverage = async ({ name, category, quantity, unit, date }) => {
  if (!name || !category || quantity === undefined || quantity === null || !unit) {
    return { error: 'Missing required fields', statusCode: 400 };
  }

  const normalizedQuantity = Number(quantity);
  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity < 0) {
    return { error: 'Quantity must be a valid non-negative number', statusCode: 400 };
  }

  const creationDate = date ? new Date(date) : new Date();
  const newBeverage = new Beverage({
    name,
    category,
    quantity: normalizedQuantity,
    unit,
    history: [{
      date: creationDate,
      change: 'added',
      quantity: normalizedQuantity,
    }],
  });

  const savedBeverage = await newBeverage.save();
  return { beverage: savedBeverage };
};

const updateExistingBeverage = async ({ id, name, category, quantity, unit }) => {
  const beverage = await Beverage.findOne({ _id: id, ...ACTIVE_BEVERAGE_FILTER }).exec();
  if (!beverage) {
    return { error: 'Beverage not found', statusCode: 404 };
  }

  if (name === undefined && category === undefined && quantity === undefined && unit === undefined) {
    return { error: 'No valid fields provided for update', statusCode: 400 };
  }

  const oldQuantity = beverage.quantity;
  const hasQuantityUpdate = quantity !== undefined;
  const newQuantity = hasQuantityUpdate ? Number(quantity) : oldQuantity;

  if (hasQuantityUpdate && (!Number.isFinite(newQuantity) || newQuantity < 0)) {
    return { error: 'Quantity must be a valid non-negative number', statusCode: 400 };
  }

  if (name !== undefined) beverage.name = name;
  if (category !== undefined) beverage.category = category;
  if (unit !== undefined) beverage.unit = unit;
  if (hasQuantityUpdate) beverage.quantity = newQuantity;

  if (hasQuantityUpdate && newQuantity !== oldQuantity) {
    beverage.history.push({
      date: new Date(),
      change: newQuantity > oldQuantity ? 'added' : 'removed',
      quantity: Math.abs(newQuantity - oldQuantity),
    });
  }

  const updatedBeverage = await beverage.save();
  return { beverage: updatedBeverage };
};

const removeBeverage = async (id) => {
  const beverage = await Beverage.findOne({ _id: id, ...ACTIVE_BEVERAGE_FILTER });
  if (!beverage) {
    return { error: 'Bebida não encontrada', statusCode: 404 };
  }

  beverage.history.push({
    date: new Date(),
    change: 'deleted',
    quantity: beverage.quantity,
  });
  beverage.deletedAt = new Date();

  await beverage.save();
  return { success: true };
};

const getFilteredBeverageHistory = async ({ id, startDate, endDate }) => {
  const beverage = await Beverage.findById(id).exec();
  if (!beverage) {
    return { error: 'Beverage not found', statusCode: 404 };
  }

  const dateRange = buildDateRange(startDate, endDate);
  const filteredHistory = beverage.history.filter((entry) => {
    if (!dateRange) return true;

    const entryDate = new Date(entry.date);
    if (dateRange.$gte && entryDate < dateRange.$gte) return false;
    if (dateRange.$lte && entryDate > dateRange.$lte) return false;
    return true;
  });

  return { history: filteredHistory };
};

const getMostLeastSold = async () => {
  const beverages = await Beverage.aggregate([
    { $match: ACTIVE_BEVERAGE_FILTER },
    { $unwind: '$history' },
    {
      $group: {
        _id: '$name',
        totalSold: {
          $sum: {
            $cond: [
              { $in: ['$history.change', ['sold', 'removed', 'vendido', 'removido']] },
              '$history.quantity',
              0,
            ],
          },
        },
      },
    },
    { $sort: { totalSold: -1 } },
    {
      $facet: {
        mostSold: [{ $limit: 5 }],
        leastSold: [{ $sort: { totalSold: 1 } }, { $limit: 5 }],
      },
    },
  ]).exec();

  return beverages[0];
};

const getNeverSold = async () => {
  const beverages = await Beverage.aggregate([
    {
      $match: {
        deletedAt: null,
        history: { $not: { $elemMatch: { change: { $in: ['sold', 'removed', 'vendido', 'removido'] } } } },
      },
    },
  ]).exec();

  return beverages;
};

const getChangeHistory = async ({ startDate, endDate }) => {
  const dateRange = buildDateRange(startDate, endDate);
  const pipeline = [
    { $unwind: '$history' },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$history.date' } },
          name: '$name',
        },
        totalChange: { $sum: '$history.quantity' },
      },
    },
    { $sort: { '_id.date': 1 } },
  ];

  if (dateRange) {
    pipeline.splice(1, 0, {
      $match: {
        'history.date': dateRange,
      },
    });
  }

  const history = await Beverage.aggregate(pipeline).exec();
  return history || [];
};

module.exports = {
  isValidObjectId,
  buildDateRange,
  createNewBeverage,
  updateExistingBeverage,
  removeBeverage,
  getFilteredBeverageHistory,
  getMostLeastSold,
  getNeverSold,
  getChangeHistory,
};
