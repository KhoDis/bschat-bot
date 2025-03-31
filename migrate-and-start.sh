#!/bin/sh
DATABASE_URL="postgresql://bschat_user:bschat_password@db:5432/bschat" npx prisma migrate reset
DATABASE_URL="postgresql://bschat_user:bschat_password@db:5432/bschat" npx prisma migrate deploy
DATABASE_URL="postgresql://bschat_user:bschat_password@db:5432/bschat" npm run start
