import { useState } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, format,
  addWeeks, subWeeks, startOfDay, getHours,
} from "date-fns";
import { ru } from "date-fns/locale";
import type { Task } from "../api";

const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

type View = "month" | "week" | "day";

interface Props {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}

/* ---------- helpers ---------- */

function getTasksForDay(tasks: Task[], day: Date) {
  return tasks.filter(t => t.deadline && isSameDay(new Date(t.deadline), day));
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---------- MonthView ---------- */

function MonthView({ tasks, date, onSelectDay, onSelectTask }: {
  tasks: Task[];
  date: Date;
  onSelectDay: (d: Date) => void;
  onSelectTask: (t: Task) => void;
}) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let cur = gridStart;
  while (cur <= gridEnd) {
    days.push(cur);
    cur = addDays(cur, 1);
  }

  const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  return (
    <div className="flex flex-col gap-1">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {days.map(day => {
          const dayTasks = getTasksForDay(tasks, day);
          const inMonth = isSameMonth(day, date);
          const today = isToday(day);
          const selected = isSameDay(day, date);

          return (
            <div
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className="flex flex-col items-center gap-0.5 cursor-pointer"
            >
              <div className={`
                w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium select-none transition-colors
                ${today && !selected ? "border-2 border-blue-500 text-blue-600" : ""}
                ${selected ? "bg-blue-500 text-white" : ""}
                ${!today && !selected && inMonth ? "text-gray-800 hover:bg-gray-100" : ""}
                ${!inMonth ? "text-gray-300" : ""}
              `}>
                {format(day, "d")}
              </div>
              {/* Event dots */}
              {dayTasks.length > 0 && (
                <div className="flex gap-0.5 flex-wrap justify-center max-w-[36px]">
                  {dayTasks.slice(0, 3).map(t => (
                    <span
                      key={t.id}
                      onClick={e => { e.stopPropagation(); onSelectTask(t); }}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: PRIORITY_COLORS[t.priority] }}
                    />
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[9px] text-gray-400">+{dayTasks.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected day tasks */}
      {getTasksForDay(tasks, date).length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">
            {cap(format(date, "d MMMM", { locale: ru }))}
          </p>
          {getTasksForDay(tasks, date).map(t => (
            <TaskChip key={t.id} task={t} onClick={() => onSelectTask(t)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- WeekView ---------- */

function WeekView({ tasks, date, onSelectTask }: {
  tasks: Task[];
  date: Date;
  onSelectTask: (t: Task) => void;
}) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex flex-col gap-3">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b pb-2">
        {days.map(d => (
          <div key={d.toISOString()} className={`text-center ${isToday(d) ? "text-blue-500 font-semibold" : "text-gray-500"}`}>
            <div className="text-xs">{format(d, "EEE", { locale: ru })}</div>
            <div className={`text-lg font-medium mx-auto w-9 h-9 flex items-center justify-center rounded-full ${isToday(d) ? "bg-blue-500 text-white" : ""}`}>
              {format(d, "d")}
            </div>
          </div>
        ))}
      </div>
      {/* Tasks grouped by day */}
      <div className="grid grid-cols-7 gap-1 min-h-[200px]">
        {days.map(d => {
          const dayTasks = getTasksForDay(tasks, d);
          return (
            <div key={d.toISOString()} className="flex flex-col gap-1">
              {dayTasks.map(t => (
                <button
                  key={t.id}
                  onClick={() => onSelectTask(t)}
                  className="text-left text-[10px] leading-tight rounded-lg p-1 text-white truncate"
                  style={{ backgroundColor: PRIORITY_COLORS[t.priority] }}
                >
                  {t.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- DayView ---------- */

function DayView({ tasks, date, onSelectTask }: {
  tasks: Task[];
  date: Date;
  onSelectTask: (t: Task) => void;
}) {
  const dayTasks = getTasksForDay(tasks, date);
  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex flex-col gap-0">
      {HOURS.map(h => {
        const hourTasks = dayTasks.filter(t => {
          const d = new Date(t.deadline!);
          return getHours(d) === h;
        });
        return (
          <div key={h} className="flex gap-2 min-h-[44px] border-b border-gray-50">
            <div className="w-10 text-[11px] text-gray-300 text-right pt-1 flex-shrink-0">
              {h === 0 ? "" : `${h}:00`}
            </div>
            <div className="flex-1 py-0.5 flex flex-col gap-0.5">
              {hourTasks.map(t => (
                <button
                  key={t.id}
                  onClick={() => onSelectTask(t)}
                  className="text-left text-xs rounded-lg px-2 py-1 text-white"
                  style={{ backgroundColor: PRIORITY_COLORS[t.priority] }}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- TaskChip ---------- */

function TaskChip({ task, onClick }: { task: Task; onClick: () => void }) {
  const STATUS_LABELS: Record<string, string> = {
    todo: "К выполнению", in_progress: "В процессе", done: "Готово"
  };
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
    >
      <span
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${task.status === "done" ? "line-through text-gray-400" : "text-gray-800"}`}>
          {task.title}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{STATUS_LABELS[task.status]}{task.assignee ? ` · ${task.assignee.first_name}` : ""}</p>
      </div>
    </button>
  );
}

/* ---------- Main ---------- */

export default function CalendarView({ tasks, onSelectTask }: Props) {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>("month");

  const VIEWS: { key: View; label: string }[] = [
    { key: "month", label: "Месяц" },
    { key: "week", label: "Неделя" },
    { key: "day", label: "День" },
  ];

  function navigatePrev() {
    if (view === "month") setDate(subMonths(date, 1));
    else if (view === "week") setDate(subWeeks(date, 1));
    else setDate(addDays(date, -1));
  }

  function navigateNext() {
    if (view === "month") setDate(addMonths(date, 1));
    else if (view === "week") setDate(addWeeks(date, 1));
    else setDate(addDays(date, 1));
  }

  function getTitle() {
    if (view === "month") return cap(format(date, "LLLL yyyy", { locale: ru }));
    if (view === "week") {
      const ws = startOfWeek(date, { weekStartsOn: 1 });
      const we = endOfWeek(date, { weekStartsOn: 1 });
      return `${format(ws, "d MMM", { locale: ru })} – ${format(we, "d MMM", { locale: ru })}`;
    }
    return cap(format(date, "d MMMM yyyy", { locale: ru }));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <button
            onClick={navigatePrev}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >
            ‹
          </button>
          <span className="text-base font-semibold text-gray-800">{getTitle()}</span>
          <button
            onClick={navigateNext}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >
            ›
          </button>
        </div>

        {/* View tabs */}
        <div className="flex mx-5 mb-4 bg-gray-100 rounded-2xl p-1 gap-1">
          {VIEWS.map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                view === v.key
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Calendar body */}
        <div className="px-4 pb-5 overflow-y-auto flex-1">
          {view === "month" && (
            <MonthView
              tasks={tasks}
              date={date}
              onSelectDay={setDate}
              onSelectTask={onSelectTask}
            />
          )}
          {view === "week" && (
            <WeekView tasks={tasks} date={date} onSelectTask={onSelectTask} />
          )}
          {view === "day" && (
            <DayView tasks={tasks} date={date} onSelectTask={onSelectTask} />
          )}
        </div>
      </div>
    </div>
  );
}
