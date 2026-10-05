using Npgsql;

namespace IELTSMaster.BusinessService.Infrastructure.Data
{
    public interface IBusinessUnitOfWork
    {
        IBusinessRepository<T> GetRepository<T>() where T : class;
        Task<int> CommitAsync(CancellationToken cancellationToken = default);
    }

    public interface IBusinessRepository<T> where T : class
    {
        IQueryable<T> Query();
        ValueTask<T?> FindAsync(params object[] keyValues);
        Task AddAsync(T entity, CancellationToken cancellationToken = default);
        void Update(T entity);
        IQueryable<T> ExecuteFunction(string functionName, params NpgsqlParameter[] parameters);
    }
}
