
How to?

Q: How to add new migration file?
A: Run command like this:

./node_modules/.bin/sequelize migration:create --config=config/db.json --models-path=lib/model/db/ --name="add_default_date_format"


Q: How to run pending migrations?
A:

./node_modules/.bin/sequelize db:migrate --config=config/db.json --models-path=lib/model/db/




REST OF THIS FILE IS OBSOLETE.

This directory contain instructions how to migrate TimeOff.Management application
between its versions.

At this moment there is no particular framework for doing it. That should be produced
when the number of migrations grew to reasonable size and based on them it is clear
what is the best way to do that.


