import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const authRoutes = (jwtSecret) => {
  const router = Router();
  const requireAuth = authMiddleware(jwtSecret);

  router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id.toString(), email: user.email, name: user.name }, jwtSecret, {
      expiresIn: '7d',
    });

    return res.json({
      token,
      user: { id: user._id.toString(), name: user.name, email: user.email },
      demoAccount: { email: 'demo@leadloom.com', password: 'demo123' },
    });
  });

  router.get('/me', requireAuth, async (req, res) => {
    const user = await User.findById(req.user.userId).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ id: user._id.toString(), name: user.name, email: user.email });
  });

  router.post('/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All password fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password must match' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.password !== currentPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ message: 'Password changed successfully' });
  });

  return router;
};

export default authRoutes;
