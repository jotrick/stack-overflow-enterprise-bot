import * as builder from "botbuilder";
import { TriggerActionDialog } from "../utils/TriggerActionDialog";
import { DialogIds } from "../utils/DialogIds";
import { DialogMatches } from "../utils/DialogMatches";
// import { MongoDbSOEQuestionStorage, SOEQuestionEntry } from "../storage/MongoDbSOEQuestionStorage";
// import { SOEQuestionEntry, UpdateEntry } from "../storage/MongoDbSOEQuestionStorage";
import { UpdateEntry } from "../storage/MongoDbSOEQuestionStorage";
import * as msTeams from "botbuilder-teams";
import { O365ConnectorCardSectionNew } from "../utils/O365ConnectorCardSectionNew";
import { renderTags } from "../apis/SOEnterpriseAPI";
import { Strings } from "../locale/locale";
// import { SOEBot } from "../SOEBot";
import * as config from "config";

export class UpdateSOEQuestionNotificationDialog extends TriggerActionDialog {

    private static async updateQuestionNotification(session: builder.Session, args?: any | builder.IDialogResult<any>, next?: (args?: builder.IDialogResult<any>) => void): Promise<void> {
        let q: any = args.questionToSend;
        // let soeQuestionEntry: SOEQuestionEntry = args.soeQuestionEntry;
        let updateEntry: UpdateEntry = args.updateEntry;
        // let mongoDbSOEQuestionStorage: MongoDbSOEQuestionStorage = args.mongoDbSOEQuestionStorage;
        // let soeQuestionStorage: MongoDbSOEQuestionStorage = (args.constructorArgs.bot as SOEBot).getSOEQuestionStorage();
        // let notificationEntry: NotificationEntry = args.notificationEntry;
        // let resolvePromiseCallback: () => void = args.resolvePromiseCallback;
        let stringOfChanges: string = args.stringOfChanges;

        // if (!q || !soeQuestionEntry || !updateEntry) {
        if (!q || !updateEntry || !stringOfChanges) {
            // send nothing
            // resolvePromiseCallback(); // this callback resolves one of the promises that the database connections in src/endpoints/RunNotificationJob.ts are waiting on to close
            session.endDialog();
            return;
        }

        let newAddress = {
            id: updateEntry.messageId,
            channelId: "msteams",
            user: {
                id: config.get("bot.botId"),
            },
            conversation: {
                id: updateEntry.conversationId,
            },
            bot: {
                id: config.get("bot.botId"),
            },
            serviceUrl: updateEntry.serviceUrl,
            useAuth: true,
        };

        // NEED TO HANDLE THE DIFFERENCES HERE BETWEEN Q AND SOEQUESTIONENTRY.SOEQUESTION
        let msg = new builder.Message(session)
            .address(newAddress)
            .textFormat(builder.TextFormat.markdown)
            .attachments([
                new msTeams.O365ConnectorCard(session)
                    .title(q.title)
                    .sections(
                        O365ConnectorCardSectionNew.create(session,
                            null, // section title
                            q.body, // section text
                            `[${q.owner.display_name}](${q.owner.link})`, // activityTitle
                            q.owner.profile_image, // activityImage
                            null, // activitySubtitle
                            null, // activityText
                            null, // images
                            [
                                Strings.field_label_tags, renderTags(q.tags),
                                Strings.field_label_answered, String(q.is_answered),
                                Strings.field_label_num_answers, String(q.answer_count),
                            ], // facts
                            // tslint:disable-next-line:trailing-comma
                        )
                    )
                    .potentialAction([
                        new msTeams.O365ConnectorCardViewAction(session)
                            .name(Strings.button_label_view_so_question)
                            .target(q.link),
                    ]),
            ]);

        if (!updateEntry.isChannel) {
            // this is the case of a 1:1 chat
            // because updating the notification does not pull the notification to the bottom of the chat, just send a new notification
            session.send(msg);
            session.send(session.gettext(Strings.msg_question_updated) + stringOfChanges);
            session.endDialog();
        } else {
            session.connector.update(msg.toMessage(), (err, address) => {
                if (!err) {
                    // this is the case of a channel chat
                    // because updating the notification does not pull the notification to the bottom of the chat, we can send a message
                    // in that reply chain to pull the updated message down
                    session.send(session.gettext(Strings.msg_question_updated) + stringOfChanges);
                } else {
                    session.error(err);
                }
                session.endDialog();
            });
        }
    }

    constructor(
        bot: builder.UniversalBot,
    ) {
        super(bot,
            DialogIds.UpdateSOEQuestionNotificationDialogId,
            DialogMatches.Update_SOE_Question_Notification_Dialog_Intent, // intent so it is not triggered by a user
            UpdateSOEQuestionNotificationDialog.updateQuestionNotification,
        );
    }
}
