# Lich su cong viec - SSO AuthService cho lang

Thoi gian: 2026-10-04

## Noi dung cong viec

- Liet ke cac chuc nang trong lang-api/lang-app lien quan xac thuc, phien, quyen va phan quyen can gom ve AuthService.
- Bo sung luong SSO `switch-tenant` de lang lay access token moi tu AuthService khi nguoi dung chuyen tenant workspace.
- Ghi tai lieu migration de sau nay lang bo dan cac buoc phan quyen cuc bo va dung chung AuthService voi IELTSMASTER/eLearning.

## File da thay doi

- `IELTSMaster.ELearning/apps/lang-api/src/auth/dto/auth.dto.ts`
- `IELTSMaster.ELearning/apps/lang-api/src/auth/identity-provider.client.ts`
- `IELTSMaster.ELearning/apps/lang-api/src/auth/auth.service.ts`
- `IELTSMaster.ELearning/apps/lang-api/src/auth/auth.controller.ts`
- `IELTSMaster.ELearning/apps/lang-api/src/auth/auth.service.spec.ts`
- `IELTSMaster.ELearning/apps/lang-api/src/access-control.e2e.spec.ts`
- `IELTSMaster.ELearning/apps/lang-app/src/components/auth/AuthProvider.tsx`
- `IELTSMaster.ELearning/apps/lang-app/src/components/dashboard/WorkspaceSwitcher.tsx`
- `Document/SSO_AUTH_MIGRATION.md`
- `WORKHISTORY/2026-10-04_sso-authservice-lang.md`

## Ly do thay doi

- AuthService da co endpoint `switch-tenant`, nhung lang-api chua co endpoint adapter tuong ung.
- Neu khong lay token theo tenant context, cac buoc sau se kho bo `TenantGuard`/membership query cuc bo trong lang.
- Can co danh sach ro cac module quyen/phien dang nam trong lang de di chuyen ve AuthService dung huong.

## Cach xu ly

- Them `SwitchTenantDto` o lang-api.
- Them `IdentityProviderClient.switchTenant()` goi `POST /api/auth/switch-tenant` cua AuthService voi Bearer token hien tai.
- Them `AuthService.switchTenant()` va `POST /auth/switch-tenant` trong lang-api, set lai refresh cookie/access token nhu cac luong SSO khac.
- Them `switchTenant()` trong `AuthProvider`.
- Them hook `activate` cho workspace tenant de goi switch tenant truoc khi navigate.
- Cap nhat test unit auth va route matrix e2e.
- Them tai lieu `Document/SSO_AUTH_MIGRATION.md`.

## Ket qua

- Lang-api co du cau SSO cho dang nhap, dang ky, refresh, logout, doi mat khau va chuyen tenant.
- Frontend co buoc doi tenant context truoc khi vao dashboard tenant.
- Co tai lieu danh sach chuc nang can chuyen ve AuthService va lo trinh go bo phan quyen cuc bo trong lang.

## Kiem tra

- `pnpm --filter lang-api test auth.service.spec.ts`: pass, 9/9 tests.
- `pnpm --filter lang-api typecheck`: pass.
- `pnpm --filter lang-api test access-control.e2e.spec.ts`: pass, 22/22 tests.
- `pnpm --filter lang-app typecheck`: chua chay duoc do `apps/lang-app/node_modules` dang la junction sang `C:\A_TRUNGTAMTIENGANH\SOURCE_CODE\lang-simulator\apps\lang-app\node_modules`, lam script tim sai `typescript/bin/tsc`. Can sua lai node_modules workspace truoc khi typecheck frontend.

## Luu y

- Chua xoa `TenantGuard`, `SystemRolesGuard`, bang user/membership local vi nhieu service nghiep vu hien van phu thuoc `TenantContext`.
- Buoc tiep theo nen chuyen guard sang token claim/introspection tu AuthService sau khi AuthService co API tenant/membership/policy day du.
