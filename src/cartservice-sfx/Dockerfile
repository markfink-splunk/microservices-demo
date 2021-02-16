# Copyright 2020 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# https://mcr.microsoft.com/v2/dotnet/sdk/tags/list
FROM mcr.microsoft.com/dotnet/sdk:5.0-focal as builder
WORKDIR /app
COPY cartservice.csproj .
COPY . .
RUN dotnet restore cartservice.csproj -r linux-musl-x64

# RUN dotnet publish cartservice.csproj -p:PublishSingleFile=true -r linux-musl-x64 -p:PublishTrimmed=True -p:TrimMode=Link -c release -o /cartservice --no-restore

RUN dotnet publish cartservice.csproj -p:PublishSingleFile=true -r linux-musl-x64 -c release -o /cartservice --no-restore

# https://mcr.microsoft.com/v2/dotnet/runtime-deps/tags/list
FROM mcr.microsoft.com/dotnet/runtime-deps:5.0.1-alpine3.12-amd64
RUN GRPC_HEALTH_PROBE_VERSION=v0.3.5 && \
    wget -qO/bin/grpc_health_probe https://github.com/grpc-ecosystem/grpc-health-probe/releases/download/${GRPC_HEALTH_PROBE_VERSION}/grpc_health_probe-linux-amd64 && \
    chmod +x /bin/grpc_health_probe

ADD https://github.com/signalfx/signalfx-dotnet-tracing/releases/download/v0.1.8/signalfx-dotnet-tracing-0.1.8-musl.tar.gz .
RUN tar -xf signalfx-dotnet-tracing-0.1.8-musl.tar.gz -C /
RUN mkdir -p /var/log/signalfx/dotnet && \
    chmod a+rwx /var/log/signalfx/dotnet

ENV CORECLR_ENABLE_PROFILING=1 \
    CORECLR_PROFILER='{B4C89B0F-9908-4F73-9F59-0D77C5A06874}' \
    CORECLR_PROFILER_PATH=/opt/signalfx-dotnet-tracing/SignalFx.Tracing.ClrProfiler.Native.so \
    SIGNALFX_INTEGRATIONS=/opt/signalfx-dotnet-tracing/integrations.json \
    SIGNALFX_DOTNET_TRACER_HOME=/opt/signalfx-dotnet-tracing \
    ASPNETCORE_URLS=http://*:7070

WORKDIR /app
COPY --from=builder /cartservice .
ENTRYPOINT ["/app/cartservice"]
