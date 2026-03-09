using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System.IO;

namespace Kiroku.Data.Contexts
{
    public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
    {
        public AppDbContext CreateDbContext(string[] args)
        {
            // Build configuration to get connection string
            var config = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory()) // Set the base path to the current directory
                .AddJsonFile("appsettings.json") // Load appsettings.json
                .Build();

            // Read the connection string
            var connectionString = config.GetConnectionString("DefaultConnection");

            // Configure DbContextOptions
            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            optionsBuilder.UseNpgsql(connectionString);

            return new AppDbContext(optionsBuilder.Options);
        }
    }
}
