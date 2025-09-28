import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './components/toast/ToastProvider.jsx'
import { ModalProvider } from './components/modal/ModalProvider.jsx'
import AppRouter from './router/AppRouter.jsx'
import './styles/global.scss'

// React Query
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Realtime (FCM + sonidos)
import RealtimeProvider from './realtime/RealtimeProvider.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ModalProvider>
          <AuthProvider>
            <RealtimeProvider>
              <BrowserRouter>
                <AppRouter />
              </BrowserRouter>
            </RealtimeProvider>
          </AuthProvider>
        </ModalProvider>
      </ToastProvider>

      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
)
