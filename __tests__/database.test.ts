import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const select = vi.fn();
  const eq = vi.fn();
  const single = vi.fn();
  
  const from = vi.fn(() => ({
    select,
    eq,
    single,
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  }));

  return {
    select,
    eq,
    single,
    from,
    supabase: {
      from,
    }
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mocks.supabase),
}));

import { databaseService } from '../services/database';

describe('databaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReturnThis();
    mocks.eq.mockReturnThis();
  });

  describe('getUserByEmail', () => {
    it('returns user data when found', async () => {
      const mockUser = { id: '1', email: 'test@example.com', nama_lengkap: 'Test User' };
      
      mocks.single.mockResolvedValue({ data: mockUser, error: null });

      const result = await databaseService.getUserByEmail('test@example.com');
      
      expect(result).toEqual(mockUser);
      expect(mocks.from).toHaveBeenCalledWith('pengguna');
      expect(mocks.eq).toHaveBeenCalledWith('email', 'test@example.com');
    });

    it('returns undefined when error occurs', async () => {
      mocks.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      const result = await databaseService.getUserByEmail('test@example.com');
      expect(result).toBeUndefined();
    });
  });
});
