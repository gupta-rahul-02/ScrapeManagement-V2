import GodownStock from '../models/GodownStock.js';

export const getInventory = async (req, res, next) => {
  try {
    const { godown } = req.query;
    const filter = {};
    if (godown) filter.godown = godown;

    const stock = await GodownStock.find(filter)
      .populate('godown', 'name location')
      .populate('category', 'name unit')
      .sort({ 'godown.name': 1 });

    // Group by godown
    const grouped = stock.reduce((acc, item) => {
      const godownId = item.godown._id.toString();
      if (!acc[godownId]) {
        acc[godownId] = {
          godown: item.godown,
          items: [],
          totalWeight: 0,
        };
      }
      acc[godownId].items.push({
        category: item.category,
        currentWeight: item.currentWeight,
        lastUpdated: item.lastUpdated,
      });
      acc[godownId].totalWeight += item.currentWeight;
      return acc;
    }, {});

    res.json(Object.values(grouped));
  } catch (error) {
    next(error);
  }
};

export const getStockSummary = async (req, res, next) => {
  try {
    const summary = await GodownStock.aggregate([
      {
        $group: {
          _id: '$category',
          totalWeight: { $sum: '$currentWeight' },
          godownCount: { $sum: 1 },
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
          _id: 0,
          category: '$category.name',
          unit: '$category.unit',
          totalWeight: 1,
          godownCount: 1,
        },
      },
      { $sort: { category: 1 } },
    ]);

    res.json(summary);
  } catch (error) {
    next(error);
  }
};

// Stock alerts — overSold (sorting surplus sold beyond purchased) and zero stock
export const getStockAlerts = async (req, res, next) => {
  try {
    const [overSoldItems, zeroItems] = await Promise.all([
      GodownStock.find({ overSold: { $gt: 0 } })
        .populate('godown', 'name location')
        .populate('category', 'name unit')
        .sort({ overSold: -1 }),
      GodownStock.find({ currentWeight: 0, overSold: 0 })
        .populate('godown', 'name location')
        .populate('category', 'name unit')
        .sort({ 'category.name': 1 }),
    ]);

    res.json({
      overSold: overSoldItems,
      zero: zeroItems,
      totalOverSoldWeight: overSoldItems.reduce((s, a) => s + a.overSold, 0),
    });
  } catch (error) {
    next(error);
  }
};
