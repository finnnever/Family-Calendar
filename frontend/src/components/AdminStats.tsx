import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../api";
import type { AdminStats as AdminStatsType } from "../api";

export default function AdminStats() {
  const [stats, setStats] = useState<AdminStatsType | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getAdminStats()
      .then(setStats)
      .catch(() => setError("Нет доступа или ошибка загрузки"));
  }, []);

  if (error) return <p className="text-center text-red-500 mt-8">{error}</p>;
  if (!stats) return <p className="text-center text-gray-400 mt-8">Загрузка...</p>;

  const chartData = stats.users.map(u => ({
    name: u.user.first_name,
    Создано: u.created,
    Выполнено: u.completed,
    Просрочено: u.overdue,
  }));

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.total_tasks}</p>
          <p className="text-xs text-gray-500 mt-1">Всего задач</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.completed_tasks}</p>
          <p className="text-xs text-gray-500 mt-1">Выполнено</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.on_time_rate}%</p>
          <p className="text-xs text-gray-500 mt-1">В срок</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold mb-3">Активность участников</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barSize={16}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="Создано" fill="#60a5fa" />
            <Bar dataKey="Выполнено" fill="#34d399" />
            <Bar dataKey="Просрочено" fill="#f87171" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-sm font-semibold mb-2">Детали по участникам</p>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs">
              <th className="text-left px-3 py-2">Участник</th>
              <th className="text-center px-2 py-2">Создано</th>
              <th className="text-center px-2 py-2">Выполнено</th>
              <th className="text-center px-2 py-2">Просрочено</th>
            </tr>
          </thead>
          <tbody>
            {stats.users.map(u => (
              <tr key={u.user.telegram_id} className="border-t">
                <td className="px-3 py-2">{u.user.first_name}</td>
                <td className="text-center px-2 py-2">{u.created}</td>
                <td className="text-center px-2 py-2 text-green-600">{u.completed}</td>
                <td className="text-center px-2 py-2 text-red-500">{u.overdue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
