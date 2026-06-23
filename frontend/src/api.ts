import { getInitData } from "./telegram";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-init-data": getInitData(),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type Priority = "low" | "medium" | "high";
export type Status = "todo" | "in_progress" | "done";

export interface User {
  telegram_id: number;
  first_name: string;
  username?: string;
}

export interface Comment {
  id: number;
  text: string;
  created_at: string;
  user_id: number;
  task_id: number;
  author: User;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  deadline?: string;
  priority: Priority;
  status: Status;
  created_at: string;
  created_by: number;
  assignee_id?: number;
  creator: User;
  assignee?: User;
  comments: Comment[];
}

export interface AdminStats {
  users: {
    user: User;
    created: number;
    completed: number;
    on_time: number;
    overdue: number;
  }[];
  total_tasks: number;
  completed_tasks: number;
  on_time_rate: number;
}

export const api = {
  syncUser: () => request<User>("/users/me", { method: "POST" }),
  getUsers: () => request<User[]>("/users"),
  getTasks: () => request<Task[]>("/tasks"),
  createTask: (data: Partial<Task>) =>
    request<Task>("/tasks", { method: "POST", body: JSON.stringify(data) }),
  updateTask: (id: number, data: Partial<Task>) =>
    request<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTask: (id: number) =>
    request<{ ok: boolean }>(`/tasks/${id}`, { method: "DELETE" }),
  createComment: (task_id: number, text: string) =>
    request<Comment>("/comments", {
      method: "POST",
      body: JSON.stringify({ task_id, text }),
    }),
  getAdminStats: () => request<AdminStats>("/admin/stats"),
};
