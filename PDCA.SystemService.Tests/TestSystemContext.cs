using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using AUN_QA.SystemService.Infrastructure.Data;

namespace AUN_QA.SystemService.Tests;

internal sealed class TestSystemContext : SystemContext, IDbContextFactory<SystemContext>
{
    private readonly string _databaseName;
    private readonly InMemoryDatabaseRoot _databaseRoot;

    public string DatabaseName => _databaseName;
    public InMemoryDatabaseRoot DatabaseRoot => _databaseRoot;

    public TestSystemContext()
        : this(Guid.NewGuid().ToString("N"), new InMemoryDatabaseRoot())
    {
    }

    private TestSystemContext(string databaseName, InMemoryDatabaseRoot databaseRoot)
        : base(new DbContextOptionsBuilder<SystemContext>()
            .UseInMemoryDatabase(databaseName, databaseRoot)
            .Options)
    {
        _databaseName = databaseName;
        _databaseRoot = databaseRoot;
    }

    public SystemContext CreateDbContext()
        => new(new DbContextOptionsBuilder<SystemContext>()
            .UseInMemoryDatabase(_databaseName, _databaseRoot)
            .Options);
}
