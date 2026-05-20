const USER_ROLES = Object.freeze({
  ADMIN: 'admin',
  MANAGER: 'manager',
  WAITER: 'waiter',
});

const USER_STATUSES = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  DISABLED: 'disabled',
});

const LEGACY_DEFAULT_ROLE = USER_ROLES.MANAGER;
const LEGACY_DEFAULT_STATUS = USER_STATUSES.ACTIVE;

const ROLE_PERMISSIONS = Object.freeze({
  [USER_ROLES.ADMIN]: [
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'users:invite',
    'inventory:read',
    'inventory:write',
    'history:read',
    'reports:read',
  ],
  [USER_ROLES.MANAGER]: [
    'inventory:read',
    'inventory:write',
    'history:read',
    'reports:read',
  ],
  [USER_ROLES.WAITER]: [
    'inventory:read',
    'history:read',
  ],
});

const normalizeUserRole = (role) => {
  if (Object.values(USER_ROLES).includes(role)) {
    return role;
  }

  return LEGACY_DEFAULT_ROLE;
};

const normalizeUserStatus = (status) => {
  if (Object.values(USER_STATUSES).includes(status)) {
    return status;
  }

  return LEGACY_DEFAULT_STATUS;
};

const getRolePermissions = (role) => ROLE_PERMISSIONS[normalizeUserRole(role)] || [];

module.exports = {
  USER_ROLES,
  USER_STATUSES,
  LEGACY_DEFAULT_ROLE,
  LEGACY_DEFAULT_STATUS,
  ROLE_PERMISSIONS,
  normalizeUserRole,
  normalizeUserStatus,
  getRolePermissions,
};
