import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import Sale from '../models/Sale.js';
import GodownStock from '../models/GodownStock.js';
import LedgerEntry from '../models/LedgerEntry.js';
import Buyer from '../models/Buyer.js';
import Challan from '../models/Challan.js';
import cloudinary from '../config/cloudinary.js';
import { logAudit } from '../utils/audit.js';

export const getSales = async (req, res, next) => {
  try {
    const { buyer, godown, category, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (buyer) filter.buyer = buyer;
    if (godown) filter.godown = godown;
    if (category) filter['items.category'] = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sales, total] = await Promise.all([
      Sale.find(filter)
        .populate('buyer', 'name phone')
        .populate('godown', 'name')
        .populate('items.category', 'name unit')
        .populate('createdBy', 'name')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Sale.countDocuments(filter),
    ]);

    res.json({
      sales,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

export const getSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('buyer', 'name phone address')
      .populate('godown', 'name location')
      .populate('items.category', 'name unit')
      .populate('createdBy', 'name');

    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    res.json(sale);
  } catch (error) {
    next(error);
  }
};

export const createSale = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { buyer, godown, items, totalWeight, totalAmount, truck, notes, date } = req.body;

    if (!truck) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Truck is required for a sale' });
    }

    // Stock not blocked — sorting may produce more than purchased.
    // Negative GodownStock.currentWeight indicates sorting surplus sold.

    let weightSlipPhoto;
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'scrap-management/weight-slips',
      });
      weightSlipPhoto = result.secure_url;
    }

    const sale = await Sale.create(
      [
        {
          buyer,
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

    // Deduct godown stock — cap at 0, track overSold (sorting surplus)
    for (const item of items) {
      const stock = await GodownStock.findOne({ godown, category: item.category }).session(session);
      const available = stock?.currentWeight || 0;
      const excess = Math.max(0, item.weight - available);
      const deduction = Math.min(item.weight, available);

      if (stock) {
        stock.currentWeight = available - deduction;
        stock.overSold = (stock.overSold || 0) + excess;
        stock.lastUpdated = new Date();
        await stock.save({ session });
      } else {
        // No stock record exists — entire sale is overSold
        await GodownStock.create(
          [{ godown, category: item.category, currentWeight: 0, overSold: item.weight, lastUpdated: new Date() }],
          { session }
        );
      }
    }

    // Update buyer balance & create ledger entries ONLY for direct sales (no truck/challan).
    // When a challan is involved, delivery may differ in weight — ledger is created on delivery.
    if (!truck) {
      await Buyer.findByIdAndUpdate(
        buyer,
        { $inc: { currentBalance: totalAmount } },
        { session }
      );

      // Double-entry: DR Buyer, CR Sales
      const txId = randomUUID();

      const lastBuyerEntry = await LedgerEntry.findOne({
        accountType: 'Buyer',
        accountId: buyer,
      })
        .sort({ date: -1, createdAt: -1 })
        .session(session);

      const buyerDoc = await Buyer.findById(buyer).select('openingBalance').lean().session(session);
      const prevBuyerBalance = lastBuyerEntry
        ? lastBuyerEntry.runningBalance
        : (buyerDoc?.openingBalance || 0);

      await LedgerEntry.create(
        [
          {
            transactionId: txId,
            accountType: 'Buyer',
            accountId: buyer,
            entryType: 'sale',
            refModel: 'Sale',
            refId: sale[0]._id,
            debit: totalAmount,
            credit: 0,
            runningBalance: prevBuyerBalance + totalAmount,
            description: `Sale (direct) - ${totalWeight} kg`,
            date: date || new Date(),
            createdBy: req.user._id,
          },
          {
            transactionId: txId,
            accountType: 'Sales',
            accountId: null,
            entryType: 'sale',
            refModel: 'Sale',
            refId: sale[0]._id,
            debit: 0,
            credit: totalAmount,
            runningBalance: 0,
            description: `Sale to buyer (direct) - ${totalWeight} kg`,
            date: date || new Date(),
            createdBy: req.user._id,
          },
        ],
        { session, ordered: true }
      );
    }

    // Auto-create challan if truck is provided
    if (truck) {
      const lastChallan = await Challan.findOne().sort({ createdAt: -1 }).session(session);
      const nextNum = lastChallan
        ? parseInt(lastChallan.challanNo.replace('CH-', '')) + 1
        : 1;
      const challanNo = `CH-${String(nextNum).padStart(5, '0')}`;

      await Challan.create(
        [
          {
            challanNo,
            sale: sale[0]._id,
            truck,
            godown,
            buyer,
            items: items.map((i) => ({
              category: i.category,
              dispatchWeight: i.weight,
            })),
            senderWeight: totalWeight,
            status: 'dispatched',
            dispatchDate: date || new Date(),
            createdBy: req.user._id,
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();

    const populatedSale = await Sale.findById(sale[0]._id)
      .populate('buyer', 'name phone')
      .populate('godown', 'name')
      .populate('items.category', 'name unit');

    logAudit({
      req,
      action: 'create',
      module: 'Sale',
      entityId: sale[0]._id,
      description: `Recorded sale — ₹${totalAmount}, ${totalWeight} kg${truck ? ' with challan' : ' direct'}`,
      metadata: { totalAmount, totalWeight, buyer, godown, truck: truck || null, items: items.length },
    });

    res.status(201).json(populatedSale);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
