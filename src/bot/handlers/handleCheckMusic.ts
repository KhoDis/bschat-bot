import { IBotContext } from "../../context/context.interface";
import { UserService } from "../services/UserService";

const handleCheckMusic = async (ctx: IBotContext, userService: UserService) => {
  const submissionUsers = await userService.getSubmissionUsers();
  const userList = await Promise.all(
    submissionUsers.map((u) => userService.getFormattedUser(u.id))
  );

  await ctx.reply(
    `Всего участников: ${submissionUsers.length}\n\n` + userList.join("\n")
  );
};

export default handleCheckMusic;
