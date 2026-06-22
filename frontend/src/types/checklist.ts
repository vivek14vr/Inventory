export type ChecklistTask = {
  id: string;
  title: string;
  sortOrder: number;
  completed?: boolean;
  completedAt?: string;
};

export type Checklist = {
  id: string;
  title: string;
  description?: string;
  assignedUserIds: string[];
  tasks: ChecklistTask[];
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TodayChecklist = Checklist & {
  date: string;
  completedCount: number;
  totalCount: number;
};

export type ChecklistProgressUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  warehouse?: { name: string; code: string };
  tasks: ChecklistTask[];
  completedCount: number;
  totalCount: number;
};

export type ChecklistProgress = {
  checklist: Checklist;
  date: string;
  users: ChecklistProgressUser[];
};
