# Template project for bun-based React web application

To create a new project based on this one:
cd <your project folder, e.g. ~/dev/my-new-project>
git init
git remote add upstream https://github.com/bjoernwuest/bun-starter.git
git fetch upstream
git merge upstream/master --allow-unrelated-histories -m "Initialize project from bun-starter template"
git remote add origin https://github.com/<your github login name>/<your repo name>.git
git push -u origin master


# Needed configuration
Create a PostgresSQL database with user and password. Enter this information in a file `.env` in your project root:
DATABASE_URL=postgresql://<username>:<password>@<postgresql-host>:<postgresql-port, usually 5432>/<name of database>
ADVISORY_LOCK=<generate and enter a 64bit integer number (postitive or negative)>

# First start
1. run `bun run drizzle` to generate the database schema and migration.
2. run `DEV_MODE=1 bun run dev` to start the application in development mode. Somewhere along the way the setup key is output which you need to configure the application.
