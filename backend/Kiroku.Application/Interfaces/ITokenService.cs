using Kiroku.Domain.Entities;

namespace Kiroku.Application.Interfaces
{
    public interface ITokenService
    {
        string GenerateToken(User user);
    }
}
