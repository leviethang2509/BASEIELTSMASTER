# SSO va gom quyen/phien ve AuthService

Ngay: 2026-10-04

## Muc tieu

AuthService la nguon duy nhat cho dang nhap SSO, phien, user, role he thong, tenant membership va tenant role. Lang-api chi giu nghiep vu hoc tap; cac buoc xac thuc va phan quyen se duoc goi qua AuthService hoac doc tu access token do AuthService phat.

## Da thuc hien trong dot nay

- Lang-api da co cau SSO HTTP sang `IELTSMaster.AuthService` qua `IdentityProviderClient`.
- Cac luong `register`, `login`, `refresh`, `logout`, `change-password` cua lang-api chuyen tiep sang AuthService.
- Bo sung `POST /auth/switch-tenant` trong lang-api de lay access token moi co tenant context tu AuthService khi nguoi dung chuyen workspace.
- Lang-app goi `switch-tenant` truoc khi vao workspace tenant, giup token dong bo voi tenant dang mo.

## Chuc nang quyen va phan quyen trong lang can gom ve AuthService

### Auth va phien

- `apps/lang-api/src/auth/auth.controller.ts`
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `GET /auth/me`
  - `POST /auth/change-password`
  - `POST /auth/switch-tenant`
- `apps/lang-api/src/auth/auth.service.ts`
  - Dang la adapter SSO. Khong nen them logic password/session noi bo moi.
- `apps/lang-api/src/auth/identity-provider.client.ts`
  - Client goi AuthService. Day la lop cau noi can giu den khi frontend goi truc tiep ApiGateway/AuthService.
- `apps/lang-api/src/auth/refresh-token.entity.ts`
  - Legacy. Refresh token chuan nam o `auth.refresh_tokens`; co the xoa khi DB/view dong bo on dinh.
- `apps/lang-api/src/auth/password.ts`
  - Legacy hash password. Nen chuyen hoan toan ve AuthService.

### Guard, decorator, route-level authorization

- `apps/lang-api/src/auth/guards/jwt-auth.guard.ts`
  - Dang verify JWT va doc `public.users`. Giai doan sau nen doc claim/introspect tu AuthService, khong phu thuoc user table cuc bo.
- `apps/lang-api/src/auth/guards/system-roles.guard.ts`
  - Kiem tra `@SystemRoles`. Nen chuyen role policy ve AuthService hoac shared policy do AuthService so huu.
- `apps/lang-api/src/tenants/tenant.guard.ts`
  - Dang tu kiem tra tenant, membership, tenant status, tenant role. Day la phan lon nhat can rut ve AuthService.
- `apps/lang-api/src/auth/decorators.ts`
  - `@Public`, `@AllowPendingPasswordChange`, `@SystemRoles`.
- `apps/lang-api/src/tenants/tenant-context.ts`
  - `@TenantRoles`, `TenantContext`. Sau nay lay tu token/introspect thay vi query membership local.
- `apps/lang-api/src/access-control.e2e.spec.ts`
  - Bang route permission cua lang. Nen chuyen thanh contract/policy test chung voi AuthService.

### User va system role

- `apps/lang-api/src/users/user.entity.ts`
  - Nen thanh read model/view tu `auth.users`, khong la bang user chinh.
- `apps/lang-api/src/users/users.service.ts`
  - Ho so ca nhan co the con o lang neu la profile hoc tap; system role/status/tokenVersion phai do AuthService so huu.
- `apps/lang-api/src/users/me.controller.ts`
  - `PATCH /me/profile` co the goi AuthService neu cap nhat profile chung.
- `apps/lang-api/src/admin/users/*`
  - List user, tao user, lock/unlock, reset password, doi system role. Tat ca thuoc AuthService.

### Tenant va membership

- `apps/lang-api/src/tenants/*`
  - Tao tenant, sua tenant, danh sach tenant cua user, public tenant lookup.
  - Phan phe duyet/suspend/plan cua admin nen thuoc AuthService neu tenant la don vi phan quyen chung.
- `apps/lang-api/src/memberships/*`
  - Them thanh vien, tao account, cap nhat role, xoa membership, guardian links, `GET /me/contexts`.
  - Membership va role la data phan quyen chung, nen chuyen ve AuthService.
- `apps/lang-api/src/plans/*`
  - Service plan anh huong quota membership; nen dong bo voi AuthService neu AuthService quan ly tenant/membership.

### Frontend lien quan SSO

- `apps/lang-app/src/components/auth/AuthProvider.tsx`
  - Giu access token trong memory, refresh qua cookie, tai contexts.
  - Da bo sung `switchTenant(tenantSlug)`.
- `apps/lang-app/src/components/dashboard/WorkspaceSwitcher.tsx`
  - Goi `activate` truoc khi navigate tenant workspace.
- `apps/lang-app/src/middleware.ts`
  - Chi doc cookie refresh de chan route som; cookie do AuthService/lang-api set.
- `apps/lang-app/src/lib/api.ts`
  - Gan Bearer token va refresh khi 401.

### Shared types/constants

- `packages/shared/src/auth.ts`
  - `AuthUser`, `AuthResponse`, cookie name.
- `packages/shared/src/roles.ts`
  - System role, tenant role, role groups.
- `packages/shared/src/status.ts`
  - User/tenant/membership status.
- `packages/shared/src/tenant.ts`
  - `MeContexts`, `MeTenantContext`, membership DTO.

## Noi can nam o AuthService

- `IELTSMaster.AuthService/Controllers/AuthController.cs`
  - SSO: login, register, refresh, logout, change password, switch tenant, introspect.
- `IELTSMaster.AuthService/Controllers/UsersController.cs`
  - Quan ly user, khoa/mo khoa, reset password, system role, assign tenant role.
- `IELTSMaster.AuthService/Controllers/RolesController.cs`
  - Role list, permission matrix, user permissions.
- Can bo sung tiep:
  - Tenant management API chuan cho approve/reject/suspend/plan.
  - Membership management API chuan cho add/update/delete roles.
  - Policy/introspection endpoint tra du `user + systemRole + activeTenant + membershipId + roles + permissions`.

## Huong migration tiep theo

1. Giữ lang-api ở vai trò adapter: frontend vẫn gọi `/auth/*` của lang, lang chuyển tiếp sang AuthService.
2. Dong bo DB: `public.users`, `memberships`, `membership_roles`, `tenants` cua lang chi con la view/read model tu schema `auth`.
3. Doi `JwtAuthGuard` va `TenantGuard` sang doc AuthService token/introspection thay vi query bang cuc bo.
4. Chuyen admin users, tenants, memberships, roles sang AuthService endpoint.
5. Xoa `password.ts`, `refresh-token.entity.ts`, logic hash/refresh noi bo va route permission matrix cuc bo khi AuthService policy da day du.

