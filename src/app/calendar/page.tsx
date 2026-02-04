import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default function CalendarPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Calendar</h2>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Calendar view coming soon.
          </p>
          <p className="text-sm text-muted-foreground">
            View all bookings and availability at a glance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
