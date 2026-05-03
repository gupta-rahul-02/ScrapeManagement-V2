import Purchase from '../models/Purchase.js';
import Sale from '../models/Sale.js';
import GodownStock from '../models/GodownStock.js';
import Vendor from '../models/Vendor.js';
import Buyer from '../models/Buyer.js';
import Challan from '../models/Challan.js';
import Payment from '../models/Payment.js';

export const getDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's totals
    const [todayPurchases, todaySales] = await Promise.all([
      Purchase.aggregate([
        { $match: { date: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, weight: { $sum: '$totalWeight' } } },
      ]),
      Sale.aggregate([
        { $match: { date: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, weight: { $sum: '$totalWeight' } } },
      ]),
    ]);

    // Total stock
    const stockSummary = await GodownStock.aggregate([
      { $group: { _id: null, totalWeight: { $sum: '$currentWeight' } } },
    ]);

    // Outstanding
    const [totalPayable, totalReceivable] = await Promise.all([
      Vendor.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: '$currentBalance' } } },
      ]),
      Buyer.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: '$currentBalance' } } },
      ]),
    ]);

    // Disputed challans
    const disputedChallans = await Challan.countDocuments({ status: 'disputed' });

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [purchaseTrend, saleTrend] = await Promise.all([
      Purchase.aggregate([
        { $match: { date: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
            total: { $sum: '$totalAmount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Sale.aggregate([
        { $match: { date: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
            total: { $sum: '$totalAmount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Category-wise stock
    const categoryStock = await GodownStock.aggregate([
      {
        $group: {
          _id: '$category',
          totalWeight: { $sum: '$currentWeight' },
        },
      },
      {
        $lookup: {
          from: 'scrapcategories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $project: {
          name: '$category.name',
          totalWeight: 1,
        },
      },
      { $sort: { totalWeight: -1 } },
    ]);

    // Recent transactions
    const [recentPurchases, recentSales, recentPayments] = await Promise.all([
      Purchase.find()
        .populate('vendor', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('vendor totalAmount totalWeight date'),
      Sale.find()
        .populate('buyer', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('buyer totalAmount totalWeight date'),
      Payment.find()
        .populate('partyId', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('type partyType partyId amount mode date'),
    ]);

    res.json({
      today: {
        purchases: todayPurchases[0] || { total: 0, weight: 0 },
        sales: todaySales[0] || { total: 0, weight: 0 },
      },
      totalStock: stockSummary[0]?.totalWeight || 0,
      totalPayable: totalPayable[0]?.total || 0,
      totalReceivable: totalReceivable[0]?.total || 0,
      disputedChallans,
      purchaseTrend,
      saleTrend,
      categoryStock,
      recentPurchases,
      recentSales,
      recentPayments,
    });
  } catch (error) {
    next(error);
  }
};
