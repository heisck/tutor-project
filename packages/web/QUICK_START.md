# Quick Start Guide - Studium Web App

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- VS Code (recommended)

### Installation

1. **Install dependencies**
```bash
cd packages/web
npm install
```

2. **Configure environment**
For normal local development you usually do not need a web-specific API base URL.
The browser calls same-origin `/api/*` routes, and `next.config.mjs` rewrites them
to `http://localhost:4000` by default.

3. **Start development server**
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Project Structure

```
packages/web/
├── src/
│   ├── app/              # Next.js app directory
│   ├── components/       # Reusable UI components
│   └── lib/              # Utilities & API client
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
└── README.md
```

## Component Library

### Import & Use

```tsx
import {
  Button,
  Card, CardHeader, CardContent, CardFooter,
  Input, Textarea, Select,
  Badge, Progress, Stat,
  Navbar, Header, Message, Tabs, Toast
} from '@/components';
```

### Common Patterns

#### Button Examples
```tsx
// Primary action
<Button variant="primary" onClick={() => handleClick()}>
  Get Started
</Button>

// With icon
<Button variant="gradient" icon={<Send size={18} />}>
  Send
</Button>

// Loading state
<Button loading>Uploading...</Button>

// Disabled
<Button disabled>Not Available</Button>
```

#### Card with Content
```tsx
<Card variant="gradient">
  <CardHeader
    title="Course Progress"
    description="Your learning journey"
    icon={<BookOpen size={20} />}
  />
  <CardContent>
    <Progress value={72} showLabel />
  </CardContent>
  <CardFooter align="between">
    <Button variant="outline">Cancel</Button>
    <Button variant="primary">Continue</Button>
  </CardFooter>
</Card>
```

#### Form Inputs
```tsx
<form>
  <Input
    label="Email Address"
    type="email"
    placeholder="you@example.com"
    icon={<Mail size={18} />}
    hint="We'll never share your email"
    error={errors.email}
  />

  <Textarea
    label="Message"
    placeholder="Type your message..."
    rows={5}
  />

  <Select
    label="Category"
    options={[
      { value: 'tech', label: 'Technology' },
      { value: 'science', label: 'Science' },
    ]}
  />
</form>
```

#### Status Indicators
```tsx
<Badge variant="success">Completed</Badge>
<Badge variant="warning">In Progress</Badge>
<Badge variant="error">Failed</Badge>

<Progress value={72} variant="success" showLabel />
<Progress value={45} variant="default" size="lg" />

<Stat
  label="Mastery Score"
  value="78%"
  trend={5}
  icon={<TrendingUp size={20} />}
/>
```

#### Message Chat Interface
```tsx
<Message
  role="user"
  content="Can you explain async/await?"
  timestamp={new Date()}
/>

<Message
  role="assistant"
  content="Of course! Async/await is syntactic sugar..."
  timestamp={new Date()}
/>
```

#### Layout Components
```tsx
<Navbar
  user={{ name: 'John Doe' }}
  onLogout={() => handleLogout()}
/>

<Header
  title="Dashboard"
  subtitle="Welcome back"
  action={<Button variant="primary">Settings</Button>}
/>

<Tabs
  tabs={[
    { id: 'tab1', label: 'Overview' },
    { id: 'tab2', label: 'Details' },
  ]}
  activeTab={active}
  onTabChange={setActive}
/>

<Toast message="Saved successfully!" type="success" />
```

## Styling

### Using Tailwind with Components

All components use Tailwind CSS. You can extend styling:

```tsx
<Button className="w-full">Full Width Button</Button>

<Card className="shadow-xl border-amber-500">
  Custom styled card
</Card>
```

### Custom CSS

Add custom styles in `globals.css`:

```css
/* Pattern overlay */
.pattern-grid { ... }
.pattern-dots { ... }

/* Animations */
.animate-gradient-shift { ... }
.animate-float { ... }

/* Depth effects */
.depth-1 { ... }
.depth-2 { ... }
```

### Color Classes

```tsx
{/* Using design tokens */}
<div className="text-amber">Amber text</div>
<div className="bg-ink">Ink background</div>
<div className="border-surface">Surface border</div>

{/* Using Tailwind extended colors */}
<div className="text-cream-50">Cream light</div>
<div className="bg-ai-blue-400">AI Blue</div>
<div className="border-mastery-500">Mastery color</div>
```

## Page Development

### Creating a New Page

1. Create file: `src/app/yourpage/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Header } from '@/components';
import { api } from '@/lib/api';

export default function YourPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch data from API
        const result = await api.get('/endpoint');
        setData(result);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Header title="Your Page" />
        
        {loading ? (
          <div>Loading...</div>
        ) : (
          <Card>
            {/* Content */}
          </Card>
        )}
      </div>
    </div>
  );
}
```

### Protected Routes

Pages in `(app)` folder are protected. Use the session check pattern:

```tsx
useEffect(() => {
  const checkAuth = async () => {
    try {
      const session = await api.getSession();
      setUser(session.user);
    } catch {
      router.push('/signin');
    }
  };
  checkAuth();
}, []);
```

## API Integration

### Using the API Client

```tsx
import { api, ApiError } from '@/lib/api';

// Auth endpoints
const session = await api.getSession();
await api.signin({ email, password });
await api.signup({ email, password, name });
await api.logout();

// CSRF handling is automatic
const token = await api.getCsrfToken();

// Generic fetch wrapper
const data = await api.get('/endpoint');
const result = await api.post('/endpoint', { body });
```

## Type Safety

All components are fully typed with TypeScript:

```tsx
// Component props are typed
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  loading?: boolean;
}

// Use with type inference
<Button<'button'> variant="primary">Click me</Button>
```

## Testing Components

Create test files alongside components:

```tsx
// Button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

## Build & Deploy

### Production Build
```bash
npm run build
npm start
```

### Environment Variables for Production
```env
API_BASE_URL=https://api.studium.app
NODE_ENV=production
```

### Docker Deployment
See root `docker-compose.yml` for containerization setup.

## Troubleshooting

### Styles Not Loading
- Ensure Tailwind CSS is configured in `tailwind.config.ts`
- Check that `globals.css` is imported in `layout.tsx`
- Run `npm run dev` to rebuild

### API Calls Failing
- Check that backend is running on port 4000
- Verify `API_BASE_URL` only if you are overriding the default rewrite target
- Check CORS settings in backend

### TypeScript Errors
```bash
# Rebuild types
npm run typecheck

# Clear cache
rm -rf .next
npm run dev
```

## Performance Tips

1. **Code Splitting**: Use dynamic imports for large components
```tsx
import dynamic from 'next/dynamic';
const HeavyComponent = dynamic(() => import('./Heavy'));
```

2. **Image Optimization**: Use Next.js Image component
```tsx
import Image from 'next/image';
<Image src="/img.png" alt="description" width={400} height={300} />
```

3. **Lazy Loading**: Suspend components until needed
```tsx
import { Suspense } from 'react';
<Suspense fallback={<Loading />}>
  <ExpensiveComponent />
</Suspense>
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

## Getting Help

1. Check component examples in this guide
2. Review component source code in `src/components/`
3. Check existing pages for patterns
4. Refer to `IMPLEMENTATION_GUIDE.md` for detailed info
5. Check `DESIGN_TOKENS.md` for design system reference
