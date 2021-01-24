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

import grpc

import demo_pb2
import demo_pb2_grpc

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchExportSpanProcessor
from opentelemetry.exporter.otlp.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.grpc import GrpcInstrumentorClient

from logger import getJSONLogger
logger = getJSONLogger('emailservice-client')

def send_confirmation_email(email, order):
  # This shows how to implement Otel tracing in-code without the runtime
  # wrapper.  This is the bare minimum needed, and all major options can be
  # configured via env variables (thank you authors!).
  if "DISABLE_TRACING" in os.environ:
    logger.info("Tracing disabled.")
  else:
    logger.info("Tracing enabled.")
    # Sampling defaults to "parentbased_always_on", which means it respects
    # the parent's sampling decision but otherwise always samples.
    trace.set_tracer_provider(TracerProvider(
      active_span_processor = BatchExportSpanProcessor(OTLPSpanExporter())
    ))

    # Uncomment for manual instrumentation
    # tracer = trace.get_tracer("__name__")

    # Instrumentation libraries must be implemented individually, like this:
    GrpcInstrumentorClient().instrument()

  channel = grpc.insecure_channel('0.0.0.0:8080')
  stub = demo_pb2_grpc.EmailServiceStub(channel)
  try:
    response = stub.SendOrderConfirmation(demo_pb2.SendOrderConfirmationRequest(
      email = email,
      order = order
    ))
    logger.info('Request sent.')
  except grpc.RpcError as err:
    logger.error(err.details())
    logger.error('{}, {}'.format(err.code().name, err.code().value))

if __name__ == '__main__':
  logger.info('Client for email service.')
