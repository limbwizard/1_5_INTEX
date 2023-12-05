#!/usr/bin/env bash
# Place in .platform/hooks/postdeploy directory
sudo certbot -n -d intex-provo-g15.us-east-1.elasticbeanstalk.com --nginx --agree-tos --email pdn23@byu.edu
sudo certbot -n -d intex.limbserver.com --nginx --agree-tos --email pdn23@byu.edu