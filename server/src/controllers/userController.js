import User from '../models/User.js';
import { logAudit } from '../utils/audit.js';

// @desc    Get all users
// @route   GET /api/users
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new user
// @route   POST /api/users
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, phone, role });
    const userObj = user.toObject();
    delete userObj.password;

    logAudit({ req, action: 'create', module: 'User', entityId: user._id, description: `Created user "${name}" (${role})`, metadata: { name, email, role } });
    res.status(201).json(userObj);
  } catch (error) {
    next(error);
  }
};

// @desc    Update user (name, phone, role, isActive)
// @route   PUT /api/users/:id
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, role, isActive } = req.body;

    // Prevent owner from demoting themselves
    if (id === req.user._id.toString() && role && role !== req.user.role) {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }

    // Prevent deactivating yourself
    if (id === req.user._id.toString() && isActive === false) {
      return res.status(400).json({ message: 'You cannot deactivate yourself' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;

    const user = await User.findByIdAndUpdate(id, updates, { returnDocument: 'after', runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const action = updates.isActive === false ? 'deactivate' : updates.isActive === true ? 'activate' : 'update';
    logAudit({ req, action, module: 'User', entityId: user._id, description: `${action.charAt(0).toUpperCase() + action.slice(1)}d user "${user.name}"`, metadata: updates });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// @desc    Reset user password
// @route   PUT /api/users/:id/reset-password
export const resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = password;
    await user.save();

    logAudit({ req, action: 'reset_password', module: 'User', entityId: user._id, description: `Reset password for user "${user.name}"` });
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
};
