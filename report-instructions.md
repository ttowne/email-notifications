You are helping me add one endpoint to an existing Spring Boot service
(Gradle, Java 25). I'm a senior engineer; be concise and precise.

## Goal
A synchronous endpoint that generates a CSV report of how often documents
were viewed and downloaded in a date range. About 5 internal users will use
it. Optimize for minimal code and minimal maintenance. No new infrastructure.

## Before writing code
Ask me for anything you need from the list below, then show me the file list
you plan to create. Do not invent class names for my existing clients.
- How the service currently calls Splunk (bean/class name, method signatures)
- Existing MariaDB access (JdbcTemplate / JPA / jOOQ) and the user table/columns
- Existing Cassandra access (CqlSession bean?) and the document table/columns
- How security/roles are configured
- Splunk index and sourcetypes: views = <<VIEW_SOURCETYPE>>,
  downloads = <<DOWNLOAD_SOURCETYPE>>, index = <<INDEX>>
  Both logs have fields docId and userId.

## API contract
GET /reports/document-activity.csv
  from     LocalDate, required, inclusive
  to       LocalDate, required, inclusive; to >= from; max 92 days
  events   comma list of VIEWS, DOWNLOADS; default both
  groupBy  DOCUMENT | USER | DOCUMENT_USER; default DOCUMENT_USER
Dates are interpreted in zone <<America/New_York>> (configurable property).
Response: text/csv; Content-Disposition attachment;
filename=doc-activity_{from}_{to}.csv
Invalid input -> 400 with a short JSON error (use the project's existing
error handling style if one exists).
Access restricted to role <<REPORTS_ROLE>> via the existing security setup.

## CSV columns
DOCUMENT_USER: docId, docTitle, docType, userId, userName, userEmail,
               department, views, downloads
DOCUMENT:      docId, docTitle, docType, views, downloads, uniqueUsers
USER:          userId, userName, userEmail, department, views, downloads,
               uniqueDocs
(Adjust enrichment columns to the real table columns I give you.)

## Implementation requirements
1. Aggregate in Splunk, never in Java from raw events. One search, e.g.:
   search index=<<INDEX>> (sourcetype=<<VIEW>> OR sourcetype=<<DOWNLOAD>>)
   earliest=... latest=...
   | eval action=if(sourcetype="<<VIEW>>","view","download")
   | stats count(eval(action="view")) as views
           count(eval(action="download")) as downloads by docId userId
   Do the DOCUMENT / USER rollups in Java from these rows (it's small).
   Request all results (count=0 or paginate), JSON output.
2. Build SPL ONLY from validated enums and formatted dates. No user-supplied
   strings in the query. Put the SPL template in one class with a unit test.
3. MariaDB user enrichment: distinct userIds, queried with WHERE id IN (...)
   in chunks of 1000. Select explicit columns only.
4. Cassandra doc enrichment: one prepared statement
   SELECT <cols> FROM <table> WHERE doc_id = ?
   executed with executeAsync, max 50 in flight (Semaphore or equivalent).
   Never use a multi-partition IN. Never loop sequentially with blocking calls.
5. Missing user/doc metadata: keep the row, leave those columns blank,
   log a single summary count at WARN (no IDs or PII in logs).
6. Stream the CSV with StreamingResponseBody; do not build the file as a
   String. Use Apache Commons CSV if already present, otherwise a minimal
   RFC 4180 writer. Prevent CSV formula injection: prefix values starting
   with = + - @ with a single quote.
7. Use records for DTOs. No Java preview features. No Lombok unless the
   project already uses it. Match the project's existing Spring Boot version
   and package conventions. Add no new dependencies without asking.
8. Timeouts: make the Splunk search timeout a config property (default 120s).

## Tests
- Request validation (date order, max range, bad enums)
- SPL builder output for each events combination
- CSV writer escaping and formula-injection handling
- Service test with mocked Splunk/Maria/Cassandra clients covering each
  groupBy and missing-metadata rows

## Output format
Give me each file in full with its path. After the code, list any
assumptions you made and anything I need to configure.