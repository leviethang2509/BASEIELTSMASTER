const FILE_BASE = "/File";
const BUSINESS_BASE = "/business";

const AUTH_BASE = "/auth/auth";
const AUTH_ROLES_BASE = "/auth/roles";
const AUTH_USERS_BASE = "/auth/users";
const AUTH_SYSTEM_BASE = "/auth/System";

export const API_ENDPOINTS = {
  System: {
    User: {
      GET_LIST: `${AUTH_USERS_BASE}/get-list`,
      GET_BY_ID: `${AUTH_USERS_BASE}`,
      INSERT: `${AUTH_USERS_BASE}`,
      UPDATE: `${AUTH_USERS_BASE}`,
      DELETE_LIST: `${AUTH_USERS_BASE}/delete-list`,
      GET_CURRENT_USER: `${AUTH_BASE}/me`,
      GET_ALL_COMBOBOX: `${AUTH_USERS_BASE}/combobox`,
      EDIT_PROFILE: `${AUTH_BASE}/me`,
      CHANGE_PASSWORD: `${AUTH_BASE}/change-password`,
      UPDATE_SYSTEM_ROLE: `${AUTH_USERS_BASE}`,
      ASSIGN_ROLE: `${AUTH_USERS_BASE}`,
    },
    SystemGroup: {
      GET_LIST: `${AUTH_SYSTEM_BASE}/SystemGroup/get-list`,
      GET_BY_ID: `${AUTH_SYSTEM_BASE}/SystemGroup/get-by-id`,
      INSERT: `${AUTH_SYSTEM_BASE}/SystemGroup/insert`,
      UPDATE: `${AUTH_SYSTEM_BASE}/SystemGroup/update`,
      DELETE_LIST: `${AUTH_SYSTEM_BASE}/SystemGroup/delete-list`,
      GET_ALL_COMBOBOX: `${AUTH_SYSTEM_BASE}/SystemGroup/get-all-combobox`,
      GET_ALL_NOT_PARENT_COMBOBOX: `${AUTH_SYSTEM_BASE}/SystemGroup/get-all-not-parent-combobox`,
      GET_ALL: `${AUTH_SYSTEM_BASE}/SystemGroup/get-all`,
    },
    Menu: {
      GET_LIST: `${AUTH_SYSTEM_BASE}/Menu/get-list`,
      GET_BY_ID: `${AUTH_SYSTEM_BASE}/Menu/get-by-id`,
      INSERT: `${AUTH_SYSTEM_BASE}/Menu/insert`,
      UPDATE: `${AUTH_SYSTEM_BASE}/Menu/update`,
      DELETE_LIST: `${AUTH_SYSTEM_BASE}/Menu/delete-list`,
      GET_LIST_BY_USER: `${AUTH_SYSTEM_BASE}/Menu/get-list-by-user`,
    },
    Role: {
      GET_LIST: `${AUTH_ROLES_BASE}`,
      GET_BY_ID: `${AUTH_ROLES_BASE}`,
      GET_MATRIX: `${AUTH_ROLES_BASE}/matrix`,
      GET_PERMISSIONS: `${AUTH_ROLES_BASE}/permissions`,
      INSERT: `${AUTH_ROLES_BASE}`,
      UPDATE: `${AUTH_ROLES_BASE}`,
      DELETE_LIST: `${AUTH_ROLES_BASE}`,
      GET_ALL_COMBOBOX: `${AUTH_ROLES_BASE}`,
      GET_PERMISSIONS_BY_ROLE: `${AUTH_ROLES_BASE}/permissions`,
      UPDATE_PERMISSIONS: `${AUTH_ROLES_BASE}/permissions`,
      GET_PERMISSIONS_BY_USER: `${AUTH_ROLES_BASE}/user-permissions`,
    },
    Auth: {
      LOGIN: `${AUTH_BASE}/login`,
      REGISTER: `${AUTH_BASE}/register`,
      LOGOUT: `${AUTH_BASE}/logout`,
      REFRESH_TOKEN: `${AUTH_BASE}/refresh`,
      SWITCH_TENANT: `${AUTH_BASE}/switch-tenant`,
      ME_CONTEXTS: `${AUTH_BASE}/contexts`,
    },
    AuditLog: {
      GET_LIST: `${AUTH_SYSTEM_BASE}/AuditLog/get-list`,
      GET_BY_ID: `${AUTH_SYSTEM_BASE}/AuditLog/get-by-id`,
      GET_ENTITY_NAMES: `${AUTH_SYSTEM_BASE}/AuditLog/get-entity-names`,
      GET_ACTIONS: `${AUTH_SYSTEM_BASE}/AuditLog/get-actions`,
    },
  },
  DanhMuc: {
    DanToc: {
      GET_LIST: `${BUSINESS_BASE}/dantoc/get-list`,
      GET_BY_ID: `${BUSINESS_BASE}/dantoc/get-by-id`,
      GET_BY_POST: `${BUSINESS_BASE}/dantoc/get-by-post`,
      INSERT: `${BUSINESS_BASE}/dantoc/insert`,
      UPDATE: `${BUSINESS_BASE}/dantoc/update`,
      DELETE: `${BUSINESS_BASE}/dantoc/delete`,
      DELETE_LIST: `${BUSINESS_BASE}/dantoc/delete-list`,
      GET_ALL_COMBOBOX: `${BUSINESS_BASE}/dantoc/get-all-combobox`,
    },
    CaLamViec: {
      GET_ALL_COMBOBOX: `${BUSINESS_BASE}/calamviec/get-all-combobox`,
    },
  },
  File: {
    UploadFile: {
      POST: `${FILE_BASE}/api/UploadFile`,
      GET: `${FILE_BASE}/`,
    },
  },
};
