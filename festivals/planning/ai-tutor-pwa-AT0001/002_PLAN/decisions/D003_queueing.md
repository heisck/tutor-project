# D003: Queueing

## Decision
Use BullMQ on Redis for asynchronous document processing and other retryable background jobs.

## Why
The product requires asynchronous upload processing, retries, and observable job state. BullMQ provides a mature queue model that fits the Redis dependency already selected in the overview.

## Benefits
- Clear separation between request-path work and background processing
- Retries with exponential backoff
- Support for dead-letter handling and observability
- Good fit for document processing, indexing, reminders, and notifications

## Tradeoffs
- Requires reliable Redis connectivity and worker orchestration
- Job payload design must avoid leaking sensitive data

## Result
Foundation work must enqueue processing jobs without doing parsing inline, and later ingestion work must execute inside BullMQ-driven workers.
