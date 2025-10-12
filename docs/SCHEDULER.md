# Scheduler Architecture

The project currently uses an in-memory scheduler (SchedulerService) that keeps timers in a process-local Map and schedules one-off jobs via setTimeout.

## Current Behavior and Limitations

- Volatile storage: All scheduled jobs are lost on process crash, container restart, or deployment.
- No deduplication across replicas: If multiple bot instances are running, each instance may schedule and execute the same job independently.
- No persistence: Jobs cannot be listed, cancelled, or recovered after restarts.
- Clock drift sensitivity: Long-running timers may drift if the event loop is blocked.
- Single-process only: Scaling horizontally is unsafe without a distributed lock.

This is sufficient for best-effort notifications and ephemeral reminders, but is not reliable for critical workflows.

## Recommended Durable Options

Choose one of these approaches depending on operational complexity and reliability requirements:

1. PostgreSQL + Polling Worker (Low complexity)

- Persist jobs in a scheduled_job table with fields: id, job_key, run_at, payload jsonb, status, attempts, last_error.
- A single worker process polls due jobs every N seconds using FOR UPDATE SKIP LOCKED.
- Advantages: Simple; uses existing Postgres; supports retries and visibility.
- Disadvantages: Polling granularity; some latency.

2. BullMQ/Redis (Medium complexity)

- Use Redis-backed queues with delayed jobs.
- Pros: Delayed jobs, retries, backoff, observability, distributed locks.
- Cons: Adds Redis dependency.

3. Cloud-native schedulers (Higher complexity)

- Examples: Cloud Tasks/Queues, Temporal, Quartz-like.
- Pros: High reliability, rich workflows and retries.
- Cons: New infra/service to provision and operate.

## Minimal Migration Plan (Postgres-based)

- Create table:

create table scheduled_job (
id serial primary key,
job_key text not null,
run_at timestamptz not null,
payload jsonb,
status text not null default 'pending',
attempts int not null default 0,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
);
create index on scheduled_job (run_at);
create index on scheduled_job (job_key);

- Worker loop:
  - Select due jobs: select \* from scheduled_job where status='pending' and run_at <= now() for update skip locked limit 50.
  - Mark to processing, execute, set completed on success; else increment attempts, store last_error, reschedule with backoff.
- Replace SchedulerService.scheduleOnce(key, when, handler) with an adapter that persists a job row and wakes a worker.

## When In-Memory Is Acceptable

- Best-effort UX-only timers (hint delays, UI auto-advance) where occasional skips are tolerable.
- Single-instance deployments without HA requirements.

## Action Items

- Keep SchedulerService API stable; add a durable implementation behind the same interface.
- Start with the Postgres approach for minimal infra changes.
- Introduce configuration flag to choose scheduler implementation at runtime.
