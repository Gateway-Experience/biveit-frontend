import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, defaultShouldDehydrateQuery } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

import routes from 'src/routes';
import { ADMIN_QUERY_KEY } from 'src/services/admin';
import AppProvider from 'src/components/common/AppProvider';
import CookieConsent from 'src/components/common/CookieConsent';
import { NotificationProvider } from 'src/components/common/NotificationProvider';
import ThemeProvider from 'src/components/common/ThemeProvider';
import 'src/styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60, // 24 hours
      staleTime: 60000, // 1 minute
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: window.localStorage,
});

createRoot(document.getElementById('root')!).render(
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister,
      // The admin dashboard's data (the platform's internals) stays in memory only.
      dehydrateOptions: { shouldDehydrateQuery: query => query.queryKey[0] !== ADMIN_QUERY_KEY && defaultShouldDehydrateQuery(query) },
    }}
  >
    <AppProvider>
      <ThemeProvider>
        <NotificationProvider>
          <BrowserRouter>
            {routes}
            <CookieConsent />
          </BrowserRouter>
        </NotificationProvider>
      </ThemeProvider>
    </AppProvider>
  </PersistQueryClientProvider>,
);
