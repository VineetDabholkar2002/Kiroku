using System.Collections.Generic;
using System.Threading.Tasks;
using Kiroku.Application.Interfaces;
using Kiroku.Data.Contexts;
using Kiroku.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Kiroku.Infrastructure.Services
{
    public class MangaService : IMangaService
    {
        private readonly AppDbContext _context;

        public MangaService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Manga?> GetMangaByIdAsync(int id)
        {
            return await _context.Mangas.FindAsync(id);
        }

        public async Task<List<Manga>> GetAllMangasAsync()
        {
            return await _context.Mangas.AsNoTracking().ToListAsync();
        }
    }
}
