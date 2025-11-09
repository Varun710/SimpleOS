import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock,
  Trash2,
  ChevronDown
} from "lucide-react";
import { useCalendarStore } from "@/stores/calendar-store";
import type { CalendarEvent } from "@/stores/calendar-store";

export function CalendarApp() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    timeFrom: "",
    timeTo: "",
    notes: "",
  });

  const { 
    addEvent, 
    updateEvent, 
    deleteEvent, 
    getEventsForDate,
    loadEvents 
  } = useCalendarStore();

  useEffect(() => {
    loadEvents();
  }, []);

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

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (day: number) => {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(year, month, day);
    const dateStr = clickedDate.toISOString().split("T")[0];
    setSelectedDate(dateStr);
    setFormData({
      title: "",
      date: dateStr,
      timeFrom: "",
      timeTo: "",
      notes: "",
    });
    setEditingEvent(null);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      date: event.date,
      timeFrom: event.timeFrom || "",
      timeTo: event.timeTo || "",
      notes: event.notes || "",
    });
    setSelectedDate(event.date);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) return;

    if (editingEvent) {
      updateEvent(editingEvent.id, {
        title: formData.title.trim(),
        date: formData.date,
        timeFrom: formData.timeFrom || undefined,
        timeTo: formData.timeTo || undefined,
        notes: formData.notes.trim() || undefined,
      });
    } else {
      addEvent({
        title: formData.title.trim(),
        date: formData.date,
        timeFrom: formData.timeFrom || undefined,
        timeTo: formData.timeTo || undefined,
        notes: formData.notes.trim() || undefined,
      });
    }

    // Reset form
    setFormData({
      title: "",
      date: selectedDate || "",
      timeFrom: "",
      timeTo: "",
      notes: "",
    });
    setEditingEvent(null);
  };

  const handleDelete = (eventId: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      deleteEvent(eventId);
      if (editingEvent?.id === eventId) {
        setEditingEvent(null);
        setFormData({
          title: "",
          date: selectedDate || "",
          timeFrom: "",
          timeTo: "",
          notes: "",
        });
      }
    }
  };

  const handleNewEvent = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    setSelectedDate(todayStr);
    setFormData({
      title: "",
      date: todayStr,
      timeFrom: "",
      timeTo: "",
      notes: "",
    });
    setEditingEvent(null);
  };

  const getEventsForDay = (day: number) => {
    const date = new Date(year, month, day);
    return getEventsForDate(date);
  };

  const formatTime = (time?: string) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Date picker component
  const DatePicker = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [pickerDate, setPickerDate] = useState(() => {
      if (formData.date) {
        const d = new Date(formData.date);
        return new Date(d.getFullYear(), d.getMonth(), 1);
      }
      return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    });

    // Sync picker date when formData.date changes externally
    useEffect(() => {
      if (formData.date) {
        const d = new Date(formData.date);
        setPickerDate(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    }, [formData.date]);

    const pickerYear = pickerDate.getFullYear();
    const pickerMonth = pickerDate.getMonth();
    const pickerFirstDay = new Date(pickerYear, pickerMonth, 1);
    const pickerLastDay = new Date(pickerYear, pickerMonth + 1, 0);
    const pickerDaysInMonth = pickerLastDay.getDate();
    const pickerStartingDay = pickerFirstDay.getDay();

    const handleDateSelect = (day: number) => {
      const selectedDate = new Date(pickerYear, pickerMonth, day);
      const dateStr = selectedDate.toISOString().split("T")[0];
      setFormData({ ...formData, date: dateStr });
      setSelectedDate(dateStr);
      setIsOpen(false);
    };

    const goToPreviousMonth = () => {
      setPickerDate(new Date(pickerYear, pickerMonth - 1, 1));
    };

    const goToNextMonth = () => {
      setPickerDate(new Date(pickerYear, pickerMonth + 1, 1));
    };

    const goToToday = () => {
      const today = new Date();
      setPickerDate(new Date(today.getFullYear(), today.getMonth(), 1));
      const todayStr = today.toISOString().split("T")[0];
      setFormData({ ...formData, date: todayStr });
      setSelectedDate(todayStr);
    };

    const isSelected = (day: number) => {
      if (!formData.date) return false;
      const checkDate = new Date(pickerYear, pickerMonth, day);
      return checkDate.toISOString().split("T")[0] === formData.date;
    };

    const isToday = (day: number) => {
      const checkDate = new Date(pickerYear, pickerMonth, day);
      const today = new Date();
      return (
        checkDate.getDate() === today.getDate() &&
        checkDate.getMonth() === today.getMonth() &&
        checkDate.getFullYear() === today.getFullYear()
      );
    };

    const pickerDays = [];
    for (let i = 0; i < pickerStartingDay; i++) {
      pickerDays.push(<div key={`empty-${i}`} className="aspect-square" />);
    }
    for (let day = 1; day <= pickerDaysInMonth; day++) {
      const isTodayDate = isToday(day);
      const isSelectedDate = isSelected(day);
      pickerDays.push(
        <button
          key={day}
          onClick={() => handleDateSelect(day)}
          className={`
            aspect-square rounded-md text-xs transition-colors
            ${isSelectedDate 
              ? "bg-primary text-primary-foreground font-semibold" 
              : isTodayDate
                ? "bg-primary/10 text-primary font-semibold hover:bg-primary/20"
                : "hover:bg-muted text-foreground"
            }
          `}
        >
          {day}
        </button>
      );
    }

    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            type="button"
          >
            <span className={formData.date ? "" : "text-muted-foreground"}>
              {formData.date ? formatDate(formData.date) : "Select date"}
            </span>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.preventDefault();
                  goToPreviousMonth();
                }}
                className="h-7 w-7"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="font-semibold text-sm">
                {monthNames[pickerMonth]} {pickerYear}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.preventDefault();
                  goToNextMonth();
                }}
                className="h-7 w-7"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="text-xs text-muted-foreground font-medium text-center py-1"
                >
                  {day.substring(0, 1)}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {pickerDays}
            </div>

            {/* Today button */}
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.preventDefault();
                  goToToday();
                }}
              >
                Today
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Time picker component
  const TimePicker = ({ type }: { type: "from" | "to" }) => {
    const timeValue = type === "from" ? formData.timeFrom : formData.timeTo;
    const [hours, minutes] = timeValue ? timeValue.split(":") : ["", ""];
    const hour = hours ? parseInt(hours) : null;
    const minute = minutes ? parseInt(minutes) : null;
    
    const displayTime = timeValue 
      ? formatTime(timeValue)
      : "Select time";

    const handleTimeSelect = (selectedHour: number, selectedMinute: number) => {
      const timeStr = `${selectedHour.toString().padStart(2, "0")}:${selectedMinute.toString().padStart(2, "0")}`;
      if (type === "from") {
        setFormData({ ...formData, timeFrom: timeStr });
      } else {
        setFormData({ ...formData, timeTo: timeStr });
      }
    };

    const handleClearTime = () => {
      if (type === "from") {
        setFormData({ ...formData, timeFrom: "" });
      } else {
        setFormData({ ...formData, timeTo: "" });
      }
    };

    const formatHourDisplay = (h: number) => {
      const displayHour = h % 12 || 12;
      const ampm = h >= 12 ? "PM" : "AM";
      return `${displayHour} ${ampm}`;
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            type="button"
          >
            <span className={timeValue ? "" : "text-muted-foreground"}>
              {displayTime}
            </span>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72 p-3" align="start">
          <div className="grid grid-cols-2 gap-3">
            {/* Hours */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 mb-1">Hour</div>
              <ScrollArea className="h-[200px]">
                <div className="space-y-0.5 pr-2">
                  {Array.from({ length: 24 }, (_, i) => (
                    <DropdownMenuItem
                      key={i}
                      className={`cursor-pointer rounded-md px-2 py-1.5 text-sm ${
                        hour === i ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"
                      }`}
                      onSelect={(e) => {
                        e.preventDefault();
                        const newMinute = minute !== null ? minute : 0;
                        handleTimeSelect(i, newMinute);
                      }}
                    >
                      <span className="font-mono">{i.toString().padStart(2, "0")}</span>
                      <span className="ml-2 text-xs opacity-70">{formatHourDisplay(i)}</span>
                    </DropdownMenuItem>
                  ))}
                </div>
              </ScrollArea>
            </div>
            {/* Minutes */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 mb-1">Minute</div>
              <ScrollArea className="h-[200px]">
                <div className="space-y-0.5 pr-2">
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <DropdownMenuItem
                      key={m}
                      className={`cursor-pointer rounded-md px-2 py-1.5 text-sm ${
                        minute === m ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"
                      }`}
                      onSelect={(e) => {
                        e.preventDefault();
                        const newHour = hour !== null ? hour : 12;
                        handleTimeSelect(newHour, m);
                      }}
                    >
                      <span className="font-mono">{m.toString().padStart(2, "0")}</span>
                    </DropdownMenuItem>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          {timeValue && (
            <>
              <Separator className="my-2" />
              <DropdownMenuItem
                className="cursor-pointer text-destructive hover:bg-destructive/10"
                onSelect={(e) => {
                  e.preventDefault();
                  handleClearTime();
                }}
              >
                Clear time
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const days = [];
  
  // Empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="aspect-square" />);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const isTodayDate = isToday(day);
    const dayEvents = getEventsForDay(day);
    const dateStr = new Date(year, month, day).toISOString().split("T")[0];
    
    days.push(
      <div
        key={day}
        className={`
          aspect-square rounded-md text-xs flex flex-col items-center justify-start p-0.5 transition-colors cursor-pointer min-h-[60px]
          ${isTodayDate ? "bg-primary/10 border-2 border-primary" : "hover:bg-muted/50 border border-transparent"}
          ${selectedDate === dateStr ? "bg-primary/20 border-2 border-primary" : ""}
        `}
        onClick={() => handleDateClick(day)}
      >
        <div className={`
          text-xs font-medium mb-0.5
          ${isTodayDate ? "text-primary font-semibold" : "text-foreground"}
        `}>
          {day}
        </div>
        {dayEvents.length > 0 && (
          <div className="flex flex-col gap-0.5 w-full px-0.5">
            {dayEvents.slice(0, 2).map((event) => (
              <div
                key={event.id}
                className="text-[9px] px-1 py-0.5 rounded bg-primary/80 text-primary-foreground truncate w-full leading-tight"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEventClick(event);
                }}
                title={event.title}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-[9px] text-muted-foreground px-1">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Get events for selected date
  const selectedDateEvents = selectedDate 
    ? getEventsForDate(new Date(selectedDate))
    : [];

  return (
    <div className="h-full flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r bg-muted/30 flex flex-col">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Events</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewEvent}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              New Event
            </Button>
          </div>
          {selectedDate && (
            <div className="text-xs text-muted-foreground">
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {/* Event Form */}
            <Card className="p-3">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Title *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Event title"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Date *</label>
                  <DatePicker />
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Time From</label>
                    <TimePicker type="from" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Time To</label>
                    <TimePicker type="to" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Notes</label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingEvent ? "Update" : "Create"} Event
                  </Button>
                  {editingEvent && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingEvent(null);
                        setFormData({
                          title: "",
                          date: selectedDate || "",
                          timeFrom: "",
                          timeTo: "",
                          notes: "",
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Card>

            <Separator />

            {/* Events List */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Events for Selected Date</h3>
              {selectedDateEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events for this date</p>
              ) : (
                selectedDateEvents.map((event) => (
                  <Card
                    key={event.id}
                    className={`p-3 cursor-pointer transition-colors ${
                      editingEvent?.id === event.id ? "bg-primary/10 border-primary" : ""
                    }`}
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{event.title}</h4>
                        {(event.timeFrom || event.timeTo) && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Clock className="w-3 h-3" />
                            {event.timeFrom 
                              ? `${formatTime(event.timeFrom)}${event.timeTo ? ` - ${formatTime(event.timeTo)}` : ""}`
                              : event.timeTo 
                                ? `Until ${formatTime(event.timeTo)}`
                                : ""}
                          </div>
                        )}
                        {event.notes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {event.notes}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(event.id);
                        }}
                        className="shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Main Calendar */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <h1 className="text-xl font-bold">Calendar</h1>
            <p className="text-xs text-muted-foreground">
              View and manage your calendar
            </p>
          </div>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPreviousMonth}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="font-semibold text-base min-w-[180px] text-center">
                  {monthNames[month]} {year}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNextMonth}
                  className="h-8 w-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="text-xs text-muted-foreground font-medium text-center py-1"
                >
                  {day.substring(0, 3)}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

