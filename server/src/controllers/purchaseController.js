import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import Purchase from '../models/Purchase.js';
import GodownStock from '../models/GodownStock.js';
import LedgerEntry from '../models/LedgerEntry.js';
import Vendor from '../models/Vendor.js';
import cloudinary from '../config/cloudinary.js';
import { logAudit } from '../utils/audit.js';

export const getPurchases = async (req, res, next) => {
  try {
    const { vendor, godown, category, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (vendor) filter.vendor = vendor;
    if (godown) filter.godown = godown;
    if (category) filter['items.category'] = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [purchases, total] = await Promise.all([
      Purchase.find(filter)
        .populate('vendor', 'name phone')
        .populate('godown', 'name')
        .populate('items.category', 'name unit')
        .populate('createdBy', 'name')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Purchase.countDocuments(filter),
    ]);

    res.json({
      purchases,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

export const getPurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('vendor', 'name phone address')
      .populate('godown', 'name location')
      .populate('items.category', 'name unit')
      .populate('createdBy', 'name');

    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
    res.json(purchase);
  } catch (error) {
    next(error);
  }
};

export const createPurchase = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { vendor, godown, items, totalWeight, totalAmount, notes, date } = req.body;

    let weightSlipPhoto;
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'scrap-management/weight-slips',
      });
      weightSlipPhoto = result.secure_url;
    }

    const purchase = await Purchase.create(
      [
        {
          vendor,
          godown,
          items,
          totalWeight,
          totalAmount,
          weightSlipPhoto,
          notes,
          date: date || Date.now(),
          createdBy: req.user._id,
        },
      ],
      { session }
    );

    // Update godown stock for each item
    for (const item of items) {
      await GodownStock.findOneAndUpdate(
        { godown, category: item.category },
        { $inc: { currentWeight: item.weight }, $set: { lastUpdated: new Date() } },
        { upsert: true, session }
      );
    }

    // Update vendor balance (credit increases — we owe them more)
    await Vendor.findByIdAndUpdate(
      vendor,
      { $inc: { currentBalance: totalAmount } },
      { session }
    );

    // Double-entry: DR Purchases, CR Vendor
    const txId = randomUUID();

    const lastVendorEntry = await LedgerEntry.findOne({
      accountType: 'Vendor',
      accountId: vendor,
    })
      .sort({ date: -1, createdAt: -1 })
      .session(session);

    // Seed from openingBalance if no prior ledger entries exist
    const vendorDoc = await Vendor.findById(vendor).select('openingBalance').lean().session(session);
    const prevVendorBalance = lastVendorEntry
      ? lastVendorEntry.runningBalance
      : (vendorDoc?.openingBalance || 0);

    await LedgerEntry.create(
      [
        {
          transactionId: txId,
          accountType: 'Purchases',
          accountId: null,
          entryType: 'purchase',
          refModel: 'Purchase',
          refId: purchase[0]._id,
          debit: totalAmount,
          credit: 0,
          runningBalance: 0,
          description: `Purchase from vendor - ${totalWeight} kg`,
          date: date || new Date(),
          createdBy: req.user._id,
        },
        {
          transactionId: txId,
          accountType: 'Vendor',
          accountId: vendor,
          entryType: 'purchase',
          refModel: 'Purchase',
          refId: purchase[0]._id,
          debit: 0,
          credit: totalAmount,
          runningBalance: prevVendorBalance + totalAmount,
          description: `Purchase - ${totalWeight} kg`,
          date: date || new Date(),
          createdBy: req.user._id,
        },
      ],
      { session, ordered: true }
    );

    await session.commitTransaction();

    const populatedPurchase = await Purchase.findById(purchase[0]._id)
      .populate('vendor', 'name phone')
      .populate('godown', 'name')
      .populate('items.category', 'name unit');

    logAudit({
      req,
      action: 'create',
      module: 'Purchase',
      entityId: purchase[0]._id,
      description: `Recorded purchase — ₹${totalAmount}, ${totalWeight} kg`,
      metadata: { totalAmount, totalWeight, vendor, godown, items: items.length },
    });

    res.status(201).json(populatedPurchase);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
