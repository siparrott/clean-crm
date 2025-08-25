#!/usr/bin/env node

/**
 * Script to populate demo app with realistic photography business data
 * Usage: node scripts/setup-demo-data.js
 */

const { db } = require('../server/db');
const { clients, crmLeads, photographySessions, crmInvoices, galleries, blogPosts } = require('../shared/schema');
const { eq, like } = require('drizzle-orm');

const DEMO_CLIENTS = [
  {
    id: 'demo-client-1',
    name: 'Maria & Johann Schmidt',
    email: 'maria.schmidt@email.com',
    phone: '+43 664 123 4567',
    status: 'active',
    source: 'Instagram',
    notes: 'Family portraits, expecting second child in spring 2025',
    address: 'Mariahilfer Str. 45, 1060 Wien',
    totalSpent: 1250.00,
    createdAt: new Date('2024-11-15'),
    updatedAt: new Date('2024-12-20')
  },
  {
    id: 'demo-client-2',
    name: 'Lisa & David Weber',
    email: 'lisa.weber@email.com',
    phone: '+43 699 987 6543',
    status: 'lead',
    source: 'Google Search',
    notes: 'Interested in wedding photography package for June 2025',
    address: 'Praterstraße 12, 1020 Wien',
    totalSpent: 0,
    createdAt: new Date('2024-12-10'),
    updatedAt: new Date('2024-12-10')
  },
  {
    id: 'demo-client-3',
    name: 'Anna Müller',
    email: 'anna.mueller@email.com',
    phone: '+43 676 555 1234',
    status: 'active',
    source: 'Referral',
    notes: 'Newborn session completed, very happy with results',
    address: 'Leopoldsgasse 8, 1020 Wien',
    totalSpent: 890.00,
    createdAt: new Date('2024-10-20'),
    updatedAt: new Date('2024-11-28')
  },
  {
    id: 'demo-client-4',
    name: 'Stefan & Carmen Hoffmann',
    email: 'stefan.hoffmann@email.com',
    phone: '+43 650 777 8899',
    status: 'active',
    source: 'Facebook',
    notes: 'Corporate headshots for consulting business',
    address: 'Kärntner Ring 5, 1010 Wien',
    totalSpent: 650.00,
    createdAt: new Date('2024-09-15'),
    updatedAt: new Date('2024-10-02')
  },
  {
    id: 'demo-client-5',
    name: 'Familie Zimmermann',
    email: 'zimmermann.familie@gmail.com',
    phone: '+43 688 444 5566',
    status: 'active',
    source: 'Website',
    notes: 'Annual family photos, 3 children ages 5, 8, 12',
    address: 'Schönbrunner Str. 88, 1050 Wien',
    totalSpent: 1420.00,
    createdAt: new Date('2024-08-10'),
    updatedAt: new Date('2024-12-05')
  }
];

const DEMO_SESSIONS = [
  {
    id: 'demo-session-1',
    title: 'Schmidt Family Winter Session',
    clientId: 'demo-client-1',
    date: '2024-12-15',
    startTime: '14:00',
    endTime: '16:00',
    location: 'Schönbrunn Gardens',
    sessionType: 'family',
    status: 'completed',
    photographer: 'Demo Photographer',
    notes: 'Beautiful natural light, family very cooperative',
    equipment: ['Canon EOS R5', '85mm f/1.8', 'Reflector'],
    weather: 'Sunny, 8°C',
    createdAt: new Date('2024-12-10'),
    updatedAt: new Date('2024-12-15')
  },
  {
    id: 'demo-session-2',
    title: 'Weber Wedding Consultation',
    clientId: 'demo-client-2',
    date: '2025-01-15',
    startTime: '16:00',
    endTime: '17:00',
    location: 'Studio',
    sessionType: 'consultation',
    status: 'scheduled',
    photographer: 'Demo Photographer',
    notes: 'Discuss wedding package options and venue requirements',
    equipment: [],
    weather: null,
    createdAt: new Date('2024-12-10'),
    updatedAt: new Date('2024-12-10')
  },
  {
    id: 'demo-session-3',
    title: 'Baby Anna Newborn Session',
    clientId: 'demo-client-3',
    date: '2024-11-28',
    startTime: '10:00',
    endTime: '13:00',
    location: 'Home Studio',
    sessionType: 'newborn',
    status: 'completed',
    photographer: 'Demo Photographer',
    notes: 'Sweet baby, very calm during session',
    equipment: ['Canon EOS R6', '50mm f/1.4', 'Softbox', 'Backdrop'],
    weather: null,
    createdAt: new Date('2024-11-20'),
    updatedAt: new Date('2024-11-28')
  }
];

const DEMO_INVOICES = [
  {
    id: 'demo-invoice-1',
    clientId: 'demo-client-1',
    invoiceNumber: 'INV-DEMO-001',
    amount: 650.00,
    tax: 130.00,
    total: 780.00,
    status: 'paid',
    dueDate: '2024-12-30',
    issueDate: '2024-12-15',
    description: 'Family Portrait Session + Digital Gallery',
    items: JSON.stringify([
      { description: 'Family Portrait Session (2 hours)', quantity: 1, rate: 350.00, amount: 350.00 },
      { description: 'Digital Gallery (25 edited photos)', quantity: 1, rate: 300.00, amount: 300.00 }
    ]),
    notes: 'Thank you for choosing our photography services!',
    createdAt: new Date('2024-12-15'),
    updatedAt: new Date('2024-12-20')
  },
  {
    id: 'demo-invoice-2',
    clientId: 'demo-client-3',
    invoiceNumber: 'INV-DEMO-002',
    amount: 890.00,
    tax: 178.00,
    total: 1068.00,
    status: 'paid',
    dueDate: '2024-12-15',
    issueDate: '2024-11-28',
    description: 'Newborn Session + Premium Package',
    items: JSON.stringify([
      { description: 'Newborn Session (3 hours)', quantity: 1, rate: 450.00, amount: 450.00 },
      { description: 'Premium Editing (20 photos)', quantity: 1, rate: 290.00, amount: 290.00 },
      { description: 'Print Package (5x7 prints)', quantity: 1, rate: 150.00, amount: 150.00 }
    ]),
    notes: 'Beautiful session, thank you!',
    createdAt: new Date('2024-11-28'),
    updatedAt: new Date('2024-12-05')
  }
];

const DEMO_GALLERIES = [
  {
    id: 'demo-gallery-1',
    title: 'Schmidt Family Winter 2024',
    description: 'Beautiful winter family portraits in Schönbrunn Gardens',
    clientId: 'demo-client-1',
    slug: 'schmidt-family-winter-2024',
    isPublic: true,
    password: null,
    expiresAt: null,
    downloadEnabled: true,
    commentsEnabled: false,
    createdAt: new Date('2024-12-16'),
    updatedAt: new Date('2024-12-16')
  },
  {
    id: 'demo-gallery-2',
    title: 'Baby Anna - First Days',
    description: 'Sweet newborn portraits of beautiful baby Anna',
    clientId: 'demo-client-3',
    slug: 'baby-anna-newborn-2024',
    isPublic: false,
    password: 'anna2024',
    expiresAt: null,
    downloadEnabled: true,
    commentsEnabled: true,
    createdAt: new Date('2024-11-30'),
    updatedAt: new Date('2024-11-30')
  }
];

const DEMO_LEADS = [
  {
    id: 'demo-lead-1',
    name: 'Thomas Fischer',
    email: 'thomas.fischer@email.com',
    phone: '+43 699 111 2233',
    source: 'Google Ads',
    status: 'new',
    message: 'Interested in corporate headshots for my team of 8 people',
    estimatedValue: 800.00,
    createdAt: new Date('2024-12-18'),
    updatedAt: new Date('2024-12-18')
  },
  {
    id: 'demo-lead-2',
    name: 'Sarah & Michael Koller',
    email: 'sarah.koller@gmail.com',
    phone: '+43 676 998 7744',
    source: 'Instagram',
    status: 'contacted',
    message: 'Looking for engagement photos before our wedding next year',
    estimatedValue: 450.00,
    createdAt: new Date('2024-12-17'),
    updatedAt: new Date('2024-12-18')
  }
];

const DEMO_BLOG_POSTS = [
  {
    id: 'demo-blog-1',
    title: 'Die besten Locations für Familienfotografie in Wien',
    slug: 'beste-locations-familienfotografie-wien',
    content: 'Wien bietet unzählige wunderschöne Locations für unvergessliche Familienfotos...',
    excerpt: 'Entdecken Sie die schönsten Plätze in Wien für Ihre nächste Familienfotosession.',
    status: 'published',
    featured: true,
    imageUrl: '/demo-images/vienna-family-location.jpg',
    tags: ['Familienfotografie', 'Wien', 'Locations'],
    createdAt: new Date('2024-12-01'),
    updatedAt: new Date('2024-12-01')
  },
  {
    id: 'demo-blog-2', 
    title: 'Tipps für entspannte Neugeborenenfotos',
    slug: 'tipps-entspannte-neugeborenenfotos',
    content: 'Neugeborenenfotos sind etwas ganz Besonderes. Hier sind meine besten Tipps...',
    excerpt: 'Wie Sie sich optimal auf ein Neugeborenen-Fotoshooting vorbereiten.',
    status: 'published',
    featured: false,
    imageUrl: '/demo-images/newborn-tips.jpg',
    tags: ['Neugeborenenfotos', 'Tipps', 'Vorbereitung'],
    createdAt: new Date('2024-11-25'),
    updatedAt: new Date('2024-11-25')
  }
];

async function setupDemoData() {
  try {
    console.log('🎬 Setting up demo data...');

    // Clear existing demo data
    await db.delete(clients).where(like(clients.id, 'demo-%'));
    await db.delete(crmLeads).where(like(crmLeads.id, 'demo-%'));
    await db.delete(photographySessions).where(like(photographySessions.id, 'demo-%'));
    await db.delete(crmInvoices).where(like(crmInvoices.id, 'demo-%'));
    await db.delete(galleries).where(like(galleries.id, 'demo-%'));
    await db.delete(blogPosts).where(like(blogPosts.id, 'demo-%'));

    // Insert demo data
    console.log('📝 Inserting demo clients...');
    await db.insert(clients).values(DEMO_CLIENTS);

    console.log('📅 Inserting demo sessions...');
    await db.insert(photographySessions).values(DEMO_SESSIONS);

    console.log('💰 Inserting demo invoices...');
    await db.insert(crmInvoices).values(DEMO_INVOICES);

    console.log('🖼️ Inserting demo galleries...');
    await db.insert(galleries).values(DEMO_GALLERIES);

    console.log('📞 Inserting demo leads...');
    await db.insert(crmLeads).values(DEMO_LEADS);

    console.log('📝 Inserting demo blog posts...');
    await db.insert(blogPosts).values(DEMO_BLOG_POSTS);

    console.log('✅ Demo data setup complete!');
    console.log('\nDemo Accounts:');
    console.log('Admin: demo@newagefotografie.com / demo2024');
    console.log('Client: client@demo.com / client2024');
    console.log('\nDemo galleries:');
    console.log('- Schmidt Family: /galerie/schmidt-family-winter-2024');
    console.log('- Baby Anna: /galerie/baby-anna-newborn-2024 (password: anna2024)');

  } catch (error) {
    console.error('Error setting up demo data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  setupDemoData();
}

module.exports = { setupDemoData };