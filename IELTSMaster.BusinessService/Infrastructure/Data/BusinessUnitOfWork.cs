using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace IELTSMaster.BusinessService.Infrastructure.Data
{
    public class BusinessUnitOfWork : IBusinessUnitOfWork
    {
        private readonly BusinessDbContext _db;
        private readonly ConcurrentDictionary<Type, object> _repositories = new();

        public BusinessUnitOfWork(BusinessDbContext db)
        {
            _db = db;
        }

        public IBusinessRepository<T> GetRepository<T>() where T : class
        {
            return (IBusinessRepository<T>)_repositories.GetOrAdd(
                typeof(T),
                _ => new BusinessRepository<T>(_db));
        }

        public Task<int> CommitAsync(CancellationToken cancellationToken = default)
        {
            return _db.SaveChangesAsync(cancellationToken);
        }
    }

    public class BusinessRepository<T> : IBusinessRepository<T> where T : class
    {
        private static readonly Regex FunctionNameRegex = new(
            @"^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$",
            RegexOptions.Compiled);

        private readonly BusinessDbContext _db;

        public BusinessRepository(BusinessDbContext db)
        {
            _db = db;
        }

        public IQueryable<T> Query()
        {
            return _db.Set<T>();
        }

        public ValueTask<T?> FindAsync(params object[] keyValues)
        {
            return _db.Set<T>().FindAsync(keyValues);
        }

        public Task AddAsync(T entity, CancellationToken cancellationToken = default)
        {
            return _db.Set<T>().AddAsync(entity, cancellationToken).AsTask();
        }

        public void Update(T entity)
        {
            _db.Set<T>().Update(entity);
        }

        public IQueryable<T> ExecuteFunction(string functionName, params NpgsqlParameter[] parameters)
        {
            if (!FunctionNameRegex.IsMatch(functionName))
            {
                throw new InvalidOperationException($"Ten function khong hop le: {functionName}");
            }

            var parameterPlaceholders = parameters?.Length > 0
                ? string.Join(", ", parameters.Select(p => $"@{p.ParameterName}"))
                : string.Empty;

            var sql = $"SELECT * FROM {functionName}({parameterPlaceholders})";

#pragma warning disable EF1002
            return _db.Set<T>().FromSqlRaw(sql, parameters ?? Array.Empty<NpgsqlParameter>());
#pragma warning restore EF1002
        }
    }
}
