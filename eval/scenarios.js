export const EVAL_NOW = new Date('2026-11-11T13:30:00+05:30');

export const scenarios = [
  {
    id: 'missing-historical-record',
    label: 'Missing history — do not invent a prior conversation',
    seedDate: '2026-11-03T09:30:00+05:30',
    seedConversation: 'fixture-empty-history',
    seedTurns: [],
    prompt: 'What did I ask you on 3 November? Is your answer still correct today?',
    expectedRecall: [],
    expectSearch: false,
    expectNoHistory: true,
    expectedVerdicts: ['unverifiable']
  },
  {
    id: 'crm-shortlist-monday',
    label: 'Monday CRM shortlist — pricing and product changes',
    seedDate: '2026-11-09T10:00:00+05:30',
    seedConversation: 'fixture-crm-monday',
    seedTurns: [
      { role: 'user', content: 'On Monday we shortlisted 5 CRM tools for a 20-person sales team: HubSpot, Pipedrive, Zoho CRM, Freshsales, and Salesforce.' },
      { role: 'assistant', content: 'The shortlist was HubSpot, Pipedrive, Zoho CRM, Freshsales, and Salesforce. We had not made a final choice. The historical note did not preserve comparable plan prices, so those need to be checked against current official sources.' }
    ],
    prompt: 'On Monday we shortlisted 5 CRM tools for a 20-person sales team. Has any of them changed pricing or shipped something big since?',
    expectedRecall: ['HubSpot','Pipedrive','Zoho CRM','Freshsales','Salesforce'],
    expectSearch: true,
    expectedVerdicts: ['changed','unchanged','unverifiable','new']
  },
  {
    id: 'explicit-november-3',
    label: 'Explicit historical date — recover question and recheck answer',
    seedDate: '2026-11-03T09:30:00+05:30',
    seedConversation: 'fixture-date-november-3',
    seedTurns: [
      { role: 'user', content: 'Which Node.js LTS release should we use for a new production service, and what is the support status?' },
      { role: 'assistant', content: 'We discussed selecting an active Node.js LTS release and checking its official release schedule. The saved answer did not preserve a version-specific source citation, so the recommendation must be re-verified before treating it as current.' }
    ],
    prompt: 'What did I ask you on 3 November? Is your answer still correct today?',
    expectedRecall: ['Node.js','LTS','3 November'],
    expectSearch: true,
    expectedVerdicts: ['still supported','corrected','unverifiable']
  },
  {
    id: 'last-tuesday-postgres',
    label: 'Ambiguous weekday — Postgres pricing since last Tuesday',
    seedDate: '2026-11-03T14:00:00+05:30',
    seedConversation: 'fixture-postgres-november-3',
    seedTurns: [
      { role: 'user', content: 'Compare Neon, Supabase, and Railway as managed Postgres hosting options for a small production app. What are their prices and relevant limits?' },
      { role: 'assistant', content: 'We compared Neon, Supabase, and Railway for managed Postgres. The stored historical answer did not retain exact comparable price amounts or plan-level source citations; do not claim a price is unchanged without recovering that baseline.' }
    ],
    distractorDate: '2026-11-10T11:00:00+05:30',
    distractorConversation: 'fixture-unrelated-november-10',
    distractorTurns: [
      { role: 'user', content: 'How should I structure a React Server Components security review?' },
      { role: 'assistant', content: 'We discussed a React Server Components security review checklist.' }
    ],
    prompt: 'Last Tuesday I asked you about Postgres hosting. Has any pricing changed since then?',
    expectedRecall: ['Neon','Supabase','Railway','Postgres'],
    expectSearch: true,
    expectedVerdicts: ['changed','unchanged','unverifiable']
  }
];
