import {
  ArgumentsHost,
  BadRequestException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function mockHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'GET', originalUrl: '/api/test' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('giữ status và message của HttpException', () => {
    const { host, status, json } = mockHost();
    filter.catch(new NotFoundException('Không tìm thấy'), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      statusCode: 404,
      message: 'Không tìm thấy',
    });
  });

  it('giữ danh sách lỗi validation', () => {
    const { host, json } = mockHost();
    filter.catch(new BadRequestException(['email must be an email']), host);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      message: ['email must be an email'],
    });
  });

  it('giữ danh sách lỗi nội dung đề (422)', () => {
    const { host, json } = mockHost();
    const issues = [{ sectionIndex: 0, message: 'Chưa chọn dạng câu hỏi.' }];
    filter.catch(
      new UnprocessableEntityException({ message: 'Đề còn lỗi', issues }),
      host,
    );
    expect(json).toHaveBeenCalledWith({
      statusCode: 422,
      message: 'Đề còn lỗi',
      issues,
    });
  });

  it('file vượt giới hạn của multer: message tiếng Việt', () => {
    const { host, json } = mockHost();
    filter.catch(new PayloadTooLargeException('File too large'), host);
    expect(json).toHaveBeenCalledWith({
      statusCode: 413,
      message: 'File vượt quá dung lượng cho phép',
    });
  });

  it('không lộ chi tiết lỗi không mong đợi', () => {
    const logSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { host, status, json } = mockHost();
    filter.catch(new Error('password=secret'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
    });
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
