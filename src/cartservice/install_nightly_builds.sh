#!/bin/bash
# This sets up and installs the nightly builds of the dotnet Otel packages.
# --prerelease is necessary for now.  This installs latest version.  To specify
# a version, remove --prerelease and add -v <version>.

dotnet new nugetconfig
dotnet nuget add source https://www.myget.org/F/opentelemetry/api/v3/index.json -n otelnightly

dotnet add package OpenTelemetry -s https://www.myget.org/F/opentelemetry/api/v3/index.json --prerelease
dotnet add package OpenTelemetry.Api -s https://www.myget.org/F/opentelemetry/api/v3/index.json --prerelease
dotnet add package OpenTelemetry.Exporter.OpenTelemetryProtocol -s https://www.myget.org/F/opentelemetry/api/v3/index.json --prerelease
dotnet add package OpenTelemetry.Extensions.Hosting -s https://www.myget.org/F/opentelemetry/api/v3/index.json --prerelease
dotnet add package OpenTelemetry.Instrumentation.AspNetCore -s https://www.myget.org/F/opentelemetry/api/v3/index.json --prerelease
dotnet add package OpenTelemetry.Instrumentation.GrpcNetClient -s https://www.myget.org/F/opentelemetry/api/v3/index.json --prerelease
dotnet add package OpenTelemetry.Instrumentation.Http -s https://www.myget.org/F/opentelemetry/api/v3/index.json --prerelease
dotnet add package OpenTelemetry.Instrumentation.StackExchangeRedis -s https://www.myget.org/F/opentelemetry/api/v3/index.json --prerelease
