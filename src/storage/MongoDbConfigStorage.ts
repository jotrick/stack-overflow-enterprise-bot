import * as mongodb from "mongodb";
import * as config from "config";

let timestampKey = "timestamp";

/** Replacable storage system. */
export class MongoDbConfigStorage {

    private mongoDb: mongodb.Db;
    private collection: mongodb.Collection;

    // public static async createConnection(): Promise<MongoDbSOEQuestionStorage> {
    //     let collectionName = config.get("mongoDb.soeQuestionCollection");
    //     let connectionString = config.get("mongoDb.connectionString");
    //     let resultMongoDbStorage = new MongoDbSOEQuestionStorage(collectionName, connectionString);
    //     await resultMongoDbStorage.initialize();
    //     return resultMongoDbStorage;
    // }

    public static createConnection(): MongoDbConfigStorage {
        let collectionName = config.get("mongoDb.configCollection");
        let connectionString = config.get("mongoDb.connectionString");
        let resultMongoDbStorage = new MongoDbConfigStorage(collectionName, connectionString);
        // await resultMongoDbStorage.initialize();
        resultMongoDbStorage.initialize();
        return resultMongoDbStorage;
    }

    constructor(
        private collectionName: string,
        private connectionString: string) {
    }

    public async getTimestampConfigAsync(): Promise<number> {
        let currentTimestampInSeconds = Math.floor(new Date().getTime() / 1000);
        if (!this.collection) {
            // need to send current timestamp in seconds
            return currentTimestampInSeconds;
        }

        let filter = { "key": timestampKey };
        let entry = await this.collection.findOne(filter);

        if (entry && entry.timestamp) {
            return entry.timestamp;
        } else {
            // this is the situation where there was no match
            // thus, we need to send current timestamp in seconds
            return currentTimestampInSeconds;
        }
    }

    public async saveTimestampConfigAsync(newTimestamp: number): Promise<void> {
        if (!this.collection) {
            return;
        }

        let filter = { "key": timestampKey };
        let entry = {
            key: timestampKey,
            timestamp: newTimestamp,
        };

        await this.collection.updateOne(filter, entry, { upsert: true });
    }

    // Reads in data from storage
    public async getGenericConfigAsync(key: string): Promise<any> {
        if (!this.collection) {
            return ({} as any);
        }

        key = key.toLowerCase();
        let filter = { "key": key };
        let entry = await this.collection.findOne(filter);

        if (entry) {
            return entry;
        } else {
            // this is the situation where there was no match
            // thus, we need to create the start of an entry that will be saved
            return {
                key: key,
            };
        }
    }

    // Writes out data from storage
    public async saveGenericConfigAsync(entry: any): Promise<void> {
        if (!this.collection) {
            return;
        }

        entry.key = entry.key.toLowerCase();
        let filter = { "key": entry.key };

        await this.collection.updateOne(filter, entry, { upsert: true });
    }

    // Deletes data from storage
    public async deleteConfigAsync(key: string): Promise<void> {
        if (!this.collection) {
            return;
        }

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
