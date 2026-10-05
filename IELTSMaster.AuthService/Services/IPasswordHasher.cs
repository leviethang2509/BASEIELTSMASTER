namespace IELTSMaster.AuthService.Services
{
    public interface IPasswordHasher
    {
        string HashPassword(string plainPassword);
        bool VerifyPassword(string plainPassword, string passwordHash);
        string GetDummyHash();
    }

    public class BcryptPasswordHasher : IPasswordHasher
    {
        private const int WorkFactor = 12;
        private static readonly Lazy<string> DummyHash = new Lazy<string>(() =>
            BCrypt.Net.BCrypt.HashPassword("dummy-password-for-timing-mitigation", WorkFactor));

        public string HashPassword(string plainPassword)
        {
            return BCrypt.Net.BCrypt.HashPassword(plainPassword, WorkFactor);
        }

        public bool VerifyPassword(string plainPassword, string passwordHash)
        {
            try
            {
                return BCrypt.Net.BCrypt.Verify(plainPassword, passwordHash);
            }
            catch
            {
                return false;
            }
        }

        public string GetDummyHash()
        {
            return DummyHash.Value;
        }
    }
}
