// import { Composer, Context } from "telegraf";
// import { message } from "telegraf/filters";
// import { InlineKeyboardButton, Message } from "@telegraf/types";
// import { shuffleArray } from "../../utils/arrayUtils";
// import { hasUsername } from "../../utils/apiUtils";
// import { MusicEntry } from "@prisma/client";
// import prisma from "../../prisma/client";

// interface MusicGuess {
//   musicEntry: MusicEntry;
//   correctUserId: number;
//   guessing: Set<number>; // Track who is currently guessing and yet to guess
//   rightGuesses: Set<number>; // Track who has guessed correctly
//   wrongGuesses: Set<number>; // Track who has guessed incorrectly
// }

// export const MusicEventComposer = new Composer();

// MusicEventComposer.command("join", async (ctx) => {
//   if (ctx.chat.type !== "private") {
//     return;
//   }

//   await prisma.user.upsert({
//     where: { id: ctx.from.id },
//     create: {
//       id: ctx.from.id,
//       username: ctx.from.username || ctx.from.first_name, // TODO: make clickable link
//     },
//     update: {
//       username: ctx.from.username || ctx.from.first_name,
//     },
//   });
//   ctx.reply("You can now collect music in this private chat!");
// });

// // Collect music in private chat
// MusicEventComposer.on(message("audio"), async (ctx) => {
//   ctx.reply("Мяу");
//   // Ensure that the message is from a personal chat
//   if (ctx.chat.type !== "private") {
//     return;
//   }
//   const file = ctx.message.audio;

//   await prisma.musicEntry.create({
//     data: {
//       fileId: file.file_id,
//       timestamp: new Date(),
//       user: {
//         connect: {
//           id: ctx.from.id,
//         },
//       },
//     },
//   });
//   ctx.reply("Музыка добавлена! Она будет использоваться в событии.");
// });

// MusicEventComposer.command("play", async (ctx) => {
//   // List all collected music
//   const musicFiles = await prisma.musicEntry.findMany();

//   if (musicFiles && musicFiles.length > 0) {
//     for (const music of musicFiles) {
//       startGuessing(ctx, music);
//     }
//   } else {
//     await ctx.reply("No music files collected");
//   }
// });

// const getUserById = async (userId: number) => {
//   return await prisma.user.findUnique({ where: { id: userId } });
// };

// const hasGuessed = (musicGuess: MusicGuess, userId: number) => {
//   return (
//     musicGuess.wrongGuesses.has(userId) || musicGuess.rightGuesses.has(userId)
//   );
// };

// // Create new guessing session
// let musicGuess: MusicGuess | null = null;
// let musicMessage: Message.AudioMessage | null = null;

// const getGuessingStatus = (ctx: Context): string | null => {
//   if (!musicGuess) {
//     return null;
//   }

//   // Print who is currently guessing, who is wrong and who is right
//   const guessingUsers = Array.from(musicGuess.guessing);
//   const rightUsers = Array.from(musicGuess.rightGuesses);
//   const wrongUsers = Array.from(musicGuess.wrongGuesses);
//   // Print who didn't guess yet:

//   return [
//     `Гадают: ${guessingUsers.join(", ")}`,
//     `Угадали: ${rightUsers.join(", ")}`,
//     `Не угадали: ${wrongUsers.join(", ")}`,
//   ].join("\n");
// };

// const startGuessing = async (ctx: Context, music: MusicEntry) => {
//   ctx.sendChatAction("typing");
//   // Get all unique users who submitted music
//   const participants = await prisma.musicEntry.findMany({
//     where: { fileId: music.fileId },
//     select: { user: true },
//   });
//   const userIdToUsername = new Map<number, string>();
//   for (const participant of participants) {
//     userIdToUsername.set(participant.user.id, participant.user.username);
//   }
//   const uniqueUsers = new Set(participants.map((p) => p.user.id));
//   const users = Array.from(uniqueUsers);

//   // Shuffle again to randomize correct answer position
//   const shuffledOptions = shuffleArray(users);

//   // Create buttons for each option
//   const buttons = shuffledOptions.map((userId) => {
//     return {
//       text: userIdToUsername.get(userId),
//       callback_data: `guess_${ctx.message?.message_id}_${userId}`,
//     };
//   });

//   // Filter out any null buttons and chunk into rows of 2
//   const validButtons = buttons.filter(
//     (btn): btn is { text: string; callback_data: string } => btn !== null
//   );
//   const buttonRows: InlineKeyboardButton.CallbackButton[][] =
//     validButtons.reduce(
//       (rows: InlineKeyboardButton.CallbackButton[][], button, index) => {
//         if (index % 4 === 0) rows.push([button]);
//         else rows[rows.length - 1]!.push(button);
//         return rows;
//       },
//       []
//     );

//   // Start guessing
//   musicGuess = {
//     musicEntry: music,
//     correctUserId: music.userId,
//     guessing: new Set(users),
//     rightGuesses: new Set(),
//     wrongGuesses: new Set(),
//   };

//   musicMessage = await ctx.replyWithAudio(music.fileId, {
//     caption: "Чья музыка?\n\n" + getGuessingStatus(ctx),
//     reply_markup: {
//       inline_keyboard: buttonRows,
//     },
//   });
// };

// // Handle guesses through callback queries
// MusicEventComposer.action(/guess_(.+)/, async (ctx) => {
//   const guessData = ctx.match[1]!.split("_"); // TODO: make callback system more robust
//   const messageId = guessData[0]!;
//   const guessedUserId = guessData[1] ? parseInt(guessData[1]) : null; // User's picked option

//   if (!guessedUserId) {
//     return ctx.answerCbQuery("Guess can't be null. Try again!");
//   }

//   if (!musicGuess) {
//     return ctx.answerCbQuery("You haven't started a guessing session yet!");
//   }

//   if (hasGuessed(musicGuess, ctx.from.id)) {
//     return ctx.answerCbQuery("You've already made a guess!");
//   }

//   const guessedUser = await getUserById(guessedUserId);
//   if (!guessedUser) {
//     // TODO: allow participants to vote despite not uploading music
//     return ctx.answerCbQuery(
//       "That user didn't participate in this guessing session!"
//     );
//   }

//   musicGuess.guessing.delete(ctx.from.id);

//   // Check if a user has guessed correctly
//   if (guessedUserId === musicGuess.correctUserId) {
//     musicGuess.rightGuesses.add(ctx.from.id);
//     ctx.answerCbQuery("🎉 Correct! Don't tell anyone yet!");
//   } else {
//     musicGuess.wrongGuesses.add(ctx.from.id);
//     ctx.answerCbQuery("❌ Wrong guess. Better luck next time!");
//   }

//   // Update the message with the new state
//   if (!musicMessage) {
//     ctx.reply("Can't find the message with the music...");
//     return;
//   }

//   ctx.editMessageCaption("Чья музыка?\n\n" + getGuessingStatus(ctx));

//   // Check if the guessing session is over
//   if (musicGuess.guessing.size === 0) {
//     ctx.answerCbQuery("The guessing session is over!");
//     musicGuess = null;
//     musicMessage = null;
//   }

//   // Show the result as a new message
//   return ctx.reply("Конец раунда! Результат:\n\n" + getGuessingStatus(ctx));
// });
