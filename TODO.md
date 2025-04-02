# TODO for BS Bot

## Current

- [ ] Split bot responses and locales into namespaces.
- [ ] Add an ability to play multiple music games at the same time.
- [ ] Automatically reset music game after the last one is finished.
- [ ] Two buttons on one row (green and red) for crafty servers.

## High Priority

- [ ] Create a help command with bot usage instructions.
- [ ] Make a system to automatically add all the users to the DB on demand.

## Medium Priority

- [ ] Add exception interceptors to handle prisma errors that send message to contact bot admin.

## Low Priority

- [ ] Write unit tests for core functionality.
- [ ] Dump all the data about user and their actions to the admin on error.

## Ideas

- Add logs about who joined into the Minecraft server.

## Completed

- [x] Show how many players are online in the Minecraft server.
- [x] Add DI to avoid passing services directly.