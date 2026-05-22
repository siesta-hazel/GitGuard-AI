# Frontend Overview

The frontend is a React 18 and Vite application that provides three primary surfaces:

- Landing page with premium branding and call to action.
- Auth page with login and registration flows.
- Dashboard page with webhook monitoring and review history presentation.

## Design Rules

- Black canvas with GitHub Green accents.
- Inter for UI text and Courier New for review content.
- Glassmorphism panels with blur and subtle borders.
- Lucide React icons only.
- No emoji usage in UI text or documentation.

## Development

1. Run `npm install`.
2. Start the frontend with `npm run frontend`.
3. Use the Vite proxy to reach backend auth endpoints through `/api`.

## Validation

- Form validation covers email, password, and name requirements.
- The auth form stores the returned session token in local storage.
- The dashboard layout is responsive and avoids text collisions in narrow layouts.
