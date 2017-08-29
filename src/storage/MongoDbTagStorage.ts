import * as mongodb from "mongodb";
import * as config from "config";

// tslint:disable-next-line:variable-name
export interface TagEntry {
    key: string; // make sure it is lower case
    notificationEntries: NotificationEntry[];
};

// tslint:disable-next-line:variable-name
export interface NotificationEntry {
    conversationId: string;
    serviceUrl: string;
    locale: string;
    isChannel: boolean;
};

/** Replacable storage system. */
export class MongoDbTagStorage {

    private mongoDb: mongodb.Db;
    private tagCollection: mongodb.Collection;

    // public static async createConnection(): Promise<MongoDbTagStorage> {
    //     let collectionName = config.get("mongoDb.tagCollection");
    //     let connectionString = config.get("mongoDb.connectionString");
    //     let resultMongoDbTagStorage = new MongoDbTagStorage(collectionName, connectionString);
    //     await resultMongoDbTagStorage.initialize();
    //     return resultMongoDbTagStorage;
    // }

    public static createConnection(): MongoDbTagStorage {
        let collectionName = config.get("mongoDb.tagCollection");
        let connectionString = config.get("mongoDb.connectionString");
        let resultMongoDbTagStorage = new MongoDbTagStorage(collectionName, connectionString);
        // await resultMongoDbTagStorage.initialize();
        resultMongoDbTagStorage.initialize();
        return resultMongoDbTagStorage;
    }

    constructor(
        private collectionName: string,
        private connectionString: string) {
    }

    // Reads in data from storage
    public async getTagAsync(key: string): Promise<TagEntry> {
        if (!this.tagCollection) {
            return ({} as any);
        }

        key = key.toLowerCase();
        let filter = { "key": key };
        let tagEntry = await this.tagCollection.findOne(filter);

        if (tagEntry) {
            return tagEntry;
        } else {
            return {
                key: key,
                notificationEntries: [],
            };
        }
    }

    // Writes out data from storage
    public async saveTagAsync(tagEntry: TagEntry): Promise<void> {
        if (!this.tagCollection) {
            return;
        }

        tagEntry.key = tagEntry.key.toLowerCase();
        let filter = { "key": tagEntry.key };

        await this.tagCollection.updateOne(filter, tagEntry, { upsert: true });
    }

    // Deletes data from storage
    public async deleteTagAsync(key: string): Promise<void> {
        if (!this.tagCollection) {
            return;
        }

        key = key.toLowerCase();
        let filter = { "key": key };

        await this.tagCollection.deleteMany(filter);
    }

    // Close the connection to the database
    public async close(): Promise<void> {
        this.tagCollection = null;
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
                this.tagCollection = await this.mongoDb.collection(this.collectionName);
            } catch (e) {
                // console.log(e.toString());
                await this.close();
            }
        }
    }
}
