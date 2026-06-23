import { useState } from "react";
import { api } from "../api";
import type { Task, User, Priority, Status } from "../api";

interface Props {
  task?: Task | null;
  users: User[];
  onClose: () => void;
  onSaved: () => void;
}

const PRIORITIES: Priority[] = ["low", "medium", "high"];
const PRIORITY_LABELS: Record<Priority, string> = { low: "Низкий", medium: "Средний", high: "Высокий" };
const STATUS_LABELS: Record<Status, string> = { todo: "К выполнению", in_progress: "В процессе", done: "Готово" };

export default function TaskModal({ task, users, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [deadline, setDeadline] = useState(
    task?.deadline ? task.deadline.slice(0, 16) : ""
  );
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [assigneeId, setAssigneeId] = useState<number | "">(task?.assignee_id ?? "");
  const [status, setStatus] = useState<Status>(task?.status ?? "todo");
  const [newComment, setNewComment] = useState("");
  const [saving, setSaving] = useState(false);

  const isEdit = !!task;

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      priority,
      assignee_id: assigneeId || undefined,
      ...(isEdit ? { status } : {}),
    };
    try {
      if (isEdit) {
        await api.updateTask(task.id, payload);
      } else {
        await api.createTask(payload);
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task || !confirm("Удалить задачу?")) return;
    await api.deleteTask(task.id);
    onSaved();
  }

  async function handleAddComment() {
    if (!task || !newComment.trim()) return;
    await api.createComment(task.id, newComment.trim());
    setNewComment("");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">{isEdit ? "Редактировать задачу" : "Новая задача"}</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">&times;</button>
        </div>

        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Название *"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
          placeholder="Описание"
          rows={2}
          value={description}
          onChange={e => setDescription(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Дедлайн</label>
            <input
              type="datetime-local"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={deadline}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
              onChange={e => setDeadline(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Приоритет</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={priority}
              onChange={e => setPriority(e.target.value as Priority)}
            >
              {PRIORITIES.map(p => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Исполнитель</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={assigneeId}
              onChange={e => setAssigneeId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Не назначен</option>
              {users.map(u => (
                <option key={u.telegram_id} value={u.telegram_id}>{u.first_name}</option>
              ))}
            </select>
          </div>
          {isEdit && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Статус</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={status}
                onChange={e => setStatus(e.target.value as Status)}
              >
                {(Object.keys(STATUS_LABELS) as Status[]).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="w-full bg-blue-500 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40"
        >
          {saving ? "Сохранение..." : isEdit ? "Сохранить" : "Создать"}
        </button>

        {isEdit && (
          <button
            onClick={handleDelete}
            className="w-full border border-red-400 text-red-500 rounded-lg py-2 text-sm"
          >
            Удалить задачу
          </button>
        )}

        {isEdit && (
          <div className="pt-2 border-t space-y-2">
            <p className="text-sm font-medium">Комментарии</p>
            {task.comments.map(c => (
              <div key={c.id} className="text-sm bg-gray-50 rounded-lg px-3 py-2">
                <span className="font-medium">{c.author.first_name}: </span>{c.text}
              </div>
            ))}
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                placeholder="Добавить комментарий..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddComment()}
              />
              <button
                onClick={handleAddComment}
                className="bg-blue-500 text-white rounded-lg px-3 py-2 text-sm"
              >
                ОК
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
