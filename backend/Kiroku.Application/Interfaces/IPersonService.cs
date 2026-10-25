using System.Threading.Tasks;

namespace Kiroku.Application.Interfaces
{
    public interface IPersonService
    {
        Task<object?> GetPersonByIdAsync(int id);
        Task<object> GetAllPeopleAsync(int page = 1, int pageSize = 50);
    }
}
