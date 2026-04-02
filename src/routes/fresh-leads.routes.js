import { Router } from 'express';
import FreshLead from '../models/freshLead.model.js';
import { LEAD_STATUSES } from '../models/lead.model.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const toClientFreshLead = (lead) => ({
  id: lead._id.toString(),
  name: lead.name,
  sourceLocation: lead.sourceLocation,
  contactNo: lead.contactNo,
  leadStatus: lead.leadStatus,
  tags: lead.tags,
  notes: lead.notes,
  lastUpdated: lead.lastUpdated,
});

const touch = () => new Date().toISOString().split('T')[0];

const freshLeadsRoutes = (jwtSecret) => {
  const router = Router();
  router.use(authMiddleware(jwtSecret));

  router.get('/', async (_req, res) => {
    const rows = await FreshLead.find().sort({ updatedAt: -1 });
    return res.json(rows.map(toClientFreshLead));
  });

  router.get('/stats', async (_req, res) => {
    const [total, contacted, converted, newLeads] = await Promise.all([
      FreshLead.countDocuments(),
      FreshLead.countDocuments({ leadStatus: 'Contacted' }),
      FreshLead.countDocuments({ leadStatus: 'Converted' }),
      FreshLead.countDocuments({ leadStatus: 'New' }),
    ]);
    return res.json({ total, contacted, converted, newLeads });
  });

  router.post('/', async (req, res) => {
    const payload = req.body || {};
    if (!(payload.name || '').trim()) {
      return res.status(400).json({ message: 'name is required' });
    }
    const lead = await FreshLead.create({
      name: payload.name.trim(),
      sourceLocation: (payload.sourceLocation || '').trim(),
      contactNo: (payload.contactNo || '').trim(),
      leadStatus: LEAD_STATUSES.includes(payload.leadStatus) ? payload.leadStatus : 'New',
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      notes: (payload.notes || '').trim(),
      lastUpdated: touch(),
    });
    return res.status(201).json(toClientFreshLead(lead));
  });

  router.post('/import', async (req, res) => {
    const { rows = [] } = req.body || {};
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'rows is required' });
    }

    const validRows = rows
      .map((row) => ({
        name: String(row?.name || '').trim(),
        sourceLocation: String(row?.sourceLocation || '').trim(),
        contactNo: String(row?.contactNo || '').trim(),
        leadStatus: LEAD_STATUSES.includes(row?.leadStatus) ? row.leadStatus : 'New',
        tags: Array.isArray(row?.tags) ? row.tags : [],
        notes: String(row?.notes || '').trim(),
        lastUpdated: touch(),
      }))
      .filter((row) => row.name);

    const skipped = rows.length - validRows.length;
    if (validRows.length === 0) {
      return res.status(400).json({ message: 'No valid rows to import' });
    }

    let inserted = [];
    let failed = 0;
    try {
      inserted = await FreshLead.insertMany(validRows, { ordered: false });
    } catch (error) {
      const insertedDocs = error?.insertedDocs || [];
      inserted = insertedDocs;
      failed = Math.max(validRows.length - insertedDocs.length, 0);
    }

    return res.json({
      imported: inserted.length,
      skipped,
      failed,
      rows: inserted.map(toClientFreshLead),
    });
  });

  router.post('/bulk/delete', async (req, res) => {
    const { ids = [] } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Invalid payload' });
    }
    const result = await FreshLead.deleteMany({ _id: { $in: ids } });
    return res.json({ deleted: result.deletedCount || 0 });
  });

  router.delete('/all', async (_req, res) => {
    const result = await FreshLead.deleteMany({});
    return res.json({ deleted: result.deletedCount || 0 });
  });

  router.post('/bulk/status', async (req, res) => {
    const { ids = [], status } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0 || !LEAD_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid payload' });
    }
    await FreshLead.updateMany({ _id: { $in: ids } }, { leadStatus: status, lastUpdated: touch() });
    return res.json({ updated: ids.length });
  });

  router.post('/bulk/tag', async (req, res) => {
    const { ids = [], tag, mode = 'add' } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0 || !tag) {
      return res.status(400).json({ message: 'Invalid payload' });
    }
    if (mode === 'remove') {
      await FreshLead.updateMany({ _id: { $in: ids } }, { $pull: { tags: tag }, lastUpdated: touch() });
    } else {
      await FreshLead.updateMany({ _id: { $in: ids } }, { $addToSet: { tags: tag }, lastUpdated: touch() });
    }
    return res.json({ updated: ids.length });
  });

  router.put('/:id', async (req, res) => {
    const payload = req.body || {};
    const update = {
      ...(payload.name !== undefined ? { name: String(payload.name).trim() } : {}),
      ...(payload.sourceLocation !== undefined ? { sourceLocation: String(payload.sourceLocation).trim() } : {}),
      ...(payload.contactNo !== undefined ? { contactNo: String(payload.contactNo).trim() } : {}),
      ...(payload.leadStatus !== undefined && LEAD_STATUSES.includes(payload.leadStatus)
        ? { leadStatus: payload.leadStatus }
        : {}),
      ...(payload.tags !== undefined && Array.isArray(payload.tags) ? { tags: payload.tags } : {}),
      ...(payload.notes !== undefined ? { notes: String(payload.notes).trim() } : {}),
      lastUpdated: touch(),
    };
    const lead = await FreshLead.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!lead) return res.status(404).json({ message: 'Fresh lead not found' });
    return res.json(toClientFreshLead(lead));
  });

  router.delete('/:id', async (req, res) => {
    const lead = await FreshLead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Fresh lead not found' });
    return res.status(204).send();
  });

  return router;
};

export default freshLeadsRoutes;
