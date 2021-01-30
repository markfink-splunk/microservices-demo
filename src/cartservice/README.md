## OpenTelemetry Notes

There is intent to create a more automated dotnet tracer based on DataDog's tracer here:  https://github.com/open-telemetry/opentelemetry-dotnet-instrumentation.  As of this writing, it appears little has been done on it.

The SignalFx dotnet tracer is based on the same upstream DataDog tracer and, as a general rule, I recommend using it as a first resort for the time being:  https://github.com/signalfx/signalfx-dotnet-tracing

For Hipster Shop, I used the OpenTelemetry .NET SDK here:  https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/src/OpenTelemetry/README.md.  The SDK is very serviceable; it is just not as automated as anyone would like.  It is on par with Go; that is, you must make substantial changes to code and recompile, even for the auto-instrumentation.

The dotnet Otel packages are available on nuget with nightly builds on MyGet.  As of this writing, the nuget packages were just updated to 1.1.0-alpha1.5; however it has been about 2.5 months since the last update and I was testing on a nightly build from MyGet.  If that pattern continues, you should learn how to use the nightly builds.  I created scripts for it in the repo to help.

Instrumenting this and probably any .NET app consists of these steps generally:
- Create a dotnet build environment with your favorite IDE.  I use VS Code.  More on this below.
- With VS Code and the C# extension, it will auto-run "dotnet restore" for you to get dependencies.  Otherwise, you may need to run "dotnet restore" yourself in the project directory.
- Install the Otel dependencies using "dotnet add".  I added install_nightly_builds.sh to install the latest nightly Otel packages that cartservice needs.  I also added upgrade_otel_packages.sh for subsequent upgrades.  I am keeping the upgrade process separate from the Dockerfile for now because upgrades often break things and require code changes.
- Add libraries and instrumentation to the source.  For cartservice, I modified Startup.cs and included comments.
- Debug as necessary in the IDE to ensure everything works as desired.
- Rebuild the Docker image.  I made a slight adjustment to the upstream Dockerfile to accommodate using nightly Otel builds.

For dotnet projects, you generally need the .NET SDK and dotnet cli installed, and an IDE that can debug C# or whatever language you're using.  While it is possible to install these on a Mac, I ran into other issues as I got further along that led me to use a devcontainer in VS Code:  https://code.visualstudio.com/docs/remote/containers.  For this project, you can use Dockerfile.debug to create a devcontainer.  This truly is the best way on a Mac.  If you are on Windows, you don't have to use a devcontainer (although you still could).  And with anything Microsoft, you are likely better off with VS or VS Code.  With VS Code, install the C# extension and you can then debug cartservice.  The C# extension will check for the .NET SDK and dotnet cli, and prompt you to install them.  If you are unfamiliar with building dotnet projects, you will need to put the time in to learn it, and cartservice is as good an example to start with as any.  As always, Google is your friend.
