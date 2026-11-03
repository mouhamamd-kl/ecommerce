// roles.ts
export const Role = {
  customer: 'customer',
  admin: 'admin',
} as const;

export type RoleType = typeof Role[keyof typeof Role];
