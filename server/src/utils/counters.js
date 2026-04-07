'use strict';

const Counter = require('../models/Counter');

const nextSequence = async (key, floor = 0) => {
  if (floor > 0) {
    await Counter.findOneAndUpdate(
      { key, value: { $lt: floor } },
      { $set: { value: floor } },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return doc.value;
};

module.exports = { nextSequence };
