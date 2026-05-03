import ScrapCategory from '../models/ScrapCategory.js';
import { logAudit } from '../utils/audit.js';

export const getCategories = async (req, res, next) => {
  try {
    const { search, active } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (active !== undefined) filter.isActive = active === 'true';

    const categories = await ScrapCategory.find(filter).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

export const getCategory = async (req, res, next) => {
  try {
    const category = await ScrapCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const category = await ScrapCategory.create(req.body);
    logAudit({ req, action: 'create', module: 'Category', entityId: category._id, description: `Created category "${category.name}"` });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const category = await ScrapCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: 'after', runValidators: true }
    );
    if (!category) return res.status(404).json({ message: 'Category not found' });
    logAudit({ req, action: 'update', module: 'Category', entityId: category._id, description: `Updated category "${category.name}"`, metadata: req.body });
    res.json(category);
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const category = await ScrapCategory.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { returnDocument: 'after' }
    );
    if (!category) return res.status(404).json({ message: 'Category not found' });
    logAudit({ req, action: 'deactivate', module: 'Category', entityId: category._id, description: `Deactivated category "${category.name}"` });
    res.json({ message: 'Category deactivated' });
  } catch (error) {
    next(error);
  }
};
