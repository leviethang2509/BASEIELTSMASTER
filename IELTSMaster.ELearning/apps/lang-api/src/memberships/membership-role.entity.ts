import { TenantRole } from '@lang/shared';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { sqlInList } from '../common/sql';
import { Membership } from './membership.entity';

@Entity('membership_roles')
// Mỗi tenant đúng một Tenant Owner. `tenant_id` chép từ membership, FK kép giữ khớp.
@Index('UQ_membership_roles_tenant_owner', ['tenantId'], {
  unique: true,
  where: `"role" = '${TenantRole.TENANT_OWNER}'`,
})
@Check('CHK_membership_roles_role', sqlInList('role', TenantRole))
export class MembershipRole {
  @PrimaryColumn({
    name: 'membership_id',
    type: 'uuid',
    primaryKeyConstraintName: 'PK_membership_roles',
  })
  membershipId: string;

  @PrimaryColumn({
    type: 'varchar',
    length: 32,
    primaryKeyConstraintName: 'PK_membership_roles',
  })
  role: TenantRole;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Membership, { onDelete: 'CASCADE' })
  @JoinColumn([
    {
      name: 'membership_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_membership_roles_membership',
    },
    { name: 'tenant_id', referencedColumnName: 'tenantId' },
  ])
  membership?: Membership;
}
