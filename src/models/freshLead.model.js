import mongoose from 'mongoose';
import { LEAD_STATUSES } from './lead.model.js';

const freshLeadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sourceLocation: { type: String, default: '', trim: true },
    contactNo: { type: String, default: '', trim: true },
    leadStatus: { type: String, enum: LEAD_STATUSES, default: 'New' },
    tags: { type: [String], default: [] },
    notes: { type: String, default: '', trim: true },
    lastUpdated: { type: String, default: () => new Date().toISOString().split('T')[0] },
  },
  { timestamps: true },
);

export default mongoose.model('FreshLead', freshLeadSchema);
