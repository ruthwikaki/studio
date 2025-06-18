# **App Name**: SupplyChainAI

## Core Features:

- Data Import: Drag-and-drop file upload and parsing for CSV/Excel inventory data with instant preview and validation
- AI Chat: AI-powered chat interface for natural language inventory queries using OpenAI API. Chat maintains conversation history and provides context-aware responses about stock levels, reorder points, and supplier recommendations. LLM acts as a tool to provide inventory insights.
- Real-time Analytics: Live inventory tracking dashboard with auto-generated insights including low stock alerts, overstock identification, dead stock analysis, ABC categorization, and turnover rates
- Automated Reordering: Smart reorder point calculations based on lead times and demand patterns, with one-click purchase order generation optimized for bulk discounts
- Multi-tenant Architecture: Company-based data isolation with role-based access control (admin/manager/viewer)
- User Authentication: Firebase Auth with email/password and Google OAuth, including user profile management and team invitations

## Style Guidelines:

- Primary color: Strong blue (#3498DB), for trust and efficiency
- Background color: Light blue (#EBF5FB), a lighter shade for clean backdrop
- Accent color: Purple (#9B59B6), for highlighting key actions and CTAs
- Success color: Green (#27AE60), for positive metrics and confirmations
- Warning color: Orange (#F39C12), for low stock alerts
- Error color: Red (#E74C3C), for critical alerts
- Headline font: 'Space Grotesk' sans-serif for headings
- Body font: 'Inter' sans-serif for clean readability
- Use clean, modern icons for inventory boxes, analytics charts, suppliers, and reorder actions
- Clean, intuitive layout with sidebar navigation, data tables with inline editing, and responsive grid system for dashboard widgets