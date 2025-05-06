# Tech Context: AIRIS

## Technologies Used

- **Frontend:** Vite, React, PrimeReact, Zustand (state management), React Router
- **Backend:** Node.js with Express
- **Database:** SQLite (for MVP), PostgreSQL (for production)
- **Image Storage:** Filesystem (images saved on disk, referenced in DB)
- **API Integration:** Backend service proxies requests to ComfyUI API

## Development Setup

- Vite for fast React development and optimized builds
- Modular codebase with clear separation between UI, state management, and API integration
- Environment configuration for ComfyUI API endpoint and database connection

## Technical Constraints

- Must support importing and parsing ComfyUI workflow JSON files
- Must persist workflows, configurations, and images reliably
- Must handle dynamic parameter forms and workflow manipulation

## Dependencies

- Vite, React, PrimeReact, Zustand, React Router, Express, SQLite/PostgreSQL, Multer (for file uploads), and others as needed
