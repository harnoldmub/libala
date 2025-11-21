import { Card } from "@/components/ui/card";
import { TrendingUp, Users, Calendar, CheckCircle, XCircle, Table2 } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { RsvpResponse } from "@shared/schema";

interface DashboardWidgetsProps {
  responses: RsvpResponse[];
}

export function DashboardWidgets({ responses }: DashboardWidgetsProps) {
  const stats = {
    total: responses.length,
    both: responses.filter((r) => r.availability === "both").length,
    march19: responses.filter((r) => r.availability === "19-march").length,
    march21: responses.filter((r) => r.availability === "21-march").length,
    unavailable: responses.filter((r) => r.availability === "unavailable").length,
    assigned: responses.filter((r) => r.tableNumber !== null).length,
    totalGuests: responses.reduce((sum, r) => sum + r.partySize, 0),
    solo: responses.filter((r) => r.partySize === 1).length,
    couple: responses.filter((r) => r.partySize === 2).length,
  };

  const availabilityData = [
    { name: "Les deux dates", value: stats.both, color: "hsl(var(--primary))" },
    { name: "19 mars", value: stats.march19, color: "hsl(var(--chart-2))" },
    { name: "21 mars", value: stats.march21, color: "hsl(var(--chart-3))" },
    { name: "Indisponibles", value: stats.unavailable, color: "hsl(var(--muted-foreground))" },
  ];

  const partySizeData = [
    { name: "Solo (1)", value: stats.solo, fill: "hsl(var(--chart-4))" },
    { name: "Couple (2)", value: stats.couple, fill: "hsl(var(--chart-5))" },
  ];

  const tableAssignmentData = [
    {
      name: "Attribués",
      value: stats.assigned,
      fill: "hsl(var(--chart-2))",
    },
    {
      name: "Non attribués",
      value: stats.total - stats.assigned,
      fill: "hsl(var(--muted))",
    },
  ];

  const confirmationRate = stats.total > 0 
    ? Math.round(((stats.total - stats.unavailable) / stats.total) * 100) 
    : 0;

  const statCards = [
    {
      title: "Total Invités",
      value: stats.totalGuests,
      description: `${stats.total} réponses`,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
      testId: "stat-total-guests",
    },
    {
      title: "Confirmations",
      value: stats.total - stats.unavailable,
      description: `${confirmationRate}% taux`,
      icon: CheckCircle,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
      testId: "stat-confirmations",
    },
    {
      title: "Tables attribuées",
      value: stats.assigned,
      description: `${stats.total - stats.assigned} restantes`,
      icon: Table2,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
      testId: "stat-tables-assigned",
    },
    {
      title: "Les deux dates",
      value: stats.both,
      description: "Présents 19 & 21",
      icon: Calendar,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
      testId: "stat-both-dates",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards Only */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card
              key={idx}
              className="p-6 hover-elevate transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-sans text-muted-foreground mb-1">
                    {stat.title}
                  </p>
                  <p 
                    className="text-3xl font-bold font-serif text-foreground mb-1"
                    data-testid={stat.testId}
                  >
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground font-sans">
                    {stat.description}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
