import type {
  DataSource,
  EntityManager,
  EntityTarget,
  ObjectLiteral,
} from 'typeorm';
import type { InMemoryRepository } from './in-memory-repository';

/**
 * DataSource giả cho unit test: `transaction` chạy callback ngay với
 * EntityManager trỏ vào các repository trong bộ nhớ. **Không rollback** khi
 * callback lỗi, nên test chỉ kiểm lỗi xảy ra trước khi ghi.
 */
export class InMemoryDataSource {
  private readonly repositories = new Map<
    EntityTarget<ObjectLiteral>,
    InMemoryRepository<object>
  >();

  register<T extends object>(
    entity: EntityTarget<T>,
    repository: InMemoryRepository<T>,
  ): this {
    this.repositories.set(
      entity,
      repository as unknown as InMemoryRepository<object>,
    );
    return this;
  }

  asDataSource(): DataSource {
    const manager = {
      getRepository: (entity: EntityTarget<ObjectLiteral>) => {
        const repository = this.repositories.get(entity);
        if (!repository) {
          const name = (entity as { name?: string }).name ?? String(entity);
          throw new Error(`Chưa đăng ký repository giả cho ${name}`);
        }
        return repository.asRepository();
      },
    } as unknown as EntityManager;
    return {
      manager,
      transaction: (run: (manager: EntityManager) => Promise<unknown>) =>
        run(manager),
    } as unknown as DataSource;
  }
}
