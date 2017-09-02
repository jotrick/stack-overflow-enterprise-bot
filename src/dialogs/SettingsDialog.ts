import * as builder from "botbuilder";
import { TriggerActionDialog } from "../utils/TriggerActionDialog";
import { DialogIds } from "../utils/DialogIds";
import { DialogMatches } from "../utils/DialogMatches";
import { ChannelData } from "../utils/ChannelData";
import { Strings } from "../locale/locale";
import * as teams from "botbuilder-teams";

export class SettingsDialog extends TriggerActionDialog {

    private static async showSettings(session: builder.Session, args?: any | builder.IDialogResult<any>, next?: (args?: builder.IDialogResult<any>) => void): Promise<void> {
        let addTagsAction = new teams.O365ConnectorCardActionCard(session)
            .id("addTagsActionId")
            .name(Strings.button_label_add_tags)
            .inputs([
                new teams.O365ConnectorCardTextInput(session)
                    .id("addTagInputStringFromSettingsCard")
                    .title(Strings.prompt_for_tags)
                    .isMultiline(false)
                    .isRequired(true),
            ])
            .actions([
                new teams.O365ConnectorCardHttpPOST(session)
                    .id("addTags")
                    .name(Strings.button_label_add_tags)
                    .body(JSON.stringify({
                        tagInputStringFromSettingsCard: "{{addTagInputStringFromSettingsCard.value}}",
                    })),
            ]);

        let channelData = ChannelData.get(session);
        let followedTags = channelData.followedTags;
        if (!followedTags) {
            followedTags = [];
        }

        let tagsToRemoveChoices = new Array<teams.O365ConnectorCardMultichoiceInputChoice>();
        for (let currTag of followedTags) {
            tagsToRemoveChoices.push(new teams.O365ConnectorCardMultichoiceInputChoice(session).display(currTag).value(currTag));
        }

        let removeTagsAction = new teams.O365ConnectorCardActionCard(session)
        .id("removeTagsActionId")
        .name(Strings.button_label_remove_tags)
        .inputs([
            new teams.O365ConnectorCardMultichoiceInput(session)
                .id("removeTagInputStringFromSettingsCard")
                .title(Strings.prompt_for_tags_unfollow)
                .isMultiSelect(true)
                .isRequired(true)
                .style("expanded")
                .choices(tagsToRemoveChoices),
        ])
        .actions([
            new teams.O365ConnectorCardHttpPOST(session)
                .id("removeTags")
                .name(Strings.button_label_remove_tags)
                .body(JSON.stringify({
                    tagInputStringFromSettingsCard: "{{removeTagInputStringFromSettingsCard.value}}",
                })),
        ]);

        let text = session.gettext(Strings.msg_currently_following_tags);
        for (let currTag of followedTags) {
            text += "**" + currTag + "**<br>";
        }

        if (followedTags.length === 0) {
            text = session.gettext(Strings.msg_currently_following_no_tags);
        }

        // added to created space between the text and the buttons
        text += "<br>";

        let card = new teams.O365ConnectorCard(session)
            // .summary("O365 card summary")
            .themeColor("#F48024")
            .title(Strings.prompt_settings)
            .text(text)
            .potentialAction([
                addTagsAction,
                removeTagsAction,
            ]);

        let msg = new teams.TeamsMessage(session)
            // .summary("A sample O365 actionable card")
            .addAttachment(card);

        session.send(msg);

        session.endDialog();
    }

    constructor(
        bot: builder.UniversalBot,
    ) {
        super(bot,
            DialogIds.SettingsDialogId,
            [
                DialogMatches.SettingsDialogMatch, // match is /show follwed tags/i
                DialogMatches.SettingsDialogMatch2, // regexCreator for "settings?"
                DialogMatches.SettingsDialogMatch3, // regexCreator for "config"
            ],
            SettingsDialog.showSettings,
        );
    }
}
