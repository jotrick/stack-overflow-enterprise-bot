import * as mongodb from "mongodb";
import * as config from "config";

// tslint:disable-next-line:variable-name
export interface SOEQuestionEntry {
    key: string; // using SOE's question.id as the question's id in our database
    soeQuestion: any;
    updateEntries: UpdateEntry[];
};

// tslint:disable-next-line:variable-name
export interface UpdateEntry {
    messageId: string;
    conversationId: string;
    serviceUrl: string;
    locale: string;
    isChannel: boolean;
    notificationEntryConversationId: string;
};

/** Replacable storage system. */
export class MongoDbSOEQuestionStorage {

    private mongoDb: mongodb.Db;
    private collection: mongodb.Collection;

    // public static async createConnection(): Promise<MongoDbSOEQuestionStorage> {
    //     let collectionName = config.get("mongoDb.soeQuestionCollection");
    //     let connectionString = config.get("mongoDb.connectionString");
    //     let resultMongoDbStorage = new MongoDbSOEQuestionStorage(collectionName, connectionString);
    //     await resultMongoDbStorage.initialize();
    //     return resultMongoDbStorage;
    // }

    public static createConnection(): MongoDbSOEQuestionStorage {
        let collectionName = config.get("mongoDb.soeQuestionCollection");
        let connectionString = config.get("mongoDb.connectionString");
        let resultMongoDbStorage = new MongoDbSOEQuestionStorage(collectionName, connectionString);
        // await resultMongoDbStorage.initialize();
        resultMongoDbStorage.initialize();
        return resultMongoDbStorage;
    }

    constructor(
        private collectionName: string,
        private connectionString: string) {
    }

    // Reads in data from storage
    public async getSOEQuestionAsync(soeQuestion: any): Promise<SOEQuestionEntry> {
        if (!this.collection) {
            return ({} as any);
        }

        if (!soeQuestion || !soeQuestion.question_id) {
            return ({} as any);
        }

        // it appears that often the id comes in as a number
        let key = soeQuestion.question_id.toString().toLowerCase();

        let filter = { "key": key };
        let entry = await this.collection.findOne(filter);

        if (entry) {
            return entry;
        } else {
            // this is the situation where there was no match
            // thus, we need to create the start of an entry that will be saved
            return {
                key: key,
                soeQuestion: soeQuestion,
                updateEntries: [],
            };
        }
    }

    // Writes out data from storage
    public async saveSOEQuestionAsync(entry: SOEQuestionEntry): Promise<void> {
        if (!this.collection) {
            return;
        }

        entry.key = entry.key.toLowerCase();
        let filter = { "key": entry.key };

        await this.collection.updateOne(filter, entry, { upsert: true });
    }

    // Deletes data from storage
    public async deleteSOEQuestionAsync(key: string): Promise<void> {
        if (!this.collection) {
            return;
        }

        // it appears that often the id comes in as a number
        key = key.toString();

        key = key.toLowerCase();
        let filter = { "key": key };

        await this.collection.deleteMany(filter);
    }

    // Close the connection to the database
    public async close(): Promise<void> {
        this.collection = null;
        if (this.mongoDb) {
            await this.mongoDb.close();
            this.mongoDb = null;
        }
    }

    // Initialize this instance
    private async initialize(): Promise<void> {
        if (!this.mongoDb) {
            try {
                this.mongoDb = await mongodb.MongoClient.connect(this.connectionString);
                this.collection = await this.mongoDb.collection(this.collectionName);
            } catch (e) {
                console.log(e.toString());
                await this.close();
            }
        }
    }
}
