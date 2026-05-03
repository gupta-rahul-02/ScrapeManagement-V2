import Vendor from '../models/Vendor.js';
import { logAudit } from '../utils/audit.js';

export const getVendors = async (req, res, next) => {
  try {
    const { search, active } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    if (active !== undefined) filter.isActive = active === 'true';

    const vendors = await Vendor.find(filter).sort({ name: 1 });
    res.json(vendors);
  } catch (error) {
    next(error);
  }
};

export const getVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json(vendor);
  } catch (error) {
    next(error);
  }
};

export const createVendor = async (req, res, next) => {
  try {
    const { openingBalance } = req.body;
    if (openingBalance) {
      req.body.currentBalance = openingBalance;
    }
    const vendor = await Vendor.create(req.body);
    logAudit({ req, action: 'create', module: 'Vendor', entityId: vendor._id, description: `Created vendor "${vendor.name}"`, metadata: { name: vendor.name, phone: vendor.phone } });
    res.status(201).json(vendor);
  } catch (error) {
    next(error);
  }
};

export const updateVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    logAudit({ req, action: 'update', module: 'Vendor', entityId: vendor._id, description: `Updated vendor "${vendor.name}"`, metadata: req.body });
    res.json(vendor);
  } catch (error) {
    next(error);
  }
};

export const deleteVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { returnDocument: 'after' }
    );
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    logAudit({ req, action: 'deactivate', module: 'Vendor', entityId: vendor._id, description: `Deactivated vendor "${vendor.name}"` });
    res.json({ message: 'Vendor deactivated' });
  } catch (error) {
    next(error);
  }
};
