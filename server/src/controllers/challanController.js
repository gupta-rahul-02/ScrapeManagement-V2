import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import Challan from '../models/Challan.js';
import Sale from '../models/Sale.js';
import Buyer from '../models/Buyer.js';
import LedgerEntry from '../models/LedgerEntry.js';
import { logAudit } from '../utils/audit.js';

export const getChallans = async (req, res, next) => {
  try {
    const { status, buyer, truck, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (buyer) filter.buyer = buyer;
    if (truck) filter.truck = truck;
    if (startDate || endDate) {
      filter.dispatchDate = {};
      if (startDate) filter.dispatchDate.$gte = new Date(startDate);
      if (endDate) filter.dispatchDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [challans, total] = await Promise.all([
      Challan.find(filter)
        .populate('buyer', 'name phone')
        .populate('truck', 'truckNumber driverName')
        .populate('godown', 'name')
        .populate('items.category', 'name unit')
        .sort({ dispatchDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Challan.countDocuments(filter),
    ]);

    res.json({
      challans,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

export const getChallan = async (req, res, next) => {
  try {
    const challan = await Challan.findById(req.params.id)
      .populate('buyer', 'name phone address')
      .populate('truck', 'truckNumber driverName driverPhone')
      .populate('godown', 'name location')
      .populate('sale')
      .populate('items.category', 'name unit');

    if (!challan) return res.status(404).json({ message: 'Challan not found' });
    res.json(challan);
  } catch (error) {
    next(error);
  }
};

// Mark delivery with receiver weight
export const updateChallanDelivery = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { receiverWeight, notes } = req.body;
    const challan = await Challan.findById(req.params.id).session(session);

    if (!challan) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Challan not found' });
    }
    if (challan.status !== 'dispatched') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Challan already processed' });
    }

    challan.receiverWeight = receiverWeight;
    challan.weightDiff = challan.senderWeight - receiverWeight;
    challan.deliveryDate = new Date();

    // Flag dispute if weight difference exceeds 2%
    const diffPercent = Math.abs(challan.weightDiff) / challan.senderWeight;
    challan.status = diffPercent > 0.02 ? 'disputed' : 'delivered';

    if (notes) challan.notes = notes;
    await challan.save({ session });

    // Calculate actual amount based on receiver weight
    // Get the original sale to derive per-kg rate (totalAmount / totalWeight)
    const sale = await Sale.findById(challan.sale).lean().session(session);
    if (sale) {
      const ratePerKg = sale.totalWeight > 0 ? sale.totalAmount / sale.totalWeight : 0;
      const actualAmount = Math.round(ratePerKg * receiverWeight * 100) / 100;

      // Update buyer balance — they now owe us for delivered goods
      await Buyer.findByIdAndUpdate(
        challan.buyer,
        { $inc: { currentBalance: actualAmount } },
        { session }
      );

      // Double-entry: DR Buyer, CR Sales
      const txId = randomUUID();

      const lastBuyerEntry = await LedgerEntry.findOne({
        accountType: 'Buyer',
        accountId: challan.buyer,
      })
        .sort({ date: -1, createdAt: -1 })
        .session(session);

      const buyerDoc = await Buyer.findById(challan.buyer).select('openingBalance').lean().session(session);
      const prevBuyerBalance = lastBuyerEntry
        ? lastBuyerEntry.runningBalance
        : (buyerDoc?.openingBalance || 0);

      const deliveryDesc = `Sale delivered (${challan.challanNo}) - ${receiverWeight} kg${challan.status === 'disputed' ? ' [DISPUTED]' : ''}`;

      await LedgerEntry.create(
        [
          {
            transactionId: txId,
            accountType: 'Buyer',
            accountId: challan.buyer,
            entryType: 'sale',
            refModel: 'Sale',
            refId: challan.sale,
            debit: actualAmount,
            credit: 0,
            runningBalance: prevBuyerBalance + actualAmount,
            description: deliveryDesc,
            date: new Date(),
            createdBy: req.user?._id,
          },
          {
            transactionId: txId,
            accountType: 'Sales',
            accountId: null,
            entryType: 'sale',
            refModel: 'Sale',
            refId: challan.sale,
            debit: 0,
            credit: actualAmount,
            runningBalance: 0,
            description: deliveryDesc,
            date: new Date(),
            createdBy: req.user?._id,
          },
        ],
        { session, ordered: true }
      );
    }

    await session.commitTransaction();
    logAudit({
      req,
      action: 'mark_delivered',
      module: 'Challan',
      entityId: challan._id,
      description: `Marked challan ${challan.challanNo} as ${challan.status} — receiver weight: ${receiverWeight} kg`,
      metadata: { challanNo: challan.challanNo, status: challan.status, senderWeight: challan.senderWeight, receiverWeight, weightDiff: challan.weightDiff },
    });
    res.json(challan);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
