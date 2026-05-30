# GitGuard AI Frontend - Setup & Architecture Guide

## Project Structure

```
frontend/
├── src/
│   ├── main.jsx              # React entry point
│   ├── App.jsx               # Main app component with routing
│   ├── pages/
│   │   ├── LandingPage.jsx   # Landing page with navbar, hero, footer
│   │   └── AuthRouter.jsx    # Authentication router (login/register)
│   └── styles/
│       ├── global.css        # Global design system & typography
│       ├── landing.css       # Landing page specific styles
│       └── auth.css          # Authentication page styles
├── index.html                # HTML entry point
└── vite.config.js            # Vite build configuration
```

## Design System

### Core Colors
- **GitHub Green**: #0FBF3E - Primary brand color for CTAs and highlights
- **Black**: #000000 - Primary background
- **White**: #FFFFFF - Primary text
- **Dark Gray**: #24292E - Secondary text and borders
- **Light Gray**: #F2F5F3 - Subtle UI elements and borders (used at 0.1-0.2 opacity)

### Typography
- **Inter**: All structural UI text, headings, buttons, navigation (400, 500, 600, 700 weights)
- **Courier New**: Exclusively for code diffs, logs, and monospace displays

### Visual Language
- **Glassmorphism**: All containers use `backdrop-filter: blur(12px)` with semi-transparent backgrounds
- **Borders**: Precise 1px borders using `rgba(242, 245, 243, 0.1-0.2)` for definition without visual weight
- **Spacing**: Consistent spacing system prevents text collisions and maintains clean layouts
- **Motion**: 0.3s cubic-bezier(0.4, 0, 0.2, 1) for smooth, professional transitions

## Component Specifications

### LandingPage Component (`frontend/src/pages/LandingPage.jsx`)

#### Header Navbar
- Lucide GitHub icon (24px, #0FBF3E)
- Brand title "GitGuard AI" in bold Inter
- Navigation links: Home, Features, Docs
- Functional "Sign In" link that routes to `/auth`
- Sticky positioning with glassmorphism backdrop
- Responsive behavior on mobile

#### Hero Section
- Massive headline: "Intelligent PR Reviews, Instantly"
- Sub-headline describing real-time PR automated reviews
- Prominent CTA button ("Get Started") with:
  - GitHub Green background with hover inversion effect
  - Lucide ArrowRight icon integrated inline
  - Routes to `/auth` when clicked
  - Box-shadow glow effect that expands on hover
- Glass container displaying code diff in Courier New
- Multi-line diff display showing before/after code
- Responsive grid layout with gradient backgrounds

#### Footer
- Sticky bottom positioning
- Glassmorphic styling matching navbar
- Centered text: "Batch No. 15 | Zaalima Web Development Pvt. Ltd."
- Low-opacity Light Gray border

### AuthRouter Component (`frontend/src/pages/AuthRouter.jsx`)

#### Centered Glass Form Box
- Backdrop-filter glassmorphism with semi-transparent background
- 1px border using light gray with low opacity
- Box-shadow for depth
- Max-width 420px with responsive padding
- Centered both horizontally and vertically on viewport

#### Login State
- Email input field with validation
- Password input field with minimum length check
- Input containers with:
  - Clean border styling
  - Focus state: border color shifts to GitHub Green (#0FBF3E)
  - Semi-transparent background on focus
  - Error state styling in red (#ff6b6b)
- Primary submit button: "Sign In"
- Toggle text: "New to the sentinel? Create an account"
- Toggle link with hover effect

#### Register State
- Name input field with required validation
- Email input field with format validation
- Password input field with minimum length check
- All inputs use same styling as login state
- Primary submit button: "Create Account"
- Fallback toggle: "Already have an account? Sign in here"
- Smooth state transition when toggling modes
- Form resets when switching between modes

#### Form Validation
- Email format validation using regex
- Minimum password length: 6 characters
- Required field validation for all inputs
- Error messages displayed below fields in red (#ff6b6b)
- Error state persists until user interacts with field

## Installation & Running

### Install Dependencies
```bash
npm install
```

This will install all dependencies including:
- React 18.2.0
- React Router DOM 6.14.2
- Lucide React 0.263.1
- Vite 4.4.9
- And backend dependencies (Express, Groq SDK, etc.)

### Development Mode

#### Option 1: Run React Frontend Only
```bash
npm run frontend
```
Starts Vite dev server at `http://localhost:5173`

#### Option 2: Run Backend Server
```bash
npm start
```
Runs Express backend at `http://localhost:3000` (or next available port)

#### Option 3: Run Both in Parallel
Terminal 1:
```bash
npm run frontend
```

Terminal 2:
```bash
npm start
```

### Build Production
```bash
npm run build
```
Builds React frontend to `public/dist/` and compiles frontend assets.

## Technical Specifications

### React Routing
- Uses React Router DOM v6 for client-side routing
- Two main routes:
  - `/` - Landing page
  - `/auth` - Authentication router with login/register toggle

### State Management
AuthRouter component manages:
- `isLogin` - Boolean toggle between login and register forms
- `loginData` - Email and password for login
- `registerData` - Name, email, and password for registration
- `errors` - Validation error messages per field

### Icons & Typography
- All icons from Lucide React (no emojis anywhere in codebase)
- GitHub icon: `<Github size={24} color="#0FBF3E" />`
- Arrow Right icon: `<ArrowRight size={20} />`
- All text uses Inter font family except code display

### Styling Architecture
- CSS modules with global root variables
- Mobile-first responsive design
- Breakpoints: 768px (tablet), 480px (mobile)
- GPU-accelerated transitions using transform and opacity
- No text overlapping with proper flex/grid spacing

### Browser Compatibility
- Modern browsers with CSS Grid, Flexbox, and backdrop-filter support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile responsive down to 320px width

## No Emoji Policy

Per requirements, the codebase contains:
- No emojis in strings, comments, labels, or logs
- No emoji-based visual indicators
- All visual indications use Lucide React icons exclusively
- Professional UI language throughout

## Notes

- The landing page includes a simulated glass container with code diff display
- Auth component supports smooth transitions between login and register states
- All form validation provides user-friendly error messages
- Glassmorphism styling creates modern, sophisticated UI without visual noise
- Design system ensures consistency across all components
- Responsive design maintains usability on all device sizes
