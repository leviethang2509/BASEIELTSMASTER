using System.Text.RegularExpressions;

namespace IELTSMaster.BusinessService.Infrastructure.Data
{
    public class DatabaseFunctionResolver : IDatabaseFunctionResolver
    {
        private static readonly Regex FunctionNameRegex = new(
            @"^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$",
            RegexOptions.Compiled);

        private readonly IConfiguration _configuration;

        public DatabaseFunctionResolver(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public string GetFunctionName(string module, string key, string fallback)
        {
            var functionName = _configuration[$"DatabaseFunctions:{module}:{key}"] ?? fallback;
            if (!FunctionNameRegex.IsMatch(functionName))
            {
                throw new InvalidOperationException($"Ten function {module}.{key} khong hop le.");
            }

            return functionName;
        }
    }
}
