using AUN_QA.SystemService.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System.Data;

namespace AUN_QA.SystemService.Helpers
{
    public static class DBContextHelper
    {
        public static async Task<TModel> ExecuteStoredProcedure<TModel>(
            this SystemContext context,
            string procedureName,
            SqlParameter[]? parameters = null) where TModel : new()
        {
            if (context.Database.GetDbConnection().State != ConnectionState.Open)
            {
                await context.Database.OpenConnectionAsync();
            }

            await using var dbCommand = context.Database.GetDbConnection().CreateCommand();
            dbCommand.CommandTimeout = 180;
            dbCommand.CommandType = CommandType.StoredProcedure;
            dbCommand.CommandText = procedureName;

            if (parameters != null)
            {
                foreach (var parameter in parameters)
                {
                    parameter.Value ??= DBNull.Value;
                    dbCommand.Parameters.Add(parameter);
                }
            }

            var result = await dbCommand.ExecuteScalarAsync();

            if (result == null || result == DBNull.Value)
            {
                return new TModel();
            }

            var json = result.ToString()!;
            try
            {
                var settings = new JsonSerializerSettings
                {
                    ContractResolver = new DefaultContractResolver
                    {
                        NamingStrategy = new SnakeCaseNamingStrategy()
                    }
                };

                return JsonConvert.DeserializeObject<TModel>(json, settings) ?? new TModel();
            }
            catch (Exception ex)
            {
                throw new Exception($"Error parsing JSON from SQL Server stored procedure '{procedureName}': {ex.Message}\nData: {json}");
            }
        }
    }
}
