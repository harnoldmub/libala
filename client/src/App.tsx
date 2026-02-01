import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import Landing from "@/pages/landing";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import Invitation from "@/pages/invitation";
import CheckIn from "@/pages/checkin";
import CagnottePage from "@/pages/cagnotte";
import ContributionMerci from "@/pages/contribution-merci";
import LiveContributions from "@/pages/live-contributions";
import DotInvitation from "@/pages/dot-invitation";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Auto-redirect to login if trying to access /admin without auth
  useEffect(() => {
    if (!isLoading && !isAuthenticated && location === "/admin") {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, location, setLocation]);

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/checkin" component={CheckIn} />
      <Route path="/invitation/:id" component={Invitation} />
      <Route path="/cagnotte" component={CagnottePage} />
      <Route path="/cagnotte/live" component={LiveContributions} />
      <Route path="/contribution/merci" component={ContributionMerci} />
      <Route path="/dot/:guestId" component={DotInvitation} />
      <Route path="/admin">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-4 text-muted-foreground">Chargement...</p>
            </div>
          </div>
        ) : isAuthenticated ? (
          <Admin />
        ) : null}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
