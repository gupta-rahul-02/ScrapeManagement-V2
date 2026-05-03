import Truck from '../models/Truck.js';

export const getTrucks = async (req, res, next) => {
  try {
    const { search, active } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { truckNumber: { $regex: search, $options: 'i' } },
        { driverName: { $regex: search, $options: 'i' } },
      ];
    }
    if (active !== undefined) filter.isActive = active === 'true';

    const trucks = await Truck.find(filter).sort({ truckNumber: 1 });
    res.json(trucks);
  } catch (error) {
    next(error);
  }
};

export const getTruck = async (req, res, next) => {
  try {
    const truck = await Truck.findById(req.params.id);
    if (!truck) return res.status(404).json({ message: 'Truck not found' });
    res.json(truck);
  } catch (error) {
    next(error);
  }
};

export const createTruck = async (req, res, next) => {
  try {
    const truck = await Truck.create(req.body);
    res.status(201).json(truck);
  } catch (error) {
    next(error);
  }
};

export const updateTruck = async (req, res, next) => {
  try {
    const truck = await Truck.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!truck) return res.status(404).json({ message: 'Truck not found' });
    res.json(truck);
  } catch (error) {
    next(error);
  }
};

export const deleteTruck = async (req, res, next) => {
  try {
    const truck = await Truck.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { returnDocument: 'after' }
    );
    if (!truck) return res.status(404).json({ message: 'Truck not found' });
    res.json({ message: 'Truck deactivated' });
  } catch (error) {
    next(error);
  }
};
