Migration notes:

- `0000_elite_shinobi_shaw.sql` is the Drizzle baseline for a brand-new database.
- `0001_add_user_email_verification.sql` adds the full-user email verification columns needed by the current auth fix.

Typical usage:

- Fresh database: run the normal Drizzle migration flow so the baseline and later migrations apply in order.
- Existing database that already has the app tables: apply `0001_add_user_email_verification.sql` or run the migration flow against a database that has already recorded the baseline.

Helpful commands:

- `npm run db:generate` to generate new migrations from schema changes.
- `npm run db:migrate` to apply checked-in migrations.
- `npm run db:push` to push schema state directly when that workflow is preferred.
