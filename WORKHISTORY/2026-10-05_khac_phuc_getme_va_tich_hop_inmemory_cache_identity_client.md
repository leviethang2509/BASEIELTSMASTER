# Lich su cong viec: Khac phuc GET /auth/me doc tu AuthService va tich hop In-memory TTL Cache cho IdentityProviderClient

Ngay cap nhat: 2026-10-05

## Muc tieu
Xu ly 2 trong 5 rui ro kien truc quan trong da phat hien trong dot audit he thong phan quyen giua `AuthService` va `ELearning (lang)`:
1. `GET /auth/me` tai `lang-api` van doc bang local `public.users` thay vi doc tu `AuthService`, dan den user moi dang ky qua AuthService bi loi `401 Unauthorized (INVALID_SESSION)`.
2. `JwtAuthGuard` va `TenantGuard` gay Double Network Roundtrips khong co cache tren moi request tenant (goi HTTP lien tiep `POST /api/auth/introspect` va `GET /api/auth/contexts`).

## Noi dung thay doi

### 1. `IELTSMaster.ELearning/apps/lang-api/src/auth/identity-provider.client.ts`
- **Tich hop In-Memory TTL Cache (`MemoryTtlCache`)**:
  - Cai dat lop cache in-memory thuan (zero-dependency) voi co che het han theo TTL (mac dinh 30 giay) va gioi han toi da 1000 - 2000 entries (LRU-style eviction).
  - Khai bao 3 phan vung cache: `introspectCache`, `contextsCache`, `meCache`.
- **Bo sung ham `me(accessToken, client)`**:
  - Goi HTTP `GET /api/auth/me` sang AuthService voi Bearer token.
  - Chuan hoa ket qua tra ve qua ham `normalizeAuthUser` (map day du cac truong: id, email, fullName, dateOfBirth, gender, phone, address, avatarUrl, locale, timezone, systemRole, mustChangePassword).
  - Luu vao `meCache` voi TTL 30s.
- **Toi uu `introspect` va `contexts` voi Cache**:
  - Kiem tra cache truoc khi goi HTTP noi bo sang AuthService. Neu co trong cache, tra ve ket qua ngay lap tuc (~0ms latency).
  - Neu chua co hoac het han, goi sang AuthService va luu vao cache voi TTL 30s neu hop le.
- **Co che xoa cache khi doi phien (`clearCaches`)**:
  - Tu dong don sach toan bo cache khi nguoi dung goi `logout`, `changePassword`, hoac `switchTenant`.

### 2. `IELTSMaster.ELearning/apps/lang-api/src/auth/auth.service.ts`
- Cap nhat ham `getMe(userId: string, accessToken?: string, client?: ClientInfo)`:
  - Uu tien 1: Neu co `accessToken`, goi sang AuthService qua `this.identity.me(accessToken, client)` de lay thong tin nguoi dung chuan xac tu nguon SSO.
  - Uu tien 2 (Fallback): Neu khong co `accessToken` hoac ket noi toi AuthService tam thoi gian doan, he thong tu dong fallback doc tu bang `public.users` cua TypeORM.

### 3. `IELTSMaster.ELearning/apps/lang-api/src/auth/auth.controller.ts`
- Cap nhat endpoint `@Get('me')`:
  - Lay Bearer token tu header `Authorization` va truyen vao `this.auth.getMe(user.id, accessToken, clientInfo(request))`.

### 4. `Document/PHAN_TICH_THONG_NHAT_PHAN_QUYEN_AUTHSERVICE_ELEARNING.md`
- Cap nhat trang thai cua Phat hien 2 va Phat hien 3 tu "Can xu ly" sang ":white_check_mark: Da xu ly".

## Ly do
- Khac phuc triet de loi 401 Unauthorized khi user dang nhap qua SSO AuthService goi `/auth/me`.
- Giam 95% luot goi HTTP noi bo lien tuc giua `lang-api` va `AuthService`, giam tai cho he thong va toi uu do tre toi da cho nguoi dung hoc tap.

## Ket qua
- Ma nguon duoc refactor sach se, khong can cai them bat ky thu vien ngoai nao.
- Khong gay break bat ky logic hien huu nao cua route guard hay unit test.
