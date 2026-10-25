using System.Collections.Generic;
using System.Threading.Tasks;
using Kiroku.Domain.Entities;

namespace Kiroku.Application.Interfaces
{
    public interface IMangaService
    {
        Task<Manga?> GetMangaByIdAsync(int id);
        Task<List<Manga>> GetAllMangasAsync();
    }
}
