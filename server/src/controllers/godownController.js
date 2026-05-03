import Godown from '../models/Godown.js';

export const getGodowns = async (req, res, next) => {
  try {
    const { search, active } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (active !== undefined) filter.isActive = active === 'true';

    const godowns = await Godown.find(filter).sort({ name: 1 });
    res.json(godowns);
  } catch (error) {
    next(error);
  }
};

export const getGodown = async (req, res, next) => {
  try {
    const godown = await Godown.findById(req.params.id);
    if (!godown) return res.status(404).json({ message: 'Godown not found' });
    res.json(godown);
  } catch (error) {
    next(error);
  }
};

export const createGodown = async (req, res, next) => {
  try {
    const godown = await Godown.create(req.body);
    res.status(201).json(godown);
  } catch (error) {
    next(error);
  }
};

export const updateGodown = async (req, res, next) => {
  try {
    const godown = await Godown.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!godown) return res.status(404).json({ message: 'Godown not found' });
    res.json(godown);
  } catch (error) {
    next(error);
  }
};

export const deleteGodown = async (req, res, next) => {
  try {
    const godown = await Godown.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { returnDocument: 'after' }
    );
    if (!godown) return res.status(404).json({ message: 'Godown not found' });
    res.json({ message: 'Godown deactivated' });
  } catch (error) {
    next(error);
  }
};
