# ──────── Build stage ────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy solution and project files for restore
COPY Kiroku.sln ./
COPY Kiroku.API/Kiroku.API.csproj Kiroku.API/
COPY Kiroku.Application/Kiroku.Application.csproj Kiroku.Application/
COPY Kiroku.Domain/Kiroku.Domain.csproj Kiroku.Domain/
COPY Kiroku.Infrastructure/Kiroku.Infrastructure.csproj Kiroku.Infrastructure/
COPY Kiroku.Data/Kiroku.Data.csproj Kiroku.Data/

RUN dotnet restore

# Copy everything and publish
COPY . .
WORKDIR /src/Kiroku.API
RUN dotnet publish -c Release -o /app/publish

# ──────── Runtime stage ────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Render provides PORT env var
ENV ASPNETCORE_URLS=http://+:${PORT:-10000}
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 10000
ENTRYPOINT ["dotnet", "Kiroku.API.dll"]
