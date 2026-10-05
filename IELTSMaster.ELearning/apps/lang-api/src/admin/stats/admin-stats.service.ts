import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantStatus, UserStatus, type AdminStats } from '@lang/shared';
import { MoreThanOrEqual, type Repository } from 'typeorm';
import { Tenant } from '../../tenants/tenant.entity';
import { User } from '../../users/user.entity';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AdminStatsService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
  ) {}

  async get(): Promise<AdminStats> {
    const since = new Date(Date.now() - WEEK_MS);
    const [total, newLast7Days, locked, statusRows] = await Promise.all([
      this.users.count(),
      this.users.countBy({ createdAt: MoreThanOrEqual(since) }),
      this.users.countBy({ status: UserStatus.LOCKED }),
      this.tenants
        .createQueryBuilder('t')
        .select('t.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('t.status')
        .getRawMany<{ status: TenantStatus; count: string }>(),
    ]);

    const byStatus = Object.fromEntries(
      Object.values(TenantStatus).map((status) => [status, 0]),
    ) as Record<TenantStatus, number>;
    for (const row of statusRows) byStatus[row.status] = Number(row.count);

    return {
      users: { total, newLast7Days, locked },
      tenants: {
        total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
        byStatus,
      },
    };
  }
}
