module github.com/GoogleCloudPlatform/microservices-demo/src/productcatalogservice

go 1.15

require (
	cloud.google.com/go v0.72.0
	contrib.go.opencensus.io/exporter/jaeger v0.2.0
	contrib.go.opencensus.io/exporter/stackdriver v0.5.0
	github.com/golang/protobuf v1.4.3
	github.com/google/go-cmp v0.5.4
	github.com/konsorten/go-windows-terminal-sequences v1.0.2 // indirect
	github.com/sirupsen/logrus v1.4.2
	github.com/uber/jaeger-client-go v2.21.1+incompatible // indirect
	go.opencensus.io v0.22.5
	go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc v0.16.0
	go.opentelemetry.io/contrib/propagators v0.16.0
	go.opentelemetry.io/otel v0.16.0
	go.opentelemetry.io/otel/exporters/otlp v0.16.0
	go.opentelemetry.io/otel/exporters/trace/jaeger v0.16.0
	go.opentelemetry.io/otel/sdk v0.16.0
	golang.org/x/net v0.0.0-20201031054903-ff519b6c9102
	google.golang.org/grpc v1.34.0
)
