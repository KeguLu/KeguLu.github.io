/**
 * Main editable site content.
 *
 * If you only want to change personal information or homepage wording,
 * start here. Usually you only need to edit the text after each colon.
 */

export const SITE = {
  // Basic identity
  name: 'Kegu Lu',
  shortName: 'K. Lu',
  role: 'PhD Researcher',
  affiliation: 'Advanced Production Engineering',
  institution: 'University of Groningen',
  institutionShort: 'UG',
  location: 'Groningen, the Netherlands',
  industryPartner: 'Philips Drachten',

  // Short bio shown in the About section on the homepage.
  bio: `PhD researcher using crystal plasticity for forming and cellular automaton for heat treatment to bridge microstructure and macroscale mechanical behaviors in sheet metals.`,

  // Links and contact details
  email: 'kegu.lu@rug.nl',
  orcid: 'https://orcid.org/0009-0006-3305-3055',
  linkedin: 'https://www.linkedin.com/in/kegu-lu-18714214a/',
  scholar: null as string | null, // e.g., 'https://scholar.google.com/citations?user=XXX'
  github: 'https://github.com/KeguLu',
  cvUrl: null as string | null,   // e.g., '/cv/kegu-lu-cv.pdf' once uploaded
  photoUrl: null as string | null, // e.g., '/photo.jpg' once uploaded

  // Homepage wording
  home: {
    heroTitleStart: 'Multiscale',
    heroTitleAccent: '& Multiphysics',
    heroTitleEnd: 'simulations for sheet metals.',
    heroIntro: `Crystal plasticity, cellular automaton and FEM simulations for the forming and heat treatment process of sheet metal.`,
    primaryAction: 'Chat with the ResearchTwin-K.Lu',
    cvAction: 'Download CV',
    aboutLabel: 'About',
    researchLabel: 'Research',
    researchIntro: `Each one has its own subcontent and pages.`,
    contactLabel: 'Elsewhere',
    loadingLabel: 'Loading...',
    areaReadAction: 'Read',
    placeholderTitle: 'Coming soon',
    placeholderSubtitle: 'In preparation',
  },

  // Header and footer wording
  navigation: {
    work: 'Work',
    chat: 'Chat',
    github: 'GitHub',
  },
  footerText: 'Built with ResearchTwin-K.Lu -- ask it anything on the Chat page',

  // Site deployment target, used for metadata and canonical URLs.
  siteUrl: 'https://kegulu.github.io',

  // Chat / agent backend
  chatApiUrl: import.meta.env.VITE_CHAT_API_URL || 'https://phd-agent-proxy.lukegusw35.workers.dev/api/chat',

  // About ResearchTwin-K.Lu, displayed on the chat page.
  agentDescription: `ResearchTwin-K.Lu is built from Kegu's published papers, research notes, and public GitHub code. It retrieves relevant passages from these sources to answer questions about the research, methods, results, code, or comparisons to prior work.`,
} as const;
