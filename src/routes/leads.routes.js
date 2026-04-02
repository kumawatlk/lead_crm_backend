import { Router } from 'express';
import Lead, { LEAD_STATUSES } from '../models/lead.model.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { normalizeAddressFields } from '../utils/address.js';

const toClientLead = (lead) => ({
  id: lead._id.toString(),
  companyName: lead.companyName,
  phone: lead.phone,
  email: lead.email,
  address: lead.address,
  city: lead.city,
  state: lead.state,
  pincode: lead.pincode,
  category: lead.category,
  leadStatus: lead.leadStatus,
  tags: lead.tags,
  notes: lead.notes,
  lastUpdated: lead.lastUpdated,
});

const touch = () => new Date().toISOString().split('T')[0];

const leadsRoutes = (jwtSecret) => {
  const router = Router();
  router.use(authMiddleware(jwtSecret));

  router.get('/', async (_req, res) => {
    const leads = await Lead.find().sort({ updatedAt: -1 });
    return res.json(leads.map(toClientLead));
  });

  router.get('/stats', async (_req, res) => {
    const [total, contacted, converted, newLeads] = await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({ leadStatus: 'Contacted' }),
      Lead.countDocuments({ leadStatus: 'Converted' }),
      Lead.countDocuments({ leadStatus: 'New' }),
    ]);
    return res.json({ total, contacted, converted, newLeads });
  });

  router.post('/', async (req, res) => {
    const payload = normalizeAddressFields(req.body || {});
    if (!payload.companyName) {
      return res.status(400).json({ message: 'companyName is required' });
    }
    const { businessName: _businessName, ...safePayload } = payload;
    const lead = await Lead.create({ ...safePayload, lastUpdated: touch() });
    return res.status(201).json(toClientLead(lead));
  });

  router.put('/:id', async (req, res) => {
    const payload = normalizeAddressFields(req.body || {});
    const { businessName: _businessName, ...safePayload } = payload;
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { ...safePayload, lastUpdated: touch() },
      { new: true },
    );
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    return res.json(toClientLead(lead));
  });

  router.delete('/:id', async (req, res) => {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    return res.status(204).send();
  });

  router.post('/bulk/status', async (req, res) => {
    const { ids = [], status } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0 || !LEAD_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid payload' });
    }
    await Lead.updateMany({ _id: { $in: ids } }, { leadStatus: status, lastUpdated: touch() });
    return res.json({ updated: ids.length });
  });

  router.post('/bulk/tag', async (req, res) => {
    const { ids = [], tag, mode = 'add' } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0 || !tag) {
      return res.status(400).json({ message: 'Invalid payload' });
    }
    if (mode === 'remove') {
      await Lead.updateMany({ _id: { $in: ids } }, { $pull: { tags: tag }, lastUpdated: touch() });
    } else {
      await Lead.updateMany({ _id: { $in: ids } }, { $addToSet: { tags: tag }, lastUpdated: touch() });
    }
    return res.json({ updated: ids.length });
  });

  router.post('/bulk/delete', async (req, res) => {
    const { ids = [] } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Invalid payload' });
    }
    const result = await Lead.deleteMany({ _id: { $in: ids } });
    return res.json({ deleted: result.deletedCount || 0 });
  });

  router.delete('/all', async (_req, res) => {
    const result = await Lead.deleteMany({});
    return res.json({ deleted: result.deletedCount || 0 });
  });

  router.post('/import', async (req, res) => {
    const { rows = [] } = req.body || {};
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'rows is required' });
    }
    const validRows = rows
      .filter((row) => (row.companyName || '').trim())
      .map((row) => {
        const normalizedRow = normalizeAddressFields(row);
        return {
          ...normalizedRow,
        companyName: (row.companyName || '').trim(),
        phone: (row.phone || '').trim(),
        email: (row.email || '').trim(),
        tags: Array.isArray(normalizedRow.tags) ? normalizedRow.tags : [],
        leadStatus: LEAD_STATUSES.includes(normalizedRow.leadStatus) ? normalizedRow.leadStatus : 'New',
        lastUpdated: touch(),
      };
      });

    const skipped = rows.length - validRows.length;
    let inserted = [];
    let failed = 0;

    try {
      inserted = await Lead.insertMany(validRows, { ordered: false });
    } catch (error) {
      const insertedDocs = error?.insertedDocs || [];
      inserted = insertedDocs;
      failed = Math.max(validRows.length - insertedDocs.length, 0);
    }

    return res.json({ imported: inserted.length, skipped, failed });
  });

  return router;
};

export default leadsRoutes;
