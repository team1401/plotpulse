# PlotPulse Frontend

Beautiful, award-winning UI for PlotPulse AI novel generation platform.

## Features

- 🎨 **Stunning Design** - Linear/Vercel/Stripe-level polish with glassmorphism and gradients
- 🌙 **Dark Mode First** - Beautiful dark theme with smooth light mode toggle
- ✨ **Fluid Animations** - Framer Motion powered micro-interactions and transitions
- 📚 **Typography-First** - Optimized for writing with beautiful serif fonts
- 📱 **Responsive** - Desktop-first but works beautifully on mobile
- ⚡ **Real-time Updates** - WebSocket integration for live generation progress
- 🎯 **State Management** - Zustand for clean, performant state handling

## Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first styling with custom design system
- **Framer Motion** - Smooth, powerful animations
- **Zustand** - Lightweight state management
- **Lucide Icons** - Beautiful, consistent icons
- **Recharts** - Data visualization for cost analytics
- **Socket.IO** - Real-time bidirectional communication

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Docker

```bash
# Build Docker image
docker build -t plotpulse-frontend .

# Run container
docker run -p 80:80 plotpulse-frontend
```

## Project Structure

```
src/
├── components/      # Reusable UI components
│   ├── Layout.jsx
│   ├── Sidebar.jsx
│   ├── Header.jsx
│   ├── Card.jsx
│   ├── Button.jsx
│   └── ...
├── pages/          # Page components
│   ├── Dashboard.jsx
│   ├── NewNovel.jsx
│   ├── OutlineReview.jsx
│   ├── GenerationView.jsx
│   ├── NovelReader.jsx
│   ├── StoryBible.jsx
│   ├── Settings.jsx
│   └── CostDashboard.jsx
├── stores/         # Zustand state management
│   └── useAppStore.js
├── utils/          # Utilities
│   ├── api.js      # API client
│   ├── socket.js   # WebSocket client
│   └── format.js   # Formatting helpers
├── styles/         # Global styles
│   └── index.css
├── App.jsx         # Main app component with routing
└── main.jsx        # Entry point
```

## Design System

### Colors

- **Primary**: Blue shades for main actions and highlights
- **Accent**: Purple/pink for special emphasis
- **Surface**: Dark slate with transparency for glass effect

### Typography

- **Sans**: Inter - UI and body text
- **Serif**: Merriweather - Novel content and quotes
- **Mono**: JetBrains Mono - Code and technical content

### Animations

All animations use Framer Motion for consistent, performant transitions:
- Page transitions
- Component mount/unmount
- Progress indicators
- Hover effects
- Modal animations

## API Integration

The frontend communicates with the backend on port 3001:

- **REST API**: `/api/*` - Novel CRUD, generation control
- **WebSocket**: `/socket.io/*` - Real-time generation updates

## State Management

Zustand stores:
- `novels`: All user novels
- `settings`: API keys, preferences
- `theme`: Dark/light mode
- `progress`: Real-time generation state

## Contributing

This is a production-quality codebase. Maintain these standards:

1. **Component Quality**: Every component should be reusable and well-documented
2. **Type Safety**: Use PropTypes or TypeScript for all components
3. **Accessibility**: ARIA labels, keyboard navigation, semantic HTML
4. **Performance**: Code splitting, lazy loading, optimized re-renders
5. **Design**: Follow the established design system

## License

Proprietary - PlotPulse Platform
