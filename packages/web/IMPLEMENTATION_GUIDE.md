# UI/UX Implementation Guide - Studium Web Application

## Overview

The Studium web application has been built with a premium "Late-Night Library" aesthetic, featuring deep ink blacks, warm amber accents, editorial typography, and sophisticated design patterns. The entire UI is constructed with depth, gradients, geometric patterns, and contextual effects.

## Design System

### Color Palette
- **Ink (#080c14)**: Deep, focused dark base
- **Cream (#ede8df)**: Warm, readable text
- **Amber (#f0a050)**: Warm accent for primary actions
- **AI-Blue (#38bdf8)**: Technical, learning-focused accent
- **Mastery (#4ade80)**: Success and achievement indicator

### Typography
- **Display Font**: Fraunces (optical-size variable serif)
  - Used for headings, titles, and editorial elements
  - Historic editorial character inspired by The Guardian
- **Body Font**: Source Serif 4 (excellent for long-form reading)
- **Monospace**: DM Mono (clean technical labels and data)

## Project Structure

```
packages/web/
├── src/
│   ├── app/
│   │   ├── globals.css          # Enhanced with gradients & patterns
│   │   ├── layout.tsx           # Root layout with fonts
│   │   ├── page.tsx             # Landing page
│   │   ├── (auth)/
│   │   │   ├── layout.tsx       # Auth layout with ambient patterns
│   │   │   ├── signin/          # Sign-in page
│   │   │   └── signup/          # Sign-up page
│   │   └── (app)/               # Protected routes
│   │       ├── layout.tsx
│   │       ├── dashboard/       # Main dashboard (analytics, courses)
│   │       ├── session/         # Tutoring session (chat + learning)
│   │       └── upload/          # Content upload with drag-drop
│   ├── components/
│   │   ├── Button.tsx           # Variants: primary, secondary, gradient, etc.
│   │   ├── Card.tsx             # Elevated card components
│   │   ├── Input.tsx            # Form inputs with validation states
│   │   ├── Badge.tsx            # Status badges & progress bars
│   │   ├── Layout.tsx           # Navbar, Header, Message bubbles
│   │   └── index.ts             # Component exports
│   └── lib/
│       ├── api.ts               # API client with CSRF handling
│       └── utils.ts             # Utility functions (formatting, etc.)
```

## Component Library

### Button Component
Multiple variants for different contexts:
- **Primary**: Amber gradient for main actions
- **Secondary**: AI-Blue gradient for secondary actions
- **Outline**: Border-based with hover effects
- **Ghost**: Minimal styling for tertiary actions
- **Gradient**: Multi-color gradient for special emphasis

```tsx
<Button variant="gradient" size="lg" icon={<Send />}>
  Send Message
</Button>
```

### Card Component
Sophisticated card system with multiple variants:
- **Default**: Standard dark card with subtle border
- **Elevated**: Gradient background with enhanced shadow depth
- **Glass**: Frosted glass effect with backdrop blur
- **Gradient**: Multi-tone gradient with pattern overlay

```tsx
<Card variant="gradient">
  <CardHeader title="Active Courses" />
  <CardContent>
    {/* content */}
  </CardContent>
  <CardFooter align="between">
    {/* actions */}
  </CardFooter>
</Card>
```

### Form Inputs
All form elements feature:
- Focus rings with amber glow
- Placeholder hints and error states
- Smooth transitions and hover effects
- Integration with validation

```tsx
<Input
  label="Email"
  type="email"
  icon={<Mail />}
  error={errors.email}
  hint="We'll never share your email"
/>
```

### Layout Components
- **Navbar**: Sticky navigation with user profile and logout
- **Header**: Page titles with descriptions and actions
- **Message**: Chat bubbles for tutoring sessions (user vs. assistant)
- **Toast**: Notifications with status variants
- **Tabs**: Tab navigation with active indicators

## Page Implementations

### 1. Landing Page (`/`)
- Hero section with ambient gradient backgrounds
- Feature highlights with icons
- Testimonials carousel
- CTA buttons with gradient styling
- Premium aesthetic throughout

### 2. Sign-In Page (`/signin`)
- Clean, centered auth layout
- Email/password inputs with validation
- Social auth option (GitHub)
- Remember me & forgot password options
- Ambient background patterns

### 3. Sign-Up Page (`/signup`)
- Multi-field signup form
- Password strength indicator
- Real-time validation
- T&C acceptance checkbox
- Error handling with user feedback

### 4. Dashboard (`/app/dashboard`)
**Key Features:**
- Welcome section with learning streak
- Four stat cards (courses, hours, mastery, streak)
- Active courses grid with progress bars
- Quick action buttons
- Recommended courses with difficulty badges
- All with gradient cards and depth effects

**Design Details:**
- Gradient stat cards showing key metrics
- Progress visualization with smooth animations
- Course cards with hover effects
- Quick action buttons with gradient hover states

### 5. Tutoring Session (`/app/session`)
**Layout:**
- Main chat area (left) with message history
- Learning sidebar (right) with tabs

**Main Chat Area:**
- Message history with user/assistant distinction
- Ambient background with floating elements
- Input bar with send button
- Typing indicator with animated dots

**Sidebar Sections:**
- **Concepts Tab**: Key concepts with visual hierarchy
- **Progress Tab**: Module & lesson completion with progress bars
- **Exercises Tab**: Exercise list with status indicators (completed, in-progress, not-started)

**Design Elements:**
- Message bubbles with gradient backgrounds
- Smooth scroll to bottom on new messages
- Loading animations
- Responsive layout

### 6. Content Upload (`/app/upload`)
**Features:**
- Drag-and-drop file upload zone
- Visual feedback on drag events
- Upload progress tracking per file
- File metadata form (title, category, description, difficulty, tags)
- Batch operations (clear all, submit all)

**Design Details:**
- Large drag-drop zone with gradient border on hover
- File icons by type (video, audio, document)
- Progress bars for each upload
- Status badges (uploading, completed, error)
- Form with comprehensive metadata fields

## CSS Enhancements

### Advanced Animations
```css
/* Pulse glow effect */
animation: pulse-glow 2s infinite;

/* Gradient mesh shifting */
animation: gradient-shift 3s ease infinite;

/* Floating animation */
animation: float 3s ease-in-out infinite;

/* Glowing pulse for highlights */
animation: glow-pulse 2s ease-in-out infinite;
```

### Geometric Patterns
- **Grid Pattern**: Regular grid overlay for depth
- **Dot Pattern**: Subtle circular patterns
- **Diagonal Pattern**: 45-degree repeating lines
- **Cross Pattern**: Technical grid pattern

### Gradient Effects
- **Gradient Mesh**: Complex multi-tone backgrounds with animation
- **Gradient Borders**: Gradient-based borders for cards
- **Background Gradients**: Radial and linear combinations

### Depth System
```css
.depth-1 { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); }
.depth-2 { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), ... }
.depth-3 { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), ... }
.depth-4 { box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6), ... }
```

### Glow Effects
- **Amber Glow**: Warm accent glow for primary elements
- **AI-Blue Glow**: Technical glow for interactive elements
- **Mastery Glow**: Success/achievement glow for completed items

## Key Design Principles Applied

### 1. **Depth Through Layering**
- Multiple shadow layers (0 2px, 0 4px, combined)
- Gradient overlays and backdrop blur
- Z-index layering for visual hierarchy

### 2. **Contextual Aesthetics**
- Editorial typography for premium feel
- Warm amber accents for focus
- Dark palette for reading comfort
- Technical elements use monospace and geometric precision

### 3. **Motion & Interaction**
- Smooth transitions (0.2s-0.3s) for all interactive elements
- Hover states with lift effects (translateY)
- Loading animations with staggered timing
- Glowing effects that pulse and breathe

### 4. **Pattern Integration**
- Geometric patterns subtly integrated into backgrounds
- Grid patterns for technical sections
- Organic shapes (radial gradients) for ambient effects

### 5. **Accessibility**
- High contrast ratios for readability
- Clear focus indicators with 2px amber outline
- Semantic HTML structure
- ARIA labels where needed

## Development Notes

### Running the Application
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### API Integration
The application uses a custom API client (`lib/api.ts`) that:
- Handles CSRF token lifecycle
- Manages authentication sessions
- Provides typed endpoints through the shared package

### Component Usage Example
```tsx
import { Button, Card, CardHeader, CardContent, Input } from '@/components';

export default function Example() {
  return (
    <Card variant="gradient">
      <CardHeader title="Example" />
      <CardContent>
        <Input label="Name" placeholder="Enter your name" />
        <Button variant="primary" className="mt-4">
          Submit
        </Button>
      </CardContent>
    </Card>
  );
}
```

## Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 15+
- Requires CSS Grid, Flexbox, and CSS Variables support

## Performance Optimizations
- Server-side rendering with Next.js
- Image optimization
- Code splitting per route
- CSS-in-JS compilation
- Font loading optimization (Google Fonts with fallbacks)

## Future Enhancements
- Dark/light theme toggle (currently dark-only)
- Advanced animations with Framer Motion
- Real-time collaboration features
- Accessibility audit & improvements
- Mobile responsive refinements
