#!/bin/bash
cd /home/ec2-user/timeoff-management/
pm2 start app.js --name "timeoff-management"
sudo env PATH=$PATH:/home/ec2-user/.nvm/versions/node/v13.6.0/bin /home/ec2-user/.nvm/versions/node/v13.6.0/lib/node_modules/pm2/bin/pm2 startup systemd -u ec2-user --hp /home/ec2-user
sudo service pm2-ec2-user start
# sudo service pm2-ec2-user status