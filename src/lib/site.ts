/**
 * Central site configuration. Edit this file to update personal info,
 * links, and site-wide strings. Avoids hunting through components.
 */

export const SITE = {
  // Person
  name: 'Kegu Lu',
  shortName: 'K. Lu',
  role: 'PhD Researcher',
  affiliation: 'Advanced Production Engineering',
  institution: 'University of Groningen',
  institutionShort: 'UG',
  location: 'Groningen, the Netherlands',

  // Short bio (2-3 sentences). Rendered on the home page.
  // Auto-drafted from the paper; replace with your own voice when ready.
  bio: `PhD researcher in computational materials science, using crystal-plasticity simulation to bridge microstructure and macroscale mechanical behavior in multiphase steels. My work combines DAMASK-based CP-RVE modeling with experimental characterization to produce quantitative, engineering-ready relationships between carbide microstructure and sheet-forming properties.`,

  // Contacts
  email: 'kegu.lu@rug.nl',
  orcid: 'https://orcid.org/0009-0006-3305-3055',
  linkedin: 'https://www.linkedin.com/in/kegu-lu-18714214a/',
  scholar: null as string | null, // e.g., 'https://scholar.google.com/citations?user=XXX'
  github: 'https://github.com/KeguLu',
  cvUrl: null as string | null,   // e.g., '/cv/kegu-lu-cv.pdf' once uploaded
  photoUrl: null as string | null, // e.g., '/photo.jpg' once uploaded

  // Site deployment target — used in a few places for meta tags & canonical URLs
  siteUrl: 'https://kegulu.github.io',

  // Chat / agent backend
  chatApiUrl: import.meta.env.VITE_CHAT_API_URL || 'https://phd-agent-proxy.lukegusw35.workers.dev/api/chat',

  // About the agent — displayed on the chat page
  agentDescription: `This agent has been trained on the contents of Kegu's published papers, research notes, and public GitHub code. It retrieves relevant passages from these sources and uses them to answer questions about the research. Ask it about methods, results, code, or comparisons to prior work.`,
} as const;
