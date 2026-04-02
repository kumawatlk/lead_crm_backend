import mongoose from 'mongoose';

const LEAD_STATUSES = ['New', 'Contacted', 'Follow-up', 'Qualified', 'Converted', 'Closed', 'Not Interested'];

const leadSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true },
    // Phone is optional for imported rows that don't include contact number.
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    category: { type: String, default: '' },
    leadStatus: { type: String, enum: LEAD_STATUSES, default: 'New' },
    tags: { type: [String], default: [] },
    notes: { type: String, default: '' },
    lastUpdated: { type: String, default: () => new Date().toISOString().split('T')[0] },
  },
  { timestamps: true },
);

export { LEAD_STATUSES };
export default mongoose.model('Lead', leadSchema);
