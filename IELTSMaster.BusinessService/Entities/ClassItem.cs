namespace IELTSMaster.BusinessService.Entities
{
    public class ClassItem
    {
        public Guid Id { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public Guid LevelId { get; set; }
        public Guid BranchId { get; set; }
        public Guid CskhId { get; set; }
        public DateTime StartDate { get; set; }
        public int TotalSessions { get; set; }
        public string StudyDaysOfWeek { get; set; } = string.Empty;
        public DateTime MidtermDate { get; set; }
        public DateTime EndDate { get; set; }
        public string ClassStatus { get; set; } = string.Empty;

        public Branch? Branch { get; set; }
    }
}
