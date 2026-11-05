import type { NotificationOutput } from './notification.output.js';

export interface PaginationOutput {
  total: number;
  count: number;
  per_page: number;
  current_page: number;
  total_pages: number;
}

export interface PaginatedNotificationsOutput {
  items: NotificationOutput[];
  pagination: PaginationOutput;
  unreadCount?: number;
}
