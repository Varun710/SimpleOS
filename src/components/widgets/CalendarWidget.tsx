import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarWidgetProps {
  onDateClick?: (date: Date) => void;
}

export function CalendarWidget({ onDateClick }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(year, month, day);
    clickedDate.setHours(0, 0, 0, 0);
    if (onDateClick) {
      onDateClick(clickedDate);
    }
  };

  const isToday = (day: number) => {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
  };

  const days = [];
  
  // Empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="aspect-square" />);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const isTodayDate = isToday(day);
    days.push(
      <button
        key={day}
        onClick={() => handleDateClick(day)}
        className={`
          aspect-square rounded-md text-sm transition-colors
          hover:bg-primary/10 focus:bg-primary/10 focus:outline-none
          ${isTodayDate ? "bg-primary text-primary-foreground font-semibold" : "text-foreground"}
        `}
      >
        {day}
      </button>
    );
  }

  return (
    <Card className="p-4 w-80 bg-background/80 backdrop-blur-sm border shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousMonth}
          className="h-8 w-8"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="font-semibold text-sm">
          {monthNames[month]} {year}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextMonth}
          className="h-8 w-8"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-xs text-muted-foreground font-medium text-center py-1"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days}
      </div>
    </Card>
  );
}

