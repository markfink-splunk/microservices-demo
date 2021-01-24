#!/usr/bin/python
#
# Copyright 2018 Google LLC
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

import os
import sys
import grpc
import demo_pb2
import demo_pb2_grpc

from logger import getJSONLogger
logger = getJSONLogger('recommendationservice-server')

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchExportSpanProcessor
from opentelemetry.exporter.otlp.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.grpc import GrpcInstrumentorClient


if __name__ == "__main__":
    # get port
    if len(sys.argv) > 1:
        port = sys.argv[1]
    else:
        port = "8080"

    # This shows how to implement Otel tracing in-code without the runtime
    # wrapper.  This is the bare minimum needed, and all major options can be
    # configured via env variables (thank you!).

    # Sampling defaults to "parentbased_always_on", which means it respects
    # the parent's sampling decision but otherwise always samples.
    trace.set_tracer_provider(TracerProvider(
      active_span_processor = BatchExportSpanProcessor(OTLPSpanExporter())
    ))

    # Uncomment for manual instrumentation
    # tracer = trace.get_tracer("__name__")

    # Instrumentation libraries must be implemented individually, like this:
    GrpcInstrumentorClient().instrument()

    # set up server stub
    channel = grpc.insecure_channel('localhost:'+port)
    stub = demo_pb2_grpc.RecommendationServiceStub(channel)
    # form request
    request = demo_pb2.ListRecommendationsRequest(user_id="test", product_ids=["test"])
    # make call to server
    response = stub.ListRecommendations(request)
    logger.info(response)
