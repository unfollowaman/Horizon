# Horizon Project Documentation

## Current Architecture
Horizon is a frontend web application built using React and TypeScript.

The application is structured logically to separate concerns:

- `src/components/`: Reusable, generic UI components (Buttons, Modals, Cards).
- `src/layouts/`: Shell components (MainLayout) that define the overall page structure and persistent elements (Header, Footer, Navigation).
- `src/pages/`: Route-level components mapping directly to pages in the application.
- `src/services/`: Functions and modules handling external communication (APIs, integrations).
- `src/data/`: Centralized mock data used for initial development.
- `src/utils/`: Helper functions and reusable utility logic.
- `src/hooks/`: Custom React hooks encapsulating specific logic.
- `src/types/`: Centralized TypeScript interfaces and models.
- `src/assets/`: Static files like images and icons.

## Routing
Routing is implemented using `react-router-dom`. The application uses `BrowserRouter` in `App.tsx` and defines nested routes within a `MainLayout` shell.

Routes currently implemented:
- `/`: Home Page
- `/library`: Resource Library (with category query parameter filtering)
- `/resource/:id`: Individual Resource Details page

Placeholder Routes:
- `/login`: Login placeholder
- `/register`: Register placeholder
- `/dashboard`: User Dashboard placeholder
- `/settings/notifications`: Notification Settings placeholder

## Mock Data System
For initial development, we are not connecting to a real backend. All data is managed using mock data centralized in `src/data/mock.ts`.

Models defined in `src/types/index.ts`:
- `Resource`: Represents a study material (PDF).
- `Category`: Categorizes resources (e.g., 'Notes', 'Previous Year Papers').
- `Announcement`: Platform-wide announcements.
- `User`: Represents a logged-in user.

## Planned Future Features
The architecture is prepared for the following features:

1. **Authentication**: Placeholders exist for Login, Register, and Dashboard. A `src/services/auth.ts` file is ready to be implemented for actual token-based authentication.
2. **Push Notifications**: Placeholders exist for Notification Settings. A `src/services/notifications.ts` is created to handle service worker integration and push API communication.
3. **Database Integration**: Once a backend is ready, `src/services/api.ts` can be added to replace the mock data logic used in the pages.
4. **PDF Viewer**: A real PDF viewer component will replace the current placeholders on the Resource Details page.

## Recommended Next Implementation Steps
1. **Implement PDF Viewer**: Integrate a library like `react-pdf` to render PDFs correctly inside the Resource Details page.
2. **Connect Backend API**: Set up an API service (e.g., using Axios) to fetch resources and announcements from a backend instead of mock data.
3. **Implement Authentication**: Build the backend login/registration flow and implement JWT storing and retrieval in `src/services/auth.ts`.
4. **Implement UI System**: Add a CSS framework (like Tailwind CSS) or a component library (like Material UI) to finalize the design.