import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { Layout } from './components/layout/Layout'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'

const router = createBrowserRouter(
  [
    {
      element: <Layout />,
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
  // BASE_URL comes from `base` in vite.config.ts, so every link keeps the
  // /learn-tajweed/ prefix that GitHub Pages serves the site under.
  { basename: import.meta.env.BASE_URL },
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
