// import { Context, session, Telegraf } from "telegraf";
// // import { handleMusicUpload } from "./features/musicCollection";
// // import { scheduleMusicEvent } from "./features/scheduler";
// import dotenv from "dotenv";
// // import { ping } from "./commands/ping";
// import { MusicEventComposer } from "./events/musicEvent";

// // Load environment variables
// // dotenv.config();

// // Initialize the bot with your token
// // const bot = new Telegraf(process.env["BOT_TOKEN"]!);

// // Middleware for user session data storage
// // bot.use(session());

// // Load event composers
// // bot.use(BingoEventComposer);
// // bot.use(InterviewEventComposer);
// // bot.use(StatisticsComposer);

// // Register commands and features
// // bot.start((ctx) => ctx.reply("Welcome to the music event bot!"));

// // Add ping command
// // ping(bot);

// import config from "../config";

// export const createBot = () => {
//   const bot = new Telegraf(config.BOT_TOKEN);

//   // registerMiddlewares(bot);
//   // registerCommands(bot);

//   bot.use(MusicEventComposer);

//   bot.on("message", (ctx) => {
//     console.log(
//       `Received message from ${ctx.from.username}:\n${JSON.stringify(
//         ctx.message,
//         null,
//         2
//       )}`
//     );
//   });

//   return bot;
// };
