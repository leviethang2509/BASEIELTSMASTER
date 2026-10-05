namespace IELTSMaster.BusinessService.Infrastructure.Data
{
    public interface IDatabaseFunctionResolver
    {
        string GetFunctionName(string module, string key, string fallback);
    }
}
