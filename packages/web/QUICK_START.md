# TutorAI UI - Quick Start Guide

## Getting Started

### 1. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 2. Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Pages Available

### Public Pages
- `/` - Landing page with hero and features
- `/auth/signup` - User registration
- `/auth/login` - User login
- `/auth/forgot-password` - Password reset

### Protected Pages (Dashboard)
- `/dashboard` - Main dashboard with stats and streaks
- `/dashboard/courses` - Browse all courses
- `/dashboard/upload` - Upload learning materials
- `/dashboard/streaks` - View analytics and achievements
- `/dashboard/settings` - User preferences and theme selector

### Learning Pages
- `/session` - AI tutoring session interface

## Testing the Theme System

The app includes 4 themes you can switch between:

1. **Dark Modern** - Blue and cyan accents (default)
2. **Light & Clean** - Light background with blue accents
3. **Purple & Modern** - Purple and pink theme
4. **Ocean** - Deep blue with cyan and green

### How to Switch Themes

**Option 1: Auth Pages**
- Go to any auth page (signup, login)
- Use the theme buttons in the header

**Option 2: Dashboard**
- Open settings page (`/dashboard/settings`)
- Click on theme buttons in Appearance section
- Or use the quick theme selector in the sidebar

**Option 3: Dashboard Sidebar**
- Use the theme selector in the sidebar footer

Themes are saved to localStorage and persist across sessions.

## Key Features to Explore

### Landing Page (`/`)
- Smooth scroll animations
- Feature cards with staggered reveals
- Responsive navigation

### Sign Up (`/auth/signup`)
- Form validation in real-time
- Password requirements
- Animated form transitions

### Dashboard (`/dashboard`)
- Learning streaks visualization
- Progress bars with animations
- Quick action cards

### Upload (`/dashboard/upload`)
- Drag-and-drop file interface
- Supported: PDF, PowerPoint, Word
- Progress tracking simulation

### Courses (`/dashboard/courses`)
- Course cards with progress tracking
- Filter options
- Responsive grid layout

### Analytics (`/dashboard/streaks`)
- 30-day activity calendar
- Weekly breakdown
- Achievement milestones
- Animated progress indicators

### Settings (`/dashboard/settings`)
- Theme selector with live preview
- Notification toggles
- Account management

### Session (`/session`)
- Chat-based tutoring interface
- Message history
- Quick action buttons

## Customization

### Change Primary Colors

Edit `app/globals.css` and update the CSS variables in `:root`:

```css
:root {
  --color-primary: 200 100% 50%;  /* Change this value */
  --color-secondary: 180 100% 50%;
  --color-accent: 280 100% 50%;
}
```

### Add New Theme

Add a new CSS rule in `app/globals.css`:

```css
html[data-theme='my-theme'] {
  --color-background: 0 0% 10%;
  --color-foreground: 0 0% 95%;
  --color-primary: 100 100% 50%;
  /* ... other colors ... */
}
```

Then update `app/providers.tsx` to include the new theme option.

### Modify Animations

Update tailwind.config.ts to change animation durations or add new animations:

```ts
animation: {
  'fade-in': 'fadeIn 0.5s ease-in-out',
  'slide-up': 'slideUp 0.5s ease-out',
  // Add your own animations here
}
```

## File Structure

```
packages/web/
├── app/
│   ├── page.tsx              # Landing page
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles + theme variables
│   ├── providers.tsx         # Theme provider
│   ├── auth/
│   ├── dashboard/
│   └── session/
├── tailwind.config.ts        # Tailwind configuration
├── tsconfig.json
├── next.config.js
├── package.json
└── UI_IMPLEMENTATION.md      # Detailed documentation
```

## Design System

### Colors (via CSS Variables)
- `bg-background` / `text-foreground` - Main colors
- `bg-primary` / `text-primary-foreground` - CTAs and highlights
- `bg-secondary` - Supporting elements
- `bg-accent` - Special attention
- `bg-muted` - Backgrounds and reduced emphasis
- `border-border` - UI boundaries

### Typography
- Default font: System sans-serif (-apple-system, BlinkMacSystemFont, etc.)
- Monospace font: Fira Code (for code blocks)
- Use Tailwind classes: `font-sans`, `font-mono`

### Spacing
- Use Tailwind spacing scale: `p-4`, `m-2`, `gap-6`, etc.
- Never use arbitrary values like `p-[16px]`

### Rounded Corners
- Small: `rounded-lg` (8px)
- Medium: `rounded-xl` (12px)
- Large: `rounded-2xl` (16px)
- Full: `rounded-full`

### Shadows
- Use Tailwind shadow utilities: `shadow-sm`, `shadow-lg`
- For primary highlights: `shadow-lg shadow-primary/50`

## Common Development Tasks

### Add a New Page

1. Create the file in appropriate directory (e.g., `app/dashboard/new-page/page.tsx`)
2. Add `'use client'` directive
3. Import motion components from framer-motion
4. Define animation variants
5. Use semantic HTML and Tailwind classes

Example:
```tsx
'use client';

import { motion } from 'framer-motion';

export default function NewPage() {
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <motion.div variants={itemVariants} initial="hidden" animate="visible">
      Content
    </motion.div>
  );
}
```

### Update Navigation

Modify the `navItems` array in `app/dashboard/layout.tsx` to add/remove sidebar items.

### Add Form Validation

Use the validation pattern from signup/login pages:

```tsx
const validate = () => {
  const newErrors: Record<string, string> = {};
  // Add validation logic
  return newErrors;
};
```

## Debugging

### Check Theme Application

Open DevTools and inspect the `<html>` element. Look for:
- Default: No `data-theme` attribute
- Other themes: `data-theme="light"` (or other theme name)

### Verify Animations

If animations aren't working:
1. Check if browser respects `prefers-reduced-motion`
2. Verify Framer Motion is imported
3. Check animation variant definitions
4. Look for console errors

### Performance Issues

1. Open DevTools Performance tab
2. Record a page interaction
3. Look for long tasks and animation jank
4. Check if transforms use GPU (use `transform` and `opacity` only)

## Deployment

The app is ready for deployment to Vercel:

```bash
npm run build
npm start
```

Or deploy directly to Vercel:
- Push to GitHub
- Connect repository to Vercel
- Auto-deploy on push

## Next Steps

1. Connect to backend API
2. Implement actual authentication
3. Add real database integration
4. Implement file upload functionality
5. Add user session management
6. Connect to tutoring engine API
7. Set up analytics and monitoring

## Support

For issues or questions about the UI:
1. Check `UI_IMPLEMENTATION.md` for detailed documentation
2. Review the Tailwind documentation: tailwindcss.com
3. Check Framer Motion docs: framer.com/motion
4. Review Next.js documentation: nextjs.org

## License

Part of the AI Tutor PWA project.
