# GitGuard AI Frontend - Component Reference

## Component Inventory

### 1. LandingPage (`frontend/src/pages/LandingPage.jsx`)

**Purpose**: Main landing page with branding, value proposition, and entry point to authentication

**Key Features**:
- Responsive glassmorphic navbar with sticky positioning
- Hero section with massive headline and sub-headline
- Prominent CTA button with icon and hover effects
- Glass container displaying code diff example
- Sticky footer with company information

**Routing**: Accessible at `/` - redirects to `/auth` on "Sign In" or "Get Started" click

**Props**: None (stateless functional component)

**Lucide Icons Used**:
- `<Github size={24} color="#0FBF3E" />` - Navbar branding
- `<ArrowRight size={20} />` - CTA button

**Key CSS Classes**:
- `.landing-page` - Main container
- `.navbar` - Header with glassmorphism
- `.hero` - Content section
- `.cta-button` - Primary action button
- `.code-diff-container` - Glass container for code display
- `.footer` - Sticky bottom

**Responsive Breakpoints**:
- 768px (tablet): Navbar layout adjustment, smaller headline
- 480px (mobile): Hidden code diff, compact spacing

---

### 2. AuthRouter (`frontend/src/pages/AuthRouter.jsx`)

**Purpose**: Dual-mode authentication component supporting login and registration

**Key Features**:
- Centered glassmorphic form container
- Toggle between login and register states
- Email validation with format checking
- Password minimum length validation (6 characters)
- Name field validation on register
- Error messages with visual indicators
- Focus state styling with green border
- Smooth state transitions

**Routing**: Accessible at `/auth` - routes from `/` with Sign In links

**State Management**:
```javascript
const [isLogin, setIsLogin] = useState(true);           // Toggle mode
const [loginData, setLoginData] = useState(...);        // Email + Password
const [registerData, setRegisterData] = useState(...);  // Name + Email + Password
const [errors, setErrors] = useState({});               // Error messages
```

**Lucide Icons Used**:
- `<Github size={32} color="#0FBF3E" />` - Header branding

**Key CSS Classes**:
- `.auth-page` - Main container with background gradient
- `.auth-container` - Glass form box
- `.auth-form` - Form wrapper
- `.input-container` - Individual input field wrapper
- `.input-field` - Text input with focus and error states
- `.submit-button` - Primary action button
- `.toggle-link` - Secondary navigation link

**Form Validation Logic**:
```javascript
// Email: Must match /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Password: Minimum 6 characters
// Name: Required (not empty)
// All fields: Required on submit, no empty values allowed
```

**Error States**:
- Field-level errors display below input
- Red border on input field when error exists
- Semi-transparent red background on focus with error
- Error clears when user starts typing

**Responsive Breakpoints**:
- 480px (mobile): Reduced padding, smaller headings, stacked layout

---

## Design System Deep Dive

### Color Palette
```css
--github-green: #0FBF3E;    /* Primary CTA, focus states, icons */
--black: #000000;           /* Background */
--white: #FFFFFF;           /* Primary text */
--dark-gray: #24292E;       /* Secondary text */
--light-gray: #F2F5F3;      /* Borders at 0.1-0.2 opacity */
```

### Typography Stack
```css
/* Inter: All structural UI text */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Courier New: Code diffs and monospace displays only */
font-family: 'Courier New', monospace;
```

**Font Weights Used**:
- 400: Regular body text
- 500: Input labels, secondary text
- 600: Subheadings, buttons, highlighted text
- 700: Main headlines, brand title

### Glassmorphism Specification
```css
backdrop-filter: blur(12px);
background: rgba(255, 255, 255, 0.04-0.06);  /* Slight transparency */
border: 1px solid rgba(242, 245, 243, 0.1-0.15);
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
```

### Motion & Transitions
```css
--transition-smooth: 0.3s cubic-bezier(0.4, 0, 0.2, 1);

/* Applied to: color, background, border, transform, box-shadow */
/* Cubic bezier provides snappy, professional motion curve */
```

### Spacing Scale
- xs: 0.25rem (4px) - Minimal gaps
- sm: 0.5rem (8px) - Button/input internal
- md: 1rem (16px) - Component padding
- lg: 1.5rem (24px) - Section spacing
- xl: 2rem (32px) - Major section breaks
- 2xl: 3rem (48px) - Page sections

---

## Code Examples

### Login Form Submission
```javascript
const handleLoginSubmit = (e) => {
  e.preventDefault();
  
  // Validation
  if (!loginData.email || !validateEmail(loginData.email)) {
    setErrors(prev => ({ ...prev, email: 'Invalid email' }));
    return;
  }
  
  // Password check (minimum 6 chars)
  if (!loginData.password || loginData.password.length < 6) {
    setErrors(prev => ({ ...prev, password: 'Min 6 characters' }));
    return;
  }
  
  // Ready for API call
  console.log('Login attempt:', loginData);
};
```

### Form Toggle Between States
```javascript
const toggleMode = () => {
  setIsLogin(!isLogin);                    // Switch mode
  setErrors({});                           // Clear errors
  setLoginData({ email: '', password: '' });        // Reset login
  setRegisterData({ name: '', email: '', password: '' }); // Reset register
};
```

### Input Focus State Styling
```css
.input-field:focus {
  outline: none;
  border-color: var(--github-green);       /* Green border on focus */
  background: rgba(255, 255, 255, 0.06);   /* Slight background lift */
  box-shadow: 0 0 0 3px rgba(15, 191, 62, 0.1); /* Green glow */
}
```

---

## Integration Points

### Routing
- Uses React Router v6
- Routes defined in `App.jsx`
- Navigation via `<Link>` components (client-side)
- External links use standard `<a>` tags

### API Integration Points
In `AuthRouter.jsx`:
- `handleLoginSubmit()` - Ready for POST /api/auth/login
- `handleRegisterSubmit()` - Ready for POST /api/auth/register

### Backend Communication
Components currently log to console - update with:
```javascript
// Example for login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(loginData)
});
```

---

## Accessibility Features

1. **Form Labels**: All inputs have associated `<label>` elements with `htmlFor`
2. **Error Messages**: ARIA-compliant error text below inputs
3. **Button Types**: Proper `type="submit"` and `type="button"` attributes
4. **Focus Management**: Visible focus states on all interactive elements
5. **Color Contrast**: All text meets WCAG AA standards
6. **Semantic HTML**: Proper heading hierarchy, semantic form elements

---

## Testing Checklist

- [ ] Navigation between login and register states works smoothly
- [ ] Form validation catches invalid emails
- [ ] Form validation enforces minimum password length
- [ ] Error messages display and clear correctly
- [ ] Landing page links route to `/auth` correctly
- [ ] Hero CTA button routes to `/auth` correctly
- [ ] All Lucide icons render without emoji fallbacks
- [ ] Glassmorphism effects work in Chrome, Firefox, Safari
- [ ] Mobile responsive design works at 320px, 480px, 768px
- [ ] No text overlaps in any layout
- [ ] Focus states are clearly visible
- [ ] All Inter and Courier New fonts load correctly
