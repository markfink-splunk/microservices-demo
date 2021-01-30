using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using cartservice.cartstore;
using cartservice.services;

using OpenTelemetry;
using OpenTelemetry.Trace;
using OpenTelemetry.Resources;
using OpenTelemetry.Context.Propagation;

namespace cartservice
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }
        
        // This method gets called by the runtime. Use this method to add services to the container.
        // For more information on how to configure your application, visit https://go.microsoft.com/fwlink/?LinkID=398940
        public void ConfigureServices(IServiceCollection services)
        {
            string redisAddress = Configuration["REDIS_ADDR"];
            ICartStore cartStore = null;
            if (!string.IsNullOrEmpty(redisAddress))
            {
                cartStore = new RedisCartStore(redisAddress);
            }
            else
            {
                Console.WriteLine("Redis cache host(hostname+port) was not specified. Starting a cart service using local store");
                Console.WriteLine("If you wanted to use Redis Cache as a backup store, you should provide its address via command line or REDIS_ADDR environment variable.");
                cartStore = new LocalCartStore();
            }

            // Initialize the redis store
            cartStore.InitializeAsync().GetAwaiter().GetResult();

            /* As of this build, the Otlp exporter does not look at the
            ENDPOINT variable, so we must do it here.  Also, the Otlp gRPC
            endpoint must have http:// prepended for insecure transport --
            which is unique to dotnet right now.
            */
            string endpoint =  Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_ENDPOINT") ?? "http://localhost:4317";

            /* Tracer init needs to come after InitializeAsync() above so that
            cartStore.Redis is defined, which we need to add Redis
            instrumentation below.  This was tricky because the original code
            defined that property as private in the ICartStore class.  I had to
            modify ICartStore to make it public, so we can access it here. 
            */
            if (cartStore.Redis != null)
            {
                // With redis
                services.AddOpenTelemetryTracing(
                    (builder) => builder
                        .SetSampler(new AlwaysOnSampler())
                        .SetResourceBuilder(ResourceBuilder.CreateDefault()
                            .AddEnvironmentVariableDetector())
                        .AddAspNetCoreInstrumentation()
                        .AddGrpcClientInstrumentation(
                            opt => opt.SuppressDownstreamInstrumentation = true)
                        .AddHttpClientInstrumentation()
                        .AddRedisInstrumentation(cartStore.Redis)
                        .AddOtlpExporter(o => o.Endpoint = new Uri(endpoint))
                );
            }
            else
            {
                // Without redis
                services.AddOpenTelemetryTracing(
                    (builder) => builder
                        .SetSampler(new AlwaysOnSampler())
                        .SetResourceBuilder(ResourceBuilder.CreateDefault()
                            .AddEnvironmentVariableDetector())
                        .AddAspNetCoreInstrumentation()
                        .AddGrpcClientInstrumentation(
                            opt => opt.SuppressDownstreamInstrumentation = true)
                        .AddHttpClientInstrumentation()
                        .AddOtlpExporter(o => o.Endpoint = new Uri(endpoint))
                );
            }
            // Propagation defaults to W3C+baggage.  It does not look at
            // OTEL_PROPAGATORS, so we do that here for b3.
            string propagator =  Environment.GetEnvironmentVariable("OTEL_PROPAGATORS");
            if (propagator == "b3" || propagator == "b3multi")
            {
                bool singleHeader = false;
                if (propagator == "b3") { singleHeader = true; }

                Sdk.SetDefaultTextMapPropagator(new CompositeTextMapPropagator(new TextMapPropagator[]
                    {
                        new B3Propagator(singleHeader),
                        new BaggagePropagator(),
                    }));
            }

            Console.WriteLine("Initialization completed");

            services.AddSingleton<ICartStore>(cartStore);

            services.AddGrpc();
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            app.UseRouting();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapGrpcService<CartService>();
                endpoints.MapGrpcService<cartservice.services.HealthCheckService>();

                endpoints.MapGet("/", async context =>
                {
                    await context.Response.WriteAsync("Communication with gRPC endpoints must be made through a gRPC client. To learn how to create a client, visit: https://go.microsoft.com/fwlink/?linkid=2086909");
                });
            });
        }
    }
}