# GitGuard AI Frontend - Quick Start Guide

## Immediate Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Frontend in Development
```bash
npm run frontend
```
Opens at `http://localhost:5173` with hot-reload enabled.

### 3. View the App
- **Landing Page**: http://localhost:5173/
- **Auth Page**: http://localhost:5173/auth

## What You Get

### Landing Page (`/`)
- GitGuard AI branding with GitHub icon
- Hero section: "Intelligent PR Reviews, Instantly"
- "Get Started" CTA button (routes to `/auth`)
- Code diff example in glassmorphic container
- Sticky navbar and footer
- Fully responsive design

### Authentication Router (`/auth`)
- Centered glassmorphic form
- **Login Mode**: Email + Password
- **Register Mode**: Name + Email + Password
- Toggle between modes with links
- Real-time form validation
- Error messages for invalid inputs
- Focus state styling with GitHub Green borders

## Key Features Implemented

### Design System ✓
- GitHub Green (#0FBF3E) for all CTAs
- Black (#000000) background with gradient
- Glassmorphism styling (blur 12px)
- Inter font for all UI text
- Courier New for code displays
- Precise 1px borders with low-opacity gray
- No emojis - all icons from lucide-react

### Components ✓
- LandingPage with navbar, hero, footer
- AuthRouter with login/register toggle
- 100% responsive (mobile, tablet, desktop)
- Smooth transitions and hover effects
- Clean spacing - no text overlaps
- Proper form validation

### Routing ✓
- React Router v6 setup
- Navigation between pages
- Link-based routing (no page reloads)
- Ready for integration with backend

## Validation Features

### Login Form
- Email format validation
- Password minimum 6 characters
- Real-time error clearing on input
- Focus state with green border

### Register Form
- Name required field validation
- Email format validation
- Password minimum 6 characters
- All fields required before submit

## Next Steps

### 1. Backend Integration
Update form handlers in `AuthRouter.jsx`:
```javascript
// Replace console.log with API calls
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(loginData)
});
```

### 2. Production Build
```bash
npm run build
```
Outputs optimized frontend to `public/dist/`

### 3. Styling Customization
Edit CSS files in `frontend/src/styles/`:
- `global.css` - Root colors, typography, base styles
- `landing.css` - Landing page specific styles
- `auth.css` - Authentication page specific styles

### 4. Adding More Pages
Create new components in `frontend/src/pages/` and add routes in `App.jsx`

## File Structure
```
frontend/
├── src/
│   ├── main.jsx              # Entry point
│   ├── App.jsx               # Routing setup
│   ├── pages/
│   │   ├── LandingPage.jsx   # Home page
│   │   └── AuthRouter.jsx    # Login/Register
│   └── styles/
│       ├── global.css        # Design system
│       ├── landing.css       # Landing styles
│       └── auth.css          # Auth styles
├── index.html                # HTML template
├── vite.config.js            # Build config
├── FRONTEND_SETUP.md         # Detailed documentation
└── COMPONENT_REFERENCE.md    # Component specs
```

## Development Commands

```bash
npm run frontend          # Start dev server (port 5173)
npm run build            # Production build
npm start                # Backend server (port 3000)
```

## Troubleshooting

### Port 5173 already in use?
```bash
npm run frontend -- --port 5174
```

### Fonts not loading?
- Check browser DevTools Network tab
- Ensure no CSP headers blocking fonts.googleapis.com

### Focus states not visible?
- Verify CSS cascade not overriding
- Check browser zoom level (100%)

### Form not validating?
- Check browser console for errors
- Verify lucide-react is installed: `npm ls lucide-react`

## Responsive Design

- Desktop: 1200px+ (full navbar, code diff visible)
- Tablet: 768px (adjusted spacing, compact nav)
- Mobile: 480px (stacked layout, hidden code diff)
- Small Mobile: 320px+ (minimal spacing, readable text)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Required features: CSS Grid, Flexbox, backdrop-filter

## Performance Notes

- CSS-in-JS approach for optimal delivery
- Vite dev server with sub-100ms HMR
- Production build with tree-shaking
- Minimal bundle size with React + React Router + Lucide

---

Ready to start? Run `npm install` then `npm run frontend` and visit http://localhost:5173!
