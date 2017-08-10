import * as builder from "botbuilder";
import * as request from "request";
import * as urlJoin from "url-join";
import * as config from "config";

export interface MultiTriggerActionDialogEntry {
    dialogId: string;
    match: RegExp | RegExp[] | string | string[];
    action: builder.IDialogWaterfallStep | builder.IDialogWaterfallStep[];
}

export function loadSessionAsync_New (bot: builder.UniversalBot, eventOrConversationId: builder.IEvent|string, serviceUrl?: string, locale?: string): Promise<builder.Session> {
    let address: builder.IChatConnectorAddress = null;
    if (typeof(eventOrConversationId) === "string") {
        // eventOrConversationId is a conversationId
        // if conversationId is passed in, then need to pass locale to get localization
        // if conversationId is passed in, then serviceUrl is not optional
        if (!serviceUrl) {
            return null;
        }

        let conversationId = eventOrConversationId;
        // "address": {
        //     "id": "1496195150421",
        //     "channelId": "msteams",
        //     "user": {
        //         "id": "29: 1tfHZU3xVny8-kZpmPHICvJBAm-Oi0Np4rcuM1fruLtPfon0GQZY2i_JujBTaixm1UIx6roKIh7ffkAS0QQVacg",
        //         "name": "Joshua Trick"
        //     },
        //     "conversation": {
        //         "isGroup": true,
        //         "id": "19:a01dedcabd8e470587b12283a195050f@thread.skype;messageid=1496195150421"
        //     },
        //     "bot": {
        //         "id": "28: 197fd55c-d711-47d7-ae1b-61244d8d3230",
        //         "name": "Bot Template"
        //     },
        //     "serviceUrl": "https: //smba.trafficmanager.net/amer-client-ss.msg/"
        // }
        address = {
            channelId: "msteams",
            user: {
                id: config.get("bot.botId"),
            },
            conversation: {
                // isGroup: true,
                id: conversationId,
            },
            // channelData: {
            //     tenant: {
            //         id: session.message.sourceEvent.tenant.id,
            //     },
            // },
            bot: {
                id: config.get("bot.botId"),
                // The bot's name can be used, but is not necessary
                // name: session.message.address.bot.name,
            },
            serviceUrl: serviceUrl,
            // useAuth: true,
        };
    } else {
        // eventOrConversationId is a builder.IEvent
        let event = eventOrConversationId;
        address = event.address;
        locale = getLocaleFromEvent(event);
    }

    if (!address) {
        return null;
    }

    return new Promise<builder.Session>((resolve, reject) => {
        bot.loadSession(address, (err: any, session: builder.Session) => {
            if (!err) {
                if (locale) {
                    (session as any)._locale = locale;
                    session.localizer.load(locale, (err2) => {
                        resolve(session);
                    });
                } else {
                    resolve(session);
                }
            } else {
                reject(err);
            }
        });
    });
};

export function loadSessionAsync (bot: builder.UniversalBot, event: builder.IEvent): Promise<builder.Session> {
    let address = event.address;
    return new Promise<builder.Session>((resolve, reject) => {
        bot.loadSession(address, (err: any, session: builder.Session) => {
            if (!err) {
                let locale = getLocaleFromEvent(event);
                if (locale) {
                    (session as any)._locale = locale;
                    session.localizer.load(locale, (err2) => {
                        resolve(session);
                    });
                } else {
                    resolve(session);
                }
            } else {
                reject(err);
            }
        });
    });
};

export function getLocaleFromEvent(event: builder.IEvent): string {
    // casting to keep away typescript errors
    let currEvent = (event as any);
    if (currEvent.entities && currEvent.entities.length) {
        for (let i = 0; i < currEvent.entities.length; i++) {
            if (currEvent.entities[i].type &&
                currEvent.entities[i].type === "clientInfo" &&
                currEvent.entities[i].locale)
            {
                return currEvent.entities[i].locale;
            }
        }
    }
    return null;
}

export function isMessageFromChannel(message: builder.IMessage): boolean {
    return (message.sourceEvent && message.sourceEvent.channel && message.sourceEvent.channel.id);
}

// simply checks to see if the incoming object is an empty object, i.e. {}
// returns true on a null or undefined input
export function isEmptyObj(obj: any): boolean {
    if (obj) {
        return Object.keys(obj).length === 0 && obj.constructor === Object;
    }
    return true;
}

// Starts a new reply chain by posting a message to a channel.
// Parameters:
//      chatConnector: Chat connector instance.
//      message: The message to post. The address in this message is ignored, and the message is posted to the specified channel.
//      channelId: Id of the channel to post the message to.
// Returns: A copy of "message.address", with the "conversation" property referring to the new reply chain.
export async function startReplyChainInChannel(chatConnector: builder.ChatConnector, message: builder.Message, channelId: string): Promise<builder.IChatConnectorAddress> {
    let activity = message.toMessage();

    // Build request
    let options: request.Options = {
        method: "POST",
        // We use urlJoin to concatenate urls. url.resolve should not be used here,
        // since it resolves urls as hrefs are resolved, which could result in losing
        // the last fragment of the serviceUrl
        url: urlJoin((activity.address as any).serviceUrl, "/v3/conversations"),
        body: {
            isGroup: true,
            activity: activity,
            channelData: {
                teamsChannelId: channelId,
            },
        },
        json: true,
    };

    let response = await sendRequestWithAccessToken(chatConnector, options);
    if (response && response.hasOwnProperty("id")) {
        let address = createAddressFromResponse(activity.address, response) as any;
        if (address.user) {
            delete address.user;
        }
        if (address.correlationId) {
            delete address.correlationId;
        }
        return address;
    } else {
        throw new Error("Failed to start reply chain: no conversation ID returned.");
    }
}

// Send an authenticated request
async function sendRequestWithAccessToken(chatConnector: builder.ChatConnector, options: request.Options): Promise<any> {
    // Add access token
    await addAccessToken(chatConnector, options);

    // Execute request
    return new Promise<any>((resolve, reject) => {
        request(options, (err, response, body) => {
            if (err) {
                reject(err);
            } else {
                if (response.statusCode < 400) {
                    try {
                        let result = typeof body === "string" ? JSON.parse(body) : body;
                        resolve(result);
                    } catch (e) {
                        reject(e instanceof Error ? e : new Error(e.toString()));
                    }
                } else {
                    let txt = "Request to '" + options.url + "' failed: [" + response.statusCode + "] " + response.statusMessage;
                    reject(new Error(txt));
                }
            }
        });
    });
}

// Add access token to request options
function addAccessToken(chatConnector: builder.ChatConnector, options: request.Options): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        // ChatConnector type definition doesn't include getAccessToken
        (chatConnector as any).getAccessToken((err: any, token: string) => {
            if (err) {
                reject(err);
            } else {
                options.headers = {
                    "Authorization": "Bearer " + token,
                };
                resolve();
            }
        });
    });
}

// Create a copy of address with the data from the response
function createAddressFromResponse(address: builder.IChatConnectorAddress, response: any): builder.IChatConnectorAddress {
    let result = {
        ...address,
        conversation: { id: response["id"] },
        useAuth: true,
    };
    if (result.id) {
        delete result.id;
    }
    if (response["activityId"]) {
        result.id = response["activityId"];
    }
    return result;
}

// Get the channel id in the event
export function getChannelId(event: builder.IEvent): string {
    let sourceEvent = event.sourceEvent;
    if (sourceEvent) {
        if (sourceEvent.teamsChannelId) {
            return sourceEvent.teamsChannelId;
        } else if (sourceEvent.channel) {
            return sourceEvent.channel.id;
        }
    }

    return "";
}

// Get the team id in the event
export function getTeamId(event: builder.IEvent): string {
    let sourceEvent = event.sourceEvent;
    if (sourceEvent) {
        if (sourceEvent.team) {
            return sourceEvent.team.id;
        } else if (sourceEvent.teamsTeamId) {
            return sourceEvent.teamsTeamId;
        }
    }
    return "";
}
