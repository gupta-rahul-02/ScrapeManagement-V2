import ExpenseCategory from '../models/ExpenseCategory.js';
import Expense from '../models/Expense.js';

export const getExpenseCategories = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.active === 'true') filter.isActive = true;
    const categories = await ExpenseCategory.find(filter).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

export const createExpenseCategory = async (req, res, next) => {
  try {
    const { name } = req.body;

    const exists = await ExpenseCategory.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (exists) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }

    const category = await ExpenseCategory.create({ name: name.trim() });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

export const updateExpenseCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (isActive !== undefined) updates.isActive = isActive;

    const category = await ExpenseCategory.findByIdAndUpdate(id, updates, { returnDocument: 'after', runValidators: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    res.json(category);
  } catch (error) {
    next(error);
  }
};

export const deleteExpenseCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if category is used in any expense
    const used = await Expense.exists({ category: id });
    if (used) {
      // Soft-delete
      await ExpenseCategory.findByIdAndUpdate(id, { isActive: false });
      return res.json({ message: 'Category deactivated (in use by expenses)' });
    }

    await ExpenseCategory.findByIdAndDelete(id);
    res.json({ message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
};
