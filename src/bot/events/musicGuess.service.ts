// services/MusicGuessService.ts

import { Context } from "telegraf";
import {
    InlineKeyboardButton,
    Message,
} from "telegraf/typings/core/types/typegram";
import { shuffleArray } from "../../utils/arrayUtils";
import prisma from "../../prisma/client";
import { IMusicGuessService } from "./musicGuess.interface";
import { MusicSubmission, User } from "@prisma/client";
import { ExtraReplyMessage } from "telegraf/typings/telegram-types";

class MusicRoundState {
    track: MusicSubmission;
    notYetGuessed: Set<number>;
    rightGuesses: Set<number>;
    wrongGuesses: Set<number>;
    message: Message.TextMessage | undefined;

    constructor(users: Set<number>, track: MusicSubmission) {
        this.notYetGuessed = new Set(users);
        this.rightGuesses = new Set();
        this.wrongGuesses = new Set();
        this.track = track;
        this.message;
    }
}

class MusicGameState {
    rounds: Map<number, MusicRoundState>;
    currentRound: number;
    users: Set<number>;

    constructor(submissions: MusicSubmission[], users: Set<number>) {
        this.rounds = new Map(
            submissions.map((track, index) => [
                index,
                new MusicRoundState(users, track),
            ])
        );
        this.currentRound = 0;
        this.users = users;
    }
}

export class MusicGuessService implements IMusicGuessService {
    private gameState: MusicGameState | null = null;
    private leaderboard: Map<number, number> = new Map();

    async getTracks() {
        return await prisma.musicSubmission.findMany();
    }

    async startGame(ctx: Context) {
        const tracks = shuffleArray(await this.getTracks());
        if (!tracks.length) {
            await ctx.reply("Никто не решился учавствовать :(");
            return Promise.resolve();
        }

        const users = new Set(tracks.map((track) => track.userId));
        this.gameState = new MusicGameState(tracks, users);
    }

    async processRound(ctx: Context) {
        if (!this.gameState) {
            await ctx.reply("Игра еще не началась");
            return Promise.resolve();
        }

        const round = this.gameState.rounds.get(this.gameState.currentRound);
        if (!round) {
            await ctx.reply("Больше нет раундов");
            // Show leaderboard
            await this.showLeaderboard(ctx);
            return Promise.resolve();
        }

        const userPromises = [...this.gameState.users]
            .map(async (userId) => {
                return await prisma.user.findUnique({
                    where: { id: userId },
                });
            })
            .filter((user) => user);

        const users = (await Promise.all(userPromises)).filter(
            (user) => user !== null
        );

        const buttons = users.map((user) => {
            return {
                text: user.name,
                callback_data: `guess_${user.id}`,
            } as InlineKeyboardButton;
        });

        ctx.replyWithAudio(round.track.fileId, {
            caption: "Угадываем!",
            reply_markup: { inline_keyboard: this.chunkButtons(buttons, 3) },
        });

        this.sendRoundInfo(ctx);
    }

    async processGuess(ctx: Context, guesserId: number) {
        if (!this.gameState) {
            await ctx.answerCbQuery("Игра еще не началась :(");
            return Promise.resolve();
        }

        const round = this.gameState.rounds.get(this.gameState.currentRound);
        if (!round) {
            await ctx.answerCbQuery("Больше нет раундов");
            // Show leaderboard
            await this.showLeaderboard(ctx);
            return Promise.resolve();
        }

        const guessingUserId = ctx.from?.id;

        if (!guessingUserId) {
            await ctx.answerCbQuery(
                "У вас почему-то id нету, попробуйте ещё раз"
            );
            return Promise.resolve();
        }

        if (!round.notYetGuessed.has(guessingUserId)) {
            await ctx.answerCbQuery("Вы уже сделали голос :(");
            return Promise.resolve();
        }

        round.notYetGuessed.delete(guessingUserId);
        if (round.track.userId === guesserId) {
            await ctx.answerCbQuery(
                "🎉 Правильно! Никому пока не говори ответ :)"
            );
            round.rightGuesses.add(guessingUserId);
        } else {
            await ctx.answerCbQuery("Эх, мимо...");
            round.wrongGuesses.add(guessingUserId);
        }

        await this.updateRoundInfo(ctx);
    }

    async nextRound(ctx: Context) {
        if (!this.gameState) {
            await ctx.reply("Игра еще не началась");
            return Promise.resolve();
        }
        this.gameState.currentRound += 1;
        await this.processRound(ctx);
    }

    async sendRoundInfo(ctx: Context) {
        const gameState = this.gameState;
        if (!gameState) {
            return;
        }
        const round = gameState.rounds.get(gameState.currentRound);
        if (!round) {
            return;
        }

        const msg = await ctx.reply(`
            Раунд ${gameState.currentRound + 1}/${gameState.rounds.size}
            Ещё думают: ${[...round.notYetGuessed].join(", ")}
            Угадали: ${[...round.rightGuesses].join(", ")}
            Не угадали: ${[...round.wrongGuesses].join(", ")}
        `);

        round.message = msg;
    }

    async updateRoundInfo(ctx: Context) {
        const gameState = this.gameState;
        if (!gameState) {
            return;
        }
        const round = gameState.rounds.get(gameState.currentRound);
        if (!round) {
            return;
        }
        const chatId = round.message?.chat.id;
        if (!chatId) {
            this.sendRoundInfo(ctx);
            return;
        }
        const msg = round.message;
        if (!msg) {
            this.sendRoundInfo(ctx);
            return;
        }
        await ctx.telegram.editMessageText(
            chatId,
            msg.message_id,
            undefined,
            `
            Раунд ${gameState.currentRound + 1}/${gameState.rounds.size}
            Ещё думают: ${[...round.notYetGuessed].join(", ")}
            Угадали: ${[...round.rightGuesses].join(", ")}
            Не угадали: ${[...round.wrongGuesses].join(", ")}
            `
        );
    }

    showLeaderboard(ctx: Context) {
        // TODO
        const sortedLeaderboard = Array.from(this.leaderboard.entries()).sort(
            (a, b) => b[1] - a[1]
        );
        const leaderboardText = sortedLeaderboard
            .map(([userId, score]) => `${userId}: ${score}`)
            .join("\n");
        ctx.reply(`Leaderboard:\n${leaderboardText}`);
    }

    private chunkButtons(buttons: InlineKeyboardButton[], size: number) {
        return Array.from(
            { length: Math.ceil(buttons.length / size) },
            (_, i) => buttons.slice(i * size, i * size + size)
        );
    }

    // async updateStatus(ctx: Context) {
    //     const status = `Leaderboard:\n${[...this.leaderboard.entries()]
    //         .map(([userId, score]) => `${userId}: ${score}`)
    //         .join("\n")}`;
    //     await ctx.editMessageCaption(status);
    // }
}
