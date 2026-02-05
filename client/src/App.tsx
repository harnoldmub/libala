import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { PublicLayout } from "@/layouts/PublicLayout";
import { AdminLayout } from "@/layouts/AdminLayout";

// Pages
import LandingPage from "@/pages/LandingPage";
import InvitationPage from "@/pages/InvitationPage";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import Invitation from "@/pages/invitation";
import CheckIn from "@/pages/checkin";
import CagnottePage from "@/pages/cagnotte";
import ContributionMerci from "@/pages/contribution-merci";
import LiveContributions from "@/pages/live-contributions";
import Signup from "@/pages/signup";
import VerifyEmail from "@/pages/verify-email";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Onboarding from "@/pages/onboarding";
import GuestInvitation from "@/pages/dot-invitation";
import NotFound from "@/pages/not-found";

// Admin Pages
import DashboardPage from "@/pages/admin/DashboardPage";
import GuestsPage from "@/pages/admin/GuestsPage";
import GiftsPage from "@/pages/admin/GiftsPage";
import PricingPage from "@/pages/admin/PricingPage";
import EmailLogsPage from "@/pages/admin/EmailLogsPage";
import TemplatesPage from "@/pages/admin/TemplatesPage";
import WelcomePage from "@/pages/admin/WelcomePage";
import { useWedding } from "@/hooks/use-api";

function AppRoot() {
  const { data: wedding, isLoading } = useWedding();
  const { user } = useAuth();

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
    </div>
  );

  if (!wedding) {
    return <Redirect to="/onboarding" />;
  }

  return <Redirect to={`/app/${wedding.id}/dashboard`} />;
}

// Subdomain logic helper
const isAppSubdomain = () => {
  const hostname = window.location.hostname;
  return hostname.startsWith('app.') || (hostname === 'localhost' && window.location.pathname.startsWith('/app'));
};

function MarketingRouter() {
  return (
    <Switch>
      {/* Landing Page */}
      <Route path="/" component={LandingPage} />

      {/* Guest Public Routes (Slug-based) */}
      <Route path="/:slug/:page*">
        {(params) => (
          <PublicLayout>
            <Switch>
              <Route path="/:slug" component={InvitationPage} />
              <Route path="/:slug/rsvp" component={InvitationPage} />
              <Route path="/:slug/cagnotte" component={CagnottePage} />
              <Route path="/:slug/live" component={LiveContributions} />
              <Route path="/:slug/checkin" component={CheckIn} />
              <Route path="/:slug/guest/:guestId" component={GuestInvitation} />
              <Route component={NotFound} />
            </Switch>
          </PublicLayout>
        )}
      </Route>

      {/* Legacy / Catch-all */}
      <Route path="/invitation/:id" component={Invitation} />
      <Route path="/checkin" component={CheckIn} />

      {/* Redirect Auth routes to App subdomain logic (simulated here for dev) */}
      <Route path="/login"><Redirect to="/app/login" /></Route>
      <Route path="/signup"><Redirect to="/app/signup" /></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    );
  }

  // Handle direct access to /app without subdomain in dev
  // In production, Nginx/Vercel handles subdomain routing to same app but we check hostname

  return (
    <Switch>
      {/* Auth Routes */}
      <Route path="/app/login" component={Login} />
      <Route path="/app/signup" component={Signup} />
      <Route path="/app/verify-email" component={VerifyEmail} />
      <Route path="/app/forgot-password" component={ForgotPassword} />
      <Route path="/app/reset-password" component={ResetPassword} />
      <Route path="/app/onboarding" component={Onboarding} />

      {/* Global Shared Protected Routes */}
      <Route path="/app/contribution/merci" component={ContributionMerci} />

      {/* Admin Protected Routes */}
      <Route path="/app">
        {!user ? <Redirect to="/app/login" /> : <AppRoot />}
      </Route>

      <Route path="/app/dashboard">
        {!user ? <Redirect to="/app/login" /> : <AppRoot />}
      </Route>

      <Route path="/app/:weddingId/:subpage*">
        {(params) => (
          !user ? <Redirect to="/app/login" /> : (
            <AdminLayout>
              <Switch>
                <Route path="/app/:weddingId/dashboard" component={DashboardPage} />
                <Route path="/app/:weddingId/welcome" component={WelcomePage} />
                <Route path="/app/:weddingId/guests" component={GuestsPage} />
                <Route path="/app/:weddingId/gifts" component={GiftsPage} />
                <Route path="/app/:weddingId/billing" component={PricingPage} />
                <Route path="/app/:weddingId/emails" component={EmailLogsPage} />
                <Route path="/app/:weddingId/templates" component={TemplatesPage} />
                {/* Fallback to Admin Dashboard */}
                <Route><Redirect to={`/app/${params.weddingId}/dashboard`} /></Route>
              </Switch>
            </AdminLayout>
          )
        )}
      </Route>

      {/* Catch-all for App subdomain */}
      <Route><Redirect to="/app" /></Route>
    </Switch>
  );
}

function Router() {
  // For local development ease, we treat paths starting with /app as the "App Subdomain"
  // In production, we would strictly check window.location.hostname
  const [location] = useLocation();
  const isApp = location.startsWith('/app');

  return isApp ? <AppRouter /> : <MarketingRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
