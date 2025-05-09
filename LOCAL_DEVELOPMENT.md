# AIRIS - Local Development Guide

This guide explains how to set up and run the AIRIS project in your local development environment.

## Prerequisites

- Node.js v20.x
- npm v10.x
- ComfyUI running locally on port 8188 (default) or set a custom URL

## Initial Setup

1. Clone the repository:

   ```
   git clone <repository-url>
   cd AIRIS
   ```

2. Install dependencies for the main project, frontend, and backend:
   ```
   npm install
   cd frontend && npm install && cd ..
   cd backend && npm install && cd ..
   ```

## Running the Application Locally

The project consists of two parts:

- Frontend (React application with Vite)
- Backend (Node.js with Express)

### Start Both Services at Once

The easiest way to run both services together:

```
npm run dev
```

This command will start:

- Backend server on port 5000
- Frontend development server on port 3000 with API proxying configured

### Manual Startup (if needed)

If you need to run the services independently:

1. Start the backend:

   ```
   npm run backend
   ```

2. In a separate terminal, start the frontend:
   ```
   npm run frontend
   ```

## ComfyUI Configuration

The application is configured to connect to ComfyUI running at `http://localhost:8188` by default. You can change this in the application settings if your ComfyUI instance is running on a different URL.

## Application Structure

- `frontend/` - React application built with Vite
- `backend/` - Express server that handles API requests and proxies to ComfyUI
- `backend/workflows/` - Stores workflow configurations
- `backend/images/` - Stores generated images

## Data Storage

The application uses SQLite for data storage in development mode. The database file is located at `backend/configurations.db`.

## Common Issues and Solutions

### CORS Issues

If you encounter CORS issues, check that:

- You're using the configured proxy in development mode
- Your backend is running on port 5000
- The frontend is properly configured to use relative API paths

### Image Upload/Display Issues

If images aren't uploading or displaying correctly:

- Check that the backend has proper write permissions to the images directory
- Verify that the ComfyUI API URL is correctly configured

### Connection to ComfyUI

If the application fails to connect to ComfyUI:

- Verify that ComfyUI is running and accessible
- Check the ComfyUI API URL in the settings
- Check for any console errors in the browser
