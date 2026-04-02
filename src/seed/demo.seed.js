import User from '../models/user.model.js';
import Lead from '../models/lead.model.js';

const starterLeads = [
  {
    companyName: 'Acme Corp',
    phone: '+1 555-0101',
    email: 'info@acme.com',
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    pincode: '10001',
    category: 'Technology',
    leadStatus: 'New',
    tags: ['Hot Lead', 'VIP'],
    notes: 'Interested in enterprise plan',
    lastUpdated: '2026-03-28',
  },
  {
    companyName: 'GlobalTech Solutions',
    phone: '+1 555-0102',
    email: 'sales@globaltech.com',
    city: 'San Francisco',
    state: 'CA',
    category: 'Software',
    leadStatus: 'Contacted',
    tags: ['Warm Lead'],
    notes: 'Demo scheduled next week',
    lastUpdated: '2026-03-27',
  },
];

export async function ensureDemoData() {
  const demoEmail = 'demo@leadloom.com';
  const existing = await User.findOne({ email: demoEmail });
  if (!existing) {
    await User.create({
      name: 'Demo User',
      email: demoEmail,
      password: 'demo123',
    });
  }

  const leadCount = await Lead.countDocuments();
  if (leadCount === 0) {
    await Lead.insertMany(starterLeads);
  }
}
