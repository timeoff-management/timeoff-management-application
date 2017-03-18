var connectionString = "postgres://*eyjqdcmvieocxx*:*fae2cba82e050acf3c228dbd543966f5a2e1e9806c655dd22dfab7b5fbd24328*@*ec2-54-75-231-195.eu-west-1.compute.amazonaws.com
*:*5432:/*da8bc6tso4apb*"

pg.connect(connectionString, function(err, client, done) {
   client.query('SELECT * FROM your_table', function(err, result) {
      done();
      if(err) return console.error(err);
      console.log(result.rows);
   });
});
