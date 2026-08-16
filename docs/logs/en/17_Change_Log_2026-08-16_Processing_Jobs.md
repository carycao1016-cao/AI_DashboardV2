# 17 Change Log: Processing Jobs

## Scope

- Source-file upload now returns an asynchronous `job_id` with HTTP 202.
- SQLite records queued, running, completed and failed processing states.
- The current in-process background task runs the deterministic Python Workbook scan.
- The frontend polls the job and exposes the phase and progress in Processing Status.

## Boundary

This is an MVP task boundary, not a production queue. A service restart can interrupt an in-process task. A durable worker and queue remain required before production use. The task does not call AI and does not generate business values.

## Verification

- Upload returned `queued` and a job ID.
- Job polling reached `completed`.
- Project reload returned the completed source version and Sheet scan summary.
