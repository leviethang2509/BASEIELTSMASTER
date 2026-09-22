var builder = DistributedApplication.CreateBuilder(args);

var fileService = builder.AddProject<Projects.PDCA_FileService>("FileService");

var systemService = builder
    .AddProject<Projects.PDCA_SystemService>("SystemService")
    .WithReference(fileService);

fileService.WithReference(systemService);

var gateway = builder.AddProject<Projects.PDCA_ApiGateway>("ApiGateway")
    .WithReference(systemService)
    .WithReference(fileService);

builder.AddNpmApp("Web", "../PDCA.Web", "dev")
    .WithReference(gateway)
    .WithHttpEndpoint(env: "VITE_DEV_PORT", port: 5173)
    .WithExternalHttpEndpoints();


builder.Build().Run();
