import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { ProfilePreviewProvider } from './context/ProfilePreviewProvider'
import { UploadProvider } from './context/UploadProvider.jsx'
import { ToastProvider } from './components/toast/ToastProvider.jsx'
import { ModalProvider } from './components/modal/ModalProvider.jsx'
import UploadIndicator from './components/uploads/UploadIndicator.jsx'
import AppRouter from './router/AppRouter.jsx'
import { LoadingProvider } from './context/LoadingContext.jsx'
import GlobalLoader from './components/loader/GlobalLoader.jsx'
import './styles/global.scss'

// React Query
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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
        <AuthProvider>
          <UploadProvider>
            <RealtimeProvider>
              <BrowserRouter>
                <LoadingProvider>
                  <ProfilePreviewProvider>
                    <ModalProvider>
                      <AppRouter />
                      <UploadIndicator />
                    </ModalProvider>
                  </ProfilePreviewProvider>
                </LoadingProvider>
              </BrowserRouter>
            </RealtimeProvider>
          </UploadProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
