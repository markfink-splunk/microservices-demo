// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"fmt"
	"net"
	"os"
	"time"

	"cloud.google.com/go/profiler"
	"github.com/sirupsen/logrus"
	"golang.org/x/net/context"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp"
	"go.opentelemetry.io/otel/exporters/otlp/otlpgrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/contrib/propagators/b3"
	"go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"

	pb "github.com/GoogleCloudPlatform/microservices-demo/src/shippingservice/genproto"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
)

const (
	defaultPort = "50051"
)

var log *logrus.Logger

func init() {
	log = logrus.New()
	log.Level = logrus.DebugLevel
	log.Formatter = &logrus.JSONFormatter{
		FieldMap: logrus.FieldMap{
			logrus.FieldKeyTime:  "timestamp",
			logrus.FieldKeyLevel: "severity",
			logrus.FieldKeyMsg:   "message",
		},
		TimestampFormat: time.RFC3339Nano,
	}
	log.Out = os.Stdout
}

func initTracer(log logrus.FieldLogger) func() {
	// As of 0.16.0, NewDriver does not look at the ENDPOINT variable, so we do
	// it here.
	endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if endpoint == "" { endpoint = "localhost:4317" }

	driver := otlpgrpc.NewDriver(
		otlpgrpc.WithInsecure(),
		otlpgrpc.WithEndpoint(endpoint),
		//otlpgrpc.WithDialOption(grpc.WithBlock()), // useful for testing
	)
	ctx := context.Background()
	exporter, err := otlp.NewExporter(ctx, driver)
	if err != nil {
		log.Fatalf("%s: %v", "failed to create exporter", err)
	}

	// This provides standard TelemetrySDK tags and OTEL_RESOURCE_ATTRIBUTES.
	res, err := resource.New(ctx)

	bsp := trace.NewBatchSpanProcessor(exporter)
	tracerProvider := trace.NewTracerProvider(
		trace.WithConfig(trace.Config{DefaultSampler: trace.AlwaysSample()}),
		trace.WithResource(res),
		trace.WithSpanProcessor(bsp),
	)
	otel.SetTracerProvider(tracerProvider)
	setOtelPropagation()

	// OTLP METRICS
	// pusher := push.New(
	// 	basic.New(
	// 		simple.NewWithExactDistribution(),
	// 		exp,
	// 	),
	// 	exp,
	// 	push.WithPeriod(2*time.Second),
	// )
	//otel.SetMeterProvider(pusher.MeterProvider())
	//pusher.Start()

	return func() {
		err := tracerProvider.Shutdown(ctx)
		if err != nil {
			log.Fatalf("%s: %v", "failed to shutdown provider", err)
		}
		err = exporter.Shutdown(ctx)
		if err != nil {
			log.Fatalf("%s: %v", "failed to stop exporter", err)
		}
		//pusher.Stop() // pushes any last exports to the receiver
	}
}

func setOtelPropagation() {
	/* As of 0.16.0, propagation with any exporter in Go is disabled by default
	and does not look at OTEL_PROPAGATORS.  W3C, B3, and Jaeger are supported. 
	The following looks for B3 and otherwise defaults to W3C.  Baggage is
	enabled either way.  I use OTEL_PROPAGATORS to be consistent with what I
	expect in the future.
	*/
	switch os.Getenv("OTEL_PROPAGATORS") {
	case "b3":
		otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
			b3.B3{InjectEncoding: b3.B3SingleHeader}, propagation.Baggage{}))
	case "b3multi":
		otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
			b3.B3{InjectEncoding: b3.B3MultipleHeader}, propagation.Baggage{}))
	default:
		otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
			propagation.TraceContext{}, propagation.Baggage{}))
	}
}

func main() {
	if os.Getenv("DISABLE_TRACING") == "" {
		log.Info("Tracing enabled.")
		fn := initTracer(log)
		defer fn()
	} else {
		log.Info("Tracing disabled.")
	}

	if os.Getenv("DISABLE_PROFILER") == "" {
		log.Info("Profiling enabled.")
		go initProfiling("shippingservice", "1.0.0")
	} else {
		log.Info("Profiling disabled.")
	}

	port := defaultPort
	if value, ok := os.LookupEnv("PORT"); ok {
		port = value
	}
	port = fmt.Sprintf(":%s", port)

	lis, err := net.Listen("tcp", port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	var srv = grpc.NewServer(
		grpc.UnaryInterceptor(otelgrpc.UnaryServerInterceptor()),
		grpc.StreamInterceptor(otelgrpc.StreamServerInterceptor()),
	)
	//var srv *grpc.Server
	svc := &server{}
	pb.RegisterShippingServiceServer(srv, svc)
	healthpb.RegisterHealthServer(srv, svc)
	log.Infof("Shipping Service listening on port %s", port)

	// Register reflection service on gRPC server.
	reflection.Register(srv)
	if err := srv.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}

// server controls RPC service responses.
type server struct{}

// Check is for health checking.
func (s *server) Check(ctx context.Context, req *healthpb.HealthCheckRequest) (*healthpb.HealthCheckResponse, error) {
	return &healthpb.HealthCheckResponse{Status: healthpb.HealthCheckResponse_SERVING}, nil
}

func (s *server) Watch(req *healthpb.HealthCheckRequest, ws healthpb.Health_WatchServer) error {
	return status.Errorf(codes.Unimplemented, "health check via Watch not implemented")
}

// GetQuote produces a shipping quote (cost) in USD.
func (s *server) GetQuote(ctx context.Context, in *pb.GetQuoteRequest) (*pb.GetQuoteResponse, error) {
	log.Info("[GetQuote] received request")
	defer log.Info("[GetQuote] completed request")

	// 1. Our quote system requires the total number of items to be shipped.
	count := 0
	for _, item := range in.Items {
		count += int(item.Quantity)
	}

	// 2. Generate a quote based on the total number of items to be shipped.
	quote := CreateQuoteFromCount(count)

	// 3. Generate a response.
	return &pb.GetQuoteResponse{
		CostUsd: &pb.Money{
			CurrencyCode: "USD",
			Units:        int64(quote.Dollars),
			Nanos:        int32(quote.Cents * 10000000)},
	}, nil

}

// ShipOrder mocks that the requested items will be shipped.
// It supplies a tracking ID for notional lookup of shipment delivery status.
func (s *server) ShipOrder(ctx context.Context, in *pb.ShipOrderRequest) (*pb.ShipOrderResponse, error) {
	log.Info("[ShipOrder] received request")
	defer log.Info("[ShipOrder] completed request")
	// 1. Create a Tracking ID
	baseAddress := fmt.Sprintf("%s, %s, %s", in.Address.StreetAddress, in.Address.City, in.Address.State)
	id := CreateTrackingId(baseAddress)

	// 2. Generate a response.
	return &pb.ShipOrderResponse{
		TrackingId: id,
	}, nil
}

func initProfiling(service, version string) {
	// TODO(ahmetb) this method is duplicated in other microservices using Go
	// since they are not sharing packages.
	for i := 1; i <= 3; i++ {
		if err := profiler.Start(profiler.Config{
			Service:        service,
			ServiceVersion: version,
			// ProjectID must be set if not running on GCP.
			// ProjectID: "my-project",
		}); err != nil {
			log.Warnf("failed to start profiler: %+v", err)
		} else {
			log.Info("started Stackdriver profiler")
			return
		}
		d := time.Second * 10 * time.Duration(i)
		log.Infof("sleeping %v to retry initializing Stackdriver profiler", d)
		time.Sleep(d)
	}
	log.Warn("could not initialize Stackdriver profiler after retrying, giving up")
}
