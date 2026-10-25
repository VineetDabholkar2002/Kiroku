# ──────── Build stage ────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy solution and project files for layer caching
COPY Kiroku.sln ./
COPY Kiroku.API/Kiroku.API.csproj Kiroku.API/
COPY Kiroku.Application/Kiroku.Application.csproj Kiroku.Application/
COPY Kiroku.Domain/Kiroku.Domain.csproj Kiroku.Domain/
COPY Kiroku.Infrastructure/Kiroku.Infrastructure.csproj Kiroku.Infrastructure/
COPY Kiroku.Data/Kiroku.Data.csproj Kiroku.Data/
COPY Kiroku.SeederRunner/Kiroku.SeederRunner.csproj Kiroku.SeederRunner/

RUN dotnet restore

# Copy all source files and publish
COPY . .
WORKDIR /src/Kiroku.API
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# ──────── Runtime stage ────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:5180
ENV ASPNETCORE_ENVIRONMENT=Development
ENV DOTNET_RUNNING_IN_CONTAINER=true

EXPOSE 5180
ENTRYPOINT ["dotnet", "Kiroku.API.dll"]
