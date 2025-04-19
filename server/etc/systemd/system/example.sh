#!/bin/bash
# These commands are roughly by memory so there might be some troubleshooting if we need to setup the server from scratch.

# after installing certbot and placing the files in their respective directories, enable the certbot timer to keep the certificates up to date
sudo systemctl enable certbot.timer

# installing certbot on the server
sudo su
yum install pip nginx -y
python3 -m venv /opt/certbot
cd /opt/certbot/bin
./pip install --upgrade pip
./pip install certbot certbot-nginx
. ./activate
./certbot run
