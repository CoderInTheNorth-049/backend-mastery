# Design prompt 05 — Ride hailing

Design Uber-core for one metro region scaling to 1M riders/50k drivers concurrent: request ride → nearby-driver matching → live tracking until completion.

Must cover: geospatial indexing (geohash/quadtree/S2 — pick one, show cell sizing math), location update ingestion rate from drivers + storage strategy (time-series trim), matching service contention (two riders grabbing one driver), state machine of a trip, live ETA computation placement, surge pricing hookpoint (mechanism only).

Follow-ups: driver detours/offline handling; city boundary handoff; payments event at trip-end.

Rubric threshold: **19/25**.
