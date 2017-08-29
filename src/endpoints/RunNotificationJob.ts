import * as express from "express";
import { SOEBot } from "../SOEBot";
import { NotificationJob } from "../notificationJob/NotificationJob";
import * as config from "config";

export class RunNotificationJob {
    public static getRequestHandler(bot: SOEBot): express.RequestHandler {
        return async function (req: any, res: any, next: any): Promise<void> {
            try {
                // simple validation so we do not accept unwanted requests
                let batchJobValidationKey = config.get("stackOverflowEnterprise.batchJobValidationKey");
                if (req.headers && req.headers.Authorization && req.headers.Authorization === "Basic " + batchJobValidationKey) {
                    RunNotificationJob.runNotificationBatchJob(bot, req, res, next);
                } else {
                    // do nothing
                }
            } catch (e) {
                // Don't log expected errors - error is probably from there not being example dialogs
                NotificationJob.respondWithError(res);
            }
        };
    }

    private static async runNotificationBatchJob(bot: SOEBot, req: any, res: any, next: any): Promise<void> {
        let configStorage = bot.getConfigStorage();
        let timestamp = await configStorage.getTimestampConfigAsync();
        let newTimestamp = await NotificationJob.runNotificationJob(bot, timestamp, res, false);
        // save one millisecond more because request for questions is inclusive
        await configStorage.saveTimestampConfigAsync(newTimestamp + 1);
    }
}
