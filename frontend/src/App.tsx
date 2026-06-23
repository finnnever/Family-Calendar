import { useEffect, useState } from "react";
import { initTelegram, getTelegramUser } from "./telegram";
import { api } from "./api";
import type { Task, User } from "./api";
import CalendarView from "./components/CalendarView";
import TaskModal from "./components/TaskModal";
import AdminStats from "./components/AdminStats";

const ADMIN_TG_ID = Number(import.meta.env.VITE_ADMIN_TELEGRAM_ID ?? "0");

type Tab = "calendar" | "list" | "admin";

const STATUS_LABELS: Record<string, string> = {
  todo: "К выполнению",
  in_progress: "В процессе",
  done: "Готово",
};

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-400",
  low: "bg-green-500",
};

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tab, setTab] = useState<Tab>("calendar");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [loading, setLoading] = useState(true);

  const tgUser = getTelegramUser();
  const isAdmin = tgUser?.id === ADMIN_TG_ID;

  useEffect(() => {
    initTelegram();
    loadData();
  }, []);

  async function loadData() {
    try {
      await api.syncUser();
      const [t, u] = await Promise.all([api.getTasks(), api.getUsers()]);
      setTasks(t);
      setUsers(u);
    } catch {
      // silently ignore auth errors in dev without initData
    } finally {
      setLoading(false);
    }
  }

  function handleModalClose() {
    setSelectedTask(null);
    setShowNewTask(false);
  }

  function handleSaved() {
    handleModalClose();
    loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white" style={{ minHeight: "100dvh" }}>
      {/* Header */}
      <div className="relative overflow-hidden" style={{ height: 160 }}>
        <img
          src="/family.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center 20%" }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.5) 100%)" }} />
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-4 pb-4">
          <h1
            className="font-semibold tracking-tight"
            style={{ color: "#ffffff", fontSize: 26, textShadow: "0 2px 8px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.9)" }}
          >
            Семейный календарь
          </h1>
          <button
            onClick={() => setShowNewTask(true)}
            className="bg-white/20 backdrop-blur-sm text-white font-bold rounded-xl border border-white/30 flex items-center justify-center"
            style={{ width: 40, height: 40, fontSize: 24 }}
          >
            +
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b text-sm">
        {(["calendar", "list"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 font-medium ${tab === t ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-400"}`}
          >
            {t === "calendar" ? "Календарь" : "Список"}
          </button>
        ))}
        {isAdmin && (
          <button
            onClick={() => setTab("admin")}
            className={`flex-1 py-2 font-medium ${tab === "admin" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-400"}`}
          >
            Статистика
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tab === "calendar" && (
          <div className="p-2">
            <CalendarView tasks={tasks} onSelectTask={setSelectedTask} />
          </div>
        )}

        {tab === "list" && (
          <div className="divide-y">
            {tasks.length === 0 && (
              <p className="text-center text-gray-400 py-12">Задач пока нет</p>
            )}
            {tasks.map(task => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="flex items-start gap-3 px-4 py-3 cursor-pointer active:bg-gray-50"
              >
                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority]}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${task.status === "done" ? "line-through text-gray-400" : ""}`}>
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {STATUS_LABELS[task.status]}
                    {task.deadline && ` · ${new Date(task.deadline).toLocaleDateString("ru-RU")}`}
                    {task.assignee && ` · ${task.assignee.first_name}`}
                  </p>
                </div>
                {task.comments.length > 0 && (
                  <span className="text-xs text-gray-400 mt-0.5">💬 {task.comments.length}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "admin" && isAdmin && <AdminStats />}
      </div>

      {/* Modals */}
      {(selectedTask || showNewTask) && (
        <TaskModal
          task={selectedTask}
          users={users}
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
