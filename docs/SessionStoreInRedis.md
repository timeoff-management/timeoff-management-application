# How to use Redis as storage for Sessions

By default application uses its database as a storage for session data (`Sessions` table).

It is possible to use different storage mechanism for Sessions data: [Redis](https://redis.io/).

## Steps

* Ensure the application's source is at least `1.4.0`
* Stop the application
* Open `config/app.json` for editing
* Update `sessions.store` section to be `redis`
* Update `sessions.redis`'s `host` and `port` pointing to corresponding instance of Redis
* Save the configuration file
* Restart the application
