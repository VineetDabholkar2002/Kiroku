using System.Threading.Tasks;

namespace Kiroku.Application.Interfaces
{
    public interface ICharacterService
    {
        Task<object?> GetCharacterByIdAsync(int id);
        Task<object> GetAllCharactersAsync(int page, int pageSize);
    }
}
