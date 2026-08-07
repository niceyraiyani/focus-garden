import { HashRouter, Routes, Route } from 'react-router-dom'
import { SettingsProvider } from './SettingsContext'
import { CloudProvider } from './CloudContext'
import { ToastProvider } from '../components/ToastContext'
import { ConfirmProvider } from '../components/ConfirmContext'
import { ErrorBoundary } from './ErrorBoundary'
import { Layout } from './Layout'
import { HomePage } from '../features/home/HomePage'
import { InboxPage, AllTasksPage, CompletedPage, ListPage } from '../features/tasks/TaskPages'
import { ListsPage } from '../features/tasks/ListsPage'
import { CalendarPage } from '../features/calendar/CalendarPage'
import { FocusPage } from '../features/focus/FocusPage'
import { InsightsPage } from '../features/insights/InsightsPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { LaunchPage } from '../features/launch/LaunchPage'

export function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <CloudProvider>
          <ToastProvider>
            <ConfirmProvider>
              <HashRouter>
                <Routes>
                  {/* Standalone: this is the browser-startup page, so it gets
                      no sidebar or chrome — one clock, one button, one move. */}
                  <Route path="start" element={<LaunchPage />} />
                  <Route element={<Layout />}>
                    <Route index element={<HomePage />} />
                    <Route path="inbox" element={<InboxPage />} />
                    <Route path="lists" element={<ListsPage />} />
                    <Route path="all" element={<AllTasksPage />} />
                    <Route path="calendar" element={<CalendarPage />} />
                    <Route path="completed" element={<CompletedPage />} />
                    <Route path="list/:id" element={<ListPage />} />
                    <Route path="focus" element={<FocusPage />} />
                    <Route path="insights" element={<InsightsPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>
                </Routes>
              </HashRouter>
            </ConfirmProvider>
          </ToastProvider>
        </CloudProvider>
      </SettingsProvider>
    </ErrorBoundary>
  )
}
