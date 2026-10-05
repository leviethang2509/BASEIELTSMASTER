var builder = DistributedApplication.CreateBuilder(args);

var authService = builder.AddProject<Projects.IELTSMaster_AuthService>("AuthService", launchProfileName: "https");

var businessService = builder.AddProject<Projects.IELTSMaster_BusinessService>("BusinessService", launchProfileName: "https");

var fileService = builder.AddProject<Projects.IELTSMaster_FileService>("FileService", launchProfileName: "https");

var elearning = builder.AddNpmApp("ELearning", "../IELTSMaster.ELearning/apps/lang-api", "dev")
    .WithHttpEndpoint(port: 3101, env: "PORT")
    // SSO: lang-api chuyển tiếp đăng nhập/làm mới phiên sang AuthService
    .WithEnvironment("AUTH_SERVICE_URL", authService.GetEndpoint("http"));

var elearningWeb = builder.AddNpmApp("ELearning-Web", "../IELTSMaster.ELearning/apps/lang-app", "dev")
    .WithHttpEndpoint(port: 3100, env: "PORT")
    .WithExternalHttpEndpoints()
    .WithReference(elearning);

var gateway = builder.AddProject<Projects.IELTSMaster_ApiGateway>("ApiGateway", launchProfileName: "https")
    .WithReference(authService)
    .WithReference(businessService)
    .WithReference(fileService)
    .WithReference(elearning);

builder.AddNpmApp("Web", "../IELTSMaster.BusinessService/ClientApp", "dev")
    .WithReference(gateway)
    .WithHttpEndpoint(env: "VITE_DEV_PORT", port: 5173)
    .WithExternalHttpEndpoints();

builder.Build().Run();
