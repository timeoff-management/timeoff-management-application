#!/bin/bash
sudo yum update -y
cd /home/ec2-user
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
. ~/.nvm/nvm.sh
nvm install node
node -e "console.log('Running Node.js ' + process.version)"
sudo yum install sqlite -y
sudo yum install sqlite-devel -y
npm install pm2 -g