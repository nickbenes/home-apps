import { parsePackCount } from './walmart';

describe('parsePackCount', () => {
  test('parses count from the size field', () => {
    expect(parsePackCount('4 Count', "Thomas' High Protein Plain Bagels")).toBe(4);
  });

  test('parses pack size from the name when size field is empty', () => {
    expect(parsePackCount('', 'Sub Sandwich Rolls, 8-Pack')).toBe(8);
  });

  test('parses "ct" and "pk" abbreviations', () => {
    expect(parsePackCount('12 ct', 'Eggs')).toBe(12);
    expect(parsePackCount('6 pk', 'Soda Cans')).toBe(6);
  });

  test('defaults to 1 when no pack count is present', () => {
    expect(parsePackCount('12 oz', 'Peanut Butter')).toBe(1);
    expect(parsePackCount('', '')).toBe(1);
  });

  test('prefers the size field over the name', () => {
    expect(parsePackCount('1 Count', 'Variety 6-Pack Sampler')).toBe(1);
  });
});
