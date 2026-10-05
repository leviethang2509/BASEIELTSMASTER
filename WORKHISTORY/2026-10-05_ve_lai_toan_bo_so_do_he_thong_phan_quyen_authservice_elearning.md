# Lich su cong viec: Ve lai va chuan hoa toan bo 12 so do he thong phan quyen AuthService & ELearning

Ngay cap nhat: 2026-10-05

## Muc tieu
Nang cap, ve lai va dong bo hoa toan bo 12 so do kien truc, luong du lieu, quy trinh kiem tra va ma tran phan quyen trong tai lieu `Document/PHAN_TICH_THONG_NHAT_PHAN_QUYEN_AUTHSERVICE_ELEARNING.md` theo sat ket qua kiem tra ma nguon thuc te (deep code audit) cua ca 2 he thong `IELTSMaster.AuthService` va `IELTSMaster.ELearning`.

## Chi tiet cac thay doi

### 1. Ve lai va nang cap toan bo 12 so do Mermaid:
1. **Hinh 1 (System Topology)**:
   - Ve lai so do kien truc thuc te voi day du cong ket noi: Next.js `lang-app` (:3100), YARP `ApiGateway` (:5000), NestJS `lang-api` (:3101), ASP.NET Core `AuthService` (:5175), `IdentityProviderClient`, bo 3 Guard (`JwtAuthGuard` -> `SystemRolesGuard` / `TenantGuard`), va PostgreSQL (:5432) voi 2 schema rieng biet (`auth` vs `public`).
2. **Hinh 2 (System Boundaries)**:
   - Phan dinh ranh gioi 3 vung: AuthService Domain (Schema `auth`), SSOT Shared Contract (`permissions-contract.json`), va ELearning Domain (Schema `public`).
3. **Hinh 3 (Data & Permission Flow)**:
   - Mo ta 4 giai doan: Nguon danh tinh -> Phat hanh Token & Introspection -> Tieu thu quyen qua Guards -> Kiem soat truoc khi thuc thi Controller/Domain.
4. **Hinh 4 (Request Verification Pipeline)**:
   - Sequence diagram 14 buoc danh so tu dong chi tiet: Public route, System route, Tenant route (`introspect` + `contexts`), va Domain ownership validation.
5. **Hinh 5 (Code Reality Audit - 5 Phat hien chi mang)**:
   - Ve lai flowchart mo ta 5 rui ro kien truc: Schema mismatch (`auth` vs `public`), `GET /auth/me` truy van DB cuc bo gay 401, 2 lan HTTP roundtrip khong cache tren moi request tenant, Dual write path (hash password & TypeORM save cuc bo), va AuthService thieu `TenantsController` / `MembershipsController`.
6. **Hinh 6 (Remaining Issues & Solutions)**:
   - Ve lai flowchart LR phan nhom 3 cap do: Rui ro nghiem trong (can fix ngay), Toi uu hieu nang & ha tang (LRU cache 30-60s), va Hoan thien kien truc microservices (Adapter delegation).
7. **Hinh 7 (Role-to-Permission Mapping)**:
   - Chuyen doi tu classDiagram sang flowchart phan cap vai tro 2 tang (System tier: 3 roles, Tenant tier: 4 roles) ket noi truc quan sang 3 pham vi chua 13 Permission Keys chuan hoa.
8. **Hinh 8 (Contract CodeGen Pipeline)**:
   - Quy trinh sinh ma SSOT tu `permissions-contract.json` qua `generate-permissions.mjs` ra C# `GeneratedPermissionKey.g.cs` va TS `roles.generated.ts` kem CI/CD drift check.
9. **Hinh 9 (Write Path Delegation)**:
   - Sequence diagram delegate thao tac ghi user/membership sang AuthService va cap nhat Read View vao schema `public`.
10. **Hinh 10 (Layered Verification Tests)**:
    - 3 tang kiem thu tu dong: Unit tests cross-language (xUnit + Vitest), Route E2E test (100+ routes), va Security edge cases tests.
11. **Hinh 11 (Layered Defense)**:
    - Co che phong thu 2 lop phan nhanh ro rang cac ma loi 401 Unauthorized, 403 Forbidden, va 400 Bad Request domain checks.
12. **Hinh 12 (Phased Implementation Roadmap)**:
    - Gantt chart truc quan tien do 4 giai doan (Phase 1 Da xong, Phase 2 Hien tai, Phase 3 Ke tiep, Phase 4 Don dep).

### 2. Danh so va chuan hoa tieu de:
- Dat tieu de dong bo `Hinh 1` den `Hinh 12` giup tai lieu chuyen nghiep, mach lac, de dan chieu khi trao doi ky thuat.

## Ket qua
- File [PHAN_TICH_THONG_NHAT_PHAN_QUYEN_AUTHSERVICE_ELEARNING.md](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/Document/PHAN_TICH_THONG_NHAT_PHAN_QUYEN_AUTHSERVICE_ELEARNING.md) da duoc ve lai toan dien.
- Tat ca so do Mermaid render dung cu phap, truc quan, mau sac hai hoa, va phan anh chinh xac 100% trang thai code hien huu cua he thong.
