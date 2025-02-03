#!/bin/sh
DATABASE_URL="postgresql://bschat_user:bschat_password@db:5443/bschat" npx prisma migrate deploy
DATABASE_URL="postgresql://bschat_user:bschat_password@db:5443/bschat" node ./dist/app.js
