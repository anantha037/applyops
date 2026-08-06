export const MOCK_SUMMARY = {
  applications_today: 5,
  response_rate: 34,
  interviews_count: 4,
  offers_count: 1,
  ghosted_count: 2,
  funnel: {
    'Not Contacted': 6,
    'In Progress': 14,
    'Interviewing': 4,
    'Offer Received': 1,
    'Rejected': 5,
    'Ghosted': 3
  }
}

export const MOCK_DUE_TODAY = [
  {
    id: 'app_1',
    company: 'Stripe',
    job_title: 'Senior Frontend Engineer',
    stage: 'Recruiter Screen',
    status: 'In Progress',
    next_action_due: '2026-08-07',
    date_applied: '2026-08-01'
  },
  {
    id: 'app_2',
    company: 'Linear',
    job_title: 'Product Engineer (UI)',
    stage: 'Technical Interview',
    status: 'Interviewing',
    next_action_due: '2026-08-07',
    date_applied: '2026-07-28'
  },
  {
    id: 'app_3',
    company: 'Vercel',
    job_title: 'Design Systems Architect',
    stage: 'Portfolio Review',
    status: 'Interviewing',
    next_action_due: '2026-08-08',
    date_applied: '2026-07-25'
  },
  {
    id: 'app_4',
    company: 'Notion',
    job_title: 'Frontend Specialist',
    stage: 'Application Sent',
    status: 'In Progress',
    next_action_due: '2026-08-09',
    date_applied: '2026-08-03'
  }
]

export const MOCK_DAILY_REPORT = {
  calls_dialed: 6,
  calls_connected: 4,
  applications_sent: 5,
  interviews_attended: 1,
  method_breakdown: {
    'LinkedIn Easy Apply': 3,
    'Company Portal': 1,
    'Employee Referral': 1
  }
}

export const MOCK_APPLICATIONS = [
  {
    id: 'app_1',
    company: 'Stripe',
    job_title: 'Senior Frontend Engineer',
    stage: 'Recruiter Screen',
    status: 'In Progress',
    application_method: 'LinkedIn Easy Apply',
    date_applied: '2026-08-01',
    next_action_due: '2026-08-07'
  },
  {
    id: 'app_2',
    company: 'Linear',
    job_title: 'Product Engineer (UI)',
    stage: 'Technical Interview',
    status: 'Interviewing',
    application_method: 'Employee Referral',
    date_applied: '2026-07-28',
    next_action_due: '2026-08-07'
  },
  {
    id: 'app_3',
    company: 'Vercel',
    job_title: 'Design Systems Architect',
    stage: 'Portfolio Review',
    status: 'Interviewing',
    application_method: 'Company Portal',
    date_applied: '2026-07-25',
    next_action_due: '2026-08-08'
  },
  {
    id: 'app_4',
    company: 'Notion',
    job_title: 'Frontend Specialist',
    stage: 'Application Sent',
    status: 'In Progress',
    application_method: 'LinkedIn Easy Apply',
    date_applied: '2026-08-03',
    next_action_due: '2026-08-09'
  },
  {
    id: 'app_5',
    company: 'Figma',
    job_title: 'UI Engineer - Design Tools',
    stage: 'Offer Received',
    status: 'Offer Received',
    application_method: 'Employee Referral',
    date_applied: '2026-07-15',
    next_action_due: '2026-08-10'
  },
  {
    id: 'app_6',
    company: 'Airbnb',
    job_title: 'Staff Web Developer',
    stage: 'Not Contacted',
    status: 'Not Contacted',
    application_method: 'Indeed',
    date_applied: '2026-08-04',
    next_action_due: null
  },
  {
    id: 'app_7',
    company: 'GitHub',
    job_title: 'Senior React Developer',
    stage: 'Rejected',
    status: 'Rejected',
    application_method: 'Company Portal',
    date_applied: '2026-07-10',
    next_action_due: null
  },
  {
    id: 'app_8',
    company: 'Raycast',
    job_title: 'Frontend Systems Specialist',
    stage: 'No Response',
    status: 'Ghosted',
    application_method: 'Cold Email',
    date_applied: '2026-07-01',
    next_action_due: null
  }
]

export const MOCK_CONTACTS = [
  {
    id: 'c_1',
    name: 'Sarah Jenkins',
    company: 'Stripe',
    role: 'Tech Recruiter',
    email: 'sarah.j@stripe.com',
    phone: '+1 (415) 890-1234',
    last_contacted: '2026-08-05',
    responded: true,
    tags: ['Recruiter', 'High Priority']
  },
  {
    id: 'c_2',
    name: 'Marcus Vance',
    company: 'Linear',
    role: 'Engineering Lead',
    email: 'marcus@linear.app',
    phone: '+1 (650) 450-8910',
    last_contacted: '2026-08-04',
    responded: true,
    tags: ['Hiring Manager', 'Referral']
  },
  {
    id: 'c_3',
    name: 'Elena Rostova',
    company: 'Vercel',
    role: 'Design Engineering Director',
    email: 'elena@vercel.com',
    phone: '+1 (415) 321-7654',
    last_contacted: '2026-08-02',
    responded: true,
    tags: ['Director', 'Interviewer']
  },
  {
    id: 'c_4',
    name: 'David Chen',
    company: 'Notion',
    role: 'Talent Acquisition',
    email: 'dchen@makenotion.com',
    phone: '+1 (415) 678-9012',
    last_contacted: '2026-07-30',
    responded: false,
    tags: ['Recruiter']
  }
]

export const MOCK_ANALYTICS = {
  current: {
    total_applications: 33,
    response_rate: 34,
    interviews_attended: 8,
    offer_received: 1,
    in_progress: 14,
    interviewing: 4,
    not_contacted: 6,
    rejected: 5,
    ghosted: 3
  },
  deltas: {
    total_applications: 18,
    response_rate: 6,
    interviews_attended: 25,
    offer_received: 100
  },
  history: [
    { date: '2026-07-08', total_applications: 5 },
    { date: '2026-07-15', total_applications: 12 },
    { date: '2026-07-22', total_applications: 20 },
    { date: '2026-07-29', total_applications: 27 },
    { date: '2026-08-05', total_applications: 33 }
  ],
  sources: {
    'LinkedIn Easy Apply': 15,
    'Company Portal': 8,
    'Employee Referral': 5,
    'Indeed': 3,
    'Cold Email': 2
  }
}

export const MOCK_CALENDAR_EVENTS = [
  {
    id: 'evt_1',
    title: 'Stripe Technical Interview',
    company: 'Stripe',
    type: 'Interview',
    start: '2026-08-07T14:00:00',
    end: '2026-08-07T15:00:00',
    notes: 'System design & React Architecture'
  },
  {
    id: 'evt_2',
    title: 'Linear Recruiter Call',
    company: 'Linear',
    type: 'Call',
    start: '2026-08-08T11:00:00',
    end: '2026-08-08T11:30:00',
    notes: 'Intro chat with Marcus'
  },
  {
    id: 'evt_3',
    title: 'Vercel Portfolio Review',
    company: 'Vercel',
    type: 'Interview',
    start: '2026-08-10T16:30:00',
    end: '2026-08-10T17:30:00',
    notes: 'Present design system project'
  }
]

export const MOCK_SETTINGS = {
  target_daily_applications: 5,
  telegram_bot_active: true,
  daily_coaching_time: '21:00',
  preferred_theme: 'light',
  sync_google_sheets: true
}
