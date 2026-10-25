using System;
using System.IO;
using Newtonsoft.Json.Linq;

namespace Kiroku.Data.Seeders
{
    public static class PathResolver
    {
        private static string? _cachedRoot;

        public static string FindWorkspaceRoot()
        {
            if (_cachedRoot != null) return _cachedRoot;

            var dir = new DirectoryInfo(AppContext.BaseDirectory);
            string? slnDir = null;

            while (dir != null)
            {
                // True repository workspace root contains both "data" and ("backend" or "frontend")
                if (Directory.Exists(Path.Combine(dir.FullName, "data")) &&
                    (Directory.Exists(Path.Combine(dir.FullName, "backend")) || Directory.Exists(Path.Combine(dir.FullName, "frontend"))))
                {
                    _cachedRoot = dir.FullName;
                    return _cachedRoot;
                }

                if (slnDir == null && File.Exists(Path.Combine(dir.FullName, "Kiroku.sln")))
                {
                    slnDir = dir.FullName;
                }

                dir = dir.Parent;
            }

            // If we found Kiroku.sln, check if its parent has 'data'
            if (slnDir != null)
            {
                var parent = Directory.GetParent(slnDir);
                if (parent != null && Directory.Exists(Path.Combine(parent.FullName, "data")))
                {
                    _cachedRoot = parent.FullName;
                    return _cachedRoot;
                }
                _cachedRoot = slnDir;
                return _cachedRoot;
            }

            // Fallback to current working directory
            _cachedRoot = Directory.GetCurrentDirectory();
            return _cachedRoot;
        }

        public static string ResolveDataPath(string fileName)
        {
            var root = FindWorkspaceRoot();

            // 1. Check in root/data
            var inData = Path.Combine(root, "data", fileName);
            if (File.Exists(inData) || Directory.Exists(inData))
                return inData;

            // 2. Check in root/backend/Kiroku.Data/Seeders
            var inBackend = Path.Combine(root, "backend", "Kiroku.Data", "Seeders", fileName);
            if (File.Exists(inBackend) || Directory.Exists(inBackend))
                return inBackend;

            // 3. Check directly relative to root
            var inRoot = Path.Combine(root, fileName);
            if (File.Exists(inRoot) || Directory.Exists(inRoot))
                return inRoot;

            // 4. Check relative to app execution base
            var inBase = Path.Combine(AppContext.BaseDirectory, fileName);
            if (File.Exists(inBase) || Directory.Exists(inBase))
                return inBase;

            return inData; // Default to expected data path
        }

        public static string ResolveConnectionString()
        {
            // 1. Environment variable override (Docker / Production / CI)
            var envConn = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
                       ?? Environment.GetEnvironmentVariable("DATABASE_URL")
                       ?? Environment.GetEnvironmentVariable("KIROKU_DB_CONNECTION");

            if (!string.IsNullOrWhiteSpace(envConn))
                return envConn;

            // 2. Read from Kiroku.API appsettings
            var root = FindWorkspaceRoot();
            var appsettingsCandidates = new[]
            {
                Path.Combine(root, "backend", "Kiroku.API", "appsettings.Development.json"),
                Path.Combine(root, "backend", "Kiroku.API", "appsettings.json"),
                Path.Combine(AppContext.BaseDirectory, "appsettings.json")
            };

            foreach (var path in appsettingsCandidates)
            {
                if (File.Exists(path))
                {
                    try
                    {
                        var json = File.ReadAllText(path);
                        var jObj = JObject.Parse(json);
                        var connStr = jObj["ConnectionStrings"]?["DefaultConnection"]?.ToString();
                        if (!string.IsNullOrWhiteSpace(connStr))
                            return connStr;
                    }
                    catch
                    {
                        // Ignore and try next candidate
                    }
                }
            }

            // 3. Standard local development fallback
            return "Host=localhost;Port=5432;Database=kiroku;Username=postgres;Password=Pass@1234";
        }
    }
}
