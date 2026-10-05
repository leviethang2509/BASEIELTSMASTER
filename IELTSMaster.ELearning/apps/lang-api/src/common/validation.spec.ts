import 'reflect-metadata';
import { Type, plainToInstance } from 'class-transformer';
import { IsInt, IsString, ValidateNested, validate } from 'class-validator';
import { validationMessages } from './validation';

class Child {
  @IsInt({ message: 'Thời lượng không hợp lệ' })
  minutes: number;
}

class Parent {
  @IsString({ message: 'Tên không hợp lệ' })
  name: string;

  @ValidateNested({ each: true })
  @Type(() => Child)
  children: Child[];
}

describe('validationMessages', () => {
  it('gom lỗi lồng nhau, không có tiền tố đường dẫn, bỏ trùng', async () => {
    const errors = await validate(
      plainToInstance(Parent, {
        name: 1,
        children: [{ minutes: 'a' }, { minutes: 'b' }],
      }),
    );
    expect(validationMessages(errors)).toEqual([
      'Tên không hợp lệ',
      'Thời lượng không hợp lệ',
    ]);
  });
});
