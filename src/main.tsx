import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { Layout } from './components/layout/Layout'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import { RouteError } from './pages/RouteError'

const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        {
          // One error boundary for every page, nested *inside* the layout so
          // the header, footer and skip link survive: an errorElement replaces
          // the element of the route it sits on, so putting it on the layout
          // route would take the whole shell down with the page.
          //
          // The failure it exists for is a stale build — see RouteError.
          errorElement: <RouteError />,
          children: [
            { path: '/', element: <Home /> },
            // Everything past the home page is loaded on demand, so the first
            // visit ships only what the home page needs.
            {
              path: '/lessons/:slug',
              lazy: async () => ({ Component: (await import('./pages/LessonPage')).LessonPage }),
            },
            {
              path: '/practice',
              lazy: async () => ({ Component: (await import('./pages/Practice')).Practice }),
            },
            {
              path: '/cheatsheet',
              lazy: async () => ({ Component: (await import('./pages/Cheatsheet')).Cheatsheet }),
            },
            {
              path: '/glossary',
              lazy: async () => ({ Component: (await import('./pages/Glossary')).Glossary }),
            },
            {
              path: '/about',
              lazy: async () => ({ Component: (await import('./pages/About')).About }),
            },
            { path: '*', element: <NotFound /> },
          ],
        },
      ],
    },
  ],
  // BASE_URL comes from `base` in vite.config.ts, itself from site.config.mjs.
  // It is '/' on the custom domain and '/learn-tajweed/' on the GitHub Pages
  // fallback, so every link follows whichever the build was made for.
  { basename: import.meta.env.BASE_URL },
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
