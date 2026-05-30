# GitGuard AI Frontend - Visual Specifications & Design System

## Color System Reference

### Primary Colors
```
GitHub Green: #0FBF3E
RGB: (15, 191, 62)
HSL: (110°, 85%, 51%)
Usage: CTAs, focus states, brand highlights, hero button, icons
```

### Background Colors
```
Black: #000000
RGB: (0, 0, 0)
Usage: Main page background, dark containers
Dark Variant: #0a0a0a
Used: Gradient secondary background
```

### Text Colors
```
White: #FFFFFF
RGB: (255, 255, 255)
Primary text on dark backgrounds, headings

Dark Gray: #24292E
RGB: (36, 41, 46)
Secondary text, muted elements

Light Gray: #F2F5F3
RGB: (242, 245, 243)
Used at low opacity (0.1-0.2) for subtle borders
Never used directly - always with opacity modifier
```

### Interactive States
```
Error Red: #ff6b6b
Used: Form validation errors
Error Light Red: #ff4444
Used: Dark error backgrounds

Focus Green: #06d136
Used: Enhanced focus state on hover
Hover Green: varies from base green by +5% brightness
```

## Typography System

### Font Families
```
Primary UI Font: 'Inter'
Fallbacks: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
Weight Range: 400, 500, 600, 700

Code Font: 'Courier New'
Used ONLY for: Code diffs, logs, monospace displays
Fallback: monospace
```

### Type Scale

| Element | Font Size | Weight | Line Height | Letter Spacing | Usage |
|---------|-----------|--------|-------------|----------------|-------|
| H1 (Hero) | 3.5rem | 700 | 1.2 | -1px | Main page headline |
| H2 (Form) | 1.375rem | 600 | 1.4 | -0.25px | Form titles |
| H3 (Nav) | 1.25rem | 700 | 1.2 | -0.5px | Brand title |
| Body | 1rem | 400 | 1.6 | 0 | Primary text |
| Small | 0.875rem | 400 | 1.6 | 0 | Secondary text |
| Label | 0.875rem | 600 | 1.5 | 0.25px | Form labels |
| Code | 0.875rem | 400 | 1.6 | 0 | Code diff display |

## Spacing System (Based on 8px Grid)

```
xs: 0.25rem (4px)   - Minimal gaps
sm: 0.5rem (8px)    - Input internal spacing
md: 1rem (16px)     - Component padding
lg: 1.5rem (24px)   - Section spacing
xl: 2rem (32px)     - Major breaks
2xl: 3rem (48px)    - Page sections
```

### Landing Page Spacing
- Navbar padding: 1rem 2rem
- Hero section padding: 4rem 2rem
- Hero content gap: 1rem (headline to subheadline)
- CTA to code diff: 3rem
- Footer padding: 2rem

### Auth Page Spacing
- Auth container padding: 3rem
- Form gap between elements: 1.5rem
- Input container gap: 0.5rem
- Input padding: 0.875rem 1rem

## Border & Shadow System

### Borders
```
Subtle Border: 1px solid rgba(242, 245, 243, 0.1)
Standard Border: 1px solid rgba(242, 245, 243, 0.15)
Focused Border: 1px solid #0FBF3E (full opacity)
Error Border: 1px solid #ff6b6b (full opacity)
```

### Shadow Effects
```
Light Shadow: 0 4px 12px rgba(0, 0, 0, 0.2)
Medium Shadow: 0 8px 32px rgba(0, 0, 0, 0.3)
Large Shadow: 0 16px 64px rgba(0, 0, 0, 0.4)

CTA Glow: 0 8px 32px rgba(15, 191, 62, 0.3)
CTA Glow Hover: 0 12px 40px rgba(15, 191, 62, 0.4)
```

### Glassmorphism Effects
```
Backdrop Filter: blur(12px)
Glass Background: rgba(255, 255, 255, 0.04) for light glass
Glass Background: rgba(255, 255, 255, 0.06) for containers
Border: 1px solid rgba(242, 245, 243, 0.15)
Shadow: 0 8px 32px rgba(0, 0, 0, 0.3)
```

## Component Specifications

### Landing Page Navbar
```
Height: Auto (min-content)
Padding: 1rem 2rem
Backdrop: blur(12px) + rgba(0, 0, 0, 0.6)
Border: 1px solid rgba(242, 245, 243, 0.1)
Position: Sticky top
Z-index: 10

Logo + Title:
- Icon size: 24px
- Icon color: #0FBF3E
- Title font: Inter 1.25rem 700
- Title color: White
- Gap: 0.75rem

Navigation Links:
- Font: Inter 0.95rem 500
- Color: rgba(255, 255, 255, 0.8)
- Hover: #0FBF3E
- Gap: 2rem

Sign In Link:
- Color: #0FBF3E
- Padding: 0.5rem 1rem
- Border: 1px solid rgba(15, 191, 62, 0.5)
- Border-radius: 0.375rem
- Hover: background rgba(15, 191, 62, 0.1) + full opacity border
```

### Hero Headline
```
Font: Inter 3.5rem 700
Color: White
Letter-spacing: -1px
Line-height: 1.2
Text-shadow: 0 4px 12px rgba(15, 191, 62, 0.1)
Margin-bottom: 1rem
```

### Hero Subheadline
```
Font: Inter 1.25rem 400
Color: rgba(242, 245, 243, 0.8)
Line-height: 1.6
Max-width: 600px
Margin-bottom: 2rem
```

### CTA Button (Get Started)
```
Layout: Flexbox row, gap 0.75rem
Padding: 0.875rem 2rem
Background: #0FBF3E
Color: #000000
Font: Inter 1rem 600
Border-radius: 0.375rem
Border: 2px solid #0FBF3E
Letter-spacing: 0.5px
Shadow: 0 8px 32px rgba(15, 191, 62, 0.3)
Transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)

Hover State:
- Background: transparent
- Color: #0FBF3E
- Box-shadow: 0 12px 40px rgba(15, 191, 62, 0.4)
- Transform: translateY(-2px)

Icon: lucide-react ArrowRight 20px
```

### Code Diff Container
```
Backdrop: blur(12px) + rgba(255, 255, 255, 0.05)
Border: 1px solid rgba(242, 245, 243, 0.15)
Border-radius: 0.5rem
Box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3)

Header:
- Padding: 1rem
- Background: rgba(0, 0, 0, 0.3)
- Border-bottom: 1px solid rgba(242, 245, 243, 0.1)
- File name color: #0FBF3E
- Font: Courier New 0.875rem 500

Diff Display:
- Padding: 1.5rem
- Font: Courier New 0.875rem
- Line-height: 1.6
- Color: rgba(242, 245, 243, 0.9)
- Overflow-x: auto
```

### Auth Container (Glass Form Box)
```
Backdrop: blur(12px) + rgba(255, 255, 255, 0.06)
Border: 1px solid rgba(242, 245, 243, 0.15)
Border-radius: 0.75rem
Padding: 3rem
Max-width: 420px
Width: 100%
Box-shadow: 0 16px 64px rgba(0, 0, 0, 0.4)
Centered: flex center items horizontally and vertically

Header:
- Gap: 1rem
- Margin-bottom: 2.5rem
- Icon size: 32px
- Icon color: #0FBF3E
- Title font: Inter 1.75rem 700
```

### Input Field
```
Padding: 0.875rem 1rem
Font: Inter 1rem 400
Line-height: 1.5
Border: 1px solid rgba(242, 245, 243, 0.2)
Border-radius: 0.375rem
Background: rgba(255, 255, 255, 0.04)
Color: White
Transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)

Placeholder:
- Color: rgba(242, 245, 243, 0.5)

Focus State:
- Border-color: #0FBF3E
- Background: rgba(255, 255, 255, 0.06)
- Box-shadow: 0 0 0 3px rgba(15, 191, 62, 0.1)

Error State:
- Border-color: #ff4444
- Background: rgba(255, 68, 68, 0.05)
- Box-shadow (focus): 0 0 0 3px rgba(255, 68, 68, 0.15)
```

### Submit Button
```
Padding: 0.875rem 1.5rem
Font: Inter 1rem 600
Letter-spacing: 0.5px
Background: #0FBF3E
Color: #000000
Border: 2px solid #0FBF3E
Border-radius: 0.375rem
Transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)
Box-shadow: 0 4px 16px rgba(15, 191, 62, 0.25)
Margin-top: 0.5rem

Hover State:
- Background: transparent
- Color: #0FBF3E
- Box-shadow: 0 6px 24px rgba(15, 191, 62, 0.35)
- Transform: translateY(-1px)

Active State:
- Transform: translateY(0)
```

### Error Message
```
Font: Inter 0.75rem 500
Color: #ff6b6b
Margin-top: -0.25rem
Display: Below input field
```

### Footer
```
Backdrop: blur(12px) + rgba(0, 0, 0, 0.6)
Border-top: 1px solid rgba(242, 245, 243, 0.1)
Padding: 2rem
Text-align: center
Position: Sticky bottom
Z-index: 10

Text:
- Font: Inter 0.95rem 500
- Color: rgba(242, 245, 243, 0.7)
- Letter-spacing: 0.25px
```

## Motion & Transition Specifications

### Global Transition
```
Duration: 0.3s
Easing: cubic-bezier(0.4, 0, 0.2, 1)
Applied to: color, background, border, box-shadow, transform, opacity
```

### Specific Animations

| Element | Property | Transition |
|---------|----------|-----------|
| Input Focus | border-color, box-shadow | 0.3s |
| Button Hover | background, color, box-shadow, transform | 0.3s |
| CTA Button Hover | All + shadow expansion | 0.3s |
| Link Hover | color, text-decoration | 0.3s |
| Input to Error | border-color, background, box-shadow | 0.3s |

## Responsive Breakpoints

### Desktop (1200px+)
```
Full navbar with all links visible
Code diff container visible
3-column layouts where applicable
Full padding and spacing
```

### Tablet (768px)
```
Navbar items may wrap
Adjusted heading sizes
Code diff still visible
Reduced padding: 1rem instead of 2rem
```

### Mobile (480px)
```
Hamburger menu considerations
Navbar brands stacked
Heading: 2.25rem (down from 3.5rem)
Code diff hidden
Compact spacing: 0.75rem instead of 1rem
Form padding: 2rem instead of 3rem
```

### Small Mobile (320px+)
```
Maximum width containers
Minimal padding: 0.75rem
Heading: 1.75rem
Full viewport width usage
Hidden secondary elements
```

## Icon Usage (lucide-react)

```javascript
// Landing Page
<Github size={24} color="#0FBF3E" />      // Navbar branding
<ArrowRight size={20} />                   // CTA button

// Auth Page
<Github size={32} color="#0FBF3E" />      // Header branding
```

### Icon Sizing
- Small UI: 16px
- Standard UI: 20px-24px
- Large/Header: 28px-32px
- All icons use consistent color coding

## Accessibility Specifications

- Minimum color contrast ratio: 4.5:1 (WCAG AA)
- Focus indicators: Clearly visible (2-3px outline or border)
- Touch targets: Minimum 44x44px
- Label associations: All inputs have `<label>` with `htmlFor`
- Semantic HTML: Proper heading hierarchy, form structure
- Error messaging: Clear, placed near fields

## Performance Targets

- First Paint: < 1s
- Time to Interactive: < 2s
- Largest Contentful Paint: < 2.5s
- CSS file size: < 50KB (gzipped)
- Font loading: Optimized with preconnect and font-display swap
