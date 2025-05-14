import { injectable } from "inversify";
import { Context } from "telegraf";

export type MediaType = "sticker" | "photo" | "video" | "animation";
export type MediaTag =
  | "minecraft"
  | "food"
  | "reaction"
  | "funny"
  | "cute"
  | "random";

export interface MediaItem {
  id: string;
  type: MediaType;
  tags: MediaTag[];
}

@injectable()
export class ZazuService {
  private readonly mediaLibrary: Record<string, MediaItem> = {
    // Stickers - Funny/Random
    normal: {
      id: "CAACAgIAAxkBAAEPGSFoJOJN2RHNg3nAHs9iFz62xTOB6AACpIMAAvOd6UhEN-iV-Dm6LzYE",
      type: "sticker",
      tags: ["funny", "random"],
    },
    photosyntesis: {
      id: "CAACAgIAAxkBAAEPGSNoJOJgkvPZVOwhtkNrhXZGUNQ9lwACI28AAkWD6UgesBXjxDdjnjYE",
      type: "sticker",
      tags: ["funny", "random"],
    },
    flashbacks: {
      id: "CAACAgIAAxkBAAEPGSVoJOJuKi7nFkRYDhzSHXdss7gf-wAClIcAAlYs6Eio1l7uTFGEYjYE",
      type: "sticker",
      tags: ["funny", "random"],
    },
    mix: {
      id: "CAACAgIAAxkBAAEPGSdoJOJ4cce-x8q-yq5tEjVwrXcUMgAC1GoAAhNk6UjAcvrOGiD25jYE",
      type: "sticker",
      tags: ["funny", "random"],
    },
    mix2: {
      id: "CAACAgIAAxkBAAEPGSloJOKBUc6njaaRsJSnGYbt4qMYjAACJncAArrh6EhoHGi2-dBNOzYE",
      type: "sticker",
      tags: ["funny", "random"],
    },
    sigma: {
      id: "CAACAgIAAxkBAAEPGStoJOKMbSucPnDVQ5_lZQOedPR4TgACK3EAAkkg6EhvLx3bUASZPzYE",
      type: "sticker",
      tags: ["funny", "random"],
    },
    mugshot: {
      id: "CAACAgIAAxkBAAEPGS1oJOKVgcpq_hvMTZV8tOALCM23iAAC7HEAAqf16EiY7kxx-ugcZzYE",
      type: "sticker",
      tags: ["funny", "random"],
    },
    absoluteCinema: {
      id: "CAACAgIAAxkBAAEPGS9oJOLEKdtxKUDFT164kr3u-1QdyQACTW8AAs6R6EhL6FeRZ3qqvDYE",
      type: "sticker",
      tags: ["funny", "random"],
    },
    robloxSmirk: {
      id: "CAACAgIAAxkBAAEPGTFoJOLT0ZRj060ZKy1P5_xKvnXLlQAC6HQAAq5i6Eh_Ol_rAqscUTYE",
      type: "sticker",
      tags: ["funny", "random"],
    },
    explosionDance: {
      id: "CAACAgIAAxkBAAEPGTNoJOL01sKGYt3g5UJxibl9kOAXXwAC5WwAApfr6EhFF97ZARUimzYE",
      type: "sticker",
      tags: ["funny", "random"],
    },
    sosiHiu: {
      id: "CAACAgIAAxkBAAEPGTVoJOMG13g8NK3Tej_19-9LD_4gXwACsXAAAvfh6Ei9iW4neuqdkDYE",
      type: "sticker",
      tags: ["funny", "random"],
    },
    gojoSatoru: {
      id: "CAACAgIAAxkBAAEPGTdoJOMRLibdWgfh9USUY6pWN2tgkAACiHEAApqV6UilvSaTcfzzSjYE",
      type: "sticker",
      tags: ["funny", "random"],
    },
    danteDmc: {
      id: "CAACAgIAAxkBAAEPGTloJOMco6-8LFYqXWXm1VDRHfSJqwAC3WYAAhZm8EgDcB0IYaSRPDYE",
      type: "sticker",
      tags: ["funny", "random"],
    },
    nerd: {
      id: "CAACAgIAAxkBAAEPGTtoJOMjebCwSNTHMk5DpBL7EkHOSQAC2G8AAiGE6Ejsth9j3ROBhjYE",
      type: "sticker",
      tags: ["funny", "random"],
    },
    criminal: {
      id: "CAACAgIAAxkBAAEPGT1oJOMqRr7UC_BfObylnucoAAFn8z8AAuJsAAJTE-lIRAk3XdCqMa42BA",
      type: "sticker",
      tags: ["funny", "random"],
    },
    asianHat: {
      id: "CAACAgIAAxkBAAEPGT9oJOMxoBXxgbWIjC7otwH_S3kaZQAC82wAAh216Ej5koNEJsnI0DYE",
      type: "sticker",
      tags: ["funny", "random"],
    },
    explosion: {
      id: "CAACAgIAAxkBAAEPGUFoJOM59rftLIMmLM5byyevwvSCAgACKYkAAkDG6EhecBR92J8ZGTYE",
      type: "sticker",
      tags: ["funny", "random"],
    },
    tongueOut: {
      id: "CAACAgIAAxkBAAEPGUNoJONEkBKMckTeehVXIWruVHPx4wACqHYAArzH6Ujncnzqx9gB_zYE",
      type: "sticker",
      tags: ["funny", "random"],
    },
    didYouPoop: {
      id: "CAACAgIAAxkBAAEPGUVoJONdDBDWWe875lzb7yZ5YS25NwACTHgAAiZ_6Ug_JAZrtdBZdTYE",
      type: "sticker",
      tags: ["funny", "random"],
    },
    clownCircus: {
      id: "CAACAgIAAxkBAAEPGUdoJONuxQP0t-XTTSC2GNYVIo8VIQACbmUAAvP-6EgmE50x7P9UcTYE",
      type: "sticker",
      tags: ["funny", "random"],
    },
    brawlStarsDislike: {
      id: "CAACAgIAAxkBAAEPGUloJON4jGfYFF3gsYykui0sGpznkAACmnkAAngc6UgVv0Gc8noBMjYE",
      type: "sticker",
      tags: ["reaction", "random"],
    },
    iLoveYou: {
      id: "CAACAgIAAxkBAAEPGUtoJOOC03drMbDaFX-s9r4ff2OL7wACH4oAAhQk6UhB-m32t7LTEzYE",
      type: "sticker",
      tags: ["cute", "random"],
    },

    // Photos - Cute/Food/Minecraft
    cuteZazu: {
      id: "AgACAgIAAxkBAAICv2gk8aBG2SR0XnbIZoGfEsnb4kGUAALB9jEbqlYoSRRfzOsIRIToAQADAgADcwADNgQ",
      type: "photo",
      tags: ["cute"],
    },
    cuteZazu2: {
      id: "AgACAgIAAxkBAAICxGgk8aDXLpZGjAkMn3preYWr3Q2rAALG9jEbqlYoSWphWJyibwHdAQADAgADcwADNgQ",
      type: "photo",
      tags: ["cute"],
    },
    cuteZazu3: {
      id: "AgACAgIAAxkBAAICwWgk8aDCjEtAkis78pClwq-fyHArAALD9jEbqlYoSfVTKT0fIIsNAQADAgADcwADNgQ",
      type: "photo",
      tags: ["cute"],
    },
    cuteZazu4: {
      id: "AgACAgIAAxkBAAICwGgk8aDrKEu8REwR5fHoNOQeAAHP2AACwvYxG6pWKEnoAAHufbhjb7YBAAMCAANzAAM2BA",
      type: "photo",
      tags: ["cute"],
    },
    cuteZazu5: {
      id: "AgACAgIAAxkBAAICx2gk8aD4CVm0jkxi2M7Kd0mAH0U4AALH9jEbqlYoSbq5TKmQ8TQJAQADAgADcwADNgQ",
      type: "photo",
      tags: ["cute"],
    },
    cuteZazu6: {
      id: "AgACAgIAAxkBAAICxWgk8aB9-zmfn5WHbCyKeppOV-uVAAJX8DEbuQooSdkO9pMp7kgxAQADAgADcwADNgQ",
      type: "photo",
      tags: ["cute"],
    },
    screaming: {
      id: "AgACAgIAAxkBAAICxmgk8aApXNfVhpyggZlO4g9CMFBzAAIX8jEbWbMpSQx1lVNVVerNAQADAgADcwADNgQ",
      type: "photo",
      tags: ["funny"],
    },
    epicGlowingEyes: {
      id: "AgACAgIAAxkBAAICwmgk8aCZcueHD1DyF0bxdMGfN0ntAALE9jEbqlYoSXc5OSXX4aMlAQADAgADcwADNgQ",
      type: "photo",
      tags: ["funny"],
    },
    burger: {
      id: "AgACAgIAAxkBAAICyGgk8aA00YaGcsVVj_9luG2aNwn6AALI9jEbqlYoSWHBCcDWo31aAQADAgADcwADNgQ",
      type: "photo",
      tags: ["food"],
    },
    flowerPot: {
      id: "AgACAgIAAxkBAAICw2gk8aBRxAcXeij0M-0W7MyHRjrCAALF9jEbqlYoSUj59E6-DLXgAQADAgADcwADNgQ",
      type: "photo",
      tags: ["funny"],
    },
    minecraftNight: {
      id: "AgACAgIAAxkBAAICuGgk8UR0vw5dtvZZkqJ3RpQlN3ekAAIM8jEbWbMpSaY_rL0AAWCUqQEAAwIAA3MAAzYE",
      type: "photo",
      tags: ["minecraft"],
    },
    minecraftIAmSteve: {
      id: "AgACAgIAAxkBAAICt2gk8USNw_HKVyPmbJny6vEtFZ_WAAK59jEbqlYoSTfPrvIm3QY8AQADAgADcwADNgQ",
      type: "photo",
      tags: ["minecraft"],
    },
    minecraftNether: {
      id: "AgACAgIAAxkBAAICuWgk8UQsho-Ahs8lvk81rYCMzoIFAAK89jEbqlYoSUnCHdXp-VqjAQADAgADcwADNgQ",
      type: "photo",
      tags: ["minecraft"],
    },
    minecraftShadersAxolotl: {
      id: "AgACAgIAAxkBAAICsmgk73W4gmUUs6cjhj9nxYP0R1TBAAK-9jEbqlYoSXOnJq0NqQNKAQADAgADcwADNgQ",
      type: "photo",
      tags: ["minecraft"],
    },

    // Videos
    chineseRap: {
      id: "BAACAgQAAxkBAAE07SVoJOTltW2Gp8eu1alFV5dzv3XcugAC6QcAAlLVFFFVxsjtfNRw2zYE",
      type: "video",
      tags: ["funny"],
    },
    outOfLineTikTokEdit: {
      id: "BAACAgIAAxkBAAE07SloJOUUcyhA2ukk9tFi-kR6U8loSAACYnoAAqpWKEkxQqZ9LhZDZjYE",
      type: "video",
      tags: ["funny"],
    },
    makingBiscuits: {
      id: "BAACAgIAAxkBAAE07StoJOUelcIeWZ_xTjhjT67pkptW0AACY3oAAqpWKEkgh3FxXAun0jYE",
      type: "video",
      tags: ["cute"],
    },
  };

  constructor() {}

  /**
   * Get random media item filtered by tags
   */
  private getRandomMediaItem(tags?: MediaTag[]): MediaItem | undefined {
    let filteredItems = Object.values(this.mediaLibrary);

    if (tags && tags.length > 0) {
      filteredItems = filteredItems.filter((item) =>
        item.tags.some((tag) => tags.includes(tag)),
      );
    }

    if (filteredItems.length === 0) return undefined;

    const randomIndex = Math.floor(Math.random() * filteredItems.length);
    return filteredItems[randomIndex];
  }

  /**
   * Send random media to chat
   */
  async sendRandomMedia(ctx: Context, tags?: MediaTag[]): Promise<boolean> {
    const mediaItem = this.getRandomMediaItem(tags);
    if (!mediaItem) return false;

    try {
      switch (mediaItem.type) {
        case "sticker":
          await ctx.replyWithSticker(mediaItem.id);
          break;
        case "photo":
          await ctx.replyWithPhoto(mediaItem.id);
          break;
        case "video":
          await ctx.replyWithVideo(mediaItem.id);
          break;
        case "animation":
          await ctx.replyWithAnimation(mediaItem.id);
          break;
        default:
          return false;
      }
      return true;
    } catch (error) {
      console.error("Failed to send media:", error);
      return false;
    }
  }

  /**
   * Specialized methods for common use cases
   */
  async sendMinecraftReaction(ctx: Context): Promise<boolean> {
    return this.sendRandomMedia(ctx, ["minecraft"]);
  }

  async sendFoodReaction(ctx: Context): Promise<boolean> {
    return this.sendRandomMedia(ctx, ["food"]);
  }

  async sendCuteReaction(ctx: Context): Promise<boolean> {
    return this.sendRandomMedia(ctx, ["cute"]);
  }

  async sendFunnyReaction(ctx: Context): Promise<boolean> {
    return this.sendRandomMedia(ctx, ["funny"]);
  }

  async sendGenericReaction(ctx: Context): Promise<boolean> {
    return this.sendRandomMedia(ctx, ["random"]);
  }
}
