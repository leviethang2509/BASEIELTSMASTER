import { durationToSeconds } from './duration';

describe('durationToSeconds', () => {
  it('đổi các đơn vị s/m/h/d sang giây', () => {
    expect(durationToSeconds('45s')).toBe(45);
    expect(durationToSeconds('15m')).toBe(900);
    expect(durationToSeconds('2h')).toBe(7200);
    expect(durationToSeconds('30d')).toBe(2_592_000);
  });

  it('từ chối giá trị sai định dạng hoặc bằng 0', () => {
    expect(() => durationToSeconds('15')).toThrow();
    expect(() => durationToSeconds('0m')).toThrow();
    expect(() => durationToSeconds('1w')).toThrow();
  });
});
