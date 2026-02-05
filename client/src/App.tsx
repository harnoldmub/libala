import { Switch, Route, Redirect } from "wouter";
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

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Root & Auth */}
      {/* Root & Auth */}
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/onboarding" component={Onboarding} />

      {/* Global Shared Public Routes (Success etc) */}
      <Route path="/contribution/merci" component={ContributionMerci} />

      {/* Admin Protected Routes */}
      <Route path="/app">
        {!user ? <Redirect to="/login" /> : <AppRoot />}
      </Route>

      <Route path="/app/:weddingId/:subpage*">
        {(params) => (
          !user ? <Redirect to="/login" /> : (
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

      {/* Preview Routes (Draft Access) */}
      <Route path="/preview/:slug/:page*">
        {(params) => (
          <PublicLayout>
            <Switch>
              <Route path="/preview/:slug" component={InvitationPage} />
              <Route path="/preview/:slug/rsvp" component={InvitationPage} />
              <Route path="/preview/:slug/cagnotte" component={CagnottePage} />
              <Route path="/preview/:slug/live" component={LiveContributions} />
              <Route path="/preview/:slug/checkin" component={CheckIn} />
              <Route path="/preview/:slug/guest/:guestId" component={GuestInvitation} />
              <Route component={NotFound} />
            </Switch>
          </PublicLayout>
        )}
      </Route>

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
      <Route component={NotFound} />
    </Switch>
  );
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
