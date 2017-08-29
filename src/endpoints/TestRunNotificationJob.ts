import * as express from "express";
import { SOEBot } from "../SOEBot";
// import { MongoDbTagStorage, NotificationEntry } from "../storage/MongoDbTagStorage";
// import { NotificationEntry } from "../storage/MongoDbTagStorage";
import { loadSessionAsync_New } from "../utils/DialogUtils";
// import { SOEnterpriseAPI } from "../apis/SOEnterpriseAPI";
import { DialogIds } from "../utils/DialogIds";
// import { UpdateEntry } from "../storage/MongoDbSOEQuestionStorage";
import { NotificationJob } from "../notificationJob/NotificationJob";
import * as config from "config";

export class TestRunNotificationJob {
    public static getRequestHandler(bot: SOEBot): express.RequestHandler {
        return async function (req: any, res: any, next: any): Promise<void> {
            try {
                let testBatchJobValidationKey = config.get("stackOverflowEnterprise.testBatchJobValidationKey");
                if (req.query && req.query.key === testBatchJobValidationKey && req.query.tag) {
                    TestRunNotificationJob.tagNameNotification(bot, req, res, next);
                } else if (req.query && req.query.key === testBatchJobValidationKey && req.query.timestamp) {
                    TestRunNotificationJob.timestampNotification(bot, req, res, next);
                } else {
                    TestRunNotificationJob.doNothingSimpleResponse(req, res, next);
                }
            } catch (e) {
                // Don't log expected errors - error is probably from there not being example dialogs
                NotificationJob.respondWithError(res);
            }
        };
    }

    private static async tagNameNotification(bot: SOEBot, req: any, res: any, next: any): Promise<void> {
        // let tagStorage = await MongoDbTagStorage.createConnection();
        let tagStorage = bot.getTagStorage();
        let tagEntry = await tagStorage.getTagAsync(req.query.tag.toLowerCase());
        // await tagStorage.close();

        for (let currNotificationEntry of tagEntry.notificationEntries) {
            let currSession = await loadSessionAsync_New(
                    bot,
                    currNotificationEntry.conversationId,
                    currNotificationEntry.serviceUrl,
                    currNotificationEntry.locale,
                );

            currSession.beginDialog(DialogIds.SendSimpleTagNotificationDialogId, { tagName: req.query.tag });
        }

        let htmlPage = `<!DOCTYPE html>
            <html>
            <head>
                <title>Bot Info</title>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body>
                <h1>
                    Notification Job ran successfully with tag: ${req.query.tag}
                </h1>
            </body>
            </html>`;

        res.send(htmlPage);
    }

    private static async timestampNotification(bot: SOEBot, req: any, res: any, next: any): Promise<void> {
        let timestamp = req.query.timestamp;
        NotificationJob.runNotificationJob(bot, timestamp, res, true);
    }

    private static async doNothingSimpleResponse(req: any, res: any, next: any): Promise<void> {
        let htmlPage = `<!DOCTYPE html>
            <html>
            <head>
                <title>Bot Info</title>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body>
                <h1>
                    No job run.
                </h1>
            </body>
            </html>`;

        res.send(htmlPage);
    }
}
