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
      {/* KPI Cards */}
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Availability Pie Chart */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-serif font-semibold text-foreground mb-1">
              Disponibilités
            </h3>
            <p className="text-sm text-muted-foreground font-sans">
              Répartition par date
            </p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={availabilityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) =>
                  `${name}: ${value} (${percent && !isNaN(percent) ? (percent * 100).toFixed(0) : 0}%)`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {availabilityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [`${value}`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Party Size Bar Chart */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-serif font-semibold text-foreground mb-1">
              Taille des groupes
            </h3>
            <p className="text-sm text-muted-foreground font-sans">
              Solo vs Couple
            </p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={partySizeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Table Assignment Progress */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-serif font-semibold text-foreground mb-1">
            Progression de l'attribution des tables
          </h3>
          <p className="text-sm text-muted-foreground font-sans">
            {stats.assigned} sur {stats.total} invités ont une table attribuée
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-sans text-muted-foreground">
                  Progression
                </span>
                <span 
                  className="text-sm font-sans font-semibold text-foreground"
                  data-testid="text-assignment-progress"
                >
                  {stats.total > 0 ? Math.round((stats.assigned / stats.total) * 100) : 0}%
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-chart-2 transition-all duration-500"
                  style={{
                    width: `${stats.total > 0 ? (stats.assigned / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-chart-2/10">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-chart-2" />
                  <span className="text-sm font-sans text-foreground">
                    Tables attribuées
                  </span>
                </div>
                <span 
                  className="text-lg font-bold font-serif text-chart-2"
                  data-testid="text-assigned-count"
                >
                  {stats.assigned}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-sans text-foreground">
                    En attente
                  </span>
                </div>
                <span 
                  className="text-lg font-bold font-serif text-muted-foreground"
                  data-testid="text-unassigned-count"
                >
                  {stats.total - stats.assigned}
                </span>
              </div>
            </div>
          </div>
          <div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={tableAssignmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {tableAssignmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    </div>
  );
}
