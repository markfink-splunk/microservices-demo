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

            /* As of v1.0.0-RC1, Zipkin does not look at the env variable, so
            we must do it here.  The OTLP exporter depends on an older version
            of GRPC that is more trouble than it's worth; Zipkin is much easier.
            */
            string endpoint =  Environment.GetEnvironmentVariable("OTEL_EXPORTER_ZIPKIN_ENDPOINT") ?? "http://localhost:9411/api/v2/spans";

            /* This needs to come after InitializeAsync() above so that
            cartStore.Redis is defined, which we need to add Redis
            instrumentation below.  This was tricky because the original code
            defined that property as private in the ICartStore class.  I had to
            modify ICartStore to make it public, so we can access it here. 
            Concerning because this is not even remotely "automatic" as we want
            tracing to be.

            AddEnvironmentVariableDetector reads OTEL_RESOURCE_ATTRIBUTES;
            however, it adds entries as span attributes and not resource
            labels.  The outcome still works with Splunk APM but it's not ideal.
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
                        .AddZipkinExporter(o => o.Endpoint = new Uri(endpoint))
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
                        .AddZipkinExporter(o => o.Endpoint = new Uri(endpoint))
                );
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