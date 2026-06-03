# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.







Page








dat ten file co duoi ten thu muc nhin cho de

my-frontend-app/
├── public/                 # Static public assets (favicons, robots.txt)
├── src/                    # Main source code container
│   ├── assets/             # Global static media (compiled images, global fonts, SVGs)
│   ├── components/         # Shared, stateless atomic UI elements (Buttons, Inputs, Modals)
│   ├── config/             # App-wide configurations, environment setups, and constants
│   ├── features/           # Modular, domain-driven feature buckets (the core business logic)
│   │   ├── auth/           # Example Feature: Authentication module
│   │   │   ├── components/ # Private UI components used only within this specific feature
│   │   │   ├── hooks/      # Feature-scoped state/logic managers (e.g., useAuth)
│   │   │   ├── services/   # Feature API calls, interceptors, and data transformers
│   │   │   ├── types/      # Domain-specific TypeScript interfaces or schemas
│   │   │   └── index.ts    # Public API surface exposing only what the rest of the app needs
│   │   └── dashboard/      # Example Feature: User Dashboard module
│   ├── hooks/              # App-wide reusable stateful logic (e.g., useTheme, useWindowSize)
│   ├── layouts/            # Page shell wrappers (e.g., AdminLayout, AuthLayout, Sidebar)
│   ├── pages/              # Route entry points mapping directly to your router configurations
│   ├── routes/             # Client-side routing orchestrations and route guards
│   ├── services/           # Base global API clients (Axios/Fetch configs, WebSocket initializers)
│   ├── store/              # Global state management slices (Redux, Zustand, Pinia)
│   ├── utils/              # Pure JavaScript utility functions (date formatters, local storage helpers)
│   ├── App.tsx             # Root component bootstrapping layouts and providers
│   └── main.tsx            # Application entry point binding to the DOM element
├── .env.example            # Sample environment template file
├── package.json            # Manifest file tracking dependencies and build scripts
└── tsconfig.json           # Compiler rules for TypeScript projects

Redux thunk