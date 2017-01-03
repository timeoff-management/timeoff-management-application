Migrations are going to be handled with sequelize-cli.

To automatically apply any outstanding migrations run following command:

  npm run-script db-update


How to?

Q: How to add new migration file?
A: Run command like this:

  ./node_modules/.bin/sequelize migration:create --config=config/db.json --models-path=lib/model/db/ --name="add_default_date_format"


Q: How to run pending migrations?
A:

  ./node_modules/.bin/sequelize db:migrate --config=config/db.json --models-path=lib/model/db/
