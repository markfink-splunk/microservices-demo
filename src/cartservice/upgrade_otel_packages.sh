#!/bin/bash
# This upgrades Otel packages by first uninstalling them, which is needed
# because of interdependencies and because dotnet does not otherwise provide a
# way to do this.  Add "nightly" as an argument to install the latest nightly
# build from myget; otherwise it installs the lastest nuget release.

dotnet remove package OpenTelemetry
dotnet remove package OpenTelemetry.Api
dotnet remove package OpenTelemetry.Exporter.OpenTelemetryProtocol
dotnet remove package OpenTelemetry.Extensions.Hosting
dotnet remove package OpenTelemetry.Instrumentation.AspNetCore
dotnet remove package OpenTelemetry.Instrumentation.GrpcNetClient
dotnet remove package OpenTelemetry.Instrumentation.Http
dotnet remove package OpenTelemetry.Instrumentation.StackExchangeRedis

if [ "$1" = "nightly" ]; then
    dotnet add package OpenTelemetry -s https://www.myget.org/F/opentelemetry/api/v3/index.json --prerelease
    dotnet add package OpenTelemetry.Api -s https://www.myget.org/F/opentelemetry/api/v3/index.json --prerelease
    dotnet add package OpenTelemetry.Exporter.OpenTelemetryProtocol -s https://www.myget.org/F/opentelemetry/api/v3/index.json --prerelease
    dotnet add package OpenTelemetry.Extensions.Hosting -s https://www.myget.org/F/opentelemetry/api/v3/index.json --prerelease
    dotnet add package OpenTelemetry.Instrumentation.AspNetCore -s https://www.myget.org/F/opentelemetry/api/v3/index.json --prerelease
    dotnet add package OpenTelemetry.Instrumentation.GrpcNetClient -s https://www.myget.org/F/opentelemetry/api/v3/index.json --prerelease
    dotnet add package OpenTelemetry.Instrumentation.Http -s https://www.myget.org/F/opentelemetry/api/v3/index.json --prerelease
    dotnet add package OpenTelemetry.Instrumentation.StackExchangeRedis -s https://www.myget.org/F/opentelemetry/api/v3/index.json --prerelease
else
    dotnet add package OpenTelemetry --prerelease
    dotnet add package OpenTelemetry.Api --prerelease
    dotnet add package OpenTelemetry.Exporter.OpenTelemetryProtocol --prerelease
    dotnet add package OpenTelemetry.Extensions.Hosting --prerelease
    dotnet add package OpenTelemetry.Instrumentation.AspNetCore --prerelease
    dotnet add package OpenTelemetry.Instrumentation.GrpcNetClient --prerelease
    dotnet add package OpenTelemetry.Instrumentation.Http --prerelease
    dotnet add package OpenTelemetry.Instrumentation.StackExchangeRedis --prerelease
fi
