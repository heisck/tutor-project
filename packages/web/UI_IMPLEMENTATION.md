# TutorAI Learning Platform - UI Implementation

## Overview

A complete, modern learning platform UI built with Next.js 16, React 19, Tailwind CSS 4, and Framer Motion. The platform features an intelligent theme system with 4 customizable color palettes and smooth animations throughout.

## Key Features

### 1. **Theme System**
- **4 Built-in Themes**: Dark Modern (default), Light & Clean, Purple & Modern, Ocean
- **CSS Variables**: Dynamic color switching without page reload
- **Persistent Storage**: Theme preference saved in localStorage
- **Smooth Transitions**: 200ms transitions for color changes
- **Accessibility**: Respects `prefers-reduced-motion` user preference

### 2. **Modern Animations**
- **Framer Motion Integration**: Complex animations and micro-interactions
- **Tailwind Animations**: Fade-in, slide-up, pulse effects
- **Staggered Reveals**: Sequential animations for content entrance
- **Hover Effects**: Scale and shadow animations on interactive elements
- **Loading States**: Skeleton screens and shimmer animations

### 3. **Comprehensive Pages**

#### Landing Page (`/`)
- Hero section with animated gradient text
- Feature showcase grid with staggered reveals
- Call-to-action section
- Navigation with auth links
- Fully responsive design

#### Authentication (`/auth`)
- **Signup Page** (`/auth/signup`)
  - Form validation with error handling
  - Password strength requirements
  - Animated form transitions
  - Link to login page
  
- **Login Page** (`/auth/login`)
  - Email and password validation
  - Remember me functionality
  - Forgot password link
  - Animated form with smooth interactions
  
- **Password Reset** (`/auth/forgot-password`)
  - Email verification flow
  - Success confirmation screen
  - Error handling

#### Dashboard (`/dashboard`)
- **Main Dashboard** (`/dashboard/page.tsx`)
  - Learning statistics (streak, hours, materials, questions)
  - Current streak display with animated calendar
  - Recent courses with progress tracking
  - Quick action cards for upload and analytics
  
- **Courses** (`/dashboard/courses`)
  - Grid view of all enrolled courses
  - Progress bars with smooth animations
  - Filter options (All, In Progress, Completed)
  - Course cards with metadata
  
- **Upload Material** (`/dashboard/upload`)
  - Drag-and-drop file upload interface
  - Support for PDF, PowerPoint, Word documents
  - File preview before upload
  - Progress tracking during upload
  - Information cards about AI analysis features
  
- **Learning Streaks** (`/dashboard/streaks`)
  - 30-day activity calendar visualization
  - Weekly breakdown with time tracking
  - Achievement milestones system
  - Stats overview (current streak, best streak, total hours)
  - Progress indicators for ongoing milestones
  
- **Settings** (`/dashboard/settings`)
  - Account information management
  - Theme selector with live preview
  - Notification preferences with toggle switches
  - Danger zone for account deletion
  - Animated toggle switches

#### Tutoring Session (`/session`)
- Chat-based interface with AI tutor
- Message history with different message types
- Quick action buttons (Get Question, Clarify, Summary)
- Real-time message input
- Loading indicators for AI responses
- Timestamps on all messages

## Architecture

### Directory Structure
```
packages/web/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout with theme provider
│   ├── globals.css                 # Global styles with theme variables
│   ├── providers.tsx               # Theme provider context
│   ├── auth/
│   │   ├── layout.tsx             # Auth layout with header
│   │   ├── signup/page.tsx        # Signup form
│   │   ├── login/page.tsx         # Login form
│   │   └── forgot-password/page.tsx # Password reset
│   ├── dashboard/
│   │   ├── layout.tsx             # Dashboard layout with sidebar
│   │   ├── page.tsx               # Main dashboard
│   │   ├── courses/page.tsx       # Courses listing
│   │   ├── upload/page.tsx        # File upload interface
│   │   ├── streaks/page.tsx       # Analytics & streaks
│   │   └── settings/page.tsx      # User settings
│   └── session/
│       └── page.tsx               # Tutoring session interface
├── tailwind.config.ts             # Tailwind configuration
├── tsconfig.json                  # TypeScript configuration
├── next.config.js                 # Next.js configuration
└── package.json                   # Dependencies
```

## Color System

### CSS Variables (in globals.css)

**Dark Modern Theme (Default)**
```css
--color-background: 0 0% 3%;
--color-foreground: 0 0% 98%;
--color-primary: 200 100% 50%;
--color-secondary: 180 100% 50%;
--color-accent: 280 100% 50%;
--color-muted: 0 0% 25%;
--color-muted-foreground: 0 0% 70%;
--color-border: 0 0% 15%;
```

**Light & Clean Theme**
- Light background (0 0% 98%)
- Dark text (0 0% 12%)
- Blue primary (210 100% 50%)

**Purple & Modern Theme**
- Dark background with purple tint (270 15% 10%)
- Purple primary (270 100% 50%)
- Pink accent (340 100% 50%)

**Ocean Theme**
- Dark blue background (210 25% 8%)
- Cyan primary (200 100% 50%)
- Green accent (160 100% 50%)

## Animation Patterns

### Entrance Animations
- `fade-in`: Opacity 0 → 1 (500ms)
- `slide-up`: Y 20px → 0 with fade (500ms)
- `slide-down`: Y -20px → 0 with fade (500ms)
- Staggered delays: 0.1s between items

### Interaction Animations
- Hover: `scale(1.02)` or `scale(1.05)` depending on element
- Press: `scale(0.98)` for tactile feedback
- Focus: 2px outline with primary color

### Loading Animations
- Skeleton screens with shimmer effect
- Pulse animations for loading indicators
- Progress bars with smooth width transitions

### Transition Effects
- Color transitions: 200ms
- Border transitions: 200ms
- Transform transitions: 300ms
- Page transitions: 500ms

## Component Patterns

### Form Inputs
```tsx
<input
  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
/>
```

### Buttons
```tsx
<button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-all">
  Action
</button>
```

### Cards
```tsx
<div className="p-6 rounded-2xl border border-border bg-background hover:border-primary transition-all">
  Content
</div>
```

### Progress Bars
```tsx
<div className="h-2 bg-muted rounded-full overflow-hidden">
  <motion.div
    initial={{ width: 0 }}
    animate={{ width: `${progress}%` }}
    className="h-full bg-gradient-to-r from-primary to-secondary"
  />
</div>
```

## Dependencies

### Core
- `next@16.2.3` - React framework
- `react@19.2.5` - UI library
- `react-dom@19.2.5` - React DOM

### Styling
- `tailwindcss@4.2.2` - Utility CSS framework
- `@tailwindcss/postcss@4.2.2` - PostCSS plugin

### Animation
- `framer-motion@11.x.x` - Animation library

### Utilities
- `zod@4.3.6` - Schema validation
- `katex@0.16.25` - Math rendering
- `sonner` - Toast notifications

## Development Guidelines

### Adding New Pages
1. Create page component with `'use client'` directive
2. Use `motion` components from framer-motion
3. Define animation variants for consistency
4. Use CSS variables for colors
5. Ensure mobile responsiveness with Tailwind prefixes

### Theming
1. Use CSS variables: `bg-background`, `text-foreground`, etc.
2. Never use hardcoded colors like `bg-white` or `text-black`
3. Test theme switching in browser DevTools
4. Verify contrast ratios for accessibility

### Animations
1. Use Framer Motion for complex animations
2. Always respect `prefers-reduced-motion` setting
3. Keep animation durations 200-500ms
4. Use `ease-in-out` for most animations
5. Test performance with DevTools

## Responsive Breakpoints

- **Mobile**: Default styles (< 768px)
- **Tablet**: `md:` prefix (≥ 768px)
- **Desktop**: `lg:` prefix (≥ 1024px)
- **Wide**: `xl:` prefix (≥ 1280px)

## Accessibility Features

- Semantic HTML elements (`<main>`, `<header>`, `<nav>`)
- ARIA labels and roles where needed
- Keyboard navigation support
- Focus visible outlines
- Color contrast WCAG 2.1 AA compliance
- Form labels associated with inputs
- Alt text for decorative images

## Performance Optimizations

- Tailwind CSS purging for minimal bundle
- Framer Motion GPU-accelerated animations
- Lazy loading for pages
- Image optimization (TODO: add next/image)
- Smooth scroll behavior

## Next Steps

1. Connect authentication backend
2. Implement API calls for data fetching
3. Add real database persistence
4. Set up user session management
5. Integrate with tutoring API
6. Add more interactive features
7. Performance monitoring and optimization

## Design Tokens

All colors use CSS variables for consistency:
- Primary: Brand color for CTAs and highlights
- Secondary: Supporting interactive elements
- Accent: Highlights and special states
- Muted: Backgrounds and reduced emphasis
- Border: UI boundaries
- Background/Foreground: Base colors

This ensures theme switching updates all UI elements automatically without code changes.
