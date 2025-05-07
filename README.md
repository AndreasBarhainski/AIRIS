# AIRIS - ComfyUI Workflows Frontend

AIRIS is a web application that provides an easy-to-use interface for ComfyUI workflows, allowing users to manage, customize, and run AI image generation workflows through a simple interface.

## Features

- Upload and manage ComfyUI workflows
- Configure workflow parameters with a user-friendly interface
- Generate images using ComfyUI as the backend
- Save and reuse configurations
- Upload images to use in your workflows
- View generated results

## Architecture

The application consists of:

- **Frontend**: React application with TypeScript, Vite, and PrimeReact
- **Backend**: Node.js Express server
- **Database**: PostgreSQL (for production/Heroku) or SQLite (for local development)

## Local Development Setup

### Prerequisites

- Node.js v20+
- npm v10+
- ComfyUI installed and running locally (default: http://localhost:8188)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd AIRIS
```

2. Install dependencies for the root, frontend, and backend:

```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

3. Start the development server:

```bash
# From the project root
npm start
```

This will concurrently run:

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

## Heroku Deployment

AIRIS is configured for easy deployment to Heroku:

### Prerequisites

- Heroku account
- Heroku CLI installed (optional, for command-line deployment)
- Git repository (preferably connected to GitHub for Heroku auto-deploys)

### Deployment Steps

1. Create a new Heroku app:

```bash
heroku create your-app-name
```

2. Add PostgreSQL add-on:

```bash
heroku addons:create heroku-postgresql:mini
```

3. Deploy to Heroku:

```bash
git push heroku main
```

Or set up automatic deployments from GitHub in the Heroku Dashboard.

4. Set environment variables (if needed):

```bash
heroku config:set COMFY_URL=https://your-comfyui-server.com
```

### Environment Variables

- `DATABASE_URL`: Automatically set by Heroku PostgreSQL add-on
- `COMFY_URL`: URL of your ComfyUI server (default: http://localhost:8188)
- `PORT`: Port for the backend server (default: 4000)

## Project Structure

```
AIRIS/
├── backend/             # Express server
│   ├── images/          # Stored images
│   ├── workflows/       # Stored workflow files
│   └── index.js         # Main server file
├── frontend/            # React application
│   ├── public/          # Static assets
│   └── src/             # Source code
│       ├── components/  # React components
│       ├── pages/       # Page components
│       ├── store/       # State management
│       └── utils/       # Utility functions
├── memory-bank/         # Project documentation
├── screenshots/         # Application screenshots
└── input/               # Input files for workflows
```

## License

[MIT License](LICENSE)

## Support

For issues, feature requests, or questions, please [open an issue](https://github.com/yourusername/AIRIS/issues) on the GitHub repository.
