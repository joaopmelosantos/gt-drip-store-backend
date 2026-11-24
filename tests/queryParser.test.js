const {
  parsePaginationAndFields,
  parsePositiveIntId,
  pickFields,
} = require('../src/utils/queryParser');
const AppError = require('../src/utils/AppError');

describe('queryParser', () => {
  describe('parsePaginationAndFields', () => {
    it('deve usar valores padrão limit=12, page=1 e fields=null', () => {
      expect(parsePaginationAndFields({}, ['id', 'name'])).toEqual({
        limit: 12,
        page: 1,
        fields: null,
      });
    });

    it('deve aceitar limit=-1 e ignorar page na validação', () => {
      expect(parsePaginationAndFields({ limit: '-1', page: '0' }, ['id', 'name'])).toEqual({
        limit: -1,
        page: 1,
        fields: null,
      });
    });

    it('deve fazer parsing de fields válidos', () => {
      expect(
        parsePaginationAndFields({ limit: '5', page: '2', fields: 'name, slug' }, ['id', 'name', 'slug'])
      ).toEqual({
        limit: 5,
        page: 2,
        fields: ['name', 'slug'],
      });
    });

    it('deve lançar AppError 400 para campo inválido em fields', () => {
      expect(() =>
        parsePaginationAndFields({ fields: 'name,secret' }, ['id', 'name'])
      ).toThrow(AppError);
    });

    it('deve lançar AppError 400 para limit inválido', () => {
      expect(() => parsePaginationAndFields({ limit: '0' }, ['id'])).toThrow(AppError);
      expect(() => parsePaginationAndFields({ limit: 'abc' }, ['id'])).toThrow(AppError);
    });
  });

  describe('parsePositiveIntId', () => {
    it('deve retornar inteiro positivo válido', () => {
      expect(parsePositiveIntId('42')).toBe(42);
    });

    it('deve lançar AppError 400 para ID inválido', () => {
      expect(() => parsePositiveIntId('0')).toThrow(AppError);
      expect(() => parsePositiveIntId('-3')).toThrow(AppError);
      expect(() => parsePositiveIntId('abc')).toThrow(AppError);
    });
  });

  describe('pickFields', () => {
    it('deve retornar objeto completo se fields for null', () => {
      const obj = { id: 1, name: 'Shoes' };
      expect(pickFields(obj, null)).toEqual(obj);
    });

    it('deve filtrar apenas os campos solicitados', () => {
      const obj = { id: 1, name: 'Shoes', slug: 'shoes' };
      expect(pickFields(obj, ['name', 'slug'])).toEqual({ name: 'Shoes', slug: 'shoes' });
    });
  });
});
