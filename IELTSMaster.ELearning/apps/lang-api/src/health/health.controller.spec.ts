import { ServiceUnavailableException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('trả ok khi database phản hồi', async () => {
    const dataSource = { query: jest.fn().mockResolvedValue([{ one: 1 }]) };
    const controller = new HealthController(
      dataSource as unknown as DataSource,
    );
    await expect(controller.check()).resolves.toMatchObject({
      status: 'ok',
      database: 'up',
    });
  });

  it('trả 503 khi database lỗi', async () => {
    const dataSource = {
      query: jest.fn().mockRejectedValue(new Error('down')),
    };
    const controller = new HealthController(
      dataSource as unknown as DataSource,
    );
    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
